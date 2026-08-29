import { chromium } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import {
  configuredTestAccountIdentity,
  createConfiguredTestAccount,
  deleteConfiguredTestAccount,
  routeLocalAppRequestsWithAccount,
} from "./lib/configured-test-account.mjs";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const artifactDir = process.env.RENDERLAB_ACTIVITY_ARTIFACT_DIR || "artifacts";
const cleanupOnly = process.argv.includes("--cleanup-only");
const ownerIdentity = configuredTestAccountIdentity("activity-owner");
const foreignIdentity = configuredTestAccountIdentity("activity-foreign");

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: supabaseKey,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
})) {
  if (!value) throw new Error(`${name} is required for configured Activity verification.`);
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

async function cleanupFixture() {
  await deleteConfiguredTestAccount(ownerIdentity);
  await deleteConfiguredTestAccount(foreignIdentity);
}

async function createJob(account, {
  id = randomUUID(),
  status = "succeeded",
  operation = "create-image",
  outputKind = operation === "create-video" || operation === "animate-image" ? "video" : "image",
  prompt,
  outputAssetIds = [],
  errorCode = null,
  errorMessage = null,
  createdAt,
  workerId = null,
  providerJobId = null,
}) {
  const response = await supabase("generation_jobs", {
    method: "POST",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({
      id,
      owner_id: account.id,
      status,
      operation,
      output_kind: outputKind,
      prompt,
      workflow_id: "activity-verification-workflow",
      model: "activity-verification-model",
      ecosystem: "activity-verification-ecosystem",
      inputs: [],
      parameters: { output: { kind: outputKind, aspectRatio: "1:1" }, advanced: {} },
      worker_id: workerId,
      provider_job_id: providerJobId,
      worker_state: workerId ? "internal-worker-state" : null,
      failover_history: workerId ? [{ internal: "should-never-render" }] : [],
      output_asset_ids: outputAssetIds,
      error_code: errorCode,
      error_message: errorMessage,
      created_at: createdAt,
      updated_at: createdAt,
      started_at: status === "queued" ? null : createdAt,
      completed_at: ["succeeded", "failed", "cancelled"].includes(status) ? createdAt : null,
    }),
  });
  if (!response.ok) throw new Error(`Could not create Activity job fixture (${response.status}): ${await response.text()}`);
  return (await response.json())[0];
}

async function createMediaAsset(account, id, displayName) {
  const response = await supabase("media_assets", {
    method: "POST",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({
      id,
      owner_id: account.id,
      generation_job_id: null,
      origin: "generated",
      kind: "image",
      mime_type: "image/png",
      storage_key: `renderlab/activity-fixtures/${id}.png`,
      thumbnail_storage_key: null,
      original_filename: null,
      display_name: displayName,
      size_bytes: 1,
      width: 1,
      height: 1,
      duration_ms: null,
      provenance: { prompt: displayName, operation: "create-image" },
      metadata: { verification: "activity-v0-1" },
    }),
  });
  if (!response.ok) throw new Error(`Could not create Activity media fixture (${response.status}): ${await response.text()}`);
}

if (cleanupOnly) {
  await cleanupFixture();
  process.exit(0);
}

await mkdir(artifactDir, { recursive: true });
let browser = null;
let primaryError = null;

try {
  await cleanupFixture();
  const owner = await createConfiguredTestAccount("activity-owner");
  const foreign = await createConfiguredTestAccount("activity-foreign");
  const resultAssetId = randomUUID();
  const missingHistoricalAssetId = randomUUID();
  const now = Date.now();

  await createMediaAsset(owner, resultAssetId, "Activity visible result");

  const jobs = [];
  jobs.push(await createJob(owner, {
    status: "running",
    prompt: "Nebula active study",
    createdAt: new Date(now).toISOString(),
  }));
  jobs.push(await createJob(owner, {
    status: "succeeded",
    prompt: "Golden result study",
    outputAssetIds: [resultAssetId],
    createdAt: new Date(now - 60_000).toISOString(),
  }));
  jobs.push(await createJob(owner, {
    status: "failed",
    operation: "create-video",
    prompt: "Failure prompt study",
    errorCode: "generation_submission_failed",
    errorMessage: "Provider 500 from internal-worker-secret at private gateway",
    workerId: "internal-worker-secret",
    providerJobId: "provider-job-secret",
    createdAt: new Date(now - 120_000).toISOString(),
  }));
  jobs.push(await createJob(owner, {
    status: "succeeded",
    prompt: "Historical deleted output",
    outputAssetIds: [missingHistoricalAssetId],
    createdAt: new Date(now - 180_000).toISOString(),
  }));

  for (let index = 4; index < 21; index += 1) {
    jobs.push(await createJob(owner, {
      status: index % 3 === 0 ? "cancelled" : "succeeded",
      operation: index % 2 === 0 ? "edit-image" : "animate-image",
      prompt: `Activity filler ${String(index).padStart(2, "0")}`,
      createdAt: new Date(now - index * 60_000).toISOString(),
    }));
  }

  await createJob(foreign, {
    status: "failed",
    prompt: "Foreign account secret prompt",
    errorCode: "generation_failed",
    errorMessage: "Foreign backend detail",
    createdAt: new Date(now + 60_000).toISOString(),
  });

  browser = await chromium.launch({ headless: true });

  const signedOutContext = await browser.newContext({ viewport: { width: 1440, height: 1024 }, colorScheme: "dark" });
  const signedOutPage = await signedOutContext.newPage();
  await signedOutPage.goto(`${baseUrl}/activity`, { waitUntil: "networkidle", timeout: 60_000 });
  await signedOutPage.getByRole("heading", { name: "Sign in to view Activity" }).waitFor({ state: "visible", timeout: 30_000 });
  assert((await signedOutPage.getByText("Nebula active study").count()) === 0, "Signed-out Activity exposed private job data.");
  await signedOutContext.close();

  const context = await browser.newContext({ viewport: { width: 1440, height: 1024 }, colorScheme: "dark" });
  const page = await context.newPage();
  await routeLocalAppRequestsWithAccount(page, baseUrl, owner);
  await page.goto(`${baseUrl}/activity`, { waitUntil: "networkidle", timeout: 60_000 });

  await page.getByRole("heading", { name: "Activity", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByText("Nebula active study", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByText("Golden result study", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByText("Failure prompt study", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  assert((await page.getByText("Foreign account secret prompt", { exact: true }).count()) === 0, "Activity exposed another account's job.");
  assert((await page.getByText("provider-job-secret", { exact: false }).count()) === 0, "Activity exposed provider job identity.");
  assert((await page.getByText("internal-worker-secret", { exact: false }).count()) === 0, "Activity exposed worker identity or raw backend error.");
  await page.getByText("Generation could not be started. Review your inputs and try again from Create.", { exact: true }).waitFor({ state: "visible" });
  await page.getByRole("link", { name: "View result", exact: true }).waitFor({ state: "visible" });
  assert(await page.getByRole("link", { name: "View result", exact: true }).count() === 1, "Activity rendered a result link for unavailable historical media.");
  assert(await page.getByRole("link", { name: "View result", exact: true }).getAttribute("href") === `/library/${resultAssetId}`, "Activity result link did not target active owner media.");
  await page.getByText("Updates automatically while generation work is active.", { exact: true }).waitFor({ state: "visible" });
  await page.getByRole("link", { name: "Older", exact: true }).waitFor({ state: "visible" });
  assert((await page.getByText("Activity filler 20", { exact: true }).count()) === 0, "First Activity page rendered beyond its 20-job bound.");
  await page.screenshot({ path: `${artifactDir}/activity-desktop.png`, fullPage: true });

  await page.goto(`${baseUrl}/activity?offset=20`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByText("Activity filler 20", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByRole("link", { name: "Newer", exact: true }).waitFor({ state: "visible" });
  assert((await page.getByText("Nebula active study", { exact: true }).count()) === 0, "Older Activity page retained newer-page jobs.");

  await page.goto(`${baseUrl}/activity`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByText("Nebula active study", { exact: true }).waitFor({ state: "visible" });
  await page.screenshot({ path: `${artifactDir}/activity-mobile.png`, fullPage: true });

  console.log(`Configured Activity rendered successfully. owner=${owner.id} foreign=${foreign.id} jobs=${jobs.length}`);
} catch (error) {
  primaryError = error;
} finally {
  if (browser) await browser.close().catch(() => {});
  try {
    await cleanupFixture();
  } catch (cleanupError) {
    console.error(cleanupError);
    if (!primaryError) primaryError = cleanupError;
  }
}

if (primaryError) throw primaryError;
