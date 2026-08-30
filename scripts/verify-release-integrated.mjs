import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { chromium } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import {
  configuredTestAccountIdentity,
  createConfiguredTestAccount,
  deleteConfiguredTestAccount,
  routeLocalAppRequestsWithAccount,
  withAccountAuthorization,
} from "./lib/configured-test-account.mjs";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.R2_BUCKET_NAME;
const backendUrl = process.env.RENDERLAB_GENERATION_BACKEND_URL;
const backendToken = process.env.RENDERLAB_GENERATION_BACKEND_TOKEN;
const artifactDir = process.env.RENDERLAB_RELEASE_ARTIFACT_DIR || "artifacts";
const cleanupOnly = process.argv.includes("--cleanup-only");
const ownerIdentity = configuredTestAccountIdentity("release-integrated-owner");
const foreignIdentity = configuredTestAccountIdentity("release-integrated-foreign");

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: bucket,
  RENDERLAB_GENERATION_BACKEND_URL: backendUrl,
  RENDERLAB_GENERATION_BACKEND_TOKEN: backendToken,
})) {
  if (!value) throw new Error(`${name} is required for Phase 12 integrated release verification.`);
}

const backendAddress = new URL(backendUrl);
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});
const pngBytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII=", "base64");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function service(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceRoleKey);
  headers.set("authorization", `Bearer ${serviceRoleKey}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers });
}

async function rows(path) {
  const response = await service(path);
  if (!response.ok) throw new Error(`Phase 12 Supabase read failed (${response.status}): ${await response.text()}`);
  return response.json();
}

async function setAccessRole(userId, role) {
  const response = await service(`renderlab_account_access?user_id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({ role }),
  });
  if (!response.ok) throw new Error(`Could not update Phase 12 fixture role (${response.status}): ${await response.text()}`);
  const updated = await response.json();
  assert(updated[0]?.role === role, `Phase 12 fixture role did not update to ${role}.`);
}

async function seedFailedRetryJob(ownerId, prompt) {
  const id = randomUUID();
  const now = new Date().toISOString();
  const response = await service("generation_jobs", {
    method: "POST",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({
      id,
      owner_id: ownerId,
      status: "failed",
      operation: "create-image",
      output_kind: "image",
      prompt,
      workflow_id: "phase12-release-retry-history",
      model: "phase12-release-retry-history",
      ecosystem: "phase12-release-retry-history",
      inputs: [],
      parameters: {
        output: { kind: "image", aspectRatio: "1:1" },
        advanced: { seed: 42, steps: 4, guidance: 1 },
      },
      worker_id: null,
      provider_job_id: null,
      worker_state: null,
      failover_history: [],
      output_asset_ids: [],
      error_code: "generation_submission_failed",
      error_message: "Intentional Phase 12 recovery fixture.",
      created_at: now,
      updated_at: now,
      started_at: now,
      completed_at: now,
    }),
  });
  if (!response.ok) throw new Error(`Could not seed Phase 12 failed job (${response.status}): ${await response.text()}`);
  return (await response.json())[0];
}

async function persistCompletedJob(ownerId, request) {
  const jobId = randomUUID();
  const assetId = randomUUID();
  const now = new Date().toISOString();
  const storageKey = `renderlab/release-validation/${ownerId}/${jobId}/${assetId}.png`;
  await r2.send(new PutObjectCommand({ Bucket: bucket, Key: storageKey, Body: pngBytes, ContentType: "image/png" }));

  const job = await service("generation_jobs", {
    method: "POST",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({
      id: jobId,
      owner_id: ownerId,
      status: "succeeded",
      operation: "create-image",
      output_kind: "image",
      prompt: request.prompt,
      workflow_id: "phase12-release-mock",
      model: "phase12-release-mock",
      ecosystem: "phase12-release-mock",
      inputs: request.inputs || [],
      parameters: { output: request.output, advanced: request.advanced || {} },
      worker_id: null,
      provider_job_id: null,
      worker_state: { phase: "completed" },
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
  if (!job.ok) throw new Error(`Could not persist Phase 12 job (${job.status}): ${await job.text()}`);

  const asset = await service("media_assets", {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({
      id: assetId,
      owner_id: ownerId,
      generation_job_id: jobId,
      origin: "generated",
      kind: "image",
      mime_type: "image/png",
      storage_key: storageKey,
      thumbnail_storage_key: null,
      original_filename: null,
      display_name: "Phase 12 integrated release result",
      size_bytes: pngBytes.length,
      width: 1,
      height: 1,
      duration_ms: null,
      provenance: { prompt: request.prompt, operation: "create-image" },
      metadata: { verification: "phase12-release-integrated" },
      created_at: now,
    }),
  });
  if (!asset.ok) throw new Error(`Could not persist Phase 12 media (${asset.status}): ${await asset.text()}`);

  const bound = await service(`generation_jobs?id=eq.${encodeURIComponent(jobId)}&owner_id=eq.${encodeURIComponent(ownerId)}`, {
    method: "PATCH",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({ output_asset_ids: [assetId], updated_at: now }),
  });
  if (!bound.ok) throw new Error(`Could not bind Phase 12 media (${bound.status}): ${await bound.text()}`);
  return { job: (await bound.json())[0], assetId };
}

function publicJob(row) {
  return {
    id: row.id,
    status: row.status,
    operation: row.operation,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    outputAssetIds: row.output_asset_ids || [],
  };
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : null;
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(payload));
}

let mockBackend;
const jobs = new Map();

async function startMockBackend() {
  mockBackend = createServer(async (request, response) => {
    try {
      if (request.headers.authorization !== `Bearer ${backendToken}`) return sendJson(response, 401, { message: "Unauthorized" });
      const ownerId = request.headers["x-renderlab-owner-id"];
      if (typeof ownerId !== "string" || !ownerId) return sendJson(response, 400, { message: "Owner required" });
      const url = new URL(request.url || "/", backendUrl);
      if (request.method === "POST" && url.pathname === "/jobs") {
        const completed = await persistCompletedJob(ownerId, await readJson(request));
        jobs.set(completed.job.id, completed.job);
        return sendJson(response, 202, { job: publicJob(completed.job) });
      }
      const match = request.method === "GET" ? url.pathname.match(/^\/jobs\/([^/]+)$/) : null;
      if (match) {
        const job = jobs.get(decodeURIComponent(match[1]));
        return job && job.owner_id === ownerId
          ? sendJson(response, 200, { job: publicJob(job) })
          : sendJson(response, 404, { message: "Not found" });
      }
      return sendJson(response, 404, { message: "Not found" });
    } catch (error) {
      console.error(error);
      return sendJson(response, 500, { message: "Mock backend failed" });
    }
  });
  await new Promise((resolve, reject) => {
    mockBackend.once("error", reject);
    mockBackend.listen(Number(backendAddress.port || 80), backendAddress.hostname, resolve);
  });
}

async function stopMockBackend() {
  if (!mockBackend) return;
  const current = mockBackend;
  mockBackend = null;
  await new Promise((resolve) => current.close(resolve));
}

async function cleanup() {
  await deleteConfiguredTestAccount(ownerIdentity);
  await deleteConfiguredTestAccount(foreignIdentity);
}

if (cleanupOnly) {
  await cleanup();
  process.exit(0);
}

await mkdir(artifactDir, { recursive: true });
let browser = null;
let primaryError = null;
try {
  await cleanup();
  await startMockBackend();
  const owner = await createConfiguredTestAccount("release-integrated-owner");
  const foreign = await createConfiguredTestAccount("release-integrated-foreign");
  await setAccessRole(owner.id, "admin");
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1024 }, colorScheme: "dark" });
  const page = await context.newPage();
  await routeLocalAppRequestsWithAccount(page, baseUrl, owner);

  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.locator("header").getByRole("link", { name: "Open Create", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.screenshot({ path: `${artifactDir}/release-integrated-landing-desktop.png`, fullPage: true });

  await page.goto(`${baseUrl}/admin`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByRole("main").getByRole("heading", { name: "Admin", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByText("Global defaults", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.screenshot({ path: `${artifactDir}/release-integrated-admin-desktop.png` });

  await page.goto(`${baseUrl}/create`, { waitUntil: "networkidle", timeout: 60_000 });
  const promptText = "Phase 12 integrated cobalt sphere continuity check";
  await page.getByRole("textbox", { name: "Prompt" }).fill(promptText);
  const generate = page.getByRole("button", { name: "Generate", exact: true });
  const submissionPromise = page.waitForResponse(
    (response) => new URL(response.url()).pathname === "/api/generation/jobs" && response.request().method() === "POST",
    { timeout: 60_000 },
  );
  await generate.click();
  const submission = await submissionPromise;
  const payload = await submission.json();
  assert(submission.ok() && payload?.ok === true, `Create submission failed: ${JSON.stringify(payload)}`);
  const jobId = payload.job.id;
  const persisted = await rows(`generation_jobs?id=eq.${encodeURIComponent(jobId)}&owner_id=eq.${encodeURIComponent(owner.id)}&select=id,status,prompt,output_asset_ids`);
  assert(persisted[0]?.status === "succeeded" && persisted[0]?.prompt === promptText, "Integrated job did not persist as succeeded.");
  const assetId = persisted[0]?.output_asset_ids?.[0];
  assert(typeof assetId === "string", "Integrated job did not bind a durable output asset.");

  await page.goto(`${baseUrl}/library`, { waitUntil: "networkidle", timeout: 60_000 });
  const card = page.locator(`a[href="/library/${assetId}"]`);
  await card.waitFor({ state: "visible", timeout: 30_000 });
  await page.screenshot({ path: `${artifactDir}/release-integrated-library-desktop.png`, fullPage: true });
  await card.click();
  await page.waitForURL(`**/library/${assetId}`, { timeout: 30_000 });
  const favorite = page.getByRole("button", { name: "Favorite", exact: true });
  await favorite.click();
  await page.getByRole("button", { name: "Favorited", exact: true }).waitFor({ state: "visible", timeout: 30_000 });

  const favoriteRows = await rows(`media_assets?id=eq.${encodeURIComponent(assetId)}&owner_id=eq.${encodeURIComponent(owner.id)}&select=favorited_at`);
  assert(Boolean(favoriteRows[0]?.favorited_at), "Viewer organization state did not persist.");
  const signedOut = await fetch(`${baseUrl}/api/media/assets/${assetId}/favorite`, { method: "PUT" });
  assert(signedOut.status === 401, `Signed-out ownership rejection returned ${signedOut.status}.`);
  const foreignResult = await fetch(`${baseUrl}/api/media/assets/${assetId}/favorite`, withAccountAuthorization(foreign, { method: "PUT" }));
  assert(foreignResult.status === 404, `Foreign ownership rejection returned ${foreignResult.status}.`);

  const retryPrompt = "Phase 12 integrated retry recovery check";
  const failedJob = await seedFailedRetryJob(owner.id, retryPrompt);
  const retryResponse = await fetch(
    `${baseUrl}/api/generation/jobs/${encodeURIComponent(failedJob.id)}/retry`,
    withAccountAuthorization(owner, { method: "POST", headers: { accept: "application/json" } }),
  );
  const retryPayload = await retryResponse.json().catch(() => null);
  assert(retryResponse.ok && retryPayload?.ok === true, `Integrated Retry failed: ${JSON.stringify(retryPayload)}`);
  const retryRows = await rows(
    `generation_jobs?id=eq.${encodeURIComponent(retryPayload.job.id)}&owner_id=eq.${encodeURIComponent(owner.id)}&select=id,status,prompt`,
  );
  assert(retryRows[0]?.status === "succeeded" && retryRows[0]?.prompt === retryPrompt, "Integrated Retry did not persist a succeeded recovery job.");

  await page.goto(`${baseUrl}/activity`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByText(promptText, { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  const retryActivityRows = page.getByText(retryPrompt, { exact: true });
  await retryActivityRows.first().waitFor({ state: "visible", timeout: 30_000 });
  assert(
    await retryActivityRows.count() === 2,
    "Activity did not preserve the failed history alongside the succeeded Retry.",
  );
  await page.screenshot({ path: `${artifactDir}/release-integrated-activity-desktop.png`, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${baseUrl}/library?favorite=true`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.locator(`a[href="/library/${assetId}"]`).waitFor({ state: "visible", timeout: 30_000 });
  await page.screenshot({ path: `${artifactDir}/release-integrated-library-narrow-reduced.png`, fullPage: true });

  console.log(`Phase 12 integrated continuity passed owner=${owner.id} job=${jobId} asset=${assetId}.`);
} catch (error) {
  primaryError = error;
} finally {
  if (browser) await browser.close().catch(() => {});
  await stopMockBackend().catch(() => {});
  try {
    await cleanup();
  } catch (cleanupError) {
    console.error(cleanupError);
    if (!primaryError) primaryError = cleanupError;
  }
}
if (primaryError) throw primaryError;
