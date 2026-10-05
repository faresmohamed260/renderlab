import {
  configuredTestAccountIdentity,
  createConfiguredTestAccount,
  deleteConfiguredTestAccount,
  withAccountAuthorization,
} from "./lib/configured-test-account.mjs";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const appOrigin = new URL(baseUrl).origin;
const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const cleanupOnly = process.argv.includes("--cleanup-only");
const accountAIdentity = configuredTestAccountIdentity("upload-admission-a");
const accountBIdentity = configuredTestAccountIdentity("upload-admission-b");
const fixtureSize = 68;

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: supabaseKey,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
})) {
  if (!value) throw new Error(`${name} is required for ENT-004 upload admission verification.`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function appRequest(path, account, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, withAccountAuthorization(account, init));
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { response, payload };
}

async function serviceRest(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", supabaseKey);
  headers.set("authorization", `Bearer ${supabaseKey}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers });
}

async function serviceJson(path, init = {}) {
  const response = await serviceRest(path, init);
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase request failed (${response.status}) ${path}: ${text}`);
  return text ? JSON.parse(text) : null;
}

function ticketRequest(kind, filename, extraHeaders = {}) {
  const path = kind === "media"
    ? "/api/media/uploads/upload-tickets"
    : "/api/assets/reference/upload-tickets";
  return {
    path,
    init: {
      method: "POST",
      headers: { "content-type": "application/json", ...extraHeaders },
      body: JSON.stringify({ filename, mimeType: "image/png", sizeBytes: fixtureSize }),
    },
  };
}

async function requestTicket(account, kind, filename, extraHeaders = {}) {
  const { path, init } = ticketRequest(kind, filename, extraHeaders);
  return appRequest(path, account, init);
}

function ticketResourceId(kind, payload) {
  return kind === "media" ? payload?.ticket?.uploadId : payload?.ticket?.sourceId;
}

async function markResourceFailed(ownerId, kind, id) {
  const table = kind === "media" ? "media_upload_sessions" : "generation_sources";
  const response = await serviceRest(
    `${table}?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status: "failed", updated_at: new Date().toISOString() }),
    },
  );
  if (!response.ok) throw new Error(`Could not fail ${kind} staging row ${id} (${response.status}): ${await response.text()}`);
}

async function ownerAdmissionRows(ownerId) {
  return serviceJson(
    `upload_admission_reservations?owner_id=eq.${encodeURIComponent(ownerId)}&select=id,upload_kind,admitted_at,lease_expires_at,bound_resource_id,bound_at,released_at&order=admitted_at.asc,id.asc`,
  );
}

async function pendingCounts(ownerId) {
  const encoded = encodeURIComponent(ownerId);
  const [media, references] = await Promise.all([
    serviceJson(`media_upload_sessions?owner_id=eq.${encoded}&status=eq.pending&select=id`),
    serviceJson(`generation_sources?owner_id=eq.${encoded}&status=eq.pending&select=id`),
  ]);
  return { media: media.length, references: references.length, total: media.length + references.length };
}

async function cleanupAccount(account) {
  await deleteConfiguredTestAccount(account).catch((error) => {
    console.error(`ENT-004 cleanup failed for owner=${account.id}`, error);
    throw error;
  });
}

async function cleanupFixtures() {
  await cleanupAccount(accountAIdentity);
  await cleanupAccount(accountBIdentity);
  console.log("ENT004_UPLOAD_ADMISSION_CLEAN=true");
}

await cleanupFixtures();
if (cleanupOnly) process.exit(0);

let primaryError = null;
try {
  const accountA = await createConfiguredTestAccount("upload-admission-a");
  const accountB = await createConfiguredTestAccount("upload-admission-b");

  // Explicit cross-origin browser metadata must fail before any mutation.
  const bBeforeCrossOrigin = (await ownerAdmissionRows(accountB.id)).length;
  const crossOrigin = await requestTicket(
    accountB,
    "media",
    "renderlab-ent004-cross-origin.png",
    { Origin: "https://cross-origin.invalid", "Sec-Fetch-Site": "cross-site" },
  );
  assert(crossOrigin.response.status === 403, `Cross-origin ticket expected 403, got ${crossOrigin.response.status}: ${JSON.stringify(crossOrigin.payload)}`);
  assert(crossOrigin.payload?.error?.code === "cross_origin_request_blocked", `Cross-origin rejection code is unstable: ${JSON.stringify(crossOrigin.payload)}`);
  assert((await ownerAdmissionRows(accountB.id)).length === bBeforeCrossOrigin, "Cross-origin request mutated upload admission history.");
  assert((await pendingCounts(accountB.id)).total === 0, "Cross-origin request created a staging row.");

  const sameSite = await requestTicket(
    accountB,
    "media",
    "renderlab-ent004-same-site.png",
    { Origin: appOrigin, "Sec-Fetch-Site": "same-site" },
  );
  assert(sameSite.response.status === 403 && sameSite.payload?.error?.code === "cross_origin_request_blocked", "Sec-Fetch-Site same-site was not rejected.");

  const sameOrigin = await requestTicket(
    accountB,
    "media",
    "renderlab-ent004-same-origin.png",
    { Origin: appOrigin, "Sec-Fetch-Site": "same-origin" },
  );
  assert(sameOrigin.response.status === 201 && sameOrigin.payload?.ok, `Same-origin mutation was rejected: ${sameOrigin.response.status} ${JSON.stringify(sameOrigin.payload)}`);
  await markResourceFailed(accountB.id, "media", ticketResourceId("media", sameOrigin.payload));
  console.log("ENT004_SAME_ORIGIN_BOUNDARY=true");

  // Signing/preparation failure must release capacity and settle the reference row as failed.
  const faultFilename = "renderlab-ent004-reference-signing-fault.png";
  const signingFault = await requestTicket(accountB, "reference", faultFilename);
  assert(signingFault.response.status === 503, `Injected reference signing fault expected 503, got ${signingFault.response.status}: ${JSON.stringify(signingFault.payload)}`);
  const failedSources = await serviceJson(
    `generation_sources?owner_id=eq.${encodeURIComponent(accountB.id)}&filename=eq.${encodeURIComponent(faultFilename)}&select=id,status`,
  );
  assert(failedSources.length === 1 && failedSources[0].status === "failed", `Reference signing failure left incorrect staging state: ${JSON.stringify(failedSources)}`);
  const bLiveProvisionalAfterFault = (await ownerAdmissionRows(accountB.id)).filter(
    (row) => row.released_at === null && row.bound_resource_id === null && Date.parse(row.lease_expires_at) > Date.now(),
  );
  assert(bLiveProvisionalAfterFault.length === 0, "Signing failure leaked a live provisional upload reservation.");
  const afterFault = await requestTicket(accountB, "media", "renderlab-ent004-after-fault.png");
  assert(afterFault.response.status === 201, `Upload capacity did not recover after signing failure: ${afterFault.response.status}`);
  await markResourceFailed(accountB.id, "media", ticketResourceId("media", afterFault.payload));
  console.log("ENT004_SIGNING_FAILURE_RELEASE=true");

  // A stale unbound reservation must self-heal on the next admission request.
  const staleRows = await serviceJson("rpc/renderlab_reserve_upload_admission", {
    method: "POST",
    body: JSON.stringify({ p_owner_id: accountB.id, p_upload_kind: "media" }),
  });
  const staleId = staleRows?.[0]?.reservation_id;
  assert(staleId, "Could not create provisional reservation for stale-lease verification.");
  const staleAdmitted = new Date(Date.now() - 20 * 60 * 1000).toISOString();
  const staleLease = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const stalePatch = await serviceRest(
    `upload_admission_reservations?id=eq.${encodeURIComponent(staleId)}&owner_id=eq.${encodeURIComponent(accountB.id)}`,
    { method: "PATCH", body: JSON.stringify({ admitted_at: staleAdmitted, lease_expires_at: staleLease }) },
  );
  assert(stalePatch.ok, `Could not age provisional reservation (${stalePatch.status}): ${await stalePatch.text()}`);
  const afterStale = await requestTicket(accountB, "reference", "renderlab-ent004-after-stale.png");
  assert(afterStale.response.status === 201, `Stale provisional reservation blocked a later ticket: ${afterStale.response.status}`);
  await markResourceFailed(accountB.id, "reference", ticketResourceId("reference", afterStale.payload));
  const staleState = (await ownerAdmissionRows(accountB.id)).find((row) => row.id === staleId);
  assert(staleState?.released_at, `Stale provisional reservation was not released: ${JSON.stringify(staleState)}`);
  console.log("ENT004_STALE_PROVISIONAL_RECOVERY=true");

  // Parallel cross-family admission must never exceed eight active slots.
  const raceRequests = Array.from({ length: 12 }, (_, index) => {
    const kind = index % 2 === 0 ? "media" : "reference";
    return requestTicket(accountA, kind, `renderlab-ent004-race-${String(index).padStart(2, "0")}.png`)
      .then((result) => ({ index, kind, result }));
  });
  const raceResults = await Promise.all(raceRequests);
  const admitted = raceResults.filter(({ result }) => result.response.status === 201);
  const rejected = raceResults.filter(({ result }) => result.response.status === 429);
  assert(admitted.length === 8, `Parallel admission expected exactly 8 grants, got ${admitted.length}: ${JSON.stringify(raceResults.map(({ kind, result }) => [kind, result.response.status, result.payload?.error?.code]))}`);
  assert(rejected.length === 4, `Parallel admission expected 4 rejections, got ${rejected.length}.`);
  assert(rejected.every(({ result }) => result.payload?.error?.code === "upload_active_limit_reached"), `Parallel rejection codes were not active-limit errors: ${JSON.stringify(rejected.map(({ result }) => result.payload))}`);
  const pendingA = await pendingCounts(accountA.id);
  assert(pendingA.total === 8 && pendingA.media > 0 && pendingA.references > 0, `Shared cross-family active cap is incorrect: ${JSON.stringify(pendingA)}`);

  // Account B must remain independent while A is saturated.
  const bIsolation = await requestTicket(accountB, "media", "renderlab-ent004-account-b-isolation.png");
  assert(bIsolation.response.status === 201, `Account B was affected by Account A active cap (${bIsolation.response.status}).`);
  await markResourceFailed(accountB.id, "media", ticketResourceId("media", bIsolation.payload));
  console.log("ENT004_SHARED_ACTIVE_CAP_ACCOUNT_ISOLATION=true");

  // Failing A's staging rows frees active capacity but must retain hourly history.
  for (const { kind, result } of admitted) {
    await markResourceFailed(accountA.id, kind, ticketResourceId(kind, result.payload));
  }
  assert((await pendingCounts(accountA.id)).total === 0, "Failed staging rows still consumed unresolved capacity.");
  let aHistory = await ownerAdmissionRows(accountA.id);
  assert(aHistory.length === 8, `Initial successful ticket history expected 8 rows, got ${aHistory.length}.`);

  // Add 22 successful tickets, settling each staging row immediately. History reaches 30.
  for (let index = 0; index < 22; index += 1) {
    const kind = index % 2 === 0 ? "media" : "reference";
    const result = await requestTicket(accountA, kind, `renderlab-ent004-rate-${String(index).padStart(2, "0")}.png`);
    assert(result.response.status === 201, `Rate-history setup ticket ${index} failed (${result.response.status}): ${JSON.stringify(result.payload)}`);
    await markResourceFailed(accountA.id, kind, ticketResourceId(kind, result.payload));
  }
  assert((await pendingCounts(accountA.id)).total === 0, "Rate-history setup left unresolved staging rows.");
  aHistory = await ownerAdmissionRows(accountA.id);
  const recentHistory = aHistory.filter((row) => Date.parse(row.admitted_at) > Date.now() - 60 * 60 * 1000);
  assert(recentHistory.length === 30, `Rolling upload admission history expected 30 rows, got ${recentHistory.length}.`);

  const rateDenied = await requestTicket(accountA, "media", "renderlab-ent004-rate-denied.png");
  assert(rateDenied.response.status === 429 && rateDenied.payload?.error?.code === "upload_rate_limit_reached", `31st rolling-hour ticket was not rate-limited: ${rateDenied.response.status} ${JSON.stringify(rateDenied.payload)}`);
  assert((await ownerAdmissionRows(accountA.id)).filter((row) => Date.parse(row.admitted_at) > Date.now() - 60 * 60 * 1000).length === 30, "Rejected rate-limit request mutated admission history.");
  console.log("ENT004_ROLLING_RATE_LIMIT=true");

  console.log(`ENT-004 upload admission verified successfully. ownerA=${accountA.id} ownerB=${accountB.id}`);
} catch (error) {
  primaryError = error;
} finally {
  try {
    await cleanupFixtures();
  } catch (cleanupError) {
    console.error(cleanupError);
    if (!primaryError) primaryError = cleanupError;
  }
}

if (primaryError) throw primaryError;
