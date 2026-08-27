import { createHash } from "node:crypto";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const runToken = process.env.GITHUB_RUN_ID || "local";
const cleanupOnly = process.argv.includes("--cleanup-only");

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
})) {
  if (!value) throw new Error(`${name} is required for configured ownership verification.`);
}

function fixtureUuid(label) {
  const hex = createHash("sha256").update(`renderlab-owner-${runToken}-${label}`).digest("hex").slice(0, 32).split("");
  hex[12] = "4";
  hex[16] = "8";
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20, 32).join("")}`;
}

const ownerA = fixtureUuid("owner-a");
const ownerB = fixtureUuid("owner-b");
const jobA = fixtureUuid("job-a");
const assetA = fixtureUuid("asset-a");
const assetB = fixtureUuid("asset-b");
const emailA = `renderlab-owner-a-${runToken}@example.com`;
const emailB = `renderlab-owner-b-${runToken}@example.com`;
const passwordA = `RenderLab-A-${runToken}-Pass!`;
const passwordB = `RenderLab-B-${runToken}-Pass!`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function authAdmin(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceRoleKey);
  headers.set("authorization", `Bearer ${serviceRoleKey}`);
  if (init.body != null) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/auth/v1/admin/${path}`, { ...init, headers });
}

async function serviceRest(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceRoleKey);
  headers.set("authorization", `Bearer ${serviceRoleKey}`);
  if (init.body != null) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers });
}

async function appFetch(path, token, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  if (token) headers.set("authorization", `Bearer ${token}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${baseUrl}${path}`, { ...init, headers, redirect: "manual" });
}

async function rawUserRest(path, token) {
  return fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: {
      apikey: publishableKey,
      authorization: `Bearer ${token}`,
      accept: "application/json",
    },
  });
}

async function deleteOwnerRows(table, ownerId) {
  const response = await serviceRest(`${table}?owner_id=eq.${encodeURIComponent(ownerId)}`, { method: "DELETE" });
  if (!response.ok) throw new Error(`Could not clean ${table} for ${ownerId} (${response.status}): ${await response.text()}`);
}

async function deleteUser(userId) {
  const response = await authAdmin(`users/${encodeURIComponent(userId)}`, { method: "DELETE" });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Could not remove ownership user ${userId} (${response.status}): ${await response.text()}`);
  }
}

async function cleanupFixtures() {
  for (const ownerId of [ownerA, ownerB]) {
    await deleteOwnerRows("media_upload_sessions", ownerId);
    await deleteOwnerRows("media_assets", ownerId);
    await deleteOwnerRows("generation_jobs", ownerId);
    await deleteOwnerRows("generation_sources", ownerId);
  }
  await deleteUser(ownerA);
  await deleteUser(ownerB);
  console.log(`Account ownership fixtures clean owners=${ownerA},${ownerB}.`);
}

async function createUser({ id, email, password }) {
  const response = await authAdmin("users", {
    method: "POST",
    body: JSON.stringify({
      id,
      email,
      password,
      email_confirm: true,
      app_metadata: { renderlab_fixture: "account-ownership", run: runToken },
    }),
  });
  if (!response.ok) throw new Error(`Could not create ownership user ${id} (${response.status}): ${await response.text()}`);
  const user = await response.json();
  assert(user?.id === id, `Supabase created an unexpected ownership user ID for ${email}.`);
}

async function signIn(email, password) {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: publishableKey, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(`Could not sign in ownership fixture ${email} (${response.status}): ${await response.text()}`);
  const payload = await response.json();
  assert(typeof payload?.access_token === "string" && payload.access_token.length > 20, `Missing access token for ${email}.`);
  return payload.access_token;
}

async function insertFixtureRows() {
  const jobResponse = await serviceRest("generation_jobs", {
    method: "POST",
    body: JSON.stringify({
      id: jobA,
      owner_id: ownerA,
      status: "succeeded",
      operation: "create-image",
      output_kind: "image",
      prompt: `owner-a-job-${runToken}`,
      workflow_id: "account-ownership-fixture",
      model: "fixture",
      ecosystem: "flux2-klein-9b",
      output_asset_ids: [],
    }),
  });
  if (!jobResponse.ok) throw new Error(`Could not seed owner job (${jobResponse.status}): ${await jobResponse.text()}`);

  const assetsResponse = await serviceRest("media_assets", {
    method: "POST",
    body: JSON.stringify([
      {
        id: assetA,
        owner_id: ownerA,
        kind: "image",
        mime_type: "image/png",
        storage_key: `renderlab/account-ownership/${runToken}/owner-a.png`,
        origin: "uploaded",
        original_filename: `owner-a-${runToken}.png`,
        display_name: `Owner A ${runToken}`,
        size_bytes: 68,
      },
      {
        id: assetB,
        owner_id: ownerB,
        kind: "image",
        mime_type: "image/png",
        storage_key: `renderlab/account-ownership/${runToken}/owner-b.png`,
        origin: "uploaded",
        original_filename: `owner-b-${runToken}.png`,
        display_name: `Owner B ${runToken}`,
        size_bytes: 68,
      },
    ]),
  });
  if (!assetsResponse.ok) throw new Error(`Could not seed owner media (${assetsResponse.status}): ${await assetsResponse.text()}`);
}

async function json(response) {
  return response.json().catch(() => null);
}

async function assertStatus(response, expected, label) {
  if (response.status !== expected) {
    throw new Error(`${label}: expected HTTP ${expected}, got ${response.status}: ${await response.text()}`);
  }
}

if (cleanupOnly) {
  await cleanupFixtures();
  process.exit(0);
}

let primaryError = null;
try {
  await cleanupFixtures();
  await createUser({ id: ownerA, email: emailA, password: passwordA });
  await createUser({ id: ownerB, email: emailB, password: passwordB });
  const tokenA = await signIn(emailA, passwordA);
  const tokenB = await signIn(emailB, passwordB);
  await insertFixtureRows();

  const anonymousList = await appFetch("/api/media/assets", null);
  await assertStatus(anonymousList, 401, "Signed-out Library API");

  const anonymousAsset = await appFetch(`/api/media/assets/${assetA}`, null);
  await assertStatus(anonymousAsset, 401, "Signed-out media read");

  const anonymousUpload = await appFetch("/api/media/uploads/upload-tickets", null, {
    method: "POST",
    body: JSON.stringify({ filename: `anonymous-${runToken}.png`, mimeType: "image/png", sizeBytes: 68 }),
  });
  await assertStatus(anonymousUpload, 401, "Signed-out persistent upload ticket");

  const anonymousReference = await appFetch("/api/assets/reference/upload-tickets", null, {
    method: "POST",
    body: JSON.stringify({ filename: `anonymous-reference-${runToken}.png`, mimeType: "image/png", sizeBytes: 68 }),
  });
  await assertStatus(anonymousReference, 401, "Signed-out reference upload ticket");

  const anonymousGeneration = await appFetch("/api/generation/jobs", null, {
    method: "POST",
    body: JSON.stringify({
      prompt: "ownership verifier signed-out generation",
      output: { kind: "image", aspectRatio: "1:1" },
      inputs: [],
    }),
  });
  await assertStatus(anonymousGeneration, 401, "Signed-out generation submission");

  const ownAsset = await appFetch(`/api/media/assets/${assetA}`, tokenA);
  await assertStatus(ownAsset, 200, "Owner A own media read");
  const ownAssetPayload = await json(ownAsset);
  assert(ownAssetPayload?.ok === true && ownAssetPayload.asset?.id === assetA, "Owner A could not resolve its own media asset.");

  const ownerAList = await appFetch("/api/media/assets?limit=24", tokenA);
  await assertStatus(ownerAList, 200, "Owner A media list");
  const ownerAListPayload = await json(ownerAList);
  const ownerAIds = new Set(ownerAListPayload?.items?.map((item) => item.id) || []);
  assert(ownerAIds.has(assetA), "Owner A Library did not include its own media asset.");
  assert(!ownerAIds.has(assetB), "Owner A Library leaked Owner B media.");

  const ownerBOwnAsset = await appFetch(`/api/media/assets/${assetB}`, tokenB);
  await assertStatus(ownerBOwnAsset, 200, "Owner B own media read");
  const ownerBOwnPayload = await json(ownerBOwnAsset);
  assert(ownerBOwnPayload?.ok === true && ownerBOwnPayload.asset?.id === assetB, "Owner B could not resolve its own media asset.");

  const ownerBList = await appFetch("/api/media/assets?limit=24", tokenB);
  await assertStatus(ownerBList, 200, "Owner B media list");
  const ownerBListPayload = await json(ownerBList);
  const ownerBIds = new Set(ownerBListPayload?.items?.map((item) => item.id) || []);
  assert(ownerBIds.has(assetB), "Owner B Library did not include its own media asset.");
  assert(!ownerBIds.has(assetA), "Owner B Library leaked Owner A media.");

  const foreignRead = await appFetch(`/api/media/assets/${assetA}`, tokenB);
  await assertStatus(foreignRead, 404, "Owner B foreign media read");

  const foreignRename = await appFetch(`/api/media/assets/${assetA}`, tokenB, {
    method: "PATCH",
    body: JSON.stringify({ displayName: "cross-account rename should fail" }),
  });
  await assertStatus(foreignRename, 404, "Owner B foreign media rename");

  for (const action of ["content", "thumbnail", "download"]) {
    const response = await appFetch(`/api/media/assets/${assetA}/${action}`, tokenB);
    await assertStatus(response, 404, `Owner B foreign media ${action}`);
  }

  const foreignJob = await appFetch(`/api/generation/jobs/${jobA}`, tokenB);
  await assertStatus(foreignJob, 404, "Owner B foreign generation job");

  const ownJob = await appFetch(`/api/generation/jobs/${jobA}`, tokenA);
  await assertStatus(ownJob, 200, "Owner A own generation job");
  const ownJobPayload = await json(ownJob);
  assert(ownJobPayload?.ok === true && ownJobPayload.job?.id === jobA, "Owner A could not resolve its own generation job.");

  const uploadTicket = await appFetch("/api/media/uploads/upload-tickets", tokenA, {
    method: "POST",
    body: JSON.stringify({ filename: `owner-a-${runToken}.png`, mimeType: "image/png", sizeBytes: 68 }),
  });
  await assertStatus(uploadTicket, 201, "Owner A upload ticket");
  const uploadTicketPayload = await json(uploadTicket);
  const uploadId = uploadTicketPayload?.ticket?.uploadId;
  assert(typeof uploadId === "string", "Owner A upload ticket did not return an upload ID.");

  const foreignUploadCompletion = await appFetch("/api/media/uploads/upload-completions", tokenB, {
    method: "POST",
    body: JSON.stringify({ uploadId }),
  });
  await assertStatus(foreignUploadCompletion, 404, "Owner B foreign upload completion");

  const referenceTicket = await appFetch("/api/assets/reference/upload-tickets", tokenA, {
    method: "POST",
    body: JSON.stringify({ filename: `reference-a-${runToken}.png`, mimeType: "image/png", sizeBytes: 68 }),
  });
  await assertStatus(referenceTicket, 201, "Owner A reference ticket");
  const referenceTicketPayload = await json(referenceTicket);
  const sourceId = referenceTicketPayload?.ticket?.sourceId;
  assert(typeof sourceId === "string", "Owner A reference ticket did not return a source ID.");

  const foreignReferenceCompletion = await appFetch("/api/assets/reference/upload-completions", tokenB, {
    method: "POST",
    body: JSON.stringify({ sourceId }),
  });
  await assertStatus(foreignReferenceCompletion, 404, "Owner B foreign reference completion");

  const uploadOwnerCheck = await serviceRest(
    `media_upload_sessions?id=eq.${encodeURIComponent(uploadId)}&select=owner_id,status&limit=1`,
  );
  assert(uploadOwnerCheck.ok, `Could not verify upload owner (${uploadOwnerCheck.status}).`);
  const uploadRows = await uploadOwnerCheck.json();
  assert(uploadRows?.[0]?.owner_id === ownerA, "Upload ticket was not persisted with Owner A.");
  assert(uploadRows?.[0]?.status === "pending", "Foreign upload completion changed Owner A upload state.");

  const sourceOwnerCheck = await serviceRest(
    `generation_sources?id=eq.${encodeURIComponent(sourceId)}&select=owner_id,status&limit=1`,
  );
  assert(sourceOwnerCheck.ok, `Could not verify reference owner (${sourceOwnerCheck.status}).`);
  const sourceRows = await sourceOwnerCheck.json();
  assert(sourceRows?.[0]?.owner_id === ownerA, "Reference ticket was not persisted with Owner A.");
  assert(sourceRows?.[0]?.status === "pending", "Foreign reference completion changed Owner A reference state.");

  const renameCheck = await serviceRest(`media_assets?id=eq.${encodeURIComponent(assetA)}&select=display_name&limit=1`);
  assert(renameCheck.ok, `Could not verify foreign rename result (${renameCheck.status}).`);
  const renameRows = await renameCheck.json();
  assert(renameRows?.[0]?.display_name === `Owner A ${runToken}`, "Foreign rename changed Owner A media.");

  for (const table of ["generation_sources", "generation_jobs", "media_assets", "media_upload_sessions"]) {
    const rawDataApi = await rawUserRest(`${table}?select=*&limit=1`, tokenA);
    assert(
      !rawDataApi.ok,
      `Authenticated browser role unexpectedly received raw ${table} access (HTTP ${rawDataApi.status}).`,
    );
  }

  console.log(`Configured account ownership verified owners=${ownerA},${ownerB} assetA=${assetA} assetB=${assetB} job=${jobA}.`);
} catch (error) {
  primaryError = error;
} finally {
  try {
    await cleanupFixtures();
  } catch (cleanupError) {
    if (!primaryError) primaryError = cleanupError;
    else console.error(cleanupError);
  }
}

if (primaryError) throw primaryError;
