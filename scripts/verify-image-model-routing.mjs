import {
  configuredTestAccountIdentity,
  createConfiguredTestAccount,
  deleteConfiguredTestAccount,
  withAccountAuthorization,
} from "./lib/configured-test-account.mjs";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const accountIdentity = configuredTestAccountIdentity("image-model-routing");

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: supabaseKey,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
  RENDERLAB_TEST_NATIVE_WORKER_GATEWAY_URL: process.env.RENDERLAB_TEST_NATIVE_WORKER_GATEWAY_URL,
})) {
  if (!value) throw new Error(`${name} is required for image model routing verification.`);
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
  if (!response.ok) throw new Error(`Image model routing query failed (${response.status}): ${await response.text()}`);
  return response.json();
}

async function request(account, body) {
  const response = await fetch(`${baseUrl}/api/generation/jobs`, withAccountAuthorization(account, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  }));
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

async function loadJob(jobId) {
  return (await rows(`generation_jobs?id=eq.${encodeURIComponent(jobId)}&select=*&limit=1`))[0] ?? null;
}

async function cleanup() {
  await supabase(`generation_admission_reservations?owner_id=eq.${encodeURIComponent(accountIdentity.id)}`, { method: "DELETE" }).catch(() => {});
  await supabase(`generation_jobs?owner_id=eq.${encodeURIComponent(accountIdentity.id)}`, { method: "DELETE" }).catch(() => {});
  await deleteConfiguredTestAccount(accountIdentity);
}

if (process.argv.includes("--cleanup-only")) {
  await cleanup();
  process.exit(0);
}

await cleanup();
try {
  const account = await createConfiguredTestAccount("image-model-routing");

  const invalidTuning = await request(account, {
    model: "qwen-image-edit-2511",
    prompt: "routing validation",
    output: { kind: "image", aspectRatio: "1:1" },
    inputs: [],
    advanced: { seed: 42, steps: 8, guidance: 1 },
  });
  assert(invalidTuning.response.status === 400 && invalidTuning.payload?.error?.code === "invalid_request",
    `Qwen accepted non-fixed Steps: ${invalidTuning.response.status} ${JSON.stringify(invalidTuning.payload)}`);

  const invalidOutput = await request(account, {
    model: "qwen-image-edit-2511",
    prompt: "routing validation",
    output: { kind: "video", aspectRatio: "16:9", resolution: "480p", durationSeconds: 5, audioEnabled: true },
    inputs: [],
  });
  assert(invalidOutput.response.status === 400 && invalidOutput.payload?.error?.code === "invalid_request",
    `Qwen was accepted for Video: ${invalidOutput.response.status} ${JSON.stringify(invalidOutput.payload)}`);

  const qwen = await request(account, {
    model: "qwen-image-edit-2511",
    prompt: "routing validation qwen",
    output: { kind: "image", aspectRatio: "1:1" },
    inputs: [],
    advanced: { seed: 99 },
  });
  assert(qwen.response.status === 202 && qwen.payload?.ok && qwen.payload.job?.id,
    `Qwen submission failed: ${qwen.response.status} ${JSON.stringify(qwen.payload)}`);
  const qwenRow = await loadJob(qwen.payload.job.id);
  assert(qwenRow?.workflow_id === "qwen-image-edit-2511-generate", `Wrong Qwen workflow: ${JSON.stringify(qwenRow)}`);
  assert(qwenRow?.ecosystem === "qwen-image-edit-2511", `Wrong Qwen ecosystem: ${JSON.stringify(qwenRow)}`);
  assert(qwenRow?.model === "Qwen Image Edit 2511 · Lightning 4-step", `Wrong Qwen model metadata: ${JSON.stringify(qwenRow)}`);
  assert(qwenRow?.worker_id === "qwen-primary-01", `Qwen did not route through its registered fleet: ${JSON.stringify(qwenRow)}`);
  assert(qwenRow?.parameters?.model === "qwen-image-edit-2511", `Qwen product intent was not persisted: ${JSON.stringify(qwenRow?.parameters)}`);
  assert(qwenRow?.parameters?.advanced?.steps === undefined && qwenRow?.parameters?.advanced?.guidance === undefined,
    `Qwen persisted hidden FLUX tuning: ${JSON.stringify(qwenRow?.parameters)}`);

  const flux = await request(account, {
    model: "flux2-klein-9b",
    prompt: "routing validation flux",
    output: { kind: "image", aspectRatio: "1:1" },
    inputs: [],
    advanced: { seed: 7, steps: 12, guidance: 2 },
  });
  assert(flux.response.status === 202 && flux.payload?.ok && flux.payload.job?.id,
    `FLUX submission failed: ${flux.response.status} ${JSON.stringify(flux.payload)}`);
  const fluxRow = await loadJob(flux.payload.job.id);
  assert(fluxRow?.workflow_id === "flux2-klein-image-generate", `Wrong FLUX workflow: ${JSON.stringify(fluxRow)}`);
  assert(fluxRow?.ecosystem === "flux2-klein-9b", `Wrong FLUX ecosystem: ${JSON.stringify(fluxRow)}`);
  assert(fluxRow?.worker_id === "flux-standby-01", `FLUX did not respect current active fleet routing: ${JSON.stringify(fluxRow)}`);
  assert(fluxRow?.parameters?.model === "flux2-klein-9b", `FLUX product intent was not persisted: ${JSON.stringify(fluxRow?.parameters)}`);
  assert(fluxRow?.parameters?.advanced?.steps === 12 && fluxRow?.parameters?.advanced?.guidance === 2,
    `FLUX configurable tuning was not preserved: ${JSON.stringify(fluxRow?.parameters)}`);

  const historicalDefault = await request(account, {
    prompt: "routing validation historical default",
    output: { kind: "image", aspectRatio: "1:1" },
    inputs: [],
  });
  assert(historicalDefault.response.status === 202 && historicalDefault.payload?.ok && historicalDefault.payload.job?.id,
    `Default image submission failed: ${historicalDefault.response.status} ${JSON.stringify(historicalDefault.payload)}`);
  const defaultRow = await loadJob(historicalDefault.payload.job.id);
  assert(defaultRow?.ecosystem === "flux2-klein-9b" && defaultRow?.parameters?.model === "flux2-klein-9b",
    `Historical omitted-model default did not remain FLUX: ${JSON.stringify(defaultRow)}`);

  console.log(JSON.stringify({
    qwen: { job: qwenRow.id, workflow: qwenRow.workflow_id, ecosystem: qwenRow.ecosystem, worker: qwenRow.worker_id },
    flux: { job: fluxRow.id, workflow: fluxRow.workflow_id, ecosystem: fluxRow.ecosystem, worker: fluxRow.worker_id },
    historicalDefault: { job: defaultRow.id, ecosystem: defaultRow.ecosystem },
  }, null, 2));
} finally {
  await cleanup();
}
