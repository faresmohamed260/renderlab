import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { chromium } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import {
  configuredTestAccountIdentity,
  createConfiguredTestAccount,
  deleteConfiguredTestAccount,
  routeLocalAppRequestsWithAccount,
  withAccountAuthorization,
} from "./lib/configured-test-account.mjs";

const live = process.argv.includes("--live");
const cleanupOnly = process.argv.includes("--cleanup-only");
const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || (live ? "http://127.0.0.1:3001" : "http://127.0.0.1:3000")).replace(/\/$/, "");
const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.R2_BUCKET_NAME;
const reconcileSecret = process.env.RENDERLAB_GENERATION_RECONCILER_SECRET;
const mockGateway = process.env.RENDERLAB_TEST_UPSCALE_WORKER_GATEWAY_URL?.replace(/\/$/, "");
const artifactDir = process.env.RENDERLAB_PHASE18F_ARTIFACT_DIR || "artifacts/phase18f-image-upscale";
const namespace = live ? "phase18f-image-upscale-live" : "phase18f-image-upscale";
const foreignNamespace = "phase18f-image-upscale-foreign";
const identity = configuredTestAccountIdentity(namespace);
const foreignIdentity = configuredTestAccountIdentity(foreignNamespace);

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: serviceKey,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: bucket,
  RENDERLAB_GENERATION_RECONCILER_SECRET: reconcileSecret,
})) {
  if (!value) throw new Error(`${name} is required for Phase 18F Image Upscale verification.`);
}
if (!live && !mockGateway) throw new Error("RENDERLAB_TEST_UPSCALE_WORKER_GATEWAY_URL is required for mock verification.");

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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
async function service(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceKey);
  headers.set("authorization", `Bearer ${serviceKey}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers });
}
async function rows(path) {
  const response = await service(path);
  if (!response.ok) throw new Error(`Supabase query failed (${response.status}): ${await response.text()}`);
  return response.json();
}
async function jsonRequest(url, account, init = {}) {
  const response = await fetch(url, withAccountAuthorization(account, init));
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { response, payload };
}
async function getObject(key) {
  const response = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  return Buffer.from(await response.Body.transformToByteArray());
}
async function createSource(account, label, width, height) {
  const id = randomUUID();
  const key = `renderlab/phase18f-fixtures/${account.id}/${id}.png`;
  const bytes = await sharp({
    create: { width, height, channels: 4, background: { r: 34, g: 98, b: 176, alpha: 0.72 } },
  }).png().toBuffer();
  await r2.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes, ContentType: "image/png" }));
  const response = await service("media_assets", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      id,
      owner_id: account.id,
      generation_job_id: null,
      generation_output_index: null,
      origin: "uploaded",
      kind: "image",
      mime_type: "image/png",
      storage_key: key,
      thumbnail_storage_key: null,
      original_filename: `${label}.png`,
      display_name: label,
      size_bytes: bytes.length,
      width,
      height,
      duration_ms: null,
      provenance: {},
      metadata: { verification: namespace },
    }),
  });
  if (!response.ok) throw new Error(`Could not create source (${response.status}): ${await response.text()}`);
  return { row: (await response.json())[0], bytes, hash: digest(bytes), key };
}
async function loadAsset(id) {
  return (await rows(`media_assets?id=eq.${encodeURIComponent(id)}&select=*&limit=1`))[0] ?? null;
}
async function loadJob(id) {
  return (await rows(`generation_jobs?id=eq.${encodeURIComponent(id)}&select=*&limit=1`))[0] ?? null;
}
async function loadJobAssets(id) {
  return rows(`media_assets?generation_job_id=eq.${encodeURIComponent(id)}&select=*&order=generation_output_index.asc.nullslast`);
}
async function activeReservations(ownerId, jobId) {
  return rows(`generation_admission_reservations?owner_id=eq.${encodeURIComponent(ownerId)}&job_id=eq.${encodeURIComponent(jobId)}&released_at=is.null&select=id,job_id`);
}
async function submitUpscale(account, sourceId) {
  const result = await jsonRequest(`${baseUrl}/api/media/assets/${encodeURIComponent(sourceId)}/upscale`, account, { method: "POST" });
  assert(result.response.status === 202 && result.payload?.ok && result.payload?.job?.id,
    `Upscale submission failed (${result.response.status}): ${JSON.stringify(result.payload)}`);
  return result.payload.job.id;
}
async function reconcileOnce() {
  const response = await fetch(`${baseUrl}/api/internal/generation/reconcile`, {
    method: "POST",
    headers: { authorization: `Bearer ${reconcileSecret}` },
  });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  if (![200, 503].includes(response.status)) throw new Error(`Reconcile failed (${response.status}): ${JSON.stringify(payload)}`);
}
async function reconcileTo(jobId, terminal, attempts = live ? 90 : 12, delayMs = live ? 10_000 : 250) {
  for (let i = 0; i < attempts; i += 1) {
    await reconcileOnce();
    const row = await loadJob(jobId);
    if (row && terminal.includes(row.status)) return row;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  const row = await loadJob(jobId);
  throw new Error(`Job ${jobId} did not reach ${terminal.join("/")}; current=${row?.status || "missing"}.`);
}
async function verifySourceUnchanged(source, label) {
  const row = await loadAsset(source.row.id);
  assert(row, `${label}: source row disappeared.`);
  assert(JSON.stringify(row) === JSON.stringify(source.row), `${label}: source row mutated during Upscale.`);
  const bytes = await getObject(source.key);
  assert(digest(bytes) === source.hash, `${label}: source R2 bytes mutated during Upscale.`);
}
async function verifyOutput(jobId, source, expectedWidth, expectedHeight, label) {
  const assets = await loadJobAssets(jobId);
  assert(assets.length === 1, `${label}: expected one durable output, got ${assets.length}.`);
  const asset = assets[0];
  assert(asset.generation_output_index === 0, `${label}: output is not slot 0.`);
  assert(asset.mime_type === "image/png", `${label}: output MIME is ${asset.mime_type}.`);
  assert(asset.width === expectedWidth && asset.height === expectedHeight,
    `${label}: persisted geometry ${asset.width}x${asset.height}, expected ${expectedWidth}x${expectedHeight}.`);
  const bytes = await getObject(asset.storage_key);
  assert(Number(asset.size_bytes) === bytes.length,
    `${label}: persisted size ${asset.size_bytes}, expected ${bytes.length}.`);
  const meta = await sharp(bytes).metadata();
  assert(meta.width === expectedWidth && meta.height === expectedHeight,
    `${label}: stored PNG geometry ${meta.width}x${meta.height}, expected ${expectedWidth}x${expectedHeight}.`);
  await verifySourceUnchanged(source, label);
  return { asset, bytes };
}
async function mockJobMode(providerJobId, mode) {
  const response = await fetch(`${mockGateway}/jobs/${encodeURIComponent(providerJobId)}/mode/${mode}`, { method: "POST" });
  if (!response.ok) throw new Error(`Could not set mock job mode ${mode} (${response.status}).`);
}
async function productDelete(account, assetId) {
  const result = await jsonRequest(`${baseUrl}/api/media/assets/${encodeURIComponent(assetId)}`, account, { method: "DELETE" });
  assert(result.response.ok && result.payload?.ok, `Could not tombstone source ${assetId}: ${JSON.stringify(result.payload)}`);
}

async function verifyMock(account, foreignAccount) {
  const trackedKeys = new Set();
  const successSource = await createSource(account, "Phase18F success source", 13, 7);
  const cancelSource = await createSource(account, "Phase18F cancel source", 11, 9);
  const retrySource = await createSource(account, "Phase18F retry source", 9, 5);
  for (const source of [successSource, cancelSource, retrySource]) trackedKeys.add(source.key);

  const successJobId = await submitUpscale(account, successSource.row.id);
  assert((await activeReservations(account.id, successJobId)).length === 1, "Accepted Upscale did not bind one admission reservation.");
  const succeeded = await reconcileTo(successJobId, ["succeeded", "failed"]);
  assert(succeeded.status === "succeeded", `Autonomous Upscale failed: ${succeeded.error_code || "unknown"}.`);
  const successOutput = await verifyOutput(successJobId, successSource, 26, 14, "Autonomous Upscale");
  trackedKeys.add(successOutput.asset.storage_key);
  if (successOutput.asset.thumbnail_storage_key) trackedKeys.add(successOutput.asset.thumbnail_storage_key);
  assert((await activeReservations(account.id, successJobId)).length === 0, "Succeeded Upscale retained active admission capacity.");

  const publicResult = await jsonRequest(`${baseUrl}/api/media/assets/${encodeURIComponent(successOutput.asset.id)}`, account);
  assert(publicResult.response.ok && publicResult.payload?.ok,
    `Succeeded Upscale result was not readable through the product media contract: ${JSON.stringify(publicResult.payload)}`);
  assert(publicResult.payload.asset.operation === "upscale-image",
    `Succeeded Upscale public provenance lost its operation: ${JSON.stringify(publicResult.payload.asset)}`);
  assert(publicResult.payload.asset.width === 26 && publicResult.payload.asset.height === 14,
    `Succeeded Upscale public geometry is incorrect: ${JSON.stringify(publicResult.payload.asset)}`);
  assert(publicResult.payload.asset.sizeBytes === successOutput.bytes.length,
    `Succeeded Upscale public size is incorrect: ${JSON.stringify(publicResult.payload.asset)}`);

  await reconcileOnce();
  await reconcileOnce();
  const duplicateAssets = await loadJobAssets(successJobId);
  assert(duplicateAssets.length === 1 && duplicateAssets[0].id === successOutput.asset.id,
    "Repeated reconciliation created or adopted a different output asset.");

  const runAgain = await jsonRequest(`${baseUrl}/api/generation/jobs/${encodeURIComponent(successJobId)}/run-again`, account, { method: "POST" });
  assert(runAgain.response.status === 409 && runAgain.payload?.error?.code === "run_again_not_available",
    "Succeeded Upscale incorrectly exposed Run Again semantics.");

  const cancelJobId = await submitUpscale(account, cancelSource.row.id);
  const foreignCancel = await jsonRequest(`${baseUrl}/api/generation/jobs/${encodeURIComponent(cancelJobId)}/cancel`, foreignAccount, { method: "POST" });
  assert(foreignCancel.response.status === 404 && foreignCancel.payload?.error?.code === "job_not_found",
    "Foreign Upscale cancellation leaked job existence or succeeded.");
  const ownerCancel = await jsonRequest(`${baseUrl}/api/generation/jobs/${encodeURIComponent(cancelJobId)}/cancel`, account, { method: "POST" });
  assert(ownerCancel.response.ok && ownerCancel.payload?.ok, `Owner Upscale cancellation failed: ${JSON.stringify(ownerCancel.payload)}`);
  const cancelled = await reconcileTo(cancelJobId, ["cancelled", "failed"], 8, 200);
  assert(cancelled.status === "cancelled", `Cancelled Upscale ended as ${cancelled.status}.`);
  assert((await loadJobAssets(cancelJobId)).length === 0, "Cancelled Upscale published a durable output.");
  assert((await activeReservations(account.id, cancelJobId)).length === 0, "Cancelled Upscale retained active admission capacity.");
  await verifySourceUnchanged(cancelSource, "Cancelled Upscale");

  const failedJobId = await submitUpscale(account, retrySource.row.id);
  const failedRowBefore = await loadJob(failedJobId);
  await mockJobMode(failedRowBefore.provider_job_id, "fail");
  const failed = await reconcileTo(failedJobId, ["failed"]);
  assert(failed.error_code === "generation_failed", `Deterministic Upscale failure had code ${failed.error_code}.`);
  const retry = await jsonRequest(`${baseUrl}/api/generation/jobs/${encodeURIComponent(failedJobId)}/retry`, account, { method: "POST" });
  assert(retry.response.status === 202 && retry.payload?.ok && retry.payload?.job?.id,
    `Failed Upscale Retry was not accepted: ${JSON.stringify(retry.payload)}`);
  const retryJobId = retry.payload.job.id;
  assert(retryJobId !== failedJobId, "Retry reused the historical failed job ID.");
  const retryRow = await loadJob(retryJobId);
  assert(retryRow.operation === "upscale-image" && retryRow.prompt === null && retryRow.parameters?.upscale?.scale === 2,
    "Retry did not reconstruct canonical fixed-2× Upscale intent.");
  assert(retryRow.inputs?.[0]?.source?.id === retrySource.row.id, "Retry did not preserve the owner-scoped durable source.");
  const retryCancel = await jsonRequest(`${baseUrl}/api/generation/jobs/${encodeURIComponent(retryJobId)}/cancel`, account, { method: "POST" });
  assert(retryCancel.response.ok && retryCancel.payload?.ok, "Could not cancel the accepted Retry fixture.");
  await reconcileTo(retryJobId, ["cancelled", "failed"], 8, 200);
  await verifySourceUnchanged(retrySource, "Upscale Retry");

  const browser = await chromium.launch({ headless: true });
  let page = null;
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, colorScheme: "dark" });
    page = await context.newPage();
    await routeLocalAppRequestsWithAccount(page, baseUrl, account);
    await page.goto(`${baseUrl}/library/${successOutput.asset.id}`, { waitUntil: "networkidle", timeout: 60_000 });
    const upscaleAgain = page.getByRole("button", { name: "Upscale 2×", exact: true });
    await upscaleAgain.waitFor({ state: "visible", timeout: 30_000 });
    assert(await upscaleAgain.isEnabled(), "Succeeded Upscale result was not itself eligible for another fixed-2× Upscale.");
    const compare = page.getByRole("button", { name: "Compare source", exact: true });
    await compare.waitFor({ state: "visible", timeout: 30_000 });
    assert((await page.getByText("Reuse settings", { exact: true }).count()) === 0, "Succeeded Upscale incorrectly exposed Reuse Settings.");
    await compare.click();
    await page.getByText("Source", { exact: true }).first().waitFor({ state: "visible" });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), "Upscale result comparison overflowed desktop Viewer.");
    await page.screenshot({ path: `${artifactDir}/phase18f-upscale-result-compare-desktop.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), "Upscale result comparison overflowed narrow Viewer.");
    await page.screenshot({ path: `${artifactDir}/phase18f-upscale-result-compare-narrow.png`, fullPage: true });
  } finally {
    if (page) await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
    await browser.close();
  }

  await productDelete(account, successSource.row.id);
  const browserAfterDelete = await chromium.launch({ headless: true });
  let pageAfterDelete = null;
  try {
    const context = await browserAfterDelete.newContext({ viewport: { width: 1000, height: 800 }, colorScheme: "dark" });
    pageAfterDelete = await context.newPage();
    await routeLocalAppRequestsWithAccount(pageAfterDelete, baseUrl, account);
    await pageAfterDelete.goto(`${baseUrl}/library/${successOutput.asset.id}`, { waitUntil: "networkidle", timeout: 60_000 });
    assert((await pageAfterDelete.getByRole("button", { name: "Compare source", exact: true }).count()) === 0,
      "Tombstoned Upscale source was resurrected for Compare source.");
  } finally {
    if (pageAfterDelete) await pageAfterDelete.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
    await browserAfterDelete.close();
  }

  await productDelete(account, retrySource.row.id);
  const retryUnavailable = await jsonRequest(`${baseUrl}/api/generation/jobs/${encodeURIComponent(failedJobId)}/retry`, account, { method: "POST" });
  assert(retryUnavailable.response.status === 409 && retryUnavailable.payload?.error?.code === "retry_not_available",
    "Failed Upscale Retry did not fail closed after current source deletion.");

  return {
    trackedKeys,
    evidence: {
      mode: "mock",
      sourceAssetId: successSource.row.id,
      successJobId,
      resultAssetId: successOutput.asset.id,
      sourceGeometry: [13, 7],
      resultGeometry: [26, 14],
      resultMime: successOutput.asset.mime_type,
      resultSizeBytes: successOutput.bytes.length,
      resultOperation: publicResult.payload.asset.operation,
      resultEligibleForAnotherUpscale: true,
      outputIndex: successOutput.asset.generation_output_index,
      sourceHashBefore: successSource.hash,
      sourcePreservedBeforeTombstone: true,
      duplicateFinalizationCount: duplicateAssets.length,
      cancellationJobId: cancelJobId,
      cancellationStatus: cancelled.status,
      retryHistoricalJobId: failedJobId,
      retryNewJobId: retryJobId,
      retryUnavailableAfterSourceDelete: true,
      runAgainUnavailable: true,
      reuseSettingsUnavailable: true,
      compareActiveSource: true,
      compareTombstonedSource: false,
    },
  };
}

async function verifyLive(account) {
  const source = await createSource(account, "Phase18F live Upscale source", 8, 6);
  const trackedKeys = new Set([source.key]);
  const startedAt = Date.now();
  const jobId = await submitUpscale(account, source.row.id);
  assert((await activeReservations(account.id, jobId)).length === 1, "Live accepted Upscale did not bind admission capacity.");
  const terminal = await reconcileTo(jobId, ["succeeded", "failed"], 90, 10_000);
  assert(terminal.status === "succeeded", `Live deployed-worker Upscale failed: ${terminal.error_code || "unknown"}.`);
  const output = await verifyOutput(jobId, source, 16, 12, "Live product Upscale");
  trackedKeys.add(output.asset.storage_key);
  if (output.asset.thumbnail_storage_key) trackedKeys.add(output.asset.thumbnail_storage_key);
  assert((await activeReservations(account.id, jobId)).length === 0, "Live succeeded Upscale retained active admission capacity.");
  return {
    trackedKeys,
    evidence: {
      mode: "live",
      sourceAssetId: source.row.id,
      jobId,
      resultAssetId: output.asset.id,
      sourceGeometry: [8, 6],
      resultGeometry: [16, 12],
      resultMime: output.asset.mime_type,
      resultSizeBytes: output.bytes.length,
      outputIndex: output.asset.generation_output_index,
      sourceHash: source.hash,
      sourcePreserved: true,
      durationMs: Date.now() - startedAt,
      workerId: terminal.worker_id,
      ecosystem: terminal.ecosystem,
    },
  };
}

async function verifyCleanup(ownerIds, storageKeys) {
  for (const ownerId of ownerIds) {
    for (const [table, column] of [
      ["media_assets", "owner_id"],
      ["generation_jobs", "owner_id"],
      ["generation_sources", "owner_id"],
      ["media_upload_sessions", "owner_id"],
      ["generation_admission_reservations", "owner_id"],
      ["renderlab_account_access", "user_id"],
    ]) {
      const remaining = await rows(`${table}?${column}=eq.${encodeURIComponent(ownerId)}&select=${column}&limit=1`).catch(() => []);
      assert(remaining.length === 0, `Cleanup left ${table} rows for ${ownerId}.`);
    }
    const auth = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(ownerId)}`, {
      headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
    });
    assert(auth.status === 404, `Cleanup left Auth user ${ownerId} (${auth.status}).`);
  }
  for (const key of storageKeys) {
    let exists = false;
    try {
      await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      exists = true;
    } catch {
      exists = false;
    }
    assert(!exists, `Cleanup left R2 object ${key}.`);
  }
}

async function cleanupAll() {
  await deleteConfiguredTestAccount(identity);
  if (!live) await deleteConfiguredTestAccount(foreignIdentity);
}

if (cleanupOnly) {
  await cleanupAll();
  process.exit(0);
}

await mkdir(artifactDir, { recursive: true });
let primaryError = null;
let trackedKeys = new Set();
try {
  await cleanupAll();
  const account = await createConfiguredTestAccount(namespace);
  let result;
  if (live) {
    result = await verifyLive(account);
  } else {
    const foreign = await createConfiguredTestAccount(foreignNamespace);
    result = await verifyMock(account, foreign);
  }
  trackedKeys = result.trackedKeys;
  await writeFile(
    `${artifactDir}/${live ? "phase18f-live-evidence.json" : "phase18f-mock-evidence.json"}`,
    `${JSON.stringify(result.evidence, null, 2)}\n`,
  );
  console.log(`Phase 18F ${live ? "live deployed-worker" : "run-owned mock"} Image Upscale verification passed.`);
} catch (error) {
  primaryError = error;
} finally {
  try {
    await cleanupAll();
    await verifyCleanup(live ? [identity.id] : [identity.id, foreignIdentity.id], trackedKeys);
  } catch (cleanupError) {
    if (!primaryError) primaryError = cleanupError;
    else console.error(cleanupError);
  }
}
if (primaryError) throw primaryError;
