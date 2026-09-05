import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import {
  configuredTestAccountIdentity,
  createConfiguredTestAccount,
  deleteConfiguredTestAccount,
  routeLocalAppRequestsWithAccount,
  withAccountAuthorization,
} from "./lib/configured-test-account.mjs";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const mockWorkerUrl = (process.env.RENDERLAB_TEST_NATIVE_WORKER_GATEWAY_URL || "http://127.0.0.1:4312").replace(/\/$/, "");
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const reconcilerSecret = process.env.RENDERLAB_GENERATION_RECONCILER_SECRET;
const artifactDir = process.env.RENDERLAB_ACTIVITY_CANCEL_ARTIFACT_DIR || "artifacts";
const ownerIdentity = configuredTestAccountIdentity("activity-cancel-owner");

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: supabaseKey,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  RENDERLAB_GENERATION_RECONCILER_SECRET: reconcilerSecret,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
})) {
  if (!value) throw new Error(`${name} is required for Activity Cancel visual verification.`);
}
if (process.env.RENDERLAB_TEST_RECONCILER_OWNER_SCOPE !== "true"
  || process.env.RENDERLAB_TEST_RECONCILER_OWNER_ID !== ownerIdentity.id) {
  throw new Error("Activity Cancel verification requires exact reconciler owner scoping.");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function supabase(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", supabaseKey);
  headers.set("authorization", `Bearer ${supabaseKey}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers });
}

async function rows(path) {
  const response = await supabase(path);
  if (!response.ok) throw new Error(`Activity Cancel query failed (${response.status}): ${await response.text()}`);
  return response.json();
}

async function cleanup() {
  await deleteConfiguredTestAccount(ownerIdentity).catch(() => {});
}

async function submit(account, label) {
  const response = await fetch(
    `${baseUrl}/api/generation/jobs`,
    withAccountAuthorization(account, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        prompt: label,
        output: { kind: "image", aspectRatio: "1:1" },
        inputs: [],
        advanced: { seed: 42, steps: 4, guidance: 1 },
      }),
    }),
  );
  const payload = await response.json().catch(() => null);
  assert(response.status === 202 && payload?.ok && payload.job?.id, `Activity Cancel submission failed: ${JSON.stringify(payload)}`);
  const job = (await rows(`generation_jobs?owner_id=eq.${account.id}&id=eq.${payload.job.id}&select=*&limit=1`))[0];
  assert(job?.worker_id && job?.provider_job_id, "Activity Cancel job did not persist native dispatch identity.");
  return job;
}

async function setCancelMode(job, mode) {
  const response = await fetch(`${mockWorkerUrl}/jobs/${encodeURIComponent(job.provider_job_id)}/cancel-mode/${mode}`, { method: "POST" });
  assert(response.ok, `Could not set Activity Cancel mock mode ${mode}.`);
}

async function reconcile() {
  const response = await fetch(`${baseUrl}/api/internal/generation/reconcile`, {
    method: "POST",
    headers: { authorization: `Bearer ${reconcilerSecret}` },
  });
  const payload = await response.json().catch(() => null);
  assert(response.status === 200 && payload?.ok, `Activity Cancel reconcile failed: ${JSON.stringify(payload)}`);
}

async function exerciseCancel(page, account, label, screenshotSuffix) {
  const job = await submit(account, label);
  await setCancelMode(job, "retryable");

  await page.goto(`${baseUrl}/activity`, { waitUntil: "networkidle", timeout: 60_000 });
  const row = page.locator("li").filter({ hasText: label }).first();
  await row.getByRole("button", { name: "Cancel", exact: true }).waitFor({ state: "visible", timeout: 30_000 });

  await row.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("heading", { name: "Cancel this generation?" }).waitFor({ state: "visible" });
  await page.getByText("This attempt can’t be resumed. If cancellation is accepted, any late provider result from this attempt will not be published to RenderLab.", { exact: true }).waitFor({ state: "visible" });
  await page.screenshot({ path: `${artifactDir}/activity-cancel-dialog-${screenshotSuffix}.png`, fullPage: true });

  await page.keyboard.press("Escape");
  assert(await page.getByRole("alertdialog").count() === 0, "Cancel confirmation did not dismiss with Escape.");
  await row.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancel generation", exact: true }).click();

  await page.locator("li").filter({ hasText: label }).getByText("Cancelling", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  const cancellingRow = page.locator("li").filter({ hasText: label }).first();
  assert(await cancellingRow.getByRole("button", { name: "Cancel", exact: true }).count() === 0, "Cancelling job still exposed Cancel.");
  await page.screenshot({ path: `${artifactDir}/activity-cancelling-${screenshotSuffix}.png`, fullPage: true });

  await setCancelMode(job, "confirm");
  await reconcile();
  await page.reload({ waitUntil: "networkidle" });
  const cancelledRow = page.locator("li").filter({ hasText: label }).first();
  await cancelledRow.getByText("Cancelled", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  assert(await cancelledRow.getByRole("button", { name: "Cancel", exact: true }).count() === 0, "Cancelled job exposed Cancel.");
  assert(await cancelledRow.getByRole("button", { name: "Retry", exact: true }).count() === 0, "Cancelled job exposed Retry.");
  await page.screenshot({ path: `${artifactDir}/activity-cancelled-${screenshotSuffix}.png`, fullPage: true });
}

await mkdir(artifactDir, { recursive: true });
let browser;
try {
  await cleanup();
  const account = await createConfiguredTestAccount("activity-cancel-owner");
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: "dark" });
  const page = await context.newPage();
  await routeLocalAppRequestsWithAccount(page, baseUrl, account);

  await exerciseCancel(page, account, "Activity desktop cancellation study", "desktop");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await exerciseCancel(page, account, "Activity narrow cancellation study", "narrow-reduced-motion");

  await context.close();
  console.log("Activity Cancel visual verification passed on desktop and narrow reduced-motion layouts.");
} finally {
  if (browser) await browser.close().catch(() => {});
  await cleanup();
}
