import { chromium } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:http";
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
const generationBackendUrl = process.env.RENDERLAB_GENERATION_BACKEND_URL;
const generationBackendToken = process.env.RENDERLAB_GENERATION_BACKEND_TOKEN;
const mockBackendAddress = generationBackendUrl ? new URL(generationBackendUrl) : null;
const capturedBackendRequests = [];
let mockBackend = null;

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: supabaseKey,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  RENDERLAB_GENERATION_BACKEND_URL: generationBackendUrl,
  RENDERLAB_GENERATION_BACKEND_TOKEN: generationBackendToken,
})) {
  if (!value) throw new Error(`${name} is required for configured Activity verification.`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  if (!response.ok) throw new Error(`Could not read configured Activity rows (${response.status}): ${await response.text()}`);
  return response.json();
}

async function assertOwnerRowsClean(ownerId) {
  for (const table of ["generation_jobs", "generation_sources", "media_assets"]) {
    const remaining = await rows(`${table}?owner_id=eq.${encodeURIComponent(ownerId)}&select=id&limit=1`);
    assert(remaining.length === 0, `Configured Activity cleanup left ${table} rows for ${ownerId}.`);
  }
}

async function cleanupFixture() {
  await deleteConfiguredTestAccount(ownerIdentity);
  await deleteConfiguredTestAccount(foreignIdentity);
  await assertOwnerRowsClean(ownerIdentity.id);
  await assertOwnerRowsClean(foreignIdentity.id);
}

function defaultParameters(outputKind) {
  return outputKind === "video"
    ? {
        output: {
          kind: "video",
          aspectRatio: "1:1",
          durationSeconds: 5,
          audioEnabled: true,
          resolution: "480p",
        },
        advanced: { seed: 42, frameRate: 24 },
      }
    : {
        output: { kind: "image", aspectRatio: "1:1" },
        advanced: { seed: 42, steps: 4, guidance: 1 },
      };
}

async function createJob(account, {
  id = randomUUID(),
  status = "succeeded",
  operation = "create-image",
  outputKind = operation === "create-video" || operation === "animate-image" ? "video" : "image",
  prompt,
  inputs = [],
  parameters = defaultParameters(outputKind),
  outputAssetIds = [],
  errorCode = null,
  errorMessage = null,
  createdAt,
  workflowId = "activity-verification-workflow",
  model = "activity-verification-model",
  ecosystem = "activity-verification-ecosystem",
  workerId = null,
  providerJobId = null,
  workerState = null,
  failoverHistory = [],
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
      workflow_id: workflowId,
      model,
      ecosystem,
      inputs,
      parameters,
      worker_id: workerId,
      provider_job_id: providerJobId,
      worker_state: workerState,
      failover_history: failoverHistory,
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

async function createMediaAsset(account, id, displayName, { deletedAt = null } = {}) {
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
      metadata: { verification: "activity-retry-v0-1" },
      deleted_at: deletedAt,
    }),
  });
  if (!response.ok) throw new Error(`Could not create Activity media fixture (${response.status}): ${await response.text()}`);
}

async function createGenerationSource(account, id, status) {
  const response = await supabase("generation_sources", {
    method: "POST",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({
      id,
      owner_id: account.id,
      storage_key: `renderlab/activity-fixtures/source-${id}.png`,
      filename: `source-${id}.png`,
      mime_type: "image/png",
      size_bytes: 1,
      width: 1,
      height: 1,
      purpose: "reference",
      status,
      metadata: { verification: "activity-retry-v0-1" },
    }),
  });
  if (!response.ok) throw new Error(`Could not create Activity source fixture (${response.status}): ${await response.text()}`);
}

async function jobSnapshot(ownerId, jobId) {
  const result = await rows(
    `generation_jobs?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(jobId)}&select=*&limit=1`,
  );
  return result[0] ?? null;
}

async function markCapturedMockJobsTerminal(ownerId) {
  const jobIds = [...new Set(
    capturedBackendRequests
      .filter((entry) => entry.ownerId === ownerId && entry.acceptedJobId)
      .map((entry) => entry.acceptedJobId),
  )];
  const now = new Date().toISOString();
  for (const jobId of jobIds) {
    const response = await supabase(
      `generation_jobs?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(jobId)}`,
      {
        method: "PATCH",
        headers: { prefer: "return=minimal" },
        body: JSON.stringify({ status: "succeeded", updated_at: now, completed_at: now }),
      },
    );
    if (!response.ok) {
      throw new Error(`Could not terminalize Activity mock retry ${jobId} (${response.status}): ${await response.text()}`);
    }
  }
}

function operationForRequest(request) {
  const hasInput = Array.isArray(request.inputs) && request.inputs.length > 0;
  if (request.output?.kind === "video") return hasInput ? "animate-image" : "create-video";
  return hasInput ? "edit-image" : "create-image";
}

async function readRequestJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  if (!chunks.length) return null;
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(payload));
}

function publicJob(row) {
  return {
    id: row.id,
    status: row.status,
    operation: row.operation,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    outputAssetIds: row.output_asset_ids ?? [],
    ...(row.error_message
      ? { error: { code: row.error_code || "generation_failed", message: row.error_message } }
      : {}),
  };
}

async function persistMockSubmission(ownerId, request) {
  const id = randomUUID();
  const now = new Date().toISOString();
  const operation = operationForRequest(request);
  const response = await supabase("generation_jobs", {
    method: "POST",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({
      id,
      owner_id: ownerId,
      status: "queued",
      operation,
      output_kind: request.output.kind,
      prompt: request.prompt,
      workflow_id: "activity-retry-mock-current-workflow",
      model: "activity-retry-mock-current-model",
      ecosystem: "activity-retry-mock-current-ecosystem",
      inputs: request.inputs,
      parameters: { output: request.output, advanced: request.advanced ?? {} },
      worker_id: null,
      provider_job_id: null,
      worker_state: null,
      failover_history: [],
      output_asset_ids: [],
      error_code: null,
      error_message: null,
      created_at: now,
      updated_at: now,
      started_at: null,
      completed_at: null,
    }),
  });
  if (!response.ok) throw new Error(`Mock backend could not persist retry job (${response.status}): ${await response.text()}`);
  return (await response.json())[0];
}

async function startMockBackend() {
  if (mockBackend) return;
  const host = mockBackendAddress.hostname;
  const port = Number(mockBackendAddress.port || 80);

  mockBackend = createServer(async (request, response) => {
    try {
      if (request.headers.authorization !== `Bearer ${generationBackendToken}`) {
        sendJson(response, 401, { message: "Mock backend authorization failed." });
        return;
      }
      const ownerId = request.headers["x-renderlab-owner-id"];
      if (typeof ownerId !== "string" || !ownerId) {
        sendJson(response, 400, { message: "Mock backend owner identity missing." });
        return;
      }

      const requestUrl = new URL(request.url || "/", generationBackendUrl);
      if (request.method === "POST" && requestUrl.pathname === "/jobs") {
        const body = await readRequestJson(request);
        capturedBackendRequests.push({ ownerId, request: body, acceptedJobId: null });
        if (body?.prompt === "Backend rejection study") {
          sendJson(response, 500, { message: "provider-secret-should-never-reach-activity" });
          return;
        }
        await wait(450);
        const row = await persistMockSubmission(ownerId, body);
        capturedBackendRequests[capturedBackendRequests.length - 1].acceptedJobId = row.id;
        sendJson(response, 202, { job: publicJob(row) });
        return;
      }

      const match = request.method === "GET" ? requestUrl.pathname.match(/^\/jobs\/([^/]+)$/) : null;
      if (match) {
        const jobId = decodeURIComponent(match[1]);
        const found = await rows(
          `generation_jobs?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(jobId)}&select=*&limit=1`,
        );
        if (!found[0]) {
          sendJson(response, 404, { message: "Not found" });
          return;
        }
        sendJson(response, 200, { job: publicJob(found[0]) });
        return;
      }

      sendJson(response, 404, { message: "Not found" });
    } catch (error) {
      console.error(error);
      sendJson(response, 500, { message: "Mock backend failed." });
    }
  });

  await new Promise((resolve, reject) => {
    mockBackend.once("error", reject);
    mockBackend.listen(port, host, resolve);
  });
}

async function stopMockBackend() {
  if (!mockBackend) return;
  const server = mockBackend;
  mockBackend = null;
  await new Promise((resolve) => server.close(resolve));
}

async function postRetry(page, jobId) {
  return page.evaluate(async (id) => {
    const response = await fetch(`/api/generation/jobs/${encodeURIComponent(id)}/retry`, {
      method: "POST",
      headers: { accept: "application/json" },
    });
    return { status: response.status, body: await response.json().catch(() => null) };
  }, jobId);
}

function assertRetryError(result, status, code, message) {
  assert(result.status === status, `${message}: expected HTTP ${status}, received ${result.status}.`);
  assert(result.body?.ok === false && result.body?.error?.code === code, `${message}: unexpected error payload.`);
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
  await startMockBackend();

  const owner = await createConfiguredTestAccount("activity-owner");
  const foreign = await createConfiguredTestAccount("activity-foreign");
  const resultAssetId = randomUUID();
  const missingHistoricalAssetId = randomUUID();
  const retryInputAssetId = randomUUID();
  const tombstonedAssetId = randomUUID();
  const foreignInputAssetId = randomUUID();
  const readySourceId = randomUUID();
  const pendingSourceId = randomUUID();
  const missingSourceId = randomUUID();
  const now = Date.now();
  const at = (minutes) => new Date(now - minutes * 60_000).toISOString();

  await createMediaAsset(owner, resultAssetId, "Activity visible result");
  await createMediaAsset(owner, retryInputAssetId, "Retry active input");
  await createMediaAsset(owner, tombstonedAssetId, "Retry deleted input", { deletedAt: at(30) });
  await createMediaAsset(foreign, foreignInputAssetId, "Foreign retry input");
  await createGenerationSource(owner, readySourceId, "ready");
  await createGenerationSource(owner, pendingSourceId, "pending");

  const jobs = [];
  const runningJob = await createJob(owner, {
    status: "running",
    prompt: "Nebula active study",
    createdAt: at(0),
  });
  jobs.push(runningJob);
  const succeededJob = await createJob(owner, {
    status: "succeeded",
    prompt: "Golden result study",
    outputAssetIds: [resultAssetId],
    createdAt: at(1),
  });
  jobs.push(succeededJob);

  const upscaleActivityJob = await createJob(owner, {
    status: "succeeded",
    operation: "upscale-image",
    outputKind: "image",
    prompt: null,
    inputs: [{
      alias: "image1",
      role: "primary-image",
      source: { type: "media-asset", id: retryInputAssetId },
    }],
    parameters: { upscale: { scale: 2 } },
    createdAt: at(1.5),
  });
  jobs.push(upscaleActivityJob);

  const retryImageJob = await createJob(owner, {
    status: "failed",
    operation: "edit-image",
    outputKind: "image",
    prompt: "Retry image study",
    inputs: [{ alias: "image1", role: "primary-image", source: { type: "media-asset", id: retryInputAssetId } }],
    parameters: {
      output: { kind: "image", aspectRatio: "original" },
      advanced: { seed: 314159, steps: 8, guidance: 2.5 },
    },
    errorCode: "generation_submission_failed",
    errorMessage: "Provider 500 from internal-worker-secret at private gateway",
    workflowId: "historical-secret-workflow",
    model: "historical-secret-model",
    ecosystem: "historical-secret-ecosystem",
    workerId: "internal-worker-secret",
    providerJobId: "provider-job-secret",
    workerState: "historical-secret-worker-state",
    failoverHistory: [{ worker: "historical-secret-standby" }],
    createdAt: at(2),
  });
  jobs.push(retryImageJob);

  const legacyVideoJob = await createJob(owner, {
    status: "failed",
    operation: "create-video",
    outputKind: "video",
    prompt: "Legacy video retry study",
    parameters: {
      output: { kind: "video", aspectRatio: "16:9", durationSeconds: 5, audioEnabled: false },
      advanced: { seed: 271828, frameRate: 25, steps: 77, guidance: 12 },
    },
    errorCode: "generation_failed",
    errorMessage: "legacy provider detail",
    createdAt: at(3),
  });
  jobs.push(legacyVideoJob);

  const readySourceJob = await createJob(owner, {
    status: "failed",
    operation: "edit-image",
    outputKind: "image",
    prompt: "Ready temporary source retry study",
    inputs: [{ role: "primary-image", source: { type: "temporary-source", id: readySourceId } }],
    parameters: {
      output: { kind: "image", aspectRatio: "original" },
      advanced: { seed: 99, steps: 4, guidance: 1 },
    },
    errorCode: "generation_failed",
    errorMessage: "temporary source failure detail",
    createdAt: at(4),
  });
  jobs.push(readySourceJob);

  const invalidJob = await createJob(owner, {
    status: "failed",
    prompt: "Invalid retry study",
    parameters: { output: { kind: "image", aspectRatio: "99:1" }, advanced: {} },
    errorCode: "generation_failed",
    errorMessage: "invalid historical intent",
    createdAt: at(5),
  });
  jobs.push(invalidJob);

  const tombstonedJob = await createJob(owner, {
    status: "failed",
    operation: "edit-image",
    prompt: "Deleted input retry study",
    inputs: [{ alias: "image1", role: "primary-image", source: { type: "media-asset", id: tombstonedAssetId } }],
    parameters: { output: { kind: "image", aspectRatio: "original" }, advanced: {} },
    errorCode: "generation_failed",
    errorMessage: "deleted input historical failure",
    createdAt: at(6),
  });
  jobs.push(tombstonedJob);

  const missingSourceJob = await createJob(owner, {
    status: "failed",
    operation: "edit-image",
    prompt: "Missing temporary source retry study",
    inputs: [{ alias: "image1", role: "primary-image", source: { type: "temporary-source", id: missingSourceId } }],
    parameters: { output: { kind: "image", aspectRatio: "original" }, advanced: {} },
    errorCode: "generation_failed",
    errorMessage: "missing source historical failure",
    createdAt: at(7),
  });
  jobs.push(missingSourceJob);

  const pendingSourceJob = await createJob(owner, {
    status: "failed",
    operation: "edit-image",
    prompt: "Pending temporary source retry study",
    inputs: [{ alias: "image1", role: "primary-image", source: { type: "temporary-source", id: pendingSourceId } }],
    parameters: { output: { kind: "image", aspectRatio: "original" }, advanced: {} },
    errorCode: "generation_failed",
    errorMessage: "pending source historical failure",
    createdAt: at(8),
  });
  jobs.push(pendingSourceJob);

  const foreignInputJob = await createJob(owner, {
    status: "failed",
    operation: "edit-image",
    prompt: "Foreign input retry study",
    inputs: [{ alias: "image1", role: "primary-image", source: { type: "media-asset", id: foreignInputAssetId } }],
    parameters: { output: { kind: "image", aspectRatio: "original" }, advanced: {} },
    errorCode: "generation_failed",
    errorMessage: "foreign input historical failure",
    createdAt: at(9),
  });
  jobs.push(foreignInputJob);

  const mismatchJob = await createJob(owner, {
    status: "failed",
    operation: "create-image",
    outputKind: "image",
    prompt: "Operation mismatch retry study",
    inputs: [{ alias: "image1", role: "primary-image", source: { type: "media-asset", id: retryInputAssetId } }],
    parameters: { output: { kind: "image", aspectRatio: "original" }, advanced: {} },
    errorCode: "generation_failed",
    errorMessage: "historical operation mismatch",
    createdAt: at(10),
  });
  jobs.push(mismatchJob);

  const backendRejectJob = await createJob(owner, {
    status: "failed",
    prompt: "Backend rejection study",
    errorCode: "generation_failed",
    errorMessage: "historical backend rejection",
    createdAt: at(11),
  });
  jobs.push(backendRejectJob);

  const backendUnavailableJob = await createJob(owner, {
    status: "failed",
    prompt: "Backend unavailable study",
    errorCode: "generation_failed",
    errorMessage: "historical backend unavailable",
    createdAt: at(12),
  });
  jobs.push(backendUnavailableJob);

  const queuedJob = await createJob(owner, { status: "queued", prompt: "Queued no retry", createdAt: at(13) });
  const persistingJob = await createJob(owner, { status: "persisting", prompt: "Persisting no retry", createdAt: at(14) });
  const cancelledJob = await createJob(owner, { status: "cancelled", prompt: "Cancelled no retry", createdAt: at(15) });
  jobs.push(queuedJob, persistingJob, cancelledJob);

  jobs.push(await createJob(owner, {
    status: "succeeded",
    prompt: "Historical deleted output",
    outputAssetIds: [missingHistoricalAssetId],
    createdAt: at(16),
  }));

  for (let index = 17; index < 22; index += 1) {
    jobs.push(await createJob(owner, {
      status: index % 2 === 0 ? "cancelled" : "succeeded",
      operation: index % 2 === 0 ? "edit-image" : "animate-image",
      prompt: `Activity filler ${String(index).padStart(2, "0")}`,
      createdAt: at(index),
    }));
  }

  const foreignJob = await createJob(foreign, {
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
  assertRetryError(await postRetry(signedOutPage, retryImageJob.id), 401, "authentication_required", "Signed-out Retry");
  await signedOutContext.close();

  const context = await browser.newContext({ viewport: { width: 1440, height: 1024 }, colorScheme: "dark" });
  const page = await context.newPage();
  await routeLocalAppRequestsWithAccount(page, baseUrl, owner);
  await page.goto(`${baseUrl}/activity`, { waitUntil: "networkidle", timeout: 60_000 });

  await page.locator("h2").filter({ hasText: /^Activity$/ }).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByText("Nebula active study", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByText("Golden result study", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByText("Upscale image", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByText("2× upscale", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  assert((await page.getByText("Untitled generation", { exact: true }).count()) === 0, "Promptless Upscale rendered as an accidental missing-prompt generation.");
  await page.getByText("Retry image study", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  assert((await page.getByText("Foreign account secret prompt", { exact: true }).count()) === 0, "Activity exposed another account's job.");
  assert((await page.getByText("provider-job-secret", { exact: false }).count()) === 0, "Activity exposed provider job identity.");
  assert((await page.getByText("internal-worker-secret", { exact: false }).count()) === 0, "Activity exposed worker identity or raw backend error.");
  await page.getByText("Generation could not be started. Retry when you’re ready.", { exact: true }).waitFor({ state: "visible" });
  await page.getByRole("link", { name: "View result", exact: true }).waitFor({ state: "visible" });
  assert(await page.getByRole("link", { name: "View result", exact: true }).count() === 1, "Activity rendered a result link for unavailable historical media.");
  assert(await page.getByRole("link", { name: "View result", exact: true }).getAttribute("href") === `/library/${resultAssetId}`, "Activity result link did not target active owner media.");
  await page.getByText("Updates automatically while generation work is active.", { exact: true }).waitFor({ state: "visible" });
  await page.getByRole("link", { name: "Older", exact: true }).waitFor({ state: "visible" });
  assert(await page.getByRole("button", { name: "Retry", exact: true }).count() === 11, "Activity did not expose Retry exactly on failed first-page jobs.");
  assert(await page.getByRole("button", { name: /cancel/i }).count() === 0, "Phase 9 exposed a Cancel control.");
  assert(await page.locator("li").filter({ hasText: "Nebula active study" }).getByRole("button", { name: "Retry" }).count() === 0, "Running job exposed Retry.");
  assert(await page.locator("li").filter({ hasText: "Golden result study" }).getByRole("button", { name: "Retry" }).count() === 0, "Succeeded job exposed Retry.");
  await page.screenshot({ path: `${artifactDir}/activity-desktop.png`, fullPage: true });
  await page.screenshot({ path: `${artifactDir}/activity-retry-desktop.png`, fullPage: true });

  await page.goto(`${baseUrl}/activity?offset=20`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByRole("link", { name: "Newer", exact: true }).waitFor({ state: "visible" });
  assert((await page.getByText("Nebula active study", { exact: true }).count()) === 0, "Older Activity page retained newer-page jobs.");
  await page.getByText("Activity filler 20", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.goto(`${baseUrl}/activity`, { waitUntil: "networkidle", timeout: 60_000 });

  assertRetryError(await postRetry(page, "not-a-uuid"), 400, "invalid_request", "Malformed Retry job ID");
  assertRetryError(await postRetry(page, randomUUID()), 404, "job_not_found", "Missing Retry job");
  assertRetryError(await postRetry(page, foreignJob.id), 404, "job_not_found", "Foreign Retry job");
  for (const [label, job] of [
    ["queued", queuedJob],
    ["running", runningJob],
    ["persisting", persistingJob],
    ["succeeded", succeededJob],
    ["cancelled", cancelledJob],
  ]) {
    assertRetryError(await postRetry(page, job.id), 409, "retry_not_available", `${label} Retry`);
  }

  const originalRetrySnapshot = await jobSnapshot(owner.id, retryImageJob.id);
  const acceptedBefore = capturedBackendRequests.length;
  const currentRetry = await postRetry(page, retryImageJob.id);
  assert(currentRetry.status === 202 && currentRetry.body?.ok === true, "Current failed Image Retry was not accepted.");
  assert(currentRetry.body.job.id !== retryImageJob.id, "Retry reused the historical job ID.");
  assert(capturedBackendRequests.length === acceptedBefore + 1, "Current Retry did not make exactly one backend submission.");
  const currentCapture = capturedBackendRequests.at(-1);
  assert(currentCapture.ownerId === owner.id, "Retry did not forward the verified owner boundary.");
  assert(currentCapture.request?.prompt === "Retry image study", "Retry did not preserve the product prompt.");
  assert(currentCapture.request?.output?.kind === "image" && currentCapture.request?.output?.aspectRatio === "original", "Retry did not reconstruct current Image output intent.");
  assert(currentCapture.request?.inputs?.[0]?.source?.id === retryInputAssetId, "Retry did not reconstruct the durable input identity.");
  assert(currentCapture.request?.advanced?.seed === 314159, "Retry did not preserve supported advanced intent.");
  const serializedCurrentCapture = JSON.stringify(currentCapture.request);
  for (const secret of [
    "historical-secret-workflow",
    "historical-secret-model",
    "historical-secret-ecosystem",
    "internal-worker-secret",
    "provider-job-secret",
    "historical-secret-worker-state",
    "historical-secret-standby",
  ]) {
    assert(!serializedCurrentCapture.includes(secret), `Retry replayed historical execution metadata: ${secret}`);
  }
  const afterRetrySnapshot = await jobSnapshot(owner.id, retryImageJob.id);
  assert(JSON.stringify(afterRetrySnapshot) === JSON.stringify(originalRetrySnapshot), "Retry mutated the historical generation job.");

  const legacyBefore = capturedBackendRequests.length;
  const legacyRetry = await postRetry(page, legacyVideoJob.id);
  assert(legacyRetry.status === 202 && legacyRetry.body?.ok === true, "Legacy Video Retry was not accepted.");
  assert(capturedBackendRequests.length === legacyBefore + 1, "Legacy Video Retry did not submit exactly once.");
  const legacyCapture = capturedBackendRequests.at(-1).request;
  assert(legacyCapture.output.resolution === "480p", "Legacy Video Retry did not normalize missing resolution to 480p.");
  assert(legacyCapture.output.durationSeconds === 5 && legacyCapture.output.audioEnabled === false, "Legacy Video Retry did not preserve duration/audio intent.");
  assert(legacyCapture.advanced.seed === 271828 && legacyCapture.advanced.frameRate === 25, "Legacy Video Retry did not preserve supported Video advanced intent.");
  assert(legacyCapture.advanced.steps === undefined && legacyCapture.advanced.guidance === undefined, "Legacy Video Retry replayed inactive Steps/Guidance.");

  const readyBefore = capturedBackendRequests.length;
  const readyRetry = await postRetry(page, readySourceJob.id);
  assert(readyRetry.status === 202 && readyRetry.body?.ok === true, "Ready temporary-source Retry was not accepted.");
  assert(capturedBackendRequests.length === readyBefore + 1, "Ready temporary-source Retry did not submit exactly once.");
  const readyCapture = capturedBackendRequests.at(-1).request;
  assert(readyCapture.inputs[0].alias === "image1", "Retry did not synthesize the missing positional input alias.");
  assert(readyCapture.inputs[0].source.id === readySourceId, "Retry changed the temporary source identity.");

  for (const [label, job] of [
    ["current-invalid", invalidJob],
    ["tombstoned", tombstonedJob],
    ["missing temporary", missingSourceJob],
    ["pending temporary", pendingSourceJob],
    ["foreign input", foreignInputJob],
    ["operation mismatch", mismatchJob],
  ]) {
    const before = capturedBackendRequests.length;
    assertRetryError(await postRetry(page, job.id), 409, "retry_not_available", `${label} failed job Retry`);
    assert(capturedBackendRequests.length === before, `${label} Retry reached the generation backend.`);
  }

  const rejectBefore = capturedBackendRequests.length;
  const rejected = await postRetry(page, backendRejectJob.id);
  assertRetryError(rejected, 502, "generation_submission_failed", "Backend-rejected Retry");
  assert(capturedBackendRequests.length === rejectBefore + 1, "Backend rejection was not attempted exactly once.");
  assert(!JSON.stringify(rejected.body).includes("provider-secret-should-never-reach-activity"), "Retry API exposed raw backend rejection detail.");

  const invalidRow = page.locator("li").filter({ hasText: "Invalid retry study" });
  await invalidRow.getByRole("button", { name: "Retry", exact: true }).click();
  await invalidRow.getByText("This generation can’t be retried with the current inputs and settings.", { exact: true }).waitFor({ state: "visible" });
  await page.screenshot({ path: `${artifactDir}/activity-retry-error-desktop.png`, fullPage: true });

  const retryRow = page.locator("li")
  .filter({ hasText: "Retry image study" })
  .filter({ hasText: "Generation could not be started. Retry when you’re ready." })
  .first();
  const acceptedJobsBeforeUi = capturedBackendRequests.filter((entry) => entry.request?.prompt === "Retry image study" && entry.acceptedJobId).map((entry) => entry.acceptedJobId);
  await retryRow.getByRole("button", { name: "Retry", exact: true }).click();
  const retryingButton = retryRow.getByRole("button", { name: "Retrying…", exact: true });
  await retryingButton.waitFor({ state: "visible" });
  assert(await retryingButton.isDisabled(), "Retry button did not disable while submission was in flight.");
  await page.screenshot({ path: `${artifactDir}/activity-retrying-desktop.png`, fullPage: true });
  await retryRow.getByText("Retry started. A new job was added to Activity.", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForFunction(() => document.body.innerText.split("Retry image study").length - 1 >= 3);
  await page.screenshot({ path: `${artifactDir}/activity-retry-success-desktop.png`, fullPage: true });
  const acceptedJobsAfterUi = capturedBackendRequests.filter((entry) => entry.request?.prompt === "Retry image study" && entry.acceptedJobId).map((entry) => entry.acceptedJobId);
  assert(acceptedJobsAfterUi.length === acceptedJobsBeforeUi.length + 1, "UI Retry did not create one additional explicit attempt.");
  assert(new Set(acceptedJobsAfterUi).size === acceptedJobsAfterUi.length, "Separate explicit Retry requests reused a new job ID.");

  // The mock backend leaves accepted attempts queued. Terminalize only those captured
  // mock attempts so the later mobile Retry tests a fresh slot without altering the
  // deliberately active seeded Activity job.
  await markCapturedMockJobsTerminal(owner.id);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByText("Nebula active study", { exact: true }).waitFor({ state: "visible" });
  await page.screenshot({ path: `${artifactDir}/activity-mobile.png`, fullPage: true });
  await page.screenshot({ path: `${artifactDir}/activity-retry-mobile.png`, fullPage: true });
  await page.locator("li").filter({ hasText: "Invalid retry study" }).getByText(
    "This generation can’t be retried with the current inputs and settings.",
    { exact: true },
  ).waitFor({ state: "visible" });
  await page.screenshot({ path: `${artifactDir}/activity-retry-error-mobile.png`, fullPage: true });

  const readyRow = page.locator("li")
  .filter({ hasText: "Ready temporary source retry study" })
  .filter({ hasText: "Generation did not complete. Retry when you’re ready." })
  .first();
  await readyRow.getByRole("button", { name: "Retry", exact: true }).click();
  const mobileRetrying = readyRow.getByRole("button", { name: "Retrying…", exact: true });
  await mobileRetrying.waitFor({ state: "visible" });
  assert(await mobileRetrying.isDisabled(), "Narrow Retry button did not disable while submitting.");
  await page.screenshot({ path: `${artifactDir}/activity-retrying-mobile.png`, fullPage: true });
  await readyRow.getByText("Retry started. A new job was added to Activity.", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.screenshot({ path: `${artifactDir}/activity-retry-success-mobile.png`, fullPage: true });
  assert(await page.getByRole("button", { name: /cancel/i }).count() === 0, "Narrow Activity exposed a Cancel control.");

  await stopMockBackend();
  const unavailable = await postRetry(page, backendUnavailableJob.id);
  assertRetryError(unavailable, 503, "generation_backend_unavailable", "Unavailable backend Retry");
  assert(!JSON.stringify(unavailable.body).includes("127.0.0.1"), "Retry backend-unavailable error exposed infrastructure detail.");

  console.log(
    `Configured Activity Retry verified. owner=${owner.id} foreign=${foreign.id} historicalJobs=${jobs.length} backendRequests=${capturedBackendRequests.length}`,
  );
} catch (error) {
  primaryError = error;
} finally {
  await stopMockBackend().catch(() => {});
  if (browser) await browser.close().catch(() => {});
  try {
    await cleanupFixture();
  } catch (cleanupError) {
    console.error(cleanupError);
    if (!primaryError) primaryError = cleanupError;
  }
}

if (primaryError) throw primaryError;
