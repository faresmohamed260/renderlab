import { chromium } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const artifactDir = process.env.RENDERLAB_ACCOUNT_ARTIFACT_DIR || "artifacts";
const cleanupOnly = process.argv.includes("--cleanup-only");
const runToken = process.env.GITHUB_RUN_ID || "local";

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  SUPABASE_PUBLISHABLE_KEY: publishableKey,
})) {
  if (!value) throw new Error(`${name} is required for configured account identity verification.`);
}

function fixtureUserId(token) {
  const hex = createHash("sha256").update(`renderlab-account-${token}`).digest("hex").slice(0, 32).split("");
  hex[12] = "4";
  hex[16] = "8";
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20, 32).join("")}`;
}

const userId = fixtureUserId(runToken);
const email = `renderlab-account-${runToken}@example.com`;
const password = `RenderLab-${runToken}-Pass!`;
const updatedPassword = `RenderLab-${runToken}-Updated!`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function authAdmin(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceRoleKey);
  headers.set("authorization", `Bearer ${serviceRoleKey}`);
  if (init.body != null) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/auth/v1/admin/${path}`, { ...init, headers });
}

async function serviceRest(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceRoleKey);
  headers.set("authorization", `Bearer ${serviceRoleKey}`);
  if (init.body != null) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers });
}

async function expectServiceSuccess(response, label) {
  if (!response.ok) throw new Error(`${label} (${response.status}): ${await response.text()}`);
}

async function cleanupFixture() {
  await expectServiceSuccess(
    await serviceRest(`renderlab_beta_invitations?normalized_email=eq.${encodeURIComponent(email.toLowerCase())}`, { method: "DELETE" }),
    "Could not remove account invitation fixture",
  );
  await expectServiceSuccess(
    await serviceRest(`renderlab_account_access?user_id=eq.${encodeURIComponent(userId)}`, { method: "DELETE" }),
    "Could not remove account access fixture",
  );
  const response = await authAdmin(`users/${encodeURIComponent(userId)}`, { method: "DELETE" });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Could not remove account fixture (${response.status}): ${await response.text()}`);
  }
  console.log(`Account identity fixture clean user=${userId}.`);
}

async function createFixture() {
  await cleanupFixture();
  const response = await authAdmin("users", {
    method: "POST",
    body: JSON.stringify({
      id: userId,
      email,
      password,
      email_confirm: true,
      user_metadata: { source: "renderlab-account-identity-ci", run: runToken },
    }),
  });
  if (!response.ok) throw new Error(`Could not create account fixture (${response.status}): ${await response.text()}`);
  const user = await response.json();
  assert(user?.id === userId, "Supabase created an unexpected account fixture ID.");

  const invitation = await serviceRest("renderlab_beta_invitations", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      normalized_email: email.toLowerCase(),
      role: "member",
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }),
  });
  await expectServiceSuccess(invitation, "Could not create closed-beta invitation fixture");
}

async function setAccessStatus(status) {
  const response = await serviceRest(`renderlab_account_access?user_id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
  });
  await expectServiceSuccess(response, `Could not set account access ${status}`);
}

async function recoveryTokenHash() {
  const response = await authAdmin("generate_link", {
    method: "POST",
    body: JSON.stringify({ type: "recovery", email }),
  });
  if (!response.ok) throw new Error(`Could not generate recovery fixture link (${response.status}): ${await response.text()}`);
  const payload = await response.json();
  const tokenHash = payload?.properties?.hashed_token || payload?.hashed_token;
  assert(typeof tokenHash === "string" && tokenHash.length > 10, "Recovery fixture did not return a hashed token.");
  return tokenHash;
}

if (cleanupOnly) {
  await cleanupFixture();
  process.exit(0);
}

await mkdir(artifactDir, { recursive: true });
let browser;
let primaryError = null;

try {
  await createFixture();
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1024 }, colorScheme: "dark" });
  const page = await context.newPage();

  await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByRole("heading", { name: "Account", exact: true }).waitFor({ state: "visible" });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByText(email, { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByText("Active", { exact: true }).waitFor({ state: "visible" });
  assert(await page.getByRole("link", { name: "Change password", exact: true }).isVisible(), "Signed-in Settings is missing Change password.");
  assert(await page.getByRole("button", { name: "Sign out", exact: true }).isVisible(), "Signed-in Settings is missing Sign out.");
  await page.screenshot({ path: `${artifactDir}/account-identity-desktop-signed-in.png`, fullPage: true });

  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("Active", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${artifactDir}/account-identity-mobile-signed-in.png`, fullPage: true });

  await setAccessStatus("suspended");
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("Suspended", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  const deniedMedia = await page.request.get(`${baseUrl}/api/media/assets`);
  assert(deniedMedia.status() === 401, `Suspended account media API expected 401, got ${deniedMedia.status()}.`);
  await page.screenshot({ path: `${artifactDir}/account-identity-mobile-suspended.png`, fullPage: true });

  await setAccessStatus("active");
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("Active", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });

  await page.getByRole("link", { name: "Change password", exact: true }).click();
  await page.getByRole("heading", { name: "Change password", exact: true }).waitFor({ state: "visible" });
  assert(await page.getByLabel("Current password").isVisible(), "Ordinary password change must require the current password.");
  await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle" });

  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByLabel("Email").waitFor({ state: "visible", timeout: 30_000 });
  assert(await page.getByRole("button", { name: "Forgot password", exact: true }).isVisible(), "Signed-out Settings is missing Forgot password.");
  assert((await page.getByRole("button", { name: "Create account", exact: true }).count()) === 0, "Closed-beta Settings must not expose public Create account.");
  await page.screenshot({ path: `${artifactDir}/account-identity-mobile-signed-out.png`, fullPage: true });

  const tokenHash = await recoveryTokenHash();
  await page.goto(
    `${baseUrl}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=recovery&next=/settings/password`,
    { waitUntil: "networkidle", timeout: 60_000 },
  );
  await page.getByRole("heading", { name: "Set a new password", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  assert((await page.getByLabel("Current password").count()) === 0, "Verified recovery flow should not ask for the old password.");
  await page.getByLabel("New password", { exact: true }).fill(updatedPassword);
  await page.getByLabel("Confirm new password", { exact: true }).fill(updatedPassword);
  await page.getByRole("button", { name: "Update password", exact: true }).click();
  await page.getByText("Password updated.", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.screenshot({ path: `${artifactDir}/account-identity-mobile-recovery-complete.png`, fullPage: true });

  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(updatedPassword);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByText("Active", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });

  console.log(`Configured account identity/admission/recovery verified user=${userId}.`);
} catch (error) {
  primaryError = error;
} finally {
  if (browser) await browser.close().catch(() => {});
  try {
    await cleanupFixture();
  } catch (cleanupError) {
    if (!primaryError) primaryError = cleanupError;
    else console.error(cleanupError);
  }
}

if (primaryError) throw primaryError;
