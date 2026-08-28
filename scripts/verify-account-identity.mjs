import { chromium } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Exercise the canonical Vercel name while preserving the existing GitHub CI alias.
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

async function cleanupFixture() {
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
  assert(await page.getByRole("button", { name: "Sign out", exact: true }).isVisible(), "Signed-in Settings state is missing Sign out.");
  await page.screenshot({ path: `${artifactDir}/account-identity-desktop-signed-in.png`, fullPage: true });

  await page.reload({ waitUntil: "networkidle" });
  await page.getByText(email, { exact: true }).waitFor({ state: "visible", timeout: 30_000 });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${artifactDir}/account-identity-mobile-signed-in.png`, fullPage: true });

  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByLabel("Email").waitFor({ state: "visible", timeout: 30_000 });
  assert(await page.getByRole("button", { name: "Create account", exact: true }).isVisible(), "Signed-out Settings state is missing Create account.");
  await page.screenshot({ path: `${artifactDir}/account-identity-mobile-signed-out.png`, fullPage: true });

  console.log(`Configured account identity verified user=${userId}.`);
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
