import {
  configuredTestAccountIdentity,
  createConfiguredTestAccount,
  deleteConfiguredTestAccount,
} from "./lib/configured-test-account.mjs";

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const account = configuredTestAccountIdentity("generation-terminal-bind");

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: supabaseKey,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
})) {
  if (!value) throw new Error(`${name} is required for terminal-bind verification.`);
}

async function supabase(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", supabaseKey);
  headers.set("authorization", `Bearer ${supabaseKey}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers });
}

async function jsonRequest(path, init = {}) {
  const response = await supabase(path, init);
  const text = await response.text();
  if (!response.ok) throw new Error(`Terminal-bind Supabase request failed (${response.status}): ${text}`);
  return text ? JSON.parse(text) : null;
}

try {
  await deleteConfiguredTestAccount(account);
  await createConfiguredTestAccount("generation-terminal-bind");

  const reservationRows = await jsonRequest("rpc/renderlab_reserve_generation_admission", {
    method: "POST",
    body: JSON.stringify({ p_owner_id: account.id }),
  });
  const reservationId = reservationRows?.[0]?.reservation_id;
  if (!reservationId) throw new Error(`Terminal-bind reservation was not created: ${JSON.stringify(reservationRows)}`);

  const completedAt = new Date().toISOString();
  const jobs = await jsonRequest("generation_jobs?select=id", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      owner_id: account.id,
      status: "failed",
      operation: "create-image",
      output_kind: "image",
      prompt: "Phase 14 terminal-before-bind verification",
      workflow_id: "phase14-terminal-bind",
      model: "Phase 14 fixture",
      ecosystem: "flux2-klein-9b",
      inputs: [],
      parameters: { output: { kind: "image", aspectRatio: "1:1" }, advanced: {} },
      error_code: "phase14_fixture_terminal",
      error_message: "Phase 14 terminal bind fixture.",
      completed_at: completedAt,
    }),
  });
  const jobId = jobs?.[0]?.id;
  if (!jobId) throw new Error(`Terminal-bind job was not created: ${JSON.stringify(jobs)}`);

  const bound = await jsonRequest("rpc/renderlab_bind_generation_admission", {
    method: "POST",
    body: JSON.stringify({
      p_owner_id: account.id,
      p_reservation_id: reservationId,
      p_job_id: jobId,
    }),
  });
  if (bound !== true) throw new Error(`Terminal job reservation did not bind: ${JSON.stringify(bound)}`);

  const reservations = await jsonRequest(
    `generation_admission_reservations?id=eq.${encodeURIComponent(reservationId)}&select=job_id,released_at`,
  );
  const reservation = reservations?.[0];
  if (reservation?.job_id !== jobId || !reservation?.released_at) {
    throw new Error(`Terminal-before-bind reservation was not atomically released: ${JSON.stringify(reservation)}`);
  }

  console.log("Phase 14 terminal-before-bind admission race verified: binding an already-terminal owned job atomically releases its reservation.");
} finally {
  await deleteConfiguredTestAccount(account);
}
