import { randomUUID } from "node:crypto";
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

async function reserve() {
  const reservationRows = await jsonRequest("rpc/renderlab_reserve_generation_admission", {
    method: "POST",
    body: JSON.stringify({ p_owner_id: account.id }),
  });
  const reservationId = reservationRows?.[0]?.reservation_id;
  if (!reservationId) throw new Error(`Terminal-bind reservation was not created: ${JSON.stringify(reservationRows)}`);
  return reservationId;
}

async function bind(reservationId, jobId) {
  return jsonRequest("rpc/renderlab_bind_generation_admission", {
    method: "POST",
    body: JSON.stringify({
      p_owner_id: account.id,
      p_reservation_id: reservationId,
      p_job_id: jobId,
    }),
  });
}

async function loadReservation(reservationId) {
  const reservations = await jsonRequest(
    `generation_admission_reservations?id=eq.${encodeURIComponent(reservationId)}&select=job_id,released_at,expires_at`,
  );
  return reservations?.[0] ?? null;
}

try {
  await deleteConfiguredTestAccount(account);
  await createConfiguredTestAccount("generation-terminal-bind");

  // Native/local fast completion: binding a job that already terminalized must not leave
  // active-capacity pressure behind.
  const terminalReservationId = await reserve();
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
  const terminalJobId = jobs?.[0]?.id;
  if (!terminalJobId) throw new Error(`Terminal-bind job was not created: ${JSON.stringify(jobs)}`);

  const terminalBound = await bind(terminalReservationId, terminalJobId);
  if (terminalBound !== true) throw new Error(`Terminal job reservation did not bind: ${JSON.stringify(terminalBound)}`);

  const terminalReservation = await loadReservation(terminalReservationId);
  if (terminalReservation?.job_id !== terminalJobId || !terminalReservation?.released_at) {
    throw new Error(`Terminal-before-bind reservation was not atomically released: ${JSON.stringify(terminalReservation)}`);
  }

  // External backend compatibility: accepted external job IDs may intentionally have no
  // local generation_jobs row. They must still bind conservatively and remain active until
  // their lease expires or another server-owned terminal signal releases them.
  const externalReservationId = await reserve();
  const externalJobId = randomUUID();
  const externalRows = await jsonRequest(
    `generation_jobs?owner_id=eq.${encodeURIComponent(account.id)}&id=eq.${encodeURIComponent(externalJobId)}&select=id&limit=1`,
  );
  if (externalRows.length !== 0) throw new Error("External-bind fixture unexpectedly collided with a local generation job.");

  const externalBound = await bind(externalReservationId, externalJobId);
  if (externalBound !== true) {
    throw new Error(`External backend job reservation did not bind conservatively: ${JSON.stringify(externalBound)}`);
  }
  const externalReservation = await loadReservation(externalReservationId);
  if (externalReservation?.job_id !== externalJobId || externalReservation?.released_at !== null) {
    throw new Error(`External backend reservation did not remain conservatively active: ${JSON.stringify(externalReservation)}`);
  }

  console.log("Phase 14 admission bind semantics verified: local terminal jobs release atomically and accepted external job IDs without local rows remain conservatively bound.");
} finally {
  await deleteConfiguredTestAccount(account);
}
