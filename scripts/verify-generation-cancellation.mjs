import { randomUUID } from "node:crypto";
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
const reconcilerSecret = process.env.RENDERLAB_GENERATION_RECONCILER_SECRET;
const ownerIdentity = configuredTestAccountIdentity("generation-cancellation-owner");
const foreignIdentity = configuredTestAccountIdentity("generation-cancellation-foreign");

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
  if (!value) throw new Error(`${name} is required for Phase 15 generation cancellation verification.`);
}

if (process.env.RENDERLAB_TEST_RECONCILER_OWNER_SCOPE !== "true") {
  throw new Error("Phase 15 cancellation verifier requires explicit reconciler owner scoping.");
}
if (process.env.RENDERLAB_TEST_RECONCILER_OWNER_ID !== ownerIdentity.id) {
  throw new Error("Phase 15 reconciler owner scope does not match its configured fixture owner.");
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
  if (!response.ok) throw new Error(`Supabase cancellation query failed (${response.status}): ${await response.text()}`);
  return response.json();
}

async function mutate(path, init = {}) {
  const response = await supabase(path, init);
  if (!response.ok) throw new Error(`Supabase cancellation mutation failed (${response.status}): ${await response.text()}`);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function loadJob(ownerId, jobId) {
  return (await rows(`generation_jobs?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(jobId)}&select=*&limit=1`))[0] ?? null;
}

async function loadAssets(ownerId, jobId) {
  return rows(`media_assets?owner_id=eq.${encodeURIComponent(ownerId)}&generation_job_id=eq.${encodeURIComponent(jobId)}&select=id,generation_output_index,storage_key`);
}

async function loadReservations(ownerId, jobId) {
  return rows(`generation_admission_reservations?owner_id=eq.${encodeURIComponent(ownerId)}&job_id=eq.${encodeURIComponent(jobId)}&select=id,released_at,expires_at`);
}

async function assertNoDurableOutput(ownerId, jobId) {
  const assets = await loadAssets(ownerId, jobId);
  assert(assets.length === 0, `Cancelled job ${jobId} unexpectedly has durable media: ${JSON.stringify(assets)}`);
}

async function assertAdmission(ownerId, jobId, released) {
  const reservations = await loadReservations(ownerId, jobId);
  assert(reservations.length === 1, `Expected one bound reservation for ${jobId}: ${JSON.stringify(reservations)}`);
  assert(Boolean(reservations[0].released_at) === released, `Reservation release mismatch for ${jobId}: ${JSON.stringify(reservations)}`);
}

async function submit(account, outputKind, label) {
  const request = outputKind === "video"
    ? {
        prompt: `Phase 15 ${label}`,
        output: { kind: "video", aspectRatio: "16:9", durationSeconds: 5, audioEnabled: false, resolution: "480p" },
        inputs: [],
        advanced: { seed: 42, frameRate: 24 },
      }
    : {
        prompt: `Phase 15 ${label}`,
        output: { kind: "image", aspectRatio: "1:1" },
        inputs: [],
        advanced: { seed: 42, steps: 4, guidance: 1 },
      };
  const response = await fetch(
    `${baseUrl}/api/generation/jobs`,
    withAccountAuthorization(account, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(request),
    }),
  );
  const payload = await response.json().catch(() => null);
  assert(response.status === 202 && payload?.ok && payload.job?.id, `${label} submission failed (${response.status}): ${JSON.stringify(payload)}`);
  const job = await loadJob(account.id, payload.job.id);
  assert(job?.status === "running" && job.worker_id && job.provider_job_id, `${label} did not persist native dispatch identity: ${JSON.stringify(job)}`);
  return job;
}

async function createUpscaleCancellationJob(account, label) {
  const providerResponse = await fetch(`${mockWorkerUrl}/jobs/upscale`, {
    method: "POST",
    body: new FormData(),
  });
  const provider = await providerResponse.json().catch(() => null);
  assert(
    providerResponse.ok && provider?.call_id && provider?.worker_id === "renderlab-upscale-01",
    `Could not create ${label} Upscale provider fixture: ${JSON.stringify(provider)}`,
  );
  const now = new Date().toISOString();
  const id = randomUUID();
  const inserted = await mutate("generation_jobs?select=*", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      id,
      owner_id: account.id,
      status: "running",
      operation: "upscale-image",
      output_kind: "image",
      prompt: null,
      workflow_id: "swinir-classical-sr-image-upscale-2x",
      model: "SwinIR Classical SR · 2×",
      ecosystem: "image-upscale-v1",
      inputs: [{
        alias: "image1",
        role: "primary-image",
        source: { type: "media-asset", id: randomUUID() },
      }],
      parameters: { upscale: { scale: 2 } },
      worker_id: "renderlab-upscale-01",
      provider_job_id: provider.call_id,
      worker_state: "queued",
      failover_history: [],
      output_asset_ids: [],
      created_at: now,
      updated_at: now,
      started_at: now,
    }),
  });
  assert(inserted?.[0]?.id === id, `Could not persist ${label} Upscale cancellation fixture.`);
  return inserted[0];
}

async function postCancel(account, jobId) {
  const response = await fetch(
    `${baseUrl}/api/generation/jobs/${encodeURIComponent(jobId)}/cancel`,
    withAccountAuthorization(account, { method: "POST", headers: { accept: "application/json" } }),
  );
  return { status: response.status, body: await response.json().catch(() => null) };
}

async function postCancelUnauthenticated(jobId) {
  const response = await fetch(`${baseUrl}/api/generation/jobs/${encodeURIComponent(jobId)}/cancel`, {
    method: "POST",
    headers: { accept: "application/json" },
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}

async function setCancelMode(job, mode) {
  const response = await fetch(`${mockWorkerUrl}/jobs/${encodeURIComponent(job.provider_job_id)}/cancel-mode/${mode}`, { method: "POST" });
  assert(response.ok, `Could not set mock cancel mode ${mode} for ${job.id}.`);
}

async function mockState(job) {
  const response = await fetch(`${mockWorkerUrl}/jobs/${encodeURIComponent(job.provider_job_id)}/state`);
  assert(response.ok, `Could not load mock state for ${job.id}.`);
  return response.json();
}

async function internalReconcile() {
  const response = await fetch(`${baseUrl}/api/internal/generation/reconcile`, {
    method: "POST",
    headers: { authorization: `Bearer ${reconcilerSecret}` },
  });
  const payload = await response.json().catch(() => null);
  assert(response.status === 200 && payload?.ok, `Internal reconciliation failed (${response.status}): ${JSON.stringify(payload)}`);
  return payload.summary;
}

async function patchJob(ownerId, jobId, patch) {
  const result = await mutate(
    `generation_jobs?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(jobId)}&select=*`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(patch),
    },
  );
  return result?.[0] ?? null;
}

async function cleanup() {
  await deleteConfiguredTestAccount(ownerIdentity).catch(() => {});
  await deleteConfiguredTestAccount(foreignIdentity).catch(() => {});
}

try {
  await cleanup();
  const owner = await createConfiguredTestAccount("generation-cancellation-owner");
  const foreign = await createConfiguredTestAccount("generation-cancellation-foreign");

  const confirmed = await submit(owner, "image", "confirmed cancel image");
  const signedOut = await postCancelUnauthenticated(confirmed.id);
  assert(signedOut.status === 401 && signedOut.body?.error?.code === "authentication_required", "Signed-out Cancel did not preserve authentication boundary.");
  const foreignAttempt = await postCancel(foreign, confirmed.id);
  assert(foreignAttempt.status === 404 && foreignAttempt.body?.error?.code === "job_not_found", "Foreign Cancel did not collapse to not-found.");

  const confirmedCancel = await postCancel(owner, confirmed.id);
  assert(confirmedCancel.status === 200 && confirmedCancel.body?.ok && confirmedCancel.body.job.status === "cancelled", `Confirmed Cancel did not terminalize: ${JSON.stringify(confirmedCancel)}`);
  await assertNoDurableOutput(owner.id, confirmed.id);
  await assertAdmission(owner.id, confirmed.id, true);
  const confirmedState = await mockState(confirmed);
  assert(confirmedState.cancelled === true && confirmedState.cancelAttempts === 1 && confirmedState.polls === 0, `Confirmed provider Cancel mismatch: ${JSON.stringify(confirmedState)}`);
  const repeated = await postCancel(owner, confirmed.id);
  assert(repeated.status === 200 && repeated.body?.job?.status === "cancelled", "Repeated Cancel was not idempotent.");
  assert((await mockState(confirmed)).cancelAttempts === 1, "Repeated terminal Cancel hit provider twice.");

  const upscaleCancelJob = await createUpscaleCancellationJob(owner, "Phase18D");
  const upscaleCancel = await postCancel(owner, upscaleCancelJob.id);
  assert(
    upscaleCancel.status === 200 && upscaleCancel.body?.ok && upscaleCancel.body.job.status === "cancelled",
    `Upscale Cancel did not terminalize through the dedicated worker: ${JSON.stringify(upscaleCancel)}`,
  );
  const upscaleCancelState = await mockState(upscaleCancelJob);
  assert(
    upscaleCancelState.cancelled === true && upscaleCancelState.cancelAttempts === 1,
    `Upscale provider Cancel mapping mismatch: ${JSON.stringify(upscaleCancelState)}`,
  );
  await assertNoDurableOutput(owner.id, upscaleCancelJob.id);

  const simultaneous = await submit(owner, "video", "simultaneous cancel video");
  const [simA, simB] = await Promise.all([postCancel(owner, simultaneous.id), postCancel(owner, simultaneous.id)]);
  for (const [label, result] of [["A", simA], ["B", simB]]) {
    assert((result.status === 200 || result.status === 202) && result.body?.ok, `Simultaneous Cancel ${label} failed: ${JSON.stringify(result)}`);
    assert(["cancelling", "cancelled"].includes(result.body.job.status), `Simultaneous Cancel ${label} returned wrong state.`);
  }
  await internalReconcile();
  const simultaneousDone = await loadJob(owner.id, simultaneous.id);
  assert(simultaneousDone?.status === "cancelled", `Simultaneous Cancel did not converge: ${JSON.stringify(simultaneousDone)}`);
  await assertNoDurableOutput(owner.id, simultaneous.id);
  await assertAdmission(owner.id, simultaneous.id, true);

  const retryable = await submit(owner, "image", "retryable cancel image");
  await setCancelMode(retryable, "retryable");
  const retryableCancel = await postCancel(owner, retryable.id);
  assert(retryableCancel.status === 202 && retryableCancel.body?.job?.status === "cancelling", `Retryable provider failure did not preserve cancelling: ${JSON.stringify(retryableCancel)}`);
  await assertNoDurableOutput(owner.id, retryable.id);
  await assertAdmission(owner.id, retryable.id, false);
  const retryState1 = await mockState(retryable);
  assert(retryState1.cancelAttempts === 1 && retryState1.polls === 0, `Retryable Cancel unexpectedly polled/finalized provider: ${JSON.stringify(retryState1)}`);
  await internalReconcile();
  const retryMid = await loadJob(owner.id, retryable.id);
  assert(retryMid?.status === "cancelling", `Cancellation reconciler left retryable state: ${JSON.stringify(retryMid)}`);
  assert((await mockState(retryable)).cancelAttempts >= 2, "Cancellation reconciler did not retry provider DELETE.");
  await setCancelMode(retryable, "confirm");
  await internalReconcile();
  const retryDone = await loadJob(owner.id, retryable.id);
  assert(retryDone?.status === "cancelled", `Retryable Cancel did not terminalize after provider recovery: ${JSON.stringify(retryDone)}`);
  assert(!(retryDone.failover_history || []).some((entry) => String(entry.phase || "").startsWith("poll-reassign")), "Cancellation incorrectly triggered standby failover.");
  await assertNoDurableOutput(owner.id, retryable.id);
  await assertAdmission(owner.id, retryable.id, true);

  const notRunning = await submit(owner, "video", "provider not running video");
  await setCancelMode(notRunning, "not-running");
  const notRunningCancel = await postCancel(owner, notRunning.id);
  assert(notRunningCancel.status === 200 && notRunningCancel.body?.job?.status === "cancelled", `Provider-not-running Cancel did not terminalize: ${JSON.stringify(notRunningCancel)}`);
  await assertNoDurableOutput(owner.id, notRunning.id);
  await assertAdmission(owner.id, notRunning.id, true);

  const grace = await submit(owner, "image", "local grace expiry image");
  await setCancelMode(grace, "retryable");
  const oldAt = new Date(Date.now() - 11 * 60_000).toISOString();
  await patchJob(owner.id, grace.id, {
    status: "cancelling",
    worker_state: "cancelling",
    failover_history: [{ phase: "cancel-requested", workerId: grace.worker_id, at: oldAt }],
    updated_at: oldAt,
  });
  await internalReconcile();
  const graceDone = await loadJob(owner.id, grace.id);
  assert(graceDone?.status === "cancelled", `Cancellation grace expiry did not terminalize locally: ${JSON.stringify(graceDone)}`);
  assert((graceDone.failover_history || []).some((entry) => entry.phase === "cancel-local-grace-expired"), "Grace-expired cancellation diagnostic was not recorded.");
  await assertNoDurableOutput(owner.id, grace.id);
  await assertAdmission(owner.id, grace.id, true);

  const persistenceWins = await submit(owner, "image", "persistence wins image");
  await patchJob(owner.id, persistenceWins.id, { status: "persisting", worker_state: "finalizing", updated_at: new Date().toISOString() });
  const rejected = await postCancel(owner, persistenceWins.id);
  assert(rejected.status === 409 && rejected.body?.error?.code === "cancel_not_available", `Persisting job accepted Cancel: ${JSON.stringify(rejected)}`);
  assert((await mockState(persistenceWins)).cancelAttempts === 0, "Persisting rejection still called provider DELETE.");
  await patchJob(owner.id, persistenceWins.id, { status: "failed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  await mutate(
    `generation_admission_reservations?owner_id=eq.${encodeURIComponent(owner.id)}&job_id=eq.${encodeURIComponent(persistenceWins.id)}&released_at=is.null`,
    { method: "PATCH", body: JSON.stringify({ released_at: new Date().toISOString() }) },
  );

  const missing = await postCancel(owner, randomUUID());
  assert(missing.status === 404 && missing.body?.error?.code === "job_not_found", "Missing Cancel did not return not-found.");

  console.log("Phase 15 generation cancellation verification passed: serialized Cancel, retries, grace expiry, ownership, admission and zero-output invariants.");
} finally {
  await cleanup();
}
