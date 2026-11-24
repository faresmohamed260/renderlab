import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { setTimeout as wait } from "node:timers/promises";
import { configuredTestAccountIdentity, createConfiguredTestAccount, deleteConfiguredTestAccount, withAccountAuthorization } from "./lib/configured-test-account.mjs";

const baseUrl = "https://renderlab.faresuniform.uk";
const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.R2_BUCKET_NAME;
const namespace = "production-h1-late-return";
const ownerIdentity = configuredTestAccountIdentity(namespace);
const trackedStorageKeys = new Set();
const artifactDir = "artifacts/production-h1-late-return";
const r2Client = new S3Client({
  region: "auto", endpoint: "https://" + process.env.R2_ACCOUNT_ID + ".r2.cloudflarestorage.com",
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID || "", secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "" },
  requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED",
});
function assert(condition, message) { if (!condition) throw new Error(message); }
async function serviceRest(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceRoleKey);
  headers.set("authorization", "Bearer " + serviceRoleKey);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(supabaseUrl + "/rest/v1/" + path, { ...init, headers });
}

async function serviceRows(path) {
  const response = await serviceRest(path);
  if (!response.ok) {
    throw new Error("QA-002 service query failed (" + response.status + "): " + await response.text());
  }
  return response.json();
}

/** A read-only fixture witness; used only for the one-generation text-to-image smoke. */
async function readSingleSmokeDurability(ownerId, { jobId, assetId }) {
  const owner = "owner_id=eq." + encodeURIComponent(ownerId);
  const [jobs, reservations, assets] = await Promise.all([
    serviceRows("generation_jobs?" + owner + "&select=id,status,output_asset_ids,completed_at"),
    serviceRows("generation_admission_reservations?" + owner + "&select=id,job_id,released_at"),
    serviceRows("media_assets?" + owner + "&generation_job_id=eq." + encodeURIComponent(jobId)
      + "&deleted_at=is.null&select=id,generation_job_id,deleted_at"),
  ]);
  assert(jobs.length === 1 && jobs[0].id === jobId && jobs[0].status === "succeeded"
    && Boolean(jobs[0].completed_at),
  "Single FIBO smoke job was not durably terminal.");
  assert(Array.isArray(jobs[0].output_asset_ids) && jobs[0].output_asset_ids.length === 1
    && jobs[0].output_asset_ids[0] === assetId,
  "Single FIBO smoke job did not index exactly one output.");
  assert(assets.length === 1 && assets[0].id === assetId
    && assets[0].generation_job_id === jobId && !assets[0].deleted_at,
  "Single FIBO smoke produced an unexpected number of live Library assets.");
  assert(reservations.length === 1 && reservations[0].job_id === jobId
    && typeof reservations[0].released_at === "string" && Boolean(reservations[0].released_at),
  "Single FIBO smoke did not release its bound admission reservation.");
  return {
    jobId, status: jobs[0].status, outputAssetIds: jobs[0].output_asset_ids,
    completedAt: jobs[0].completed_at, assetIds: assets.map((asset) => asset.id),
    reservationId: reservations[0].id, reservationReleasedAt: reservations[0].released_at,
  };
}

async function collectTrackedStorageKeys(ownerId) {
  const encoded = encodeURIComponent(ownerId);
  const [sessions, assets, sources] = await Promise.all([
    serviceRows("media_upload_sessions?owner_id=eq." + encoded + "&select=storage_key"),
    serviceRows("media_assets?owner_id=eq." + encoded + "&select=storage_key,thumbnail_storage_key"),
    serviceRows("generation_sources?owner_id=eq." + encoded + "&select=storage_key"),
  ]);
  trackedStorageKeys.add("renderlab/account-profiles/" + ownerId + "/avatar.webp");
  for (const row of sessions) if (row.storage_key) trackedStorageKeys.add(row.storage_key);
  for (const row of assets) {
    if (row.storage_key) trackedStorageKeys.add(row.storage_key);
    if (row.thumbnail_storage_key) trackedStorageKeys.add(row.thumbnail_storage_key);
  }
  for (const row of sources) if (row.storage_key) trackedStorageKeys.add(row.storage_key);
}

async function objectExists(key) {
  try {
    await r2Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    if (error?.$metadata?.httpStatusCode === 404 || error?.name === "NotFound" || error?.name === "NoSuchKey") return false;
    throw error;
  }
}

async function assertIndependentCleanup(ownerId) {
  const encoded = encodeURIComponent(ownerId);
  for (const [table, column] of [
    ["generation_admission_reservations", "owner_id"],
    ["generation_jobs", "owner_id"],
    ["generation_sources", "owner_id"],
    ["media_upload_sessions", "owner_id"],
    ["media_assets", "owner_id"],
    ["media_collections", "owner_id"],
    ["media_collection_items", "owner_id"],
    ["renderlab_account_profiles", "owner_id"],
    ["renderlab_account_preferences", "owner_id"],
    ["renderlab_account_exports", "owner_id"],
    ["renderlab_account_lifecycle", "user_id"],
    ["renderlab_account_access", "user_id"],
  ]) {
    const rows = await serviceRows(table + "?" + column + "=eq." + encoded + "&select=*&limit=1");
    assert(rows.length === 0, "QA-002 cleanup left " + table + " residue for " + ownerId + ".");
  }

  const auth = await fetch(supabaseUrl + "/auth/v1/admin/users/" + encoded, {
    headers: { apikey: serviceRoleKey, authorization: "Bearer " + serviceRoleKey },
  });
  assert(auth.status === 404, "QA-002 cleanup left the run-owned Auth identity.");

  for (const key of trackedStorageKeys) {
    assert(!(await objectExists(key)), "QA-002 cleanup left a tracked R2 object.");
  }
  return {
    verified: true,
    trackedR2ObjectsChecked: trackedStorageKeys.size,
    contractedDbAuthResidue: 0,
  };
}


async function cleanupFixture() {
  await collectTrackedStorageKeys(ownerIdentity.id);
  await deleteConfiguredTestAccount(ownerIdentity);
  const result = await assertIndependentCleanup(ownerIdentity.id);
  for (const table of ["generation_dispatch_outbox", "renderlab_generation_request_keys"]) {
    const residue = await serviceRows(table + "?owner_id=eq." + encodeURIComponent(ownerIdentity.id) + "&select=*&limit=1");
    assert(residue.length === 0, "dispatch or request key residue");
  }
  return result;
}
function outputId(jobId) {
  const b = createHash("sha256").update("renderlab:generation-output:" + jobId + ":0").digest().subarray(0, 16);
  b[6] = (b[6] & 15) | 80; b[8] = (b[8] & 63) | 128;
  const h = b.toString("hex");
  return [h.slice(0,8),h.slice(8,12),h.slice(12,16),h.slice(16,20),h.slice(20)].join("-");
}
const proof = { expectedSha: process.env.RENDERLAB_EXPECTED_PRODUCTION_SHA, providerGenerationCount: 0, libraryLoads: 0, jobStatusPolls: 0, passed: false };
let stage = "preflight";
let failed = false;
assert(process.env.GITHUB_REF === "refs/heads/main" && process.env.GITHUB_EVENT_NAME === "workflow_dispatch" &&
  process.env.RENDERLAB_CONFIRM_BOUNDED_FIXTURE_PROVIDER_WORK === "true" &&
  /^[0-9a-f]{40}$/.test(proof.expectedSha || ""), "not authorized");
for (const key of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"]) assert(process.env[key], "missing required configuration");
if (process.argv.includes("--cleanup-only")) {
  try { await cleanupFixture(); console.log("H1_CLEANUP verified"); } catch { console.error("H1_FAIL cleanup"); process.exitCode=1; }
} else {
await mkdir(artifactDir, { recursive: true });
try {
  stage = "fixture";
  const account = await createConfiguredTestAccount(namespace);
  proof.fixtureAccountId = account.id;
  const owner = "owner_id=eq." + encodeURIComponent(account.id);
  stage = "submit";
  // Exactly one POST, no retry. No job-status GET, browser visit or provider poll during wait.
  const response = await fetch(baseUrl + "/api/generation/jobs", withAccountAuthorization(account, {
    method: "POST", redirect: "error", headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({prompt:"C1 disposable verification: cobalt glass sphere on neutral gray",output:{kind:"image",aspectRatio:"1:1"},inputs:[],advanced:{seed:42001,steps:4,guidance:1}}),
  }));
  proof.submissionStatus = response.status;
  const payload = await response.json();
  assert(response.status === 202 && payload?.ok && /^[0-9a-f-]{36}$/.test(payload?.job?.id || ""), "submission not accepted");
  proof.providerGenerationCount = 1;
  proof.jobId = payload.job.id;
  proof.acceptedAt = new Date().toISOString();
  console.log("H1_ACCEPTED 202 " + proof.acceptedAt + " job=" + proof.jobId);
  stage = "unpolled_wait";
  await wait(22 * 60_000);
  const before = await serviceRows("generation_jobs?" + owner + "&select=id,status,provider_job_id,created_at,output_asset_ids,error_code");
  assert(before.length === 1 && before[0].id === proof.jobId, "fixture job missing or duplicated");
  const row = before[0];
  proof.beforeLibrary = {status:row.status,providerDispatched:Boolean(row.provider_job_id),createdAt:row.created_at,outputCount:row.output_asset_ids?.length || 0,ageSeconds:Math.floor((Date.now()-Date.parse(row.created_at))/1000)};
  const assetId = outputId(row.id);
  const month = new Date(row.created_at).toISOString().slice(0,7).replace("-", "/");
  trackedStorageKeys.add("renderlab/generations/" + month + "/" + assetId + ".png");
  trackedStorageKeys.add("renderlab/thumbnails/" + month + "/" + assetId + ".png");
  assert(proof.beforeLibrary.ageSeconds > 1200 && row.status === "running" && row.provider_job_id && proof.beforeLibrary.outputCount === 0, "not an expired unpolled running job");
  stage = "one_library_load";
  proof.libraryLoads = 1;
  proof.libraryLoadedAt = new Date().toISOString();
  const library = await fetch(baseUrl + "/library", withAccountAuthorization(account,{redirect:"error",headers:{accept:"text/html"}}));
  proof.libraryHttp = library.status;
  const html = await library.text();
  assert(library.status === 200, "Library request failed");
  // Allow the original request's after() continuation; no second page load or job poll.
  await wait(30_000);
  stage = "durable_witness";
  const result = await serviceRows("generation_jobs?" + owner + "&select=id,status,error_code,output_asset_ids,completed_at");
  proof.afterLibrary = {status:result[0]?.status || null,errorCode:result[0]?.error_code || null,completedAt:result[0]?.completed_at || null};
  assert(result.length === 1 && result[0].id === proof.jobId && result[0].status === "succeeded" && !result[0].error_code, "late return failed");
  proof.durable = await readSingleSmokeDurability(account.id,{jobId:proof.jobId,assetId});
  proof.libraryContainsAsset = html.includes(assetId);
  // The contract permits an after() continuation; verify durable asset, not an immediate HTML render.
  const assets = await serviceRows("media_assets?" + owner + "&select=id,storage_key,thumbnail_storage_key&deleted_at=is.null");
  assert(assets.length === 1 && assets[0].id === assetId && await objectExists(assets[0].storage_key), "one durable R2 asset required");
  console.log("H1_LATE_RETURN succeeded age_seconds=" + proof.beforeLibrary.ageSeconds + " assets=1 released=true library_loads=1 job_polls=0");
} catch {
  failed = true; proof.failedStage = stage; console.error("H1_FAIL " + stage);
} finally {
  try { proof.cleanup = await cleanupFixture(); console.log("H1_CLEANUP verified"); }
  catch { failed=true; proof.cleanup={verified:false}; console.error("H1_FAIL cleanup"); }
  proof.passed = !failed && proof.providerGenerationCount === 1 && proof.libraryLoads === 1 && proof.cleanup?.verified === true;
  await writeFile(artifactDir + "/manifest.json", JSON.stringify(proof,null,2)+"\n");
}
if (!proof.passed) process.exitCode=1;
}
