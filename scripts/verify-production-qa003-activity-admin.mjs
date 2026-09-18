import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { chromium } from "@playwright/test";
import { createHmac, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import {
  configuredTestAccountIdentity,
  createConfiguredTestAccount,
  deleteConfiguredTestAccount,
} from "./lib/configured-test-account.mjs";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "https://renderlab.faresuniform.uk").replace(/\/$/, "");
const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const artifactDir = process.env.RENDERLAB_QA003_ARTIFACT_DIR || "artifacts/qa003-production-activity-admin";
const expectedSource = process.env.RENDERLAB_EXPECTED_PRODUCTION_SHA?.trim() || "";
const cleanupOnly = process.argv.includes("--cleanup-only");
const runToken = process.env.GITHUB_RUN_ID || "local";
const activityNamespace = "qa003-activity";
const adminNamespace = "qa003-admin";
const activityIdentity = configuredTestAccountIdentity(activityNamespace);
const adminIdentity = configuredTestAccountIdentity(adminNamespace);
const desktop = { width: 1440, height: 1080 };
const mobile = { width: 390, height: 844 };

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
  RENDERLAB_EXPECTED_PRODUCTION_SHA: expectedSource,
})) {
  if (!value) throw new Error(`${name} is required for QA-003 production audit.`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(/^[0-9a-f]{40}$/i.test(expectedSource), "RENDERLAB_EXPECTED_PRODUCTION_SHA must be an exact 40-character Git SHA.");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeBase32(value) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const normalized = value.toUpperCase().replace(/=+$/g, "").replace(/\s+/g, "");
  let bits = "";
  for (const character of normalized) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error("Unexpected TOTP secret encoding.");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
    bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  }
  return Buffer.from(bytes);
}

function currentTotp(secret, timeMs = Date.now()) {
  const counter = BigInt(Math.floor(timeMs / 1000 / 30));
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(counter);
  const digest = createHmac("sha1", decodeBase32(secret)).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

async function stableTotp(secret) {
  const second = Math.floor(Date.now() / 1000) % 30;
  if (second >= 27) await sleep((31 - second) * 1000);
  return currentTotp(secret);
}

async function serviceRest(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceRoleKey);
  headers.set("authorization", `Bearer ${serviceRoleKey}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers });
}

async function serviceRows(path) {
  const response = await serviceRest(path);
  if (!response.ok) throw new Error(`Fixture query failed (${response.status}): ${await response.text()}`);
  return response.json();
}

async function expectServiceOk(response, label) {
  if (!response.ok) throw new Error(`${label} (${response.status}): ${await response.text()}`);
  return response;
}

async function authAdmin(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceRoleKey);
  headers.set("authorization", `Bearer ${serviceRoleKey}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/auth/v1/admin/${path}`, { ...init, headers });
}

async function setAccountAccess(userId, patch) {
  await expectServiceOk(
    await serviceRest(`renderlab_account_access?user_id=eq.${encodeURIComponent(userId)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
    }),
    `Could not update access for ${userId}`,
  );
}

async function seedFailedRetryJob(ownerId, prompt) {
  const id = randomUUID();
  const now = new Date().toISOString();
  await expectServiceOk(
    await serviceRest("generation_jobs", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        id,
        owner_id: ownerId,
        status: "failed",
        operation: "create-image",
        output_kind: "image",
        prompt,
        workflow_id: "flux2-klein-image-generate",
        model: "FLUX.2 Klein 9B · DarkBeast V2 BFS",
        ecosystem: "flux2-klein-9b",
        inputs: [],
        parameters: {
          model: "flux2-klein-9b",
          output: { kind: "image", aspectRatio: "1:1" },
          advanced: { seed: 42, steps: 4, guidance: 1 },
        },
        worker_id: null,
        provider_job_id: null,
        worker_state: null,
        failover_history: [],
        output_asset_ids: [],
        error_code: "generation_submission_failed",
        error_message: "QA-003 run-owned failed fixture.",
        created_at: now,
        updated_at: now,
        completed_at: now,
      }),
    }),
    "Could not seed QA-003 failed retry job",
  );
  return id;
}

async function assertNoOverflow(page, label) {
  const delta = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(delta <= 2, `${label} overflowed horizontally by ${delta}px.`);
}

async function screenshot(page, name, options = {}) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${artifactDir}/${name}.png`, fullPage: true, ...options });
}

async function signInThroughSettings(page, account, expectChallenge = false) {
  await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByLabel("Email").fill(account.email);
  await page.locator("#account-password").fill(account.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  if (expectChallenge) {
    await page.waitForURL(/\/settings\/mfa\/challenge/, { timeout: 60_000 });
  } else {
    await page.locator('[data-account-state="signed-in"]').waitFor({ state: "visible", timeout: 60_000 });
  }
}

async function waitNewestPromptCount(page, prompt, minimumCount, timeout = 60_000) {
  const rows = page.locator("li").filter({ hasText: prompt });
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await rows.count() >= minimumCount) return rows.first();
    await page.waitForTimeout(500);
  }
  throw new Error(`Activity never exposed ${minimumCount} rows for ${prompt}.`);
}

async function observeNewestPromptTerminal(page, prompt, expectedCount, label, timeoutMs = 15 * 60_000) {
  const row = await waitNewestPromptCount(page, prompt, expectedCount);
  const deadline = Date.now() + timeoutMs;
  let lastStatus = null;
  while (Date.now() < deadline) {
    const status = await row.getAttribute("data-activity-status");
    if (status && status !== lastStatus) {
      lastStatus = status;
      console.log(`${label} Activity status=${status}`);
      await screenshot(page, `${label}-activity-${status}-${(await page.viewportSize())?.width || "viewport"}`);
    }
    if (status === "succeeded" || status === "cancelled") return status;
    if (status === "failed") throw new Error(`${label} reached failed state: ${await row.innerText()}`);
    await page.waitForTimeout(2_000);
  }
  throw new Error(`${label} did not reach a terminal state within ${Math.round(timeoutMs / 60_000)} minutes.`);
}

async function delayOneMutation(page, pathSuffix, delayMs = 1_800) {
  const pattern = `**${pathSuffix}`;
  await page.route(pattern, async (route) => {
    await sleep(delayMs);
    await route.continue();
  });
  return async () => page.unroute(pattern);
}

async function submitCancellableImage(page, prompt) {
  await page.setViewportSize(desktop);
  await page.goto(`${baseUrl}/create`, { waitUntil: "networkidle", timeout: 60_000 });
  const imageMode = page.getByRole("radio", { name: "Image", exact: true });
  await imageMode.click();
  await page.getByRole("textbox", { name: "Prompt" }).fill(prompt);
  const responsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === "/api/generation/jobs" && response.request().method() === "POST";
  }, { timeout: 120_000 });
  await page.getByRole("button", { name: "Generate", exact: true }).click();
  const response = await responsePromise;
  const payload = await response.json().catch(() => null);
  assert(response.status() === 202 && payload?.ok && payload?.job?.id, `Cancel fixture submission failed: ${JSON.stringify(payload)}`);
  return payload.job.id;
}

async function exerciseCancel(page, prompt, jobId) {
  await page.goto(`${baseUrl}/activity`, { waitUntil: "networkidle", timeout: 60_000 });
  const row = page.locator("li").filter({ hasText: prompt }).first();
  await row.waitFor({ state: "visible", timeout: 60_000 });
  await row.getByRole("button", { name: "Cancel", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await assertNoOverflow(page, "Activity Cancel desktop");
  await screenshot(page, "activity-cancel-desktop-before");

  await row.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("alertdialog").waitFor({ state: "visible" });
  await screenshot(page, "activity-cancel-desktop-dialog");
  await page.getByRole("button", { name: "Keep running", exact: true }).click();

  await page.setViewportSize(mobile);
  await row.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("alertdialog").waitFor({ state: "visible" });
  await assertNoOverflow(page, "Activity Cancel mobile dialog");
  await screenshot(page, "activity-cancel-mobile-dialog");

  const path = `/api/generation/jobs/${jobId}/cancel`;
  const removeDelay = await delayOneMutation(page, path);
  const responsePromise = page.waitForResponse((response) => new URL(response.url()).pathname === path && response.request().method() === "POST", { timeout: 120_000 });
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancel generation", exact: true }).click();
  await page.getByRole("alertdialog").getByText("Cancelling…", { exact: true }).waitFor({ state: "visible", timeout: 10_000 });
  await screenshot(page, "activity-cancel-mobile-submitting");
  const response = await responsePromise;
  await removeDelay();
  const payload = await response.json().catch(() => null);
  assert((response.status() === 200 || response.status() === 202) && payload?.ok, `Cancel action failed: ${response.status()} ${JSON.stringify(payload)}`);

  const status = await observeNewestPromptTerminal(page, prompt, 1, "activity-cancel", 10 * 60_000);
  assert(status === "cancelled", `Cancel fixture terminalized as ${status} instead of cancelled.`);
  await screenshot(page, "activity-cancel-mobile-cancelled");
  await page.setViewportSize(desktop);
  await assertNoOverflow(page, "Activity Cancel desktop terminal");
  await screenshot(page, "activity-cancel-desktop-cancelled");
}

async function exerciseRetryAndRunAgain(page, ownerId) {
  const prompt = `QA-003 retry/run-again ${runToken}`;
  const failedId = await seedFailedRetryJob(ownerId, prompt);

  await page.setViewportSize(desktop);
  await page.goto(`${baseUrl}/activity`, { waitUntil: "networkidle", timeout: 60_000 });
  let row = page.locator("li").filter({ hasText: prompt }).first();
  await row.getByText("Failed", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await row.getByRole("button", { name: "Retry", exact: true }).waitFor({ state: "visible" });
  await screenshot(page, "activity-retry-desktop-before");

  await page.setViewportSize(mobile);
  await assertNoOverflow(page, "Activity Retry mobile");
  await screenshot(page, "activity-retry-mobile-before");

  const retryPath = `/api/generation/jobs/${failedId}/retry`;
  const removeRetryDelay = await delayOneMutation(page, retryPath);
  const retryResponsePromise = page.waitForResponse((response) => new URL(response.url()).pathname === retryPath && response.request().method() === "POST", { timeout: 120_000 });
  await row.getByRole("button", { name: "Retry", exact: true }).click();
  await row.getByRole("button", { name: "Retrying…", exact: true }).waitFor({ state: "visible", timeout: 10_000 });
  await screenshot(page, "activity-retry-mobile-submitting");
  const retryResponse = await retryResponsePromise;
  await removeRetryDelay();
  const retryPayload = await retryResponse.json().catch(() => null);
  assert(retryResponse.status() === 202 && retryPayload?.ok && retryPayload?.job?.id, `Retry failed: ${retryResponse.status()} ${JSON.stringify(retryPayload)}`);

  const retryStatus = await observeNewestPromptTerminal(page, prompt, 2, "activity-retry");
  assert(retryStatus === "succeeded", `Retry terminalized as ${retryStatus}.`);
  await screenshot(page, "activity-retry-mobile-completed");
  await page.setViewportSize(desktop);
  await screenshot(page, "activity-retry-desktop-completed");

  row = page.locator("li").filter({ hasText: prompt }).first();
  await row.getByRole("button", { name: "Run again", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await screenshot(page, "activity-run-again-desktop-before");
  await page.setViewportSize(mobile);
  await assertNoOverflow(page, "Activity Run Again mobile");
  await screenshot(page, "activity-run-again-mobile-before");

  const runAgainPath = `/api/generation/jobs/${retryPayload.job.id}/run-again`;
  const removeRunAgainDelay = await delayOneMutation(page, runAgainPath);
  const runAgainResponsePromise = page.waitForResponse((response) => new URL(response.url()).pathname === runAgainPath && response.request().method() === "POST", { timeout: 120_000 });
  await row.getByRole("button", { name: "Run again", exact: true }).click();
  await row.getByRole("button", { name: "Running again…", exact: true }).waitFor({ state: "visible", timeout: 10_000 });
  await screenshot(page, "activity-run-again-mobile-submitting");
  const runAgainResponse = await runAgainResponsePromise;
  await removeRunAgainDelay();
  const runAgainPayload = await runAgainResponse.json().catch(() => null);
  assert(runAgainResponse.status() === 202 && runAgainPayload?.ok && runAgainPayload?.job?.id, `Run Again failed: ${runAgainResponse.status()} ${JSON.stringify(runAgainPayload)}`);

  const runAgainStatus = await observeNewestPromptTerminal(page, prompt, 3, "activity-run-again");
  assert(runAgainStatus === "succeeded", `Run Again terminalized as ${runAgainStatus}.`);
  await screenshot(page, "activity-run-again-mobile-completed");
  await page.setViewportSize(desktop);
  await screenshot(page, "activity-run-again-desktop-completed");

  return { failedId, retryJobId: retryPayload.job.id, runAgainJobId: runAgainPayload.job.id };
}

async function enrollAdminMfa(page) {
  await page.goto(`${baseUrl}/admin`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForURL(/\/settings\/mfa(?:$|\?)/, { timeout: 60_000 });
  await page.getByRole("heading", { name: "Multi-factor authentication", exact: true }).waitFor({ state: "visible" });
  await screenshot(page, "admin-mfa-enrollment-required-desktop");

  await page.setViewportSize(mobile);
  await assertNoOverflow(page, "Admin MFA enrollment mobile");
  await screenshot(page, "admin-mfa-enrollment-required-mobile");
  await page.setViewportSize(desktop);

  await page.getByLabel("Authenticator label").fill("QA-003 Admin");
  await page.getByRole("button", { name: "Set up authenticator", exact: true }).click();
  await page.getByText("Manual setup key", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  const secret = (await page.locator("code").first().textContent())?.trim();
  assert(secret && secret.length >= 8, "MFA enrollment did not expose a usable manual setup secret.");

  await page.getByLabel("Authenticator code").fill(await stableTotp(secret));
  await page.getByRole("button", { name: "Verify authenticator", exact: true }).click();
  await page.getByText("Authenticator verified. Multi-factor authentication is active.", { exact: true }).waitFor({ state: "visible", timeout: 60_000 });
  assert(await page.locator("code").count() === 0, "MFA setup secret remained visible after verification.");
  await screenshot(page, "admin-mfa-enrolled-desktop");
  await page.setViewportSize(mobile);
  await assertNoOverflow(page, "Admin MFA enrolled mobile");
  await screenshot(page, "admin-mfa-enrolled-mobile");
  return secret;
}

async function challengeAdminToAal2(page, account, secret) {
  await page.setViewportSize(desktop);
  await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByRole("button", { name: "Sign out this device", exact: true }).click();
  await page.locator('[data-account-state="signed-out"]').waitFor({ state: "visible", timeout: 60_000 });

  await signInThroughSettings(page, account, true);
  await page.goto(`${baseUrl}/admin`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForURL(/\/settings\/mfa\/challenge\?next=(?:%2F|\/)admin/i, { timeout: 60_000 });
  await page.getByRole("heading", { name: "Verify your authenticator", exact: true }).waitFor({ state: "visible" });
  await page.getByLabel("Code").waitFor({ state: "visible", timeout: 30_000 });
  await screenshot(page, "admin-mfa-challenge-desktop");

  await page.setViewportSize(mobile);
  await assertNoOverflow(page, "Admin MFA challenge mobile");
  await screenshot(page, "admin-mfa-challenge-mobile");
  await page.setViewportSize(desktop);

  await page.getByLabel("Code").fill(await stableTotp(secret));
  await page.getByRole("button", { name: "Verify", exact: true }).click();
  await page.waitForURL(/\/admin$/, { timeout: 60_000 });
}

function adminScreenshotMasks(page) {
  return [
    page.locator('[data-admin-list="invitations"]'),
    page.locator('[data-admin-list="accounts"]'),
    page.locator('[data-admin-list="generation-overrides"]'),
  ];
}

async function auditAdminReadOnly(page, adminId) {
  await page.getByRole("main").getByRole("heading", { name: "Admin", exact: true }).waitFor({ state: "visible", timeout: 60_000 });
  for (const heading of ["Access", "Generation", "Health", "Global defaults"]) {
    await page.getByRole("heading", { name: heading, exact: true }).waitFor({ state: "visible" });
  }
  await page.getByText("Completion p50", { exact: true }).waitFor({ state: "visible" });
  await page.getByText("Maintenance backlog", { exact: true }).waitFor({ state: "visible" });
  assert(await page.locator('[data-admin-row]').count() === 3, "Admin did not render exactly three registered rows.");
  assert(await page.locator(`[data-admin-account="${adminId}"]`).count() === 1, "Run-owned Admin account row is missing.");
  assert(await page.locator(`#role-${adminId}`).isDisabled(), "Acting Admin role selector was not locked.");
  assert(await page.locator(`#status-${adminId}`).isDisabled(), "Acting Admin status selector was not locked.");

  assert(await page.locator('[data-admin-list="accounts"]').count() === 1, "Admin account identity list is missing its privacy-mask boundary.");
  assert(await page.locator('[data-admin-list="generation-overrides"]').count() === 1, "Admin override identity list is missing its privacy-mask boundary.");

  await page.setViewportSize(desktop);
  await assertNoOverflow(page, "Admin desktop");
  await screenshot(page, "admin-readonly-desktop", { mask: adminScreenshotMasks(page), maskColor: "#090d13" });

  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => ({
    tag: document.activeElement?.tagName || "",
    body: document.activeElement === document.body,
  }));
  assert(!focus.body && focus.tag, "Admin keyboard navigation did not move visible focus.");
  await screenshot(page, "admin-readonly-desktop-focus", { mask: adminScreenshotMasks(page), maskColor: "#090d13" });

  await page.setViewportSize(mobile);
  await assertNoOverflow(page, "Admin mobile");
  await screenshot(page, "admin-readonly-mobile", { mask: adminScreenshotMasks(page), maskColor: "#090d13" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await assertNoOverflow(page, "Admin mobile reduced motion");
  await screenshot(page, "admin-readonly-mobile-reduced", { mask: adminScreenshotMasks(page), maskColor: "#090d13" });
  await page.emulateMedia({ reducedMotion: "no-preference" });
}

async function collectOwnerStorageKeys(ownerId) {
  const encoded = encodeURIComponent(ownerId);
  const [assets, sources, uploads] = await Promise.all([
    serviceRows(`media_assets?owner_id=eq.${encoded}&select=storage_key,thumbnail_storage_key`),
    serviceRows(`generation_sources?owner_id=eq.${encoded}&select=storage_key`),
    serviceRows(`media_upload_sessions?owner_id=eq.${encoded}&select=storage_key`),
  ]);
  return [...new Set([
    ...assets.flatMap((row) => [row.storage_key, row.thumbnail_storage_key]),
    ...sources.map((row) => row.storage_key),
    ...uploads.map((row) => row.storage_key),
  ].filter(Boolean))];
}

async function authUserExists(userId) {
  const response = await authAdmin(`users/${encodeURIComponent(userId)}`);
  if (response.status === 404) return false;
  if (!response.ok) throw new Error(`Could not verify Auth cleanup for ${userId}: ${response.status}`);
  return true;
}

async function verifyNoOwnerRows(ownerId) {
  const encoded = encodeURIComponent(ownerId);
  const tables = [
    ["renderlab_account_access", "user_id"],
    ["generation_jobs", "owner_id"],
    ["generation_sources", "owner_id"],
    ["media_assets", "owner_id"],
    ["media_upload_sessions", "owner_id"],
    ["generation_admission_reservations", "owner_id"],
    ["renderlab_account_profiles", "owner_id"],
    ["renderlab_account_preferences", "owner_id"],
  ];
  for (const [table, column] of tables) {
    const result = await serviceRows(`${table}?${column}=eq.${encoded}&select=*&limit=1`);
    assert(result.length === 0, `QA-003 cleanup left ${table} residue for ${ownerId}.`);
  }
  assert(!(await authUserExists(ownerId)), `QA-003 cleanup left Auth user ${ownerId}.`);
}

async function verifyR2KeysGone(keys) {
  if (!keys.length) return;
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  for (const key of keys) {
    try {
      await client.send(new HeadObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }));
      throw new Error(`QA-003 cleanup left R2 object ${key}.`);
    } catch (error) {
      const status = error?.$metadata?.httpStatusCode;
      if (status !== 404 && error?.name !== "NotFound" && error?.name !== "NoSuchKey") throw error;
    }
  }
}

async function cleanupFixtures() {
  await deleteConfiguredTestAccount(activityIdentity);
  await deleteConfiguredTestAccount(adminIdentity);
}

await mkdir(artifactDir, { recursive: true });
if (cleanupOnly) {
  await cleanupFixtures();
  await verifyNoOwnerRows(activityIdentity.id);
  await verifyNoOwnerRows(adminIdentity.id);
  console.log("QA-003 production fixture cleanup completed and exact DB/Auth absence was verified.");
  process.exit(0);
}

let browser;
let activityAccount;
let adminAccount;
let storageKeys = [];
let primaryError = null;
const manifest = {
  audit: "QA-003",
  runId: runToken,
  baseUrl,
  expectedProductionSource: expectedSource,
  activity: {},
  admin: { evidencePrivacy: "identity lists fully masked in screenshots" },
  cleanup: { verified: false },
};

try {
  await cleanupFixtures();
  activityAccount = await createConfiguredTestAccount(activityNamespace);
  adminAccount = await createConfiguredTestAccount(adminNamespace);
  await setAccountAccess(adminAccount.id, { role: "admin", status: "active" });

  browser = await chromium.launch({ headless: true });

  const activityContext = await browser.newContext({ viewport: desktop, colorScheme: "dark", reducedMotion: "no-preference" });
  const activityPage = await activityContext.newPage();
  await signInThroughSettings(activityPage, activityAccount);

  const cancelPrompt = `QA-003 cancel ${runToken}`;
  const cancelJobId = await submitCancellableImage(activityPage, cancelPrompt);
  await exerciseCancel(activityPage, cancelPrompt, cancelJobId);
  const actionJobs = await exerciseRetryAndRunAgain(activityPage, activityAccount.id);
  manifest.activity = { cancelJobId, ...actionJobs, result: "passed" };
  await activityContext.close();

  const adminContext = await browser.newContext({ viewport: desktop, colorScheme: "dark", reducedMotion: "no-preference" });
  const adminPage = await adminContext.newPage();
  await signInThroughSettings(adminPage, adminAccount);
  const secret = await enrollAdminMfa(adminPage);
  await challengeAdminToAal2(adminPage, adminAccount, secret);
  await auditAdminReadOnly(adminPage, adminAccount.id);
  manifest.admin = { accountId: adminAccount.id, result: "passed", mfa: "enrollment+fresh-challenge" };
  await adminContext.close();

  storageKeys = await collectOwnerStorageKeys(activityAccount.id);
  console.log("QA-003 production Activity actions and AAL2 Admin audit passed.");
} catch (error) {
  primaryError = error;
} finally {
  if (browser) await browser.close().catch(() => {});
  try {
    if (activityAccount) storageKeys = [...new Set([...storageKeys, ...(await collectOwnerStorageKeys(activityAccount.id).catch(() => []))])];
    await cleanupFixtures();
    await verifyNoOwnerRows(activityIdentity.id);
    await verifyNoOwnerRows(adminIdentity.id);
    await verifyR2KeysGone(storageKeys);
    manifest.cleanup = { verified: true, r2ObjectsChecked: storageKeys.length };
  } catch (cleanupError) {
    manifest.cleanup = { verified: false, error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError) };
    if (!primaryError) primaryError = cleanupError;
    else console.error(cleanupError);
  }
  await writeFile(`${artifactDir}/manifest.json`, JSON.stringify(manifest, null, 2), "utf8");
}

if (primaryError) throw primaryError;
