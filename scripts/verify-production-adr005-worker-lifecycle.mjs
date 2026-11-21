import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import {
  configuredTestAccountIdentity,
  createConfiguredTestAccount,
  deleteConfiguredTestAccount,
  withAccountAuthorization,
} from "./lib/configured-test-account.mjs";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "").replace(/\/$/, "");
const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const expectedSource = process.env.RENDERLAB_EXPECTED_PRODUCTION_SHA?.trim() || "";
const scenario = process.env.RENDERLAB_ADR005_LIFECYCLE_SCENARIO || "";
const confirmed = process.env.RENDERLAB_CONFIRM_ADR005_PROVIDER_WORK === "true";
const processTerminationConfirmed = process.env.RENDERLAB_CONFIRM_ADR005_PROCESS_TERMINATION === "true";
const runId = process.env.GITHUB_RUN_ID || "local";
const artifactDir = process.env.RENDERLAB_ADR005_ARTIFACT_DIR || "artifacts/production-adr005-worker-lifecycle";
const accountNamespace = `adr005-${scenario}`;
const fixtureIdentity = configuredTestAccountIdentity(accountNamespace);
const terminal = new Set(["succeeded", "failed", "cancelled"]);
const events = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function validateConfiguration() {
  assert(["warm-queue", "cancel-recovery", "process-exit-recovery"].includes(scenario),
    "ADR-005 lifecycle scenario must be warm-queue, cancel-recovery, or process-exit-recovery.");
  assert(confirmed, "ADR-005 lifecycle verification requires explicit bounded provider-work confirmation.");
  if (scenario === "process-exit-recovery") {
    assert(processTerminationConfirmed,
      "ADR-005 process-exit verification requires explicit ComfyUI-subprocess termination confirmation.");
  }
  assert(/^[0-9a-f]{40}$/i.test(expectedSource), "Expected production source must be an exact Git SHA.");
  assert(baseUrl === "https://renderlab.faresuniform.uk", "ADR-005 lifecycle verification must target the production custom domain.");
  for (const [name, value] of Object.entries({
    SUPABASE_URL: supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
  })) assert(Boolean(value), `${name} is required for ADR-005 lifecycle verification.`);
}

async function service(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceRoleKey);
  headers.set("authorization", `Bearer ${serviceRoleKey}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers });
}

async function serviceRows(path) {
  const response = await service(path);
  if (!response.ok) throw new Error(`ADR-005 database read failed (${response.status}): ${await response.text()}`);
  return response.json();
}

async function appRequest(path, account, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("origin", baseUrl);
  headers.set("accept", "application/json");
  const response = await fetch(`${baseUrl}${path}`, withAccountAuthorization(account, { ...init, headers }));
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { response, payload };
}

async function uploadReference(account) {
  const bytes = await sharp(Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="#e6dfd2"/><circle cx="256" cy="256" r="130" fill="#2463eb"/></svg>',
  )).png().toBuffer();
  const ticketResult = await appRequest("/api/assets/reference/upload-tickets", account, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ filename: `adr005-${runId}.png`, mimeType: "image/png", sizeBytes: bytes.length }),
  });
  assert(ticketResult.response.ok, `Reference ticket failed: ${JSON.stringify(ticketResult.payload)}`);
  const ticket = ticketResult.payload?.ticket;
  assert(ticket?.sourceId && ticket?.uploadUrl && ticket?.method === "PUT", "Reference ticket was incomplete.");
  const upload = await fetch(ticket.uploadUrl, { method: "PUT", headers: ticket.headers, body: bytes });
  assert(upload.ok, `Reference upload failed (${upload.status}).`);
  const completion = await appRequest("/api/assets/reference/upload-completions", account, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sourceId: ticket.sourceId, width: 512, height: 512 }),
  });
  assert(completion.response.ok && completion.payload?.source?.status === "ready", `Reference completion failed: ${JSON.stringify(completion.payload)}`);
  return ticket.sourceId;
}

async function submit(account, { prompt, sourceId, steps = 4 }) {
  const inputs = sourceId ? [{ alias: "image1", role: "primary-image", source: { type: "temporary-source", id: sourceId } }] : [];
  const result = await appRequest("/api/generation/jobs", account, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      prompt,
      output: { kind: "image", aspectRatio: "1:1" },
      inputs,
      advanced: { seed: sourceId ? 42002 : 42001, steps, guidance: 1 },
    }),
  });
  assert(result.response.status === 202 && result.payload?.ok && result.payload.job?.id,
    `Generation submission failed (${result.response.status}): ${JSON.stringify(result.payload)}`);
  events.push({ at: new Date().toISOString(), phase: "submitted", jobId: result.payload.job.id, edit: Boolean(sourceId) });
  return result.payload.job.id;
}

async function databaseJob(ownerId, jobId) {
  const rows = await serviceRows(
    `generation_jobs?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(jobId)}`
      + "&select=id,status,worker_state,provider_job_id,output_asset_ids,error_code,started_at,completed_at,created_at,updated_at&limit=1",
  );
  const row = rows[0];
  if (!row) return null;
  const { provider_job_id: providerJobId, ...safe } = row;
  return { ...safe, providerDispatched: Boolean(providerJobId) };
}

async function waitForDatabaseJob(ownerId, jobId, predicate, label, timeoutMs = 8 * 60_000) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    last = await databaseJob(ownerId, jobId);
    if (last && predicate(last)) return last;
    await wait(750);
  }
  throw new Error(`${label} timed out; last state=${JSON.stringify(last)}`);
}

async function reconcileJob(account, jobId) {
  const result = await appRequest(`/api/generation/jobs/${encodeURIComponent(jobId)}`, account);
  assert(result.response.ok && result.payload?.ok && result.payload.job?.id === jobId,
    `Generation reconciliation failed (${result.response.status}): ${JSON.stringify(result.payload)}`);
  return result.payload.job;
}

async function waitForTerminal(account, jobId, timeoutMs = 10 * 60_000) {
  const deadline = Date.now() + timeoutMs;
  let job = null;
  while (Date.now() < deadline) {
    job = await reconcileJob(account, jobId);
    if (terminal.has(job.status)) {
      events.push({ at: new Date().toISOString(), phase: "terminal", jobId, status: job.status });
      return job;
    }
    await wait(1000);
  }
  throw new Error(`Generation ${jobId} did not terminalize; last state=${JSON.stringify(job)}`);
}

async function waitForExternalProcessExit(account, jobId, timeoutMs = 4 * 60_000) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    last = await appRequest(`/api/generation/jobs/${encodeURIComponent(jobId)}`, account);
    if (last.response.ok && last.payload?.job?.status === "failed") {
      events.push({ at: new Date().toISOString(), phase: "provider-process-exit-terminal", jobId });
      return { terminal: last.payload.job, transientFailureObserved: false };
    }
    if (last.response.status >= 500) {
      events.push({ at: new Date().toISOString(), phase: "provider-process-exit-unreadable", jobId,
        responseStatus: last.response.status });
      return { terminal: null, transientFailureObserved: true };
    }
    assert(!terminal.has(last.payload?.job?.status),
      `Process-exit target terminalized as ${last.payload?.job?.status} before external termination was observed.`);
    await wait(750);
  }
  throw new Error(`External process exit was not observed; last status=${last?.response?.status}.`);
}

async function ageRunOwnedProviderFailure(ownerId, jobId) {
  const response = await service(
    `generation_jobs?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(jobId)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ updated_at: new Date(Date.now() - 3 * 60 * 60_000).toISOString() }),
    },
  );
  const rows = await response.json().catch(() => []);
  assert(response.ok && rows.length === 1, `Could not advance the run-owned provider-failure clock (${response.status}).`);
  events.push({ at: new Date().toISOString(), phase: "provider-failure-clock-advanced", jobId });
}

async function verifySavedOutput(account, ownerId, jobId) {
  const rows = await serviceRows(
    `media_assets?owner_id=eq.${encodeURIComponent(ownerId)}&generation_job_id=eq.${encodeURIComponent(jobId)}`
      + "&select=id,generation_output_index,storage_key&order=generation_output_index.asc",
  );
  assert(rows.length === 1 && rows[0].generation_output_index === 0, `Expected one indexed Library result for ${jobId}.`);
  const content = await fetch(`${baseUrl}/api/media/assets/${encodeURIComponent(rows[0].id)}/content`,
    withAccountAuthorization(account, { redirect: "manual" }));
  assert(content.status === 302 && content.headers.get("location"), `Library result ${rows[0].id} did not resolve privately.`);
  const object = await fetch(content.headers.get("location"), { redirect: "error" });
  const bytes = Buffer.from(await object.arrayBuffer());
  assert(object.ok && bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")), `Library result ${rows[0].id} was not a readable PNG.`);
  return rows[0].id;
}

async function dispatchRows(ownerId) {
  const rows = await serviceRows(
    `generation_dispatch_outbox?owner_id=eq.${encodeURIComponent(ownerId)}`
      + "&select=attempt_id,job_id,status,delivery_count,backend_call_id,send_reserved_at,execution_started_at,created_at,updated_at&order=created_at.asc",
  );
  return rows.map(({ backend_call_id: backendCallId, ...row }) => ({
    ...row,
    providerCallBound: Boolean(backendCallId),
    providerCallFingerprint: backendCallId
      ? createHash("sha256").update(backendCallId).digest("hex").slice(0, 12)
      : null,
  }));
}

async function runWarmQueue(account, sourceId) {
  const firstId = await submit(account, { prompt: `ADR-005 warm queue ${runId}: a cobalt glass orb on a neutral background` });
  const firstRunning = await waitForDatabaseJob(account.id, firstId,
    (job) => job.status === "running" && job.providerDispatched, "first render start");
  events.push({ at: new Date().toISOString(), phase: "provider-started", jobId: firstId });

  const secondId = await submit(account, {
    prompt: "Change @image1 into a cobalt glass orb while preserving the flat neutral background.",
    sourceId,
  });
  const queuedPair = await waitForDatabaseJob(account.id, secondId, (job) => job.status === "queued", "second queued render", 30_000);
  const firstDuringQueue = await databaseJob(account.id, firstId);
  assert(firstDuringQueue && !terminal.has(firstDuringQueue.status), "First render completed before the queued-pair state could be observed.");
  events.push({ at: new Date().toISOString(), phase: "queued-behind-active", firstJobId: firstId, secondJobId: secondId });

  const first = await waitForTerminal(account, firstId);
  const second = await waitForTerminal(account, secondId);
  assert(first.status === "succeeded" && second.status === "succeeded", "Warm queue jobs did not both succeed.");
  const firstAssetId = await verifySavedOutput(account, account.id, firstId);
  const secondAssetId = await verifySavedOutput(account, account.id, secondId);
  const dispatch = await dispatchRows(account.id);
  assert(dispatch.length === 2 && dispatch.every((row) => row.delivery_count === 1 && row.providerCallBound && row.execution_started_at),
    `Warm queue did not preserve exactly-once dispatch: ${JSON.stringify(dispatch)}`);
  assert(new Set(dispatch.map((row) => row.providerCallFingerprint)).size === 2, "Warm queue reused a provider call identity.");
  return { firstId, secondId, firstAssetId, secondAssetId, firstRunning, queuedPair, dispatch };
}

async function runCancelRecovery(account) {
  const cancelledId = await submit(account, {
    prompt: `ADR-005 cancellation ${runId}: a detailed cobalt mechanical sphere on a neutral studio background`,
    steps: 8,
  });
  await waitForDatabaseJob(account.id, cancelledId,
    (job) => job.status === "running" && job.providerDispatched, "cancel target provider start");
  events.push({ at: new Date().toISOString(), phase: "provider-started", jobId: cancelledId });
  const cancellation = await appRequest(`/api/generation/jobs/${encodeURIComponent(cancelledId)}/cancel`, account, { method: "POST" });
  assert([200, 202].includes(cancellation.response.status) && cancellation.payload?.ok,
    `Active cancellation failed (${cancellation.response.status}): ${JSON.stringify(cancellation.payload)}`);
  const cancelled = await waitForDatabaseJob(account.id, cancelledId, (job) => job.status === "cancelled", "cancelled terminal state", 90_000);
  const cancelledAssets = await serviceRows(
    `media_assets?owner_id=eq.${encodeURIComponent(account.id)}&generation_job_id=eq.${encodeURIComponent(cancelledId)}&select=id`,
  );
  assert(cancelledAssets.length === 0 && cancelled.output_asset_ids.length === 0, "Cancelled render published durable output.");
  events.push({ at: new Date().toISOString(), phase: "provider-cancelled", jobId: cancelledId });

  const recoveryId = await submit(account, { prompt: `ADR-005 clean recovery ${runId}: a simple cobalt sphere, neutral background, no text` });
  const recovery = await waitForTerminal(account, recoveryId);
  assert(recovery.status === "succeeded", `Post-cancellation render ended as ${recovery.status}.`);
  const recoveryAssetId = await verifySavedOutput(account, account.id, recoveryId);
  const dispatch = await dispatchRows(account.id);
  assert(dispatch.length === 2 && dispatch.every((row) => row.delivery_count === 1 && row.providerCallBound),
    `Cancellation recovery did not preserve exactly-once dispatch: ${JSON.stringify(dispatch)}`);
  return { cancelledId, recoveryId, recoveryAssetId, cancelled, dispatch };
}

async function runProcessExitRecovery(account) {
  const failedId = await submit(account, {
    prompt: `ADR-005 process exit ${runId}: a detailed cobalt mechanical sphere on a neutral studio background`,
    steps: 8,
  });
  await waitForDatabaseJob(account.id, failedId,
    (job) => job.status === "running" && job.providerDispatched, "process-exit provider start");
  events.push({ at: new Date().toISOString(), phase: "provider-started-awaiting-external-process-exit", jobId: failedId });
  console.log(`ADR005_PROCESS_EXIT_READY job=${failedId}`);

  const observed = await waitForExternalProcessExit(account, failedId);
  await ageRunOwnedProviderFailure(account.id, failedId);
  const failed = observed.terminal || await waitForTerminal(account, failedId, 90_000);
  assert(failed.status === "failed", `Process-exit render ended as ${failed.status}.`);
  const failedRow = await databaseJob(account.id, failedId);
  const failedAssets = await serviceRows(
    `media_assets?owner_id=eq.${encodeURIComponent(account.id)}&generation_job_id=eq.${encodeURIComponent(failedId)}&select=id`,
  );
  assert(failedRow && failedRow.status === "failed" && failedAssets.length === 0
    && failedRow.output_asset_ids.length === 0, "Process-exit render published durable output or lacked a truthful failed state.");

  const recoveryId = await submit(account, {
    prompt: `ADR-005 process-exit recovery ${runId}: a simple cobalt sphere, neutral background, no text`,
  });
  const recovery = await waitForTerminal(account, recoveryId);
  assert(recovery.status === "succeeded", `Post-process-exit render ended as ${recovery.status}.`);
  const recoveryAssetId = await verifySavedOutput(account, account.id, recoveryId);
  const dispatch = await dispatchRows(account.id);
  assert(dispatch.length === 2 && dispatch.every((row) => row.delivery_count === 1 && row.providerCallBound),
    `Process-exit recovery did not preserve exactly-once dispatch: ${JSON.stringify(dispatch)}`);
  return { failedId, recoveryId, recoveryAssetId, failed: failedRow, dispatch };
}

validateConfiguration();
await mkdir(artifactDir, { recursive: true });
let account = null;
let outcome = null;
let primaryError = null;
let cleanupVerified = false;

try {
  await deleteConfiguredTestAccount(fixtureIdentity).catch(() => {});
  account = await createConfiguredTestAccount(accountNamespace);
  if (scenario === "warm-queue") {
    const sourceId = await uploadReference(account);
    outcome = await runWarmQueue(account, sourceId);
  } else if (scenario === "cancel-recovery") {
    outcome = await runCancelRecovery(account);
  } else {
    outcome = await runProcessExitRecovery(account);
  }
} catch (error) {
  primaryError = error;
  console.error(error);
} finally {
  try {
    await deleteConfiguredTestAccount(account || fixtureIdentity);
    const residue = await serviceRows(
      `generation_dispatch_outbox?owner_id=eq.${encodeURIComponent(fixtureIdentity.id)}&select=attempt_id&limit=1`,
    );
    assert(residue.length === 0, "ADR-005 lifecycle cleanup left durable dispatch residue.");
    cleanupVerified = true;
  } catch (error) {
    console.error(error);
    if (!primaryError) primaryError = error;
  }
}

const manifest = {
  audit: "ADR-005 production worker lifecycle",
  scenario,
  runId,
  expectedProductionSource: expectedSource,
  providerCallCeiling: 2,
  outcome,
  events,
  cleanupVerified,
  passed: !primaryError && cleanupVerified,
  completedAt: new Date().toISOString(),
};
await writeFile(`${artifactDir}/manifest.json`, JSON.stringify(manifest, null, 2) + "\n", "utf8");
if (primaryError) throw primaryError;
console.log(`ADR-005 ${scenario} production lifecycle verification passed with exact fixture cleanup.`);
