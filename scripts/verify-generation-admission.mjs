import { chromium } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import {
  configuredTestAccountIdentity,
  createConfiguredTestAccount,
  deleteConfiguredTestAccount,
  routeLocalAppRequestsWithAccount,
  withAccountAuthorization,
} from "./lib/configured-test-account.mjs";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const generationBackendUrl = process.env.RENDERLAB_GENERATION_BACKEND_URL;
const generationBackendToken = process.env.RENDERLAB_GENERATION_BACKEND_TOKEN;
const artifactDir = process.env.RENDERLAB_ADMISSION_ARTIFACT_DIR || "artifacts";
const cleanupOnly = process.argv.includes("--cleanup-only");
const runToken = process.env.GITHUB_RUN_ID || "local";
const baselinePath = `/tmp/renderlab-generation-admission-settings-${runToken}.json`;
const mockBackendAddress = generationBackendUrl ? new URL(generationBackendUrl) : null;
const capturedBackendRequests = [];
const ephemeralBackendJobs = new Map();
let mockBackend = null;

const fixtureNamespaces = [
  "generation-admission-policy",
  "generation-admission-race",
  "generation-admission-active-override",
  "generation-admission-rate-default",
  "generation-admission-rate-override",
  "generation-admission-lease",
  "generation-admission-missing-bound",
  "generation-admission-cross-create",
  "generation-admission-cross-retry",
  "generation-admission-ui",
];
const identities = Object.fromEntries(
  fixtureNamespaces.map((namespace) => [namespace, configuredTestAccountIdentity(namespace)]),
);

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  RENDERLAB_GENERATION_BACKEND_URL: generationBackendUrl,
  RENDERLAB_GENERATION_BACKEND_TOKEN: generationBackendToken,
})) {
  if (!value) throw new Error(`${name} is required for configured Generation Admission verification.`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function serviceRest(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceRoleKey);
  headers.set("authorization", `Bearer ${serviceRoleKey}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers });
}

async function rows(path, { allowMissingAdmissionTable = false } = {}) {
  const response = await serviceRest(path);
  if (!response.ok) {
    const text = await response.text();
    if (
      allowMissingAdmissionTable
      && response.status === 404
      && text.includes("generation_admission_reservations")
    ) {
      return [];
    }
    throw new Error(`Generation Admission fixture query failed (${response.status}): ${text}`);
  }
  return response.json();
}

async function appJson(path, account, init = {}) {
  const response = account
    ? await fetch(`${baseUrl}${path}`, withAccountAuthorization(account, init))
    : await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { response, body };
}

function generationRequest(prompt, extra = {}) {
  return {
    prompt,
    output: { kind: "image", aspectRatio: "1:1" },
    inputs: [],
    ...extra,
  };
}

async function submitGeneration(account, prompt, extra = {}) {
  return appJson("/api/generation/jobs", account, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(generationRequest(prompt, extra)),
  });
}

async function retryGeneration(account, jobId) {
  return appJson(`/api/generation/jobs/${encodeURIComponent(jobId)}/retry`, account, {
    method: "POST",
    headers: { accept: "application/json" },
  });
}

function assertError(result, status, code, label) {
  assert(result.response.status === status, `${label}: expected HTTP ${status}, got ${result.response.status}.`);
  assert(result.body?.ok === false, `${label}: response did not use the failure contract.`);
  assert(result.body?.error?.code === code, `${label}: expected ${code}, got ${JSON.stringify(result.body)}.`);
}

function backendCount(ownerId) {
  return capturedBackendRequests.filter((entry) => entry.ownerId === ownerId).length;
}

async function reservationRows(ownerId, options) {
  return rows(
    `generation_admission_reservations?owner_id=eq.${encodeURIComponent(ownerId)}&select=id,owner_id,admitted_at,expires_at,job_id,released_at&order=admitted_at.asc,id.asc`,
    options,
  );
}

async function setAccess(userId, patch) {
  const response = await serviceRest(`renderlab_account_access?user_id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
  if (!response.ok) throw new Error(`Could not update admission access fixture (${response.status}): ${await response.text()}`);
}

async function upsertActiveAccess(userId) {
  const response = await serviceRest("renderlab_account_access?on_conflict=user_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      user_id: userId,
      role: "member",
      status: "active",
      generation_enabled: null,
      max_active_jobs: null,
      max_jobs_per_hour: null,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!response.ok) throw new Error(`Could not restore active admission access (${response.status}): ${await response.text()}`);
}

async function deleteAccess(userId) {
  const response = await serviceRest(`renderlab_account_access?user_id=eq.${encodeURIComponent(userId)}`, { method: "DELETE" });
  if (!response.ok) throw new Error(`Could not delete admission access fixture (${response.status}): ${await response.text()}`);
}

function settingsShape(row) {
  return {
    singleton_id: row.singleton_id,
    generation_enabled: row.generation_enabled,
    max_active_jobs: row.max_active_jobs,
    max_jobs_per_hour: row.max_jobs_per_hour,
    updated_by: row.updated_by ?? null,
    updated_at: row.updated_at,
  };
}

async function currentSettings() {
  const result = await rows(
    "renderlab_beta_settings?singleton_id=eq.1&select=singleton_id,generation_enabled,max_active_jobs,max_jobs_per_hour,updated_by,updated_at&limit=1",
  );
  if (!result[0]) throw new Error("Generation Admission settings singleton is missing.");
  return settingsShape(result[0]);
}

async function captureSettingsBaseline() {
  const baseline = await currentSettings();
  await writeFile(baselinePath, JSON.stringify(baseline), "utf8");
  return baseline;
}

async function restoreSettingsBaseline(baseline) {
  if (!baseline) return;
  const response = await serviceRest("renderlab_beta_settings?singleton_id=eq.1", {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      generation_enabled: baseline.generation_enabled,
      max_active_jobs: baseline.max_active_jobs,
      max_jobs_per_hour: baseline.max_jobs_per_hour,
      updated_by: baseline.updated_by,
      updated_at: baseline.updated_at,
    }),
  });
  if (!response.ok) throw new Error(`Could not restore generation settings baseline (${response.status}): ${await response.text()}`);
  const restored = await currentSettings();
  assert(JSON.stringify(restored) === JSON.stringify(baseline), "Generation settings baseline was not restored exactly.");
  await rm(baselinePath, { force: true });
}

async function restoreSettingsBaselineFromFile() {
  try {
    const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
    await restoreSettingsBaseline(baseline);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function setGlobalSettings({ generationEnabled = true, maxActiveJobs = 1, maxJobsPerHour = 12 } = {}) {
  const response = await serviceRest("renderlab_beta_settings?singleton_id=eq.1", {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      generation_enabled: generationEnabled,
      max_active_jobs: maxActiveJobs,
      max_jobs_per_hour: maxJobsPerHour,
      updated_by: null,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!response.ok) throw new Error(`Could not set deterministic generation defaults (${response.status}): ${await response.text()}`);
}

async function markJobTerminal(ownerId, jobId, status = "succeeded") {
  const now = new Date().toISOString();
  const response = await serviceRest(
    `generation_jobs?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(jobId)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status, updated_at: now, completed_at: now }),
    },
  );
  if (!response.ok) throw new Error(`Could not mark admission job terminal (${response.status}): ${await response.text()}`);
}

async function createHistoricalFailedJob(account, prompt) {
  const id = randomUUID();
  const now = new Date().toISOString();
  const response = await serviceRest("generation_jobs", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      id,
      owner_id: account.id,
      status: "failed",
      operation: "create-image",
      output_kind: "image",
      prompt,
      workflow_id: "generation-admission-historical-workflow",
      model: "generation-admission-historical-model",
      ecosystem: "generation-admission-historical-ecosystem",
      inputs: [],
      parameters: { output: { kind: "image", aspectRatio: "1:1" }, advanced: {} },
      worker_id: null,
      provider_job_id: null,
      worker_state: null,
      failover_history: [],
      output_asset_ids: [],
      error_code: "generation_submission_failed",
      error_message: "Historical generation failed.",
      created_at: now,
      updated_at: now,
      completed_at: now,
    }),
  });
  if (!response.ok) throw new Error(`Could not seed historical Retry fixture (${response.status}): ${await response.text()}`);
  return id;
}

async function seedReservation(ownerId, { admittedAt, expiresAt, jobId = null, releasedAt = null }) {
  const response = await serviceRest("generation_admission_reservations?select=id,owner_id,admitted_at,expires_at,job_id,released_at", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      owner_id: ownerId,
      admitted_at: admittedAt,
      expires_at: expiresAt,
      job_id: jobId,
      released_at: releasedAt,
    }),
  });
  if (!response.ok) throw new Error(`Could not seed admission reservation (${response.status}): ${await response.text()}`);
  return (await response.json())[0];
}

async function patchReservation(id, patch) {
  const response = await serviceRest(`generation_admission_reservations?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) throw new Error(`Could not patch admission reservation (${response.status}): ${await response.text()}`);
}

function operationForRequest(request) {
  const hasInput = Array.isArray(request.inputs) && request.inputs.length > 0;
  if (request.output?.kind === "video") return hasInput ? "animate-image" : "create-video";
  return hasInput ? "edit-image" : "create-image";
}

async function readRequestJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : null;
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(payload));
}

function publicJob(row) {
  return {
    id: row.id,
    status: row.status,
    operation: row.operation,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    outputAssetIds: row.output_asset_ids ?? [],
  };
}

async function persistMockJob(ownerId, request) {
  const id = randomUUID();
  const now = new Date().toISOString();
  const row = {
    id,
    owner_id: ownerId,
    status: "queued",
    operation: operationForRequest(request),
    output_kind: request.output.kind,
    prompt: request.prompt,
    workflow_id: "generation-admission-mock-workflow",
    model: "generation-admission-mock-model",
    ecosystem: "generation-admission-mock-ecosystem",
    inputs: request.inputs ?? [],
    parameters: { output: request.output, advanced: request.advanced ?? {} },
    worker_id: null,
    provider_job_id: null,
    worker_state: null,
    failover_history: [],
    output_asset_ids: [],
    error_code: null,
    error_message: null,
    created_at: now,
    updated_at: now,
    started_at: null,
    completed_at: null,
  };
  const response = await serviceRest("generation_jobs", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(row),
  });
  if (!response.ok) throw new Error(`Mock backend could not persist generation job (${response.status}): ${await response.text()}`);
  return row;
}

async function startMockBackend() {
  if (mockBackend) return;
  const host = mockBackendAddress.hostname;
  const port = Number(mockBackendAddress.port || 80);

  mockBackend = createServer(async (request, response) => {
    try {
      if (request.headers.authorization !== `Bearer ${generationBackendToken}`) {
        sendJson(response, 401, { message: "Mock backend authorization failed." });
        return;
      }
      const ownerId = request.headers["x-renderlab-owner-id"];
      if (typeof ownerId !== "string" || !ownerId) {
        sendJson(response, 400, { message: "Mock backend owner identity missing." });
        return;
      }

      const requestUrl = new URL(request.url || "/", generationBackendUrl);
      if (request.method === "POST" && requestUrl.pathname === "/jobs") {
        const body = await readRequestJson(request);
        const capture = { ownerId, request: body, acceptedJobId: null };
        capturedBackendRequests.push(capture);

        if (String(body?.prompt || "").startsWith("Admission immediate failure")) {
          sendJson(response, 500, { message: "mock-provider-secret-admission-failure" });
          return;
        }

        await wait(300);
        if (String(body?.prompt || "").startsWith("Admission missing-bound")) {
          const now = new Date().toISOString();
          const row = {
            id: randomUUID(),
            status: "queued",
            operation: operationForRequest(body),
            created_at: now,
            updated_at: now,
            output_asset_ids: [],
          };
          ephemeralBackendJobs.set(row.id, row);
          capture.acceptedJobId = row.id;
          sendJson(response, 202, { job: publicJob(row) });
          return;
        }

        const row = await persistMockJob(ownerId, body);
        capture.acceptedJobId = row.id;
        sendJson(response, 202, { job: publicJob(row) });
        return;
      }

      const match = request.method === "GET" ? requestUrl.pathname.match(/^\/jobs\/([^/]+)$/) : null;
      if (match) {
        const jobId = decodeURIComponent(match[1]);
        const ephemeral = ephemeralBackendJobs.get(jobId);
        if (ephemeral) {
          sendJson(response, 200, { job: publicJob(ephemeral) });
          return;
        }
        const found = await rows(
          `generation_jobs?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(jobId)}&select=*&limit=1`,
        );
        if (!found[0]) {
          sendJson(response, 404, { message: "Not found" });
          return;
        }
        sendJson(response, 200, { job: publicJob(found[0]) });
        return;
      }

      sendJson(response, 404, { message: "Not found" });
    } catch (error) {
      console.error(error);
      sendJson(response, 500, { message: "Mock backend failed." });
    }
  });

  await new Promise((resolve, reject) => {
    mockBackend.once("error", reject);
    mockBackend.listen(port, host, resolve);
  });
}

async function stopMockBackend() {
  if (!mockBackend) return;
  const server = mockBackend;
  mockBackend = null;
  await new Promise((resolve) => server.close(resolve));
}

async function authAdmin(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceRoleKey);
  headers.set("authorization", `Bearer ${serviceRoleKey}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/auth/v1/admin/${path}`, { ...init, headers });
}

async function assertFixtureClean(identity) {
  for (const table of ["generation_jobs", "renderlab_account_access"]) {
    const filter = table === "renderlab_account_access" ? `user_id=eq.${encodeURIComponent(identity.id)}` : `owner_id=eq.${encodeURIComponent(identity.id)}`;
    const remaining = await rows(`${table}?${filter}&select=*&limit=1`);
    assert(remaining.length === 0, `Generation Admission cleanup left ${table} rows for ${identity.id}.`);
  }
  const reservations = await reservationRows(identity.id, { allowMissingAdmissionTable: true });
  assert(reservations.length === 0, `Generation Admission cleanup left reservation rows for ${identity.id}.`);

  const authResponse = await authAdmin(`users/${encodeURIComponent(identity.id)}`);
  if (authResponse.ok) {
    const payload = await authResponse.json().catch(() => null);
    assert(payload?.id !== identity.id, `Generation Admission cleanup left Auth user ${identity.id}.`);
  } else {
    assert(authResponse.status === 404, `Could not verify Auth cleanup for ${identity.id} (${authResponse.status}).`);
  }
}

async function cleanupFixtures() {
  for (const identity of Object.values(identities)) {
    await deleteConfiguredTestAccount(identity).catch((error) => {
      throw new Error(`Could not clean Generation Admission account ${identity.id}: ${error}`);
    });
  }
  for (const identity of Object.values(identities)) await assertFixtureClean(identity);
}

if (cleanupOnly) {
  await restoreSettingsBaselineFromFile().catch((error) => console.error(error));
  await cleanupFixtures();
  console.log("Generation Admission exact fixture cleanup completed.");
  process.exit(0);
}

await mkdir(artifactDir, { recursive: true });
let browser = null;
let baseline = null;
let primaryError = null;
const accounts = {};

try {
  await cleanupFixtures();
  baseline = await captureSettingsBaseline();
  await setGlobalSettings({ generationEnabled: true, maxActiveJobs: 1, maxJobsPerHour: 12 });
  await startMockBackend();

  for (const namespace of fixtureNamespaces) {
    accounts[namespace] = await createConfiguredTestAccount(namespace);
  }

  const policy = accounts["generation-admission-policy"];
  const race = accounts["generation-admission-race"];
  const activeOverride = accounts["generation-admission-active-override"];
  const rateDefault = accounts["generation-admission-rate-default"];
  const rateOverride = accounts["generation-admission-rate-override"];
  const lease = accounts["generation-admission-lease"];
  const missingBound = accounts["generation-admission-missing-bound"];
  const crossCreate = accounts["generation-admission-cross-create"];
  const crossRetry = accounts["generation-admission-cross-retry"];
  const ui = accounts["generation-admission-ui"];

  const signedOut = await appJson("/api/generation/jobs", null, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(generationRequest("Admission signed-out")),
  });
  assertError(signedOut, 401, "authentication_required", "Signed-out Create admission");
  const signedOutRetry = await appJson(`/api/generation/jobs/${randomUUID()}/retry`, null, { method: "POST" });
  assertError(signedOutRetry, 401, "authentication_required", "Signed-out Retry admission");

  await deleteAccess(policy.id);
  const missingAccessBefore = backendCount(policy.id);
  assertError(
    await submitGeneration(policy, "Admission missing access"),
    403,
    "generation_access_denied",
    "Missing RenderLab access",
  );
  assert(backendCount(policy.id) === missingAccessBefore, "Missing access crossed the mock backend boundary.");
  assert((await reservationRows(policy.id)).length === 0, "Missing access consumed an admission reservation.");
  await upsertActiveAccess(policy.id);

  const policyRetryJob = await createHistoricalFailedJob(policy, "Admission suspended retry");
  await setAccess(policy.id, { status: "suspended" });
  const suspendedBefore = backendCount(policy.id);
  assertError(
    await submitGeneration(policy, "Admission suspended create"),
    403,
    "generation_access_denied",
    "Suspended Create admission",
  );
  assertError(
    await retryGeneration(policy, policyRetryJob),
    403,
    "generation_access_denied",
    "Suspended Retry admission",
  );
  assert(backendCount(policy.id) === suspendedBefore, "Suspended admission crossed the mock backend boundary.");
  assert((await reservationRows(policy.id)).length === 0, "Suspended admission consumed a reservation.");
  await setAccess(policy.id, { status: "active" });

  await setGlobalSettings({ generationEnabled: false, maxActiveJobs: 1, maxJobsPerHour: 12 });
  const globalDisabledBefore = backendCount(policy.id);
  assertError(
    await submitGeneration(policy, "Admission global disabled"),
    503,
    "generation_disabled",
    "Global generation disabled",
  );
  assert(backendCount(policy.id) === globalDisabledBefore, "Global disabled admission crossed the mock backend boundary.");
  assert((await reservationRows(policy.id)).length === 0, "Global disabled admission consumed a reservation.");
  await setGlobalSettings({ generationEnabled: true, maxActiveJobs: 1, maxJobsPerHour: 12 });

  await setAccess(policy.id, { generation_enabled: false });
  const accountDisabledBefore = backendCount(policy.id);
  assertError(
    await submitGeneration(policy, "Admission account disabled"),
    503,
    "generation_disabled",
    "Per-account generation disabled",
  );
  assert(backendCount(policy.id) === accountDisabledBefore, "Account disabled admission crossed the mock backend boundary.");
  await setAccess(policy.id, { generation_enabled: null });

  const policyReservationsBeforeValidation = (await reservationRows(policy.id)).length;
  const malformed = await appJson("/api/generation/jobs", policy, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  assertError(malformed, 400, "invalid_request", "Malformed generation request");
  const unavailable = await appJson("/api/generation/jobs", policy, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      prompt: "Admission unavailable input",
      output: { kind: "image", aspectRatio: "original" },
      inputs: [{
        alias: "image1",
        role: "primary-image",
        source: { type: "media-asset", id: randomUUID() },
      }],
    }),
  });
  assertError(unavailable, 502, "generation_submission_failed", "Unavailable input preflight");
  assert(
    (await reservationRows(policy.id)).length === policyReservationsBeforeValidation,
    "Malformed or unavailable input attempts consumed admission history.",
  );

  const raceBefore = backendCount(race.id);
  const raceResults = await Promise.all([
    submitGeneration(race, "Admission race A"),
    submitGeneration(race, "Admission race B"),
  ]);
  const raceAccepted = raceResults.filter((result) => result.response.status === 202 && result.body?.ok === true);
  const raceLimited = raceResults.filter(
    (result) => result.response.status === 429 && result.body?.error?.code === "generation_active_limit_reached",
  );
  assert(raceAccepted.length === 1 && raceLimited.length === 1, `Same-owner race did not resolve 1 accepted / 1 limited: ${JSON.stringify(raceResults.map((r) => ({ status: r.response.status, body: r.body })))}`);
  assert(backendCount(race.id) === raceBefore + 1, "Same-owner race crossed the backend more than once.");
  const raceJobId = raceAccepted[0].body.job.id;
  let raceReservations = await reservationRows(race.id);
  const raceBound = raceReservations.find((row) => row.job_id === raceJobId);
  assert(raceBound && raceBound.released_at === null, "Successful generation was not bound to its admission reservation.");

  await markJobTerminal(race.id, raceJobId);
  const terminalBefore = backendCount(race.id);
  const terminalReleased = await submitGeneration(race, "Admission terminal state release");
  assert(terminalReleased.response.status === 202 && terminalReleased.body?.ok === true, "Terminal job state did not release the active slot transactionally.");
  assert(backendCount(race.id) === terminalBefore + 1, "Terminal release retry did not cross the backend exactly once.");
  raceReservations = await reservationRows(race.id);
  assert(raceReservations.find((row) => row.id === raceBound.id)?.released_at, "Terminal job reservation was not marked released by the next admission check.");

  await setAccess(activeOverride.id, { max_active_jobs: 2, max_jobs_per_hour: 120 });
  const activeBefore = backendCount(activeOverride.id);
  const activeResults = await Promise.all([
    submitGeneration(activeOverride, "Admission active override A"),
    submitGeneration(activeOverride, "Admission active override B"),
  ]);
  assert(activeResults.every((result) => result.response.status === 202 && result.body?.ok === true), "Active-limit override 2 did not admit two concurrent jobs.");
  assert(backendCount(activeOverride.id) === activeBefore + 2, "Active-limit override did not cross the backend exactly twice.");
  assertError(
    await submitGeneration(activeOverride, "Admission active override C"),
    429,
    "generation_active_limit_reached",
    "Active-limit override third job",
  );
  assert(backendCount(activeOverride.id) === activeBefore + 2, "Active-limit override third request crossed the backend.");

  const defaultRateBefore = backendCount(rateDefault.id);
  for (let index = 1; index <= 12; index += 1) {
    const result = await submitGeneration(rateDefault, `Admission immediate failure default ${index}`);
    assertError(result, 502, "generation_submission_failed", `Default hourly admitted failure ${index}`);
  }
  assert(backendCount(rateDefault.id) === defaultRateBefore + 12, "Default hourly window did not admit exactly twelve backend attempts.");
  const defaultRateReservations = await reservationRows(rateDefault.id);
  assert(defaultRateReservations.length === 12, "Default hourly window did not retain twelve admission timestamps.");
  assert(defaultRateReservations.every((row) => row.released_at), "Immediate backend failure did not release provisional concurrency.");
  assertError(
    await submitGeneration(rateDefault, "Admission immediate failure default 13"),
    429,
    "generation_rate_limit_reached",
    "Default 12/hour limit",
  );
  assert(backendCount(rateDefault.id) === defaultRateBefore + 12, "Thirteenth default hourly request crossed the backend.");

  await setAccess(rateOverride.id, { max_jobs_per_hour: 2 });
  const overrideRateBefore = backendCount(rateOverride.id);
  for (let index = 1; index <= 2; index += 1) {
    const result = await submitGeneration(rateOverride, `Admission immediate failure override ${index}`);
    assertError(result, 502, "generation_submission_failed", `Hourly override admitted failure ${index}`);
  }
  assertError(
    await submitGeneration(rateOverride, "Admission immediate failure override 3"),
    429,
    "generation_rate_limit_reached",
    "Hourly override limit",
  );
  assert(backendCount(rateOverride.id) === overrideRateBefore + 2, "Hourly override request crossed the backend after its limit.");

  const now = Date.now();
  const activeLease = await seedReservation(lease.id, {
    admittedAt: new Date(now - 20 * 60_000).toISOString(),
    expiresAt: new Date(now + 10 * 60_000).toISOString(),
  });
  const leaseBefore = backendCount(lease.id);
  assertError(
    await submitGeneration(lease, "Admission unbound crash lease blocked"),
    429,
    "generation_active_limit_reached",
    "Unbound crash lease",
  );
  assert(backendCount(lease.id) === leaseBefore, "Active unbound lease crossed the backend.");
  await patchReservation(activeLease.id, { expires_at: new Date(now - 5 * 60_000).toISOString() });
  const leaseExpired = await submitGeneration(lease, "Admission unbound crash lease expired");
  assert(leaseExpired.response.status === 202 && leaseExpired.body?.ok === true, "Expired unbound lease continued blocking generation.");

  const missingBefore = backendCount(missingBound.id);
  const missingSubmission = await submitGeneration(missingBound, "Admission missing-bound success");
  assert(missingSubmission.response.status === 202 && missingSubmission.body?.ok === true, "Missing-local-job backend submission was not accepted.");
  assert(backendCount(missingBound.id) === missingBefore + 1, "Missing-local-job submission did not cross the backend exactly once.");
  let missingReservations = await reservationRows(missingBound.id);
  const missingReservation = missingReservations.find((row) => row.job_id === missingSubmission.body.job.id);
  assert(missingReservation, "External job UUID was not bound when no local generation_jobs row existed.");
  assertError(
    await submitGeneration(missingBound, "Admission missing-bound blocked"),
    429,
    "generation_active_limit_reached",
    "Missing bound job conservative slot",
  );
  assert(backendCount(missingBound.id) === missingBefore + 1, "Missing bound job allowed another backend dispatch.");
  const oldAdmitted = new Date(Date.now() - 2 * 60 * 60_000).toISOString();
  const oldExpired = new Date(Date.now() - 60 * 60_000).toISOString();
  await patchReservation(missingReservation.id, { admitted_at: oldAdmitted, expires_at: oldExpired });
  const afterMissingExpiry = await submitGeneration(missingBound, "Admission missing bound lease expired");
  assert(afterMissingExpiry.response.status === 202 && afterMissingExpiry.body?.ok === true, "Expired missing-bound lease continued blocking generation.");

  await setAccess(crossCreate.id, { max_active_jobs: 1, max_jobs_per_hour: 120 });
  const crossCreateHistorical = await createHistoricalFailedJob(crossCreate, "Admission cross Create historical Retry");
  const crossCreateBefore = backendCount(crossCreate.id);
  const crossCreateSubmission = await submitGeneration(crossCreate, "Admission cross Create occupies slot");
  assert(crossCreateSubmission.response.status === 202 && crossCreateSubmission.body?.ok === true, "Create did not occupy the cross-surface active slot.");
  assertError(
    await retryGeneration(crossCreate, crossCreateHistorical),
    429,
    "generation_active_limit_reached",
    "Create active slot blocks Retry",
  );
  assert(backendCount(crossCreate.id) === crossCreateBefore + 1, "Blocked Retry crossed the backend after Create occupied the slot.");

  await setAccess(crossRetry.id, { max_active_jobs: 1, max_jobs_per_hour: 1 });
  const crossRetryHistorical = await createHistoricalFailedJob(crossRetry, "Admission cross Retry occupies hour");
  const crossRetryBefore = backendCount(crossRetry.id);
  const retryAccepted = await retryGeneration(crossRetry, crossRetryHistorical);
  assert(retryAccepted.response.status === 202 && retryAccepted.body?.ok === true, "Retry did not occupy the cross-surface hourly window.");
  await markJobTerminal(crossRetry.id, retryAccepted.body.job.id);
  assertError(
    await submitGeneration(crossRetry, "Admission cross Create denied by Retry hour"),
    429,
    "generation_rate_limit_reached",
    "Retry hourly admission blocks Create",
  );
  assert(backendCount(crossRetry.id) === crossRetryBefore + 1, "Create crossed the backend after Retry consumed the hourly window.");

  await setGlobalSettings({ generationEnabled: true, maxActiveJobs: 1, maxJobsPerHour: 12 });
  await setAccess(ui.id, { generation_enabled: false, max_active_jobs: null, max_jobs_per_hour: null });
  const uiRetryJob = await createHistoricalFailedJob(ui, "Admission UI Retry study");

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1024 }, colorScheme: "dark" });
  const page = await context.newPage();
  await routeLocalAppRequestsWithAccount(page, baseUrl, ui);

  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60_000 });
  const prompt = page.getByRole("textbox", { name: "Prompt" });
  await prompt.waitFor({ state: "visible", timeout: 30_000 });
  await prompt.fill("Admission UI Create study");
  await page.getByRole("button", { name: "Generate", exact: true }).click();
  await page.getByText("Generation is temporarily paused for this account.", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  assert(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), "Create admission desktop state has horizontal clipping.");
  await page.screenshot({ path: `${artifactDir}/generation-admission-create-error-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  assert(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), "Create admission narrow state has horizontal clipping.");
  await page.screenshot({ path: `${artifactDir}/generation-admission-create-error-mobile.png`, fullPage: true });

  await page.setViewportSize({ width: 1440, height: 1024 });
  await page.goto(`${baseUrl}/activity`, { waitUntil: "networkidle", timeout: 60_000 });
  const uiRetryRow = page.locator("li").filter({ hasText: "Admission UI Retry study" }).first();
  await uiRetryRow.getByRole("button", { name: "Retry", exact: true }).click();
  await uiRetryRow.getByText("Generation is temporarily paused for this account.", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  assert(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), "Activity admission desktop state has horizontal clipping.");
  await page.screenshot({ path: `${artifactDir}/generation-admission-activity-error-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  assert(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), "Activity admission narrow state has horizontal clipping.");
  await page.screenshot({ path: `${artifactDir}/generation-admission-activity-error-mobile.png`, fullPage: true });
  await context.close();
  browser = null;

  await setAccess(ui.id, { generation_enabled: null });
  await restoreSettingsBaseline(baseline);
  baseline = null;

  console.log(
    `Configured Generation Admission verified. backendRequests=${capturedBackendRequests.length} fixtures=${fixtureNamespaces.length}.`,
  );
} catch (error) {
  primaryError = error;
} finally {
  if (browser) await browser.close().catch(() => {});
  await stopMockBackend().catch(() => {});
  try {
    if (baseline) {
      await restoreSettingsBaseline(baseline);
      baseline = null;
    } else {
      await restoreSettingsBaselineFromFile();
    }
  } catch (restoreError) {
    console.error(restoreError);
    if (!primaryError) primaryError = restoreError;
  }
  try {
    await cleanupFixtures();
  } catch (cleanupError) {
    console.error(cleanupError);
    if (!primaryError) primaryError = cleanupError;
  }
}

if (primaryError) throw primaryError;
