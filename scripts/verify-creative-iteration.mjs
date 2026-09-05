import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { chromium } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import {
  configuredTestAccountIdentity,
  createConfiguredTestAccount,
  deleteConfiguredTestAccount,
  withAccountAuthorization,
} from "./lib/configured-test-account.mjs";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const generationBackendUrl = process.env.RENDERLAB_GENERATION_BACKEND_URL;
const generationBackendToken = process.env.RENDERLAB_GENERATION_BACKEND_TOKEN;
const artifactDir = process.env.RENDERLAB_PHASE16_ARTIFACT_DIR || "artifacts";
const cleanupOnly = process.argv.includes("--cleanup-only");
const ownerIdentity = configuredTestAccountIdentity("phase16-owner");
const foreignIdentity = configuredTestAccountIdentity("phase16-foreign");
const backendAddress = generationBackendUrl ? new URL(generationBackendUrl) : null;
const r2AccountId = process.env.R2_ACCOUNT_ID;
const r2Bucket = process.env.R2_BUCKET_NAME;
const capturedBackendRequests = [];
let mockBackend = null;

const pngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z5ZsAAAAASUVORK5CYII=",
  "base64",
);

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: supabaseKey,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  RENDERLAB_GENERATION_BACKEND_URL: generationBackendUrl,
  RENDERLAB_GENERATION_BACKEND_TOKEN: generationBackendToken,
  R2_ACCOUNT_ID: r2AccountId,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: r2Bucket,
})) {
  if (!value) throw new Error(`${name} is required for Phase 16 creative-iteration verification.`);
}

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

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
  if (!response.ok) throw new Error(`Could not read Phase 16 fixture rows (${response.status}): ${await response.text()}`);
  return response.json();
}

async function request(path, account, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, withAccountAuthorization(account, init));
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  return { response, payload };
}

async function signedOutRequest(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  return { response, payload };
}

function isSignedProductRedirectPath(pathname) {
  return /^\/api\/media\/assets\/[^/]+\/(?:content|thumbnail|download)$/.test(pathname)
    || /^\/api\/assets\/reference\/[^/]+\/content$/.test(pathname);
}

async function routeLocalAppRequestsWithAccount(page, account) {
  const origin = new URL(baseUrl).origin;
  await page.route("**/*", async (route) => {
    const requestMessage = route.request();
    const requestUrl = new URL(requestMessage.url());
    if (requestUrl.origin !== origin) {
      await route.continue();
      return;
    }
    const headers = { ...requestMessage.headers(), authorization: `Bearer ${account.accessToken}` };
    if (isSignedProductRedirectPath(requestUrl.pathname)) {
      const response = await route.fetch({ headers, maxRedirects: 0 });
      await route.fulfill({ response });
      return;
    }
    await route.continue({ headers });
  });
}

async function putFixtureObject(key) {
  await r2Client.send(new PutObjectCommand({
    Bucket: r2Bucket,
    Key: key,
    Body: pngBytes,
    ContentType: "image/png",
  }));
}

function storageKey(ownerId, id, suffix = "asset") {
  return `renderlab/phase16-fixtures/${ownerId}/${suffix}-${id}.png`;
}

async function createMediaAsset(account, {
  id = randomUUID(),
  displayName,
  origin = "uploaded",
  generationJobId = null,
  generationOutputIndex = null,
  deletedAt = null,
}) {
  const key = storageKey(account.id, id, origin === "generated" ? "result" : "input");
  await putFixtureObject(key);
  const response = await supabase("media_assets", {
    method: "POST",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({
      id,
      owner_id: account.id,
      generation_job_id: generationJobId,
      generation_output_index: generationOutputIndex,
      origin,
      kind: "image",
      mime_type: "image/png",
      storage_key: key,
      thumbnail_storage_key: null,
      original_filename: origin === "uploaded" ? `${displayName}.png` : null,
      display_name: displayName,
      size_bytes: pngBytes.length,
      width: 1,
      height: 1,
      duration_ms: null,
      provenance: { prompt: displayName, operation: generationJobId ? "edit-image" : null },
      metadata: { verification: "phase16-creative-iteration" },
      deleted_at: deletedAt,
    }),
  });
  if (!response.ok) throw new Error(`Could not create Phase 16 media fixture (${response.status}): ${await response.text()}`);
  return (await response.json())[0];
}

async function createGenerationSource(account, {
  id = randomUUID(),
  status = "ready",
  filename = "phase16-reference.png",
}) {
  const key = storageKey(account.id, id, "temporary-source");
  if (status === "ready") await putFixtureObject(key);
  const response = await supabase("generation_sources", {
    method: "POST",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({
      id,
      owner_id: account.id,
      storage_key: key,
      filename,
      mime_type: "image/png",
      size_bytes: pngBytes.length,
      width: 1,
      height: 1,
      purpose: "reference",
      status,
      metadata: { verification: "phase16-creative-iteration" },
    }),
  });
  if (!response.ok) throw new Error(`Could not create Phase 16 source fixture (${response.status}): ${await response.text()}`);
  return (await response.json())[0];
}

function imageParameters({ aspectRatio = "original", seed = 42, steps = 4, guidance = 1, negativePrompt } = {}) {
  return {
    output: { kind: "image", aspectRatio },
    advanced: {
      ...(negativePrompt ? { negativePrompt } : {}),
      seed,
      steps,
      guidance,
    },
  };
}

function videoParameters({
  aspectRatio = "16:9",
  resolution = "720p",
  durationSeconds = 10,
  audioEnabled = false,
  seed = 271828,
  frameRate = 25,
  legacySteps = 77,
  legacyGuidance = 12,
} = {}) {
  return {
    output: { kind: "video", aspectRatio, resolution, durationSeconds, audioEnabled },
    advanced: { seed, frameRate, steps: legacySteps, guidance: legacyGuidance },
  };
}

async function createJob(account, {
  id = randomUUID(),
  status = "succeeded",
  operation = "create-image",
  outputKind = operation === "create-video" || operation === "animate-image" ? "video" : "image",
  prompt,
  inputs = [],
  parameters = outputKind === "video"
    ? videoParameters({ aspectRatio: inputs.length ? "original" : "16:9" })
    : imageParameters({ aspectRatio: inputs.length ? "original" : "1:1" }),
  outputAssetIds = [],
  workerId = null,
  providerJobId = null,
  failoverHistory = [],
  workflowId = "phase16-historical-workflow",
  model = "phase16-historical-model",
  ecosystem = "phase16-historical-ecosystem",
}) {
  const now = new Date().toISOString();
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
      worker_state: workerId ? "phase16-historical-worker-state" : null,
      failover_history: failoverHistory,
      output_asset_ids: outputAssetIds,
      error_code: status === "failed" ? "generation_failed" : null,
      error_message: status === "failed" ? "phase16 historical provider detail" : null,
      created_at: now,
      updated_at: now,
      started_at: status === "queued" ? null : now,
      completed_at: ["succeeded", "failed", "cancelled"].includes(status) ? now : null,
    }),
  });
  if (!response.ok) throw new Error(`Could not create Phase 16 job fixture (${response.status}): ${await response.text()}`);
  return (await response.json())[0];
}

async function jobSnapshot(ownerId, jobId) {
  const result = await rows(
    `generation_jobs?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(jobId)}&select=id,status,operation,output_kind,prompt,inputs,parameters,workflow_id,model,ecosystem,worker_id,provider_job_id,worker_state,failover_history,output_asset_ids,created_at,updated_at,completed_at&limit=1`,
  );
  return result[0] ?? null;
}

async function ownerJobCount(ownerId) {
  const result = await rows(`generation_jobs?owner_id=eq.${encodeURIComponent(ownerId)}&select=id`);
  return result.length;
}

async function patchAccountAccess(ownerId, patch) {
  const response = await supabase(`renderlab_account_access?user_id=eq.${encodeURIComponent(ownerId)}`, {
    method: "PATCH",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) throw new Error(`Could not patch Phase 16 account access (${response.status}): ${await response.text()}`);
}

function operationForRequest(requestBody) {
  const hasInput = Array.isArray(requestBody.inputs) && requestBody.inputs.length > 0;
  if (requestBody.output?.kind === "video") return hasInput ? "animate-image" : "create-video";
  return hasInput ? "edit-image" : "create-image";
}

async function readRequestJson(requestMessage) {
  const chunks = [];
  for await (const chunk of requestMessage) chunks.push(Buffer.from(chunk));
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : null;
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
  };
}

async function persistMockSubmission(ownerId, requestBody) {
  const id = randomUUID();
  const now = new Date().toISOString();
  const operation = operationForRequest(requestBody);
  const response = await supabase("generation_jobs", {
    method: "POST",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({
      id,
      owner_id: ownerId,
      status: "succeeded",
      operation,
      output_kind: requestBody.output.kind,
      prompt: requestBody.prompt,
      workflow_id: "phase16-current-mock-workflow",
      model: "phase16-current-mock-model",
      ecosystem: "phase16-current-mock-ecosystem",
      inputs: requestBody.inputs,
      parameters: { output: requestBody.output, advanced: requestBody.advanced ?? {} },
      worker_id: null,
      provider_job_id: null,
      worker_state: null,
      failover_history: [],
      output_asset_ids: [],
      error_code: null,
      error_message: null,
      created_at: now,
      updated_at: now,
      started_at: now,
      completed_at: now,
    }),
  });
  if (!response.ok) throw new Error(`Phase 16 mock backend could not persist job (${response.status}): ${await response.text()}`);
  return (await response.json())[0];
}

async function startMockBackend() {
  if (mockBackend) return;
  const host = backendAddress.hostname;
  const port = Number(backendAddress.port || 80);
  mockBackend = createServer(async (requestMessage, response) => {
    try {
      if (requestMessage.headers.authorization !== `Bearer ${generationBackendToken}`) {
        sendJson(response, 401, { message: "Mock backend authorization failed." });
        return;
      }
      const ownerId = requestMessage.headers["x-renderlab-owner-id"];
      if (typeof ownerId !== "string" || !ownerId) {
        sendJson(response, 400, { message: "Mock backend owner identity missing." });
        return;
      }
      const requestUrl = new URL(requestMessage.url || "/", generationBackendUrl);
      if (requestMessage.method === "POST" && requestUrl.pathname === "/jobs") {
        const body = await readRequestJson(requestMessage);
        const row = await persistMockSubmission(ownerId, body);
        capturedBackendRequests.push({ ownerId, request: body, acceptedJobId: row.id });
        sendJson(response, 202, { job: publicJob(row) });
        return;
      }
      const match = requestMessage.method === "GET" ? requestUrl.pathname.match(/^\/jobs\/([^/]+)$/) : null;
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
      sendJson(response, 500, { message: "Phase 16 mock backend failed." });
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

function expectProductError(result, status, code, label) {
  assert(result.response.status === status, `${label}: expected HTTP ${status}, got ${result.response.status}.`);
  assert(result.payload?.ok === false && result.payload?.error?.code === code, `${label}: unexpected product error payload.`);
}

async function postRunAgain(account, jobId) {
  return request(`/api/generation/jobs/${encodeURIComponent(jobId)}/run-again`, account, {
    method: "POST",
    headers: { accept: "application/json" },
  });
}

async function cleanupFixture() {
  await deleteConfiguredTestAccount(ownerIdentity);
  await deleteConfiguredTestAccount(foreignIdentity);
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

  const owner = await createConfiguredTestAccount("phase16-owner");
  const foreign = await createConfiguredTestAccount("phase16-foreign");

  const activeInput = await createMediaAsset(owner, { displayName: "Phase16 reusable input" });
  const tombstonedInput = await createMediaAsset(owner, {
    displayName: "Phase16 deleted input",
    deletedAt: new Date(Date.now() - 60_000).toISOString(),
  });
  const foreignInput = await createMediaAsset(foreign, { displayName: "Phase16 foreign input" });
  const readySource = await createGenerationSource(owner, { filename: "phase16-ready-reference.png" });
  const pendingSource = await createGenerationSource(owner, { status: "pending", filename: "phase16-pending-reference.png" });

  const imageResultId = randomUUID();
  const imageJob = await createJob(owner, {
    status: "succeeded",
    operation: "edit-image",
    outputKind: "image",
    prompt: "Phase16 reuse @image1 cinematic portrait",
    inputs: [{ alias: "image1", role: "primary-image", source: { type: "media-asset", id: activeInput.id } }],
    parameters: imageParameters({
      aspectRatio: "original",
      seed: 314159,
      steps: 8,
      guidance: 2.5,
      negativePrompt: "blur",
    }),
    outputAssetIds: [imageResultId],
    workerId: "historical-worker-secret",
    providerJobId: "historical-provider-secret",
    failoverHistory: [{ worker: "historical-standby-secret" }],
    workflowId: "historical-workflow-secret",
    model: "historical-model-secret",
    ecosystem: "historical-ecosystem-secret",
  });
  await createMediaAsset(owner, {
    id: imageResultId,
    displayName: "Phase16 reusable result",
    origin: "generated",
    generationJobId: imageJob.id,
    generationOutputIndex: 0,
  });

  const videoJob = await createJob(owner, {
    status: "succeeded",
    operation: "create-video",
    outputKind: "video",
    prompt: "Phase16 legacy video recipe",
    parameters: videoParameters(),
  });

  const temporaryJob = await createJob(owner, {
    status: "succeeded",
    operation: "edit-image",
    outputKind: "image",
    prompt: "Phase16 temporary @image1 recipe",
    inputs: [{ role: "primary-image", source: { type: "temporary-source", id: readySource.id } }],
    parameters: imageParameters({ aspectRatio: "original", seed: 99, steps: 6, guidance: 1.5 }),
  });

  const invalidJob = await createJob(owner, {
    status: "succeeded",
    operation: "create-image",
    outputKind: "image",
    prompt: "Phase16 invalid current recipe",
    parameters: { output: { kind: "image", aspectRatio: "99:1" }, advanced: {} },
  });

  const tombstonedJob = await createJob(owner, {
    status: "succeeded",
    operation: "edit-image",
    outputKind: "image",
    prompt: "Phase16 deleted input recipe",
    inputs: [{ alias: "image1", role: "primary-image", source: { type: "media-asset", id: tombstonedInput.id } }],
    parameters: imageParameters({ aspectRatio: "original" }),
  });

  const pendingSourceJob = await createJob(owner, {
    status: "succeeded",
    operation: "edit-image",
    outputKind: "image",
    prompt: "Phase16 pending temporary recipe",
    inputs: [{ alias: "image1", role: "primary-image", source: { type: "temporary-source", id: pendingSource.id } }],
    parameters: imageParameters({ aspectRatio: "original" }),
  });

  const foreignInputJob = await createJob(owner, {
    status: "succeeded",
    operation: "edit-image",
    outputKind: "image",
    prompt: "Phase16 foreign input recipe",
    inputs: [{ alias: "image1", role: "primary-image", source: { type: "media-asset", id: foreignInput.id } }],
    parameters: imageParameters({ aspectRatio: "original" }),
  });

  const failedJob = await createJob(owner, {
    status: "failed",
    operation: "edit-image",
    outputKind: "image",
    prompt: "Phase16 failed retry only",
    inputs: [{ alias: "image1", role: "primary-image", source: { type: "media-asset", id: activeInput.id } }],
    parameters: imageParameters({ aspectRatio: "original" }),
  });

  const activeJob = await createJob(owner, {
    status: "running",
    operation: "create-image",
    outputKind: "image",
    prompt: "Phase16 active no run again",
    parameters: imageParameters({ aspectRatio: "1:1" }),
  });

  const foreignJob = await createJob(foreign, {
    status: "succeeded",
    operation: "create-image",
    outputKind: "image",
    prompt: "Phase16 foreign secret prompt",
    parameters: imageParameters({ aspectRatio: "1:1" }),
  });

  const signedOutRunAgain = await signedOutRequest(`/api/generation/jobs/${imageJob.id}/run-again`, { method: "POST" });
  assert(signedOutRunAgain.response.status === 401, "Signed-out Run Again was not rejected.");

  browser = await chromium.launch({ headless: true });
  const signedOutContext = await browser.newContext({ viewport: { width: 1440, height: 1024 }, colorScheme: "dark" });
  const signedOutPage = await signedOutContext.newPage();
  await signedOutPage.goto(`${baseUrl}/create?recipe=${encodeURIComponent(imageJob.id)}`, { waitUntil: "networkidle", timeout: 60_000 });
  await signedOutPage.getByText("Sign in from Settings to reuse private RenderLab generation settings.", { exact: true }).waitFor({ state: "visible" });
  assert(await signedOutPage.locator("#create-prompt").inputValue() === "", "Signed-out recipe navigation exposed the private prompt.");
  assert((await signedOutPage.getByText("Phase16 reuse", { exact: false }).count()) === 0, "Signed-out recipe navigation exposed private recipe text.");
  await signedOutContext.close();

  const context = await browser.newContext({ viewport: { width: 1440, height: 1024 }, colorScheme: "dark" });
  const page = await context.newPage();
  await routeLocalAppRequestsWithAccount(page, owner);

  const jobsBeforeRecipeOpen = await ownerJobCount(owner.id);
  const capturesBeforeRecipeOpen = capturedBackendRequests.length;
  await page.goto(`${baseUrl}/library/${imageResultId}`, { waitUntil: "networkidle", timeout: 60_000 });
  const reuseLink = page.getByRole("link", { name: "Reuse settings", exact: true });
  await reuseLink.waitFor({ state: "visible", timeout: 30_000 });
  assert((await reuseLink.getAttribute("href")) === `/create?recipe=${imageJob.id}`, "Viewer Reuse settings link did not target the producing recipe.");
  await reuseLink.click();
  await page.waitForURL(`**/create?recipe=${imageJob.id}`);
  await page.locator("#create-prompt").waitFor({ state: "visible" });
  assert(await page.locator("#create-prompt").inputValue() === imageJob.prompt, "Reuse Settings did not prefill the historical prompt.");
  await page.locator('[data-reference-alias="image1"]').waitFor({ state: "visible" });
  await page.getByRole("button", { name: "Aspect ratio Original", exact: true }).waitFor({ state: "visible" });
  await page.getByRole("button", { name: "Open Advanced controls", exact: true }).click();
  assert(await page.locator("#advanced-negative-prompt").inputValue() === "blur", "Reuse Settings did not prefill negative prompt.");
  assert(await page.locator("#advanced-seed").inputValue() === "314159", "Reuse Settings did not prefill seed.");
  assert(await page.locator("#advanced-steps").inputValue() === "8", "Reuse Settings did not prefill steps.");
  assert(await page.locator("#advanced-guidance").inputValue() === "2.5", "Reuse Settings did not prefill guidance.");
  assert(capturedBackendRequests.length === capturesBeforeRecipeOpen, "Opening Reuse Settings implicitly dispatched generation.");
  assert(await ownerJobCount(owner.id) === jobsBeforeRecipeOpen, "Opening Reuse Settings created a generation job.");
  await page.screenshot({ path: `${artifactDir}/phase16-recipe-create-desktop.png`, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${artifactDir}/phase16-recipe-create-narrow.png`, fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1024 });

  await page.locator("#create-prompt").fill("Phase16 edited @image1 cinematic portrait");
  await page.locator("#advanced-seed").fill("314160");
  const capturesBeforeEditedSubmit = capturedBackendRequests.length;
  await page.getByRole("button", { name: "Generate", exact: true }).click();
  for (let index = 0; index < 50 && capturedBackendRequests.length === capturesBeforeEditedSubmit; index += 1) await wait(100);
  assert(capturedBackendRequests.length === capturesBeforeEditedSubmit + 1, "Edited Reuse Settings did not submit through ordinary generation.");
  const editedCapture = capturedBackendRequests.at(-1);
  assert(editedCapture.request.prompt === "Phase16 edited @image1 cinematic portrait", "Edited Reuse Settings did not submit the edited prompt.");
  assert(editedCapture.request.inputs?.[0]?.alias === "image1", "Edited Reuse Settings changed the stable reference alias.");
  assert(editedCapture.request.inputs?.[0]?.role === "primary-image", "Edited Reuse Settings changed the input role.");
  assert(editedCapture.request.inputs?.[0]?.source?.type === "media-asset" && editedCapture.request.inputs[0].source.id === activeInput.id, "Edited Reuse Settings changed the historical input source.");
  assert(editedCapture.request.advanced?.seed === 314160, "Edited Reuse Settings did not submit the edited Advanced value.");

  const capturesBeforeTemporaryOpen = capturedBackendRequests.length;
  await page.goto(`${baseUrl}/create?recipe=${temporaryJob.id}`, { waitUntil: "networkidle", timeout: 60_000 });
  assert(await page.locator("#create-prompt").inputValue() === temporaryJob.prompt, "Ready temporary-source recipe did not prefill Create.");
  await page.locator('[data-reference-alias="image1"]').waitFor({ state: "visible" });
  assert(capturedBackendRequests.length === capturesBeforeTemporaryOpen, "Opening a ready temporary-source recipe implicitly dispatched generation.");
  const tempContent = await request(`/api/assets/reference/${readySource.id}/content`, owner, { redirect: "manual" });
  assert(tempContent.response.status === 302, "Owner could not resolve the authenticated ready temporary-source content route.");
  const foreignTempContent = await request(`/api/assets/reference/${readySource.id}/content`, foreign, { redirect: "manual" });
  assert(foreignTempContent.response.status === 404, "Temporary-source content route leaked a foreign owner source.");

  await page.goto(`${baseUrl}/create?recipe=${videoJob.id}`, { waitUntil: "networkidle", timeout: 60_000 });
  assert(await page.locator("#create-prompt").inputValue() === videoJob.prompt, "Video recipe did not prefill prompt.");
  await page.getByRole("button", { name: "Aspect ratio 16:9", exact: true }).waitFor({ state: "visible" });
  const videoSettings = page.getByRole("button", { name: "Video settings. Resolution 720p. Duration 10 seconds. Audio off", exact: true });
  await videoSettings.waitFor({ state: "visible" });
  await videoSettings.click();
  await page.getByRole("menuitem", { name: "Advanced controls", exact: true }).click();
  assert(await page.locator("#advanced-seed").inputValue() === "271828", "Video recipe did not prefill seed.");
  assert(await page.locator("#advanced-frame-rate").inputValue() === "25", "Video recipe did not prefill frame rate.");
  assert((await page.locator("#advanced-steps").count()) === 0 && (await page.locator("#advanced-guidance").count()) === 0, "Legacy Video steps/guidance leaked back into the current UI.");

  await page.goto(`${baseUrl}/create?recipe=${imageJob.id}&source=${imageResultId}&action=edit-image`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByText("That Create link mixes two continuation types. Start a new creation or use one saved starting point.", { exact: true }).waitFor({ state: "visible" });
  assert(await page.locator("#create-prompt").inputValue() === "", "Mixed recipe/media navigation guessed a recipe precedence.");

  await page.goto(`${baseUrl}/create?recipe=not-a-uuid`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByText("That saved generation link is invalid. Start a new creation instead.", { exact: true }).waitFor({ state: "visible" });

  await page.goto(`${baseUrl}/create?recipe=${foreignJob.id}`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByText("That saved generation can’t be reused with the current inputs and settings. Start a new creation instead.", { exact: true }).waitFor({ state: "visible" });
  assert((await page.getByText("Phase16 foreign secret prompt", { exact: true }).count()) === 0, "Foreign recipe navigation exposed the foreign prompt.");

  for (const unavailableJob of [invalidJob, tombstonedJob, pendingSourceJob, foreignInputJob]) {
    await page.goto(`${baseUrl}/create?recipe=${unavailableJob.id}`, { waitUntil: "networkidle", timeout: 60_000 });
    await page.getByText("That saved generation can’t be reused with the current inputs and settings. Start a new creation instead.", { exact: true }).waitFor({ state: "visible" });
    assert(await page.locator("#create-prompt").inputValue() === "", `Unavailable recipe ${unavailableJob.id} partially prefilled Create.`);
  }

  await page.goto(`${baseUrl}/activity`, { waitUntil: "networkidle", timeout: 60_000 });
  for (const reusableJob of [imageJob, videoJob, temporaryJob]) {
    const row = page.locator("li").filter({ hasText: reusableJob.prompt });
    await row.getByRole("button", { name: "Run again", exact: true }).waitFor({ state: "visible" });
  }
  for (const unavailableJob of [invalidJob, tombstonedJob, pendingSourceJob, foreignInputJob, activeJob]) {
    const row = page.locator("li").filter({ hasText: unavailableJob.prompt });
    assert(await row.getByRole("button", { name: "Run again", exact: true }).count() === 0, `Unavailable ${unavailableJob.prompt} exposed Run again.`);
  }
  const failedRow = page.locator("li").filter({ hasText: failedJob.prompt });
  await failedRow.getByRole("button", { name: "Retry", exact: true }).waitFor({ state: "visible" });
  assert(await failedRow.getByRole("button", { name: "Run again", exact: true }).count() === 0, "Failed job collapsed Retry and Run again semantics.");
  await page.screenshot({ path: `${artifactDir}/phase16-activity-run-again-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${artifactDir}/phase16-activity-run-again-narrow.png`, fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1024 });

  const malformedRunAgain = await request("/api/generation/jobs/not-a-uuid/run-again", owner, { method: "POST" });
  assert(malformedRunAgain.response.status === 400 && malformedRunAgain.payload?.error?.code === "invalid_request", "Malformed Run Again ID was not rejected.");
  expectProductError(await postRunAgain(owner, randomUUID()), 404, "job_not_found", "Missing Run Again");
  expectProductError(await postRunAgain(owner, foreignJob.id), 404, "job_not_found", "Foreign Run Again");
  expectProductError(await postRunAgain(owner, failedJob.id), 409, "run_again_not_available", "Failed Run Again");
  expectProductError(await postRunAgain(owner, activeJob.id), 409, "run_again_not_available", "Active Run Again");
  expectProductError(await postRunAgain(owner, invalidJob.id), 409, "run_again_not_available", "Invalid-current Run Again");

  const capturesBeforeUnavailableRunAgain = capturedBackendRequests.length;
  expectProductError(await postRunAgain(owner, tombstonedJob.id), 409, "run_again_not_available", "Unavailable-input Run Again");
  assert(capturedBackendRequests.length === capturesBeforeUnavailableRunAgain, "Unavailable-input Run Again reached backend work.");

  const originalBefore = await jobSnapshot(owner.id, imageJob.id);
  const capturesBeforeRunAgain = capturedBackendRequests.length;
  const firstRunAgain = await postRunAgain(owner, imageJob.id);
  assert(firstRunAgain.response.status === 202 && firstRunAgain.payload?.ok === true, "Reusable successful job was not accepted by Run Again.");
  assert(firstRunAgain.payload.job.id !== imageJob.id, "Run Again reused the historical job ID.");
  assert(capturedBackendRequests.length === capturesBeforeRunAgain + 1, "Run Again did not make exactly one ordinary backend submission.");
  const firstCapture = capturedBackendRequests.at(-1);
  assert(firstCapture.ownerId === owner.id, "Run Again did not preserve the verified owner boundary.");
  assert(firstCapture.request.prompt === imageJob.prompt, "Run Again did not preserve product prompt intent.");
  assert(firstCapture.request.inputs?.[0]?.alias === "image1" && firstCapture.request.inputs?.[0]?.source?.id === activeInput.id, "Run Again did not preserve current-valid input intent.");
  const serializedCapture = JSON.stringify(firstCapture.request);
  for (const secret of ["historical-worker-secret", "historical-provider-secret", "historical-standby-secret", "historical-workflow-secret", "historical-model-secret", "historical-ecosystem-secret"]) {
    assert(!serializedCapture.includes(secret), `Run Again replayed historical execution metadata: ${secret}`);
  }

  const secondRunAgain = await postRunAgain(owner, imageJob.id);
  assert(secondRunAgain.response.status === 202 && secondRunAgain.payload?.ok === true, "Second explicit Run Again was not accepted.");
  assert(secondRunAgain.payload.job.id !== firstRunAgain.payload.job.id, "Separate explicit Run Again requests did not create distinct attempts.");
  const originalAfter = await jobSnapshot(owner.id, imageJob.id);
  assert(JSON.stringify(originalAfter) === JSON.stringify(originalBefore), "Run Again mutated the historical successful job.");

  await patchAccountAccess(owner.id, { generation_enabled: false });
  const capturesBeforeDisabled = capturedBackendRequests.length;
  expectProductError(await postRunAgain(owner, videoJob.id), 503, "generation_disabled", "Generation-disabled Run Again");
  assert(capturedBackendRequests.length === capturesBeforeDisabled, "Generation-disabled Run Again reached the backend.");
  await patchAccountAccess(owner.id, { generation_enabled: true });

  console.log(
    `Phase 16 creative iteration verified. owner=${owner.id} reusableJobs=3 backendSubmissions=${capturedBackendRequests.length}`,
  );
} catch (error) {
  primaryError = error;
  throw error;
} finally {
  if (browser) await browser.close().catch(() => {});
  await stopMockBackend().catch(() => {});
  try {
    await cleanupFixture();
  } catch (cleanupError) {
    if (!primaryError) throw cleanupError;
    console.error("Phase 16 cleanup also failed:", cleanupError);
  }
}
