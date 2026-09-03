import { createHash, randomUUID } from "node:crypto";
import {
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  configuredTestAccountIdentity,
  createConfiguredTestAccount,
  deleteConfiguredTestAccount,
  withAccountAuthorization,
} from "./lib/configured-test-account.mjs";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const mockWorkerUrl = (process.env.RENDERLAB_TEST_NATIVE_WORKER_GATEWAY_URL || "http://127.0.0.1:4312").replace(/\/$/, "");
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const reconcilerSecret = process.env.RENDERLAB_GENERATION_RECONCILER_SECRET;
const r2Bucket = process.env.R2_BUCKET_NAME;
const fixtureAccount = configuredTestAccountIdentity("generation-reconciliation");
const fixtureKeys = new Set();

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: supabaseKey,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
  RENDERLAB_GENERATION_RECONCILER_SECRET: reconcilerSecret,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: r2Bucket,
})) {
  if (!value) throw new Error(`${name} is required for Phase 14 generation reconciliation verification.`);
}

if (process.env.RENDERLAB_TEST_RECONCILER_OWNER_SCOPE !== "true") {
  throw new Error("Phase 14 verifier requires explicit test reconciler owner scoping.");
}
if (process.env.RENDERLAB_TEST_RECONCILER_OWNER_ID !== fixtureAccount.id) {
  throw new Error("Phase 14 reconciler owner scope does not match its configured fixture account.");
}

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

async function supabase(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", supabaseKey);
  headers.set("authorization", `Bearer ${supabaseKey}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers });
}

async function rows(path) {
  const response = await supabase(path);
  if (!response.ok) throw new Error(`Supabase Phase 14 query failed (${response.status}): ${await response.text()}`);
  return response.json();
}

async function serviceMutation(path, init = {}) {
  const response = await supabase(path, init);
  if (!response.ok) throw new Error(`Supabase Phase 14 mutation failed (${response.status}): ${await response.text()}`);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function loadJob(jobId) {
  return (await rows(`generation_jobs?id=eq.${encodeURIComponent(jobId)}&owner_id=eq.${encodeURIComponent(fixtureAccount.id)}&select=*&limit=1`))[0] ?? null;
}

async function loadAssets(jobId) {
  return rows(
    `media_assets?generation_job_id=eq.${encodeURIComponent(jobId)}&owner_id=eq.${encodeURIComponent(fixtureAccount.id)}&select=id,storage_key,thumbnail_storage_key,mime_type,kind,generation_output_index&order=created_at.asc,id.asc`,
  );
}

async function loadReservations(jobId) {
  return rows(
    `generation_admission_reservations?owner_id=eq.${encodeURIComponent(fixtureAccount.id)}&job_id=eq.${encodeURIComponent(jobId)}&select=id,released_at,expires_at`,
  );
}

function deterministicAssetId(jobId, outputIndex = 0) {
  const bytes = Buffer.from(
    createHash("sha256")
      .update(`renderlab:generation-output:${jobId}:${outputIndex}`)
      .digest()
      .subarray(0, 16),
  );
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function outputExtension(kind) {
  return kind === "video" ? "mp4" : "png";
}

function expectedPrimaryKey(job, kind) {
  const created = new Date(job.created_at);
  const year = created.getUTCFullYear();
  const month = String(created.getUTCMonth() + 1).padStart(2, "0");
  return `renderlab/generations/${year}/${month}/${deterministicAssetId(job.id)}.${outputExtension(kind)}`;
}

function expectedThumbnailKey(job) {
  const created = new Date(job.created_at);
  const year = created.getUTCFullYear();
  const month = String(created.getUTCMonth() + 1).padStart(2, "0");
  return `renderlab/thumbnails/${year}/${month}/${deterministicAssetId(job.id)}.png`;
}

async function objectExists(key) {
  try {
    await r2Client.send(new HeadObjectCommand({ Bucket: r2Bucket, Key: key }));
    return true;
  } catch (error) {
    const status = error?.$metadata?.httpStatusCode;
    if (status === 404 || error?.name === "NotFound" || error?.name === "NoSuchKey") return false;
    throw error;
  }
}

async function objectCountForDeterministicAsset(key) {
  const prefix = key.replace(/\.[^.]+$/, "");
  const result = await r2Client.send(new ListObjectsV2Command({ Bucket: r2Bucket, Prefix: prefix }));
  return (result.Contents || []).filter((item) => item.Key?.startsWith(prefix)).length;
}

async function internalReconcile(auth = reconcilerSecret) {
  const headers = auth ? { authorization: `Bearer ${auth}` } : {};
  const response = await fetch(`${baseUrl}/api/internal/generation/reconcile`, {
    method: "POST",
    headers,
  });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { response, payload };
}

async function requireReconcile() {
  const result = await internalReconcile();
  if (result.response.status !== 200 || !result.payload?.ok) {
    throw new Error(`Internal reconciliation failed (${result.response.status}): ${JSON.stringify(result.payload)}`);
  }
  return result.payload.summary;
}

async function setMockProviderState(job, state) {
  if (!job?.provider_job_id) throw new Error(`Cannot set provider state ${state} without a provider job ID.`);
  const response = await fetch(`${mockWorkerUrl}/jobs/${encodeURIComponent(job.provider_job_id)}/${state}`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Could not set Phase 14 mock provider state ${state} (${response.status}): ${await response.text()}`);
  }
}

async function submit(account, request, label) {
  const response = await fetch(
    `${baseUrl}/api/generation/jobs`,
    withAccountAuthorization(account, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    }),
  );
  const payload = await response.json().catch(() => null);
  if (response.status !== 202 || !payload?.ok || !payload.job?.id) {
    throw new Error(`${label} submission failed (${response.status}): ${JSON.stringify(payload)}`);
  }
  const job = await loadJob(payload.job.id);
  if (!job) throw new Error(`${label} persisted job was not found.`);
  const primaryKey = expectedPrimaryKey(job, request.output.kind);
  fixtureKeys.add(primaryKey);
  if (request.output.kind === "video") fixtureKeys.add(expectedThumbnailKey(job));
  console.log(`${label} accepted job=${job.id}; no browser job-status GET will be used.`);
  return job;
}

async function assertCanonicalSuccess(account, jobId, kind, { thumbnailExpected = undefined } = {}) {
  const job = await loadJob(jobId);
  const assets = await loadAssets(jobId);
  if (!job || job.status !== "succeeded") {
    throw new Error(`Expected succeeded job ${jobId}: ${JSON.stringify(job)}`);
  }
  if (job.reconcile_token !== null || job.reconcile_lease_until !== null) {
    throw new Error(`Succeeded job retained a reconciliation claim: ${JSON.stringify(job)}`);
  }
  if (assets.length !== 1) {
    throw new Error(`Expected exactly one durable output for ${jobId}, found ${assets.length}: ${JSON.stringify(assets)}`);
  }
  const asset = assets[0];
  const expectedId = deterministicAssetId(jobId);
  if (asset.id !== expectedId || asset.generation_output_index !== 0 || asset.kind !== kind) {
    throw new Error(`Canonical output slot mismatch for ${jobId}: ${JSON.stringify(asset)}`);
  }
  if (!Array.isArray(job.output_asset_ids) || job.output_asset_ids.length !== 1 || job.output_asset_ids[0] !== asset.id) {
    throw new Error(`Job output identity does not match canonical media for ${jobId}.`);
  }
  if (asset.storage_key !== expectedPrimaryKey(job, kind)) {
    throw new Error(`Deterministic storage key mismatch for ${jobId}: ${asset.storage_key}`);
  }
  if (!(await objectExists(asset.storage_key))) throw new Error(`Canonical R2 object is missing for ${jobId}.`);
  if ((await objectCountForDeterministicAsset(asset.storage_key)) !== 1) {
    throw new Error(`More than one R2 primary object exists for deterministic output ${jobId}.`);
  }
  if (thumbnailExpected !== undefined && Boolean(asset.thumbnail_storage_key) !== thumbnailExpected) {
    throw new Error(`Thumbnail expectation mismatch for ${jobId}: ${JSON.stringify(asset)}`);
  }

  const mediaResponse = await fetch(
    `${baseUrl}/api/media/assets/${encodeURIComponent(asset.id)}`,
    withAccountAuthorization(account, { headers: { accept: "application/json" } }),
  );
  const mediaPayload = await mediaResponse.json().catch(() => null);
  if (!mediaResponse.ok || !mediaPayload?.ok || mediaPayload.asset?.id !== asset.id) {
    throw new Error(`Canonical output is not readable through the product media API (${mediaResponse.status}): ${JSON.stringify(mediaPayload)}`);
  }

  const reservations = await loadReservations(jobId);
  if (reservations.length !== 1 || !reservations[0].released_at) {
    throw new Error(`Terminal job ${jobId} did not settle its bound generation reservation: ${JSON.stringify(reservations)}`);
  }
  return { job, asset };
}

async function assertNoAssets(jobId) {
  const assets = await loadAssets(jobId);
  if (assets.length !== 0) throw new Error(`Expected no durable output yet for ${jobId}: ${JSON.stringify(assets)}`);
}

async function insertStaleJob({ workerId = null, providerJobId = null, label }) {
  const timestamp = new Date(Date.now() - 20 * 60 * 1000).toISOString();
  const id = randomUUID();
  const inserted = await serviceMutation("generation_jobs?select=*", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      id,
      owner_id: fixtureAccount.id,
      status: workerId && providerJobId ? "running" : "queued",
      operation: "create-image",
      output_kind: "image",
      prompt: `Phase 14 ${label}`,
      workflow_id: "flux2-klein-image-generate",
      model: "FLUX.2 Klein 9B · DarkBeast V2 BFS",
      ecosystem: "flux2-klein-9b",
      inputs: [],
      parameters: { output: { kind: "image", aspectRatio: "1:1" }, advanced: {} },
      worker_id: workerId,
      provider_job_id: providerJobId,
      worker_state: workerId ? "unknown" : null,
      created_at: timestamp,
      updated_at: timestamp,
      started_at: workerId ? timestamp : null,
    }),
  });
  if (!inserted?.[0]?.id) throw new Error(`Could not insert ${label} stale job fixture.`);
  return inserted[0];
}

async function claimLease(jobId, token) {
  const result = await serviceMutation("rpc/renderlab_claim_generation_reconciliation", {
    method: "POST",
    body: JSON.stringify({
      p_owner_id: fixtureAccount.id,
      p_job_id: jobId,
      p_token: token,
      p_lease_seconds: 600,
    }),
  });
  if (result !== true) throw new Error(`Could not claim Phase 14 interruption lease for ${jobId}.`);
}

async function expireLease(jobId) {
  await serviceMutation(
    `generation_jobs?owner_id=eq.${encodeURIComponent(fixtureAccount.id)}&id=eq.${encodeURIComponent(jobId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ reconcile_lease_until: new Date(Date.now() - 1000).toISOString() }),
    },
  );
}

async function backdateJob(jobId, milliseconds) {
  await serviceMutation(
    `generation_jobs?owner_id=eq.${encodeURIComponent(fixtureAccount.id)}&id=eq.${encodeURIComponent(jobId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ updated_at: new Date(Date.now() - milliseconds).toISOString() }),
    },
  );
}

async function cleanup() {
  for (const key of fixtureKeys) {
    await r2Client.send(new DeleteObjectCommand({ Bucket: r2Bucket, Key: key })).catch(() => {});
  }
  fixtureKeys.clear();
  await deleteConfiguredTestAccount(fixtureAccount);
}

try {
  await cleanup();
  const account = await createConfiguredTestAccount("generation-reconciliation");

  const unauthenticated = await internalReconcile(null);
  if (unauthenticated.response.status !== 401) {
    throw new Error(`Internal reconciler accepted an unauthenticated request (${unauthenticated.response.status}).`);
  }
  const wrongSecret = await internalReconcile("wrong-phase14-secret");
  if (wrongSecret.response.status !== 401) {
    throw new Error(`Internal reconciler accepted an invalid secret (${wrongSecret.response.status}).`);
  }

  // One ordinary accepted job proves browser-independent lifecycle plus three ordered
  // fault boundaries: before R2, after R2/before media metadata, and after media/before
  // terminal job commit. The fault injector consumes each configured fault once.
  const faultJob = await submit(
    account,
    {
      prompt: "Phase 14 autonomous finalization fault recovery image",
      output: { kind: "image", aspectRatio: "1:1" },
      inputs: [],
    },
    "Fault-recovery image",
  );
  const faultKey = expectedPrimaryKey(faultJob, "image");

  await requireReconcile(); // mock worker -> 202 generating
  if ((await loadJob(faultJob.id))?.status !== "running") throw new Error("Fault job did not remain running after initial worker poll.");

  await requireReconcile(); // before-primary-write fault
  if ((await loadJob(faultJob.id))?.status !== "persisting") throw new Error("Before-write fault did not leave job recoverably persisting.");
  await assertNoAssets(faultJob.id);
  if (await objectExists(faultKey)) throw new Error("Before-primary-write fault unexpectedly committed an R2 object.");

  await requireReconcile(); // after-primary-write fault
  if (!(await objectExists(faultKey))) throw new Error("After-primary-write fault did not leave the deterministic R2 object for retry.");
  await assertNoAssets(faultJob.id);
  if ((await objectCountForDeterministicAsset(faultKey)) !== 1) throw new Error("Deterministic R2 retry path produced more than one primary object.");

  // Remove the provider result now. Everything after this point must recover from durable
  // RenderLab state rather than assuming the worker can serve the result again.
  await setMockProviderState(await loadJob(faultJob.id), "expire-result");

  await requireReconcile(); // adopts deterministic R2 object, inserts media, then after-media-insert fault
  const afterMediaJob = await loadJob(faultJob.id);
  const afterMediaAssets = await loadAssets(faultJob.id);
  if (afterMediaJob?.status !== "persisting" || afterMediaAssets.length !== 1 || afterMediaAssets[0].generation_output_index !== 0) {
    throw new Error(`After-media fault did not preserve one recoverable canonical output: ${JSON.stringify({ afterMediaJob, afterMediaAssets })}`);
  }

  await requireReconcile(); // adopts existing media with provider result still unavailable
  await assertCanonicalSuccess(account, faultJob.id, "image");

  // Concurrent scheduler/browser-equivalent reconciliation must converge on one lease and
  // one output slot. No browser GET endpoint is used here either.
  const raceJob = await submit(
    account,
    {
      prompt: "Phase 14 concurrent reconciliation image",
      output: { kind: "image", aspectRatio: "1:1" },
      inputs: [],
    },
    "Concurrent image",
  );
  await Promise.all([requireReconcile(), requireReconcile()]);
  await Promise.all([requireReconcile(), requireReconcile()]);
  await assertCanonicalSuccess(account, raceJob.id, "image");

  // Simulate scheduler interruption after claiming a job. An active lease blocks work;
  // after forced expiry, a new reconciler safely reclaims and finishes the same job.
  const leaseJob = await submit(
    account,
    {
      prompt: "Phase 14 expired reconciliation lease recovery image",
      output: { kind: "image", aspectRatio: "1:1" },
      inputs: [],
    },
    "Lease-recovery image",
  );
  const abandonedToken = randomUUID();
  await claimLease(leaseJob.id, abandonedToken);
  await requireReconcile();
  const blockedJob = await loadJob(leaseJob.id);
  if (blockedJob?.reconcile_token !== abandonedToken || blockedJob?.worker_state !== "queued") {
    throw new Error(`Active reconciliation lease did not block competing work: ${JSON.stringify(blockedJob)}`);
  }
  await expireLease(leaseJob.id);
  await requireReconcile();
  await requireReconcile();
  await assertCanonicalSuccess(account, leaseJob.id, "image");

  // The final configured fault occurs during optional video poster persistence. Primary
  // video success must not be converted into a failed generation because a thumbnail write
  // is unavailable.
  const videoJob = await submit(
    account,
    {
      prompt: "Phase 14 optional poster failure video",
      output: { kind: "video", aspectRatio: "16:9", durationSeconds: 5, resolution: "480p", audioEnabled: false },
      inputs: [],
    },
    "Poster-fault video",
  );
  await requireReconcile();
  await requireReconcile();
  await assertCanonicalSuccess(account, videoJob.id, "video", { thumbnailExpected: false });
  if (await objectExists(expectedThumbnailKey(videoJob))) {
    throw new Error("Optional thumbnail fault unexpectedly left a thumbnail object.");
  }

  // Stale incomplete orchestration and invalid worker identity must converge to truthful
  // failed terminal states instead of occupying capacity forever.
  const staleDispatch = await insertStaleJob({ label: "stale undispatched" });
  await requireReconcile();
  const staleDispatchAfter = await loadJob(staleDispatch.id);
  if (staleDispatchAfter?.status !== "failed" || staleDispatchAfter?.error_code !== "generation_orchestration_stalled") {
    throw new Error(`Stale undispatched job did not fail safely: ${JSON.stringify(staleDispatchAfter)}`);
  }

  const invalidWorker = await insertStaleJob({
    workerId: "phase14-missing-worker",
    providerJobId: randomUUID(),
    label: "invalid worker",
  });
  await requireReconcile();
  const invalidWorkerAfter = await loadJob(invalidWorker.id);
  if (invalidWorkerAfter?.status !== "failed" || invalidWorkerAfter?.error_code !== "generation_worker_unavailable") {
    throw new Error(`Invalid-worker job did not fail safely: ${JSON.stringify(invalidWorkerAfter)}`);
  }

  // Retryable provider outages do not stay active forever. After two hours without a
  // successful status update, reconciliation terminalizes with sanitized product copy while
  // preserving the provider diagnostic only in server-owned failover history.
  const staleProvider = await submit(
    account,
    {
      prompt: "Phase 14 stale provider outage image",
      output: { kind: "image", aspectRatio: "1:1" },
      inputs: [],
    },
    "Stale-provider image",
  );
  await setMockProviderState(staleProvider, "unavailable");
  await backdateJob(staleProvider.id, 3 * 60 * 60 * 1000);
  await requireReconcile();
  const staleProviderAfter = await loadJob(staleProvider.id);
  const internalMarker = "phase14-internal-provider-detail-must-not-leak";
  if (staleProviderAfter?.status !== "failed" || staleProviderAfter?.error_code !== "generation_provider_stalled") {
    throw new Error(`Stale provider outage did not terminalize safely: ${JSON.stringify(staleProviderAfter)}`);
  }
  if (String(staleProviderAfter.error_message || "").includes(internalMarker)) {
    throw new Error("Provider diagnostic leaked into the product error message.");
  }
  if (!JSON.stringify(staleProviderAfter.failover_history || []).includes(internalMarker)) {
    throw new Error("Provider diagnostic was not retained in server-owned failover history.");
  }
  const staleProviderReservations = await loadReservations(staleProvider.id);
  if (staleProviderReservations.length !== 1 || !staleProviderReservations[0].released_at) {
    throw new Error(`Stale provider terminalization did not settle admission: ${JSON.stringify(staleProviderReservations)}`);
  }

  const remainingActive = await rows(
    `generation_jobs?owner_id=eq.${encodeURIComponent(account.id)}&status=in.(queued,preparing,running,persisting)&select=id,status`,
  );
  if (remainingActive.length) throw new Error(`Phase 14 left active fixture jobs: ${JSON.stringify(remainingActive)}`);

  const duplicateSlots = await rows(
    `media_assets?owner_id=eq.${encodeURIComponent(account.id)}&generation_output_index=not.is.null&select=generation_job_id,generation_output_index,id`,
  );
  const seenSlots = new Set();
  for (const asset of duplicateSlots) {
    const key = `${asset.generation_job_id}:${asset.generation_output_index}`;
    if (seenSlots.has(key)) throw new Error(`Duplicate generation output slot survived Phase 14 verification: ${key}`);
    seenSlots.add(key);
  }

  console.log("Phase 14 autonomous generation reconciliation verified: browser-independent completion, provider-independent durable fault recovery, lease races, bounded stale-provider handling, sanitized product errors, admission settlement, product-media readability, optional thumbnail failure and stale-job terminalization all passed.");
} finally {
  await cleanup();
}
