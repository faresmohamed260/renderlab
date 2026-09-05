import {
  configuredTestAccountIdentity,
  createConfiguredTestAccount,
  deleteConfiguredTestAccount,
  withAccountAuthorization,
} from "./lib/configured-test-account.mjs";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const reconcilerSecret = process.env.RENDERLAB_GENERATION_RECONCILER_SECRET;
const fixtureIdentity = configuredTestAccountIdentity("generation-cancellation-live");

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
  if (!value) throw new Error(`${name} is required for live generation cancellation verification.`);
}
if (process.env.RENDERLAB_TEST_RECONCILER_OWNER_SCOPE !== "true"
  || process.env.RENDERLAB_TEST_RECONCILER_OWNER_ID !== fixtureIdentity.id) {
  throw new Error("Live generation cancellation verification requires exact reconciler owner scoping.");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
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
  if (!response.ok) {
    throw new Error(`Live cancellation query failed (${response.status}): ${await response.text()}`);
  }
  return response.json();
}

async function appJson(path, account, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, withAccountAuthorization(account, init));
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { response, payload };
}

async function reconcile() {
  const response = await fetch(`${baseUrl}/api/internal/generation/reconcile`, {
    method: "POST",
    headers: { authorization: `Bearer ${reconcilerSecret}`, accept: "application/json" },
  });
  const payload = await response.json().catch(() => null);
  assert(response.status === 200 && payload?.ok, `Live cancellation reconcile failed: ${JSON.stringify(payload)}`);
}

async function loadJob(ownerId, jobId) {
  return (await rows(
    `generation_jobs?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(jobId)}&select=id,owner_id,status,operation,worker_id,provider_job_id,failover_history,output_asset_ids,completed_at,reconcile_token&limit=1`,
  ))[0] ?? null;
}

async function loadAssets(ownerId, jobId) {
  return rows(
    `media_assets?owner_id=eq.${encodeURIComponent(ownerId)}&generation_job_id=eq.${encodeURIComponent(jobId)}&select=id,generation_output_index,storage_key,thumbnail_storage_key`,
  );
}

async function loadReservations(ownerId, jobId) {
  return rows(
    `generation_admission_reservations?owner_id=eq.${encodeURIComponent(ownerId)}&job_id=eq.${encodeURIComponent(jobId)}&select=id,released_at`,
  );
}

function providerConfirmation(job) {
  return [...(job.failover_history || [])].reverse().find((entry) => entry?.phase === "cancel-provider-confirmed") || null;
}

async function submitAndCancel(account, request, expectation) {
  const submission = await appJson("/api/generation/jobs", account, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(request),
  });
  assert(
    submission.response.status === 202 && submission.payload?.ok && submission.payload.job?.id,
    `${expectation.label} submit failed (${submission.response.status}): ${JSON.stringify(submission.payload)}`,
  );

  const jobId = submission.payload.job.id;
  let persisted = await loadJob(account.id, jobId);
  assert(persisted?.worker_id?.startsWith(expectation.workerPrefix), `${expectation.label} routed to unexpected worker.`);
  assert(persisted?.provider_job_id, `${expectation.label} did not persist provider dispatch identity.`);
  assert(["queued", "preparing", "running"].includes(persisted.status), `${expectation.label} was not cancellable after acceptance: ${persisted.status}`);

  console.log(`${expectation.label} accepted and mapped to the expected native ecosystem; requesting cancellation.`);
  const cancellation = await appJson(`/api/generation/jobs/${encodeURIComponent(jobId)}/cancel`, account, {
    method: "POST",
    headers: { accept: "application/json" },
  });
  assert(
    cancellation.response.status === 200 && cancellation.payload?.ok && cancellation.payload.job?.id === jobId,
    `${expectation.label} cancellation failed (${cancellation.response.status}): ${JSON.stringify(cancellation.payload)}`,
  );
  assert(
    cancellation.payload.job.status === "cancelling" || cancellation.payload.job.status === "cancelled",
    `${expectation.label} cancellation returned unexpected state ${cancellation.payload.job.status}.`,
  );

  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    persisted = await loadJob(account.id, jobId);
    assert(persisted, `${expectation.label} job disappeared during cancellation.`);
    if (persisted.status === "cancelled") break;
    assert(persisted.status === "cancelling", `${expectation.label} left cancelling via unexpected state ${persisted.status}.`);
    await reconcile();
    await wait(1000);
  }

  persisted = await loadJob(account.id, jobId);
  assert(persisted?.status === "cancelled", `${expectation.label} did not reach terminal cancelled state.`);
  assert(persisted.completed_at, `${expectation.label} did not record terminal completion time.`);
  assert(Array.isArray(persisted.output_asset_ids) && persisted.output_asset_ids.length === 0, `${expectation.label} published an output ID after cancellation.`);
  assert(persisted.reconcile_token == null, `${expectation.label} retained a reconciliation claim after terminal cancellation.`);

  const confirmation = providerConfirmation(persisted);
  assert(confirmation, `${expectation.label} did not record provider cancellation confirmation.`);
  assert(
    Number.isInteger(confirmation.status)
      && ((confirmation.status >= 200 && confirmation.status < 300) || confirmation.status === 404 || confirmation.status === 410),
    `${expectation.label} provider cancellation returned unexpected status ${confirmation.status}.`,
  );
  assert(
    !(persisted.failover_history || []).some((entry) => entry?.phase === "cancel-local-grace-expired"),
    `${expectation.label} resolved through the local grace fallback instead of provider cancellation mapping.`,
  );

  assert((await loadAssets(account.id, jobId)).length === 0, `${expectation.label} created durable media after cancellation.`);
  const reservations = await loadReservations(account.id, jobId);
  assert(reservations.length === 1 && reservations[0].released_at, `${expectation.label} did not release its bound admission reservation.`);

  await reconcile();
  await wait(1500);
  await reconcile();
  persisted = await loadJob(account.id, jobId);
  assert(persisted?.status === "cancelled" && persisted.output_asset_ids.length === 0, `${expectation.label} changed after repeated reconciliation.`);
  assert((await loadAssets(account.id, jobId)).length === 0, `${expectation.label} gained durable media after repeated reconciliation.`);

  console.log(`${expectation.label} verified provider-backed cancellation with no durable output.`);
  return jobId;
}

async function assertFixtureCleanup() {
  const encodedOwner = encodeURIComponent(fixtureIdentity.id);
  for (const table of ["generation_jobs", "generation_sources", "media_assets", "media_upload_sessions", "generation_admission_reservations", "renderlab_account_access"]) {
    const list = await rows(`${table}?${table === "renderlab_account_access" ? "user_id" : "owner_id"}=eq.${encodedOwner}&select=*`);
    assert(list.length === 0, `Live cancellation cleanup left ${table} rows.`);
  }
}

try {
  await deleteConfiguredTestAccount(fixtureIdentity).catch(() => {});
  const account = await createConfiguredTestAccount("generation-cancellation-live");

  await submitAndCancel(account, {
    prompt: "RenderLab live cancellation verification: a simple blue circle on a neutral background",
    output: { kind: "image", aspectRatio: "1:1" },
    inputs: [],
    advanced: { seed: 27182, steps: 4, guidance: 1 },
  }, {
    label: "FLUX Image cancellation",
    workerPrefix: "flux-",
  });

  await submitAndCancel(account, {
    prompt: "RenderLab live cancellation verification: a static blue square on a neutral studio background",
    output: { kind: "video", aspectRatio: "16:9", resolution: "480p", durationSeconds: 5, audioEnabled: false },
    inputs: [],
    advanced: { seed: 27182, frameRate: 24 },
  }, {
    label: "REDGraft Video cancellation",
    workerPrefix: "ltx-",
  });

  console.log("Live FLUX and REDGraft cancellation verification passed.");
} finally {
  await deleteConfiguredTestAccount(fixtureIdentity);
  await assertFixtureCleanup();
}
