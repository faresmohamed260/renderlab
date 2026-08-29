import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { chromium } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import {
  configuredTestAccountIdentity,
  createConfiguredTestAccount,
  deleteConfiguredTestAccount,
  routeLocalAppRequestsWithAccount,
  withAccountAuthorization,
} from "./lib/configured-test-account.mjs";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const r2Bucket = process.env.R2_BUCKET_NAME;
const artifactDir = process.env.RENDERLAB_LIBRARY_BATCH_DELETE_ARTIFACT_DIR || "artifacts";
const fixturePath = process.env.RENDERLAB_LIBRARY_BATCH_DELETE_FIXTURE_PATH || "/tmp/renderlab-library-batch-delete-fixture.json";
const cleanupOnly = process.argv.includes("--cleanup-only");
const ownerIdentity = configuredTestAccountIdentity("library-batch-delete");
const foreignIdentity = configuredTestAccountIdentity("library-batch-delete-foreign");

const pngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZPZkAAAAASUVORK5CYII=",
  "base64",
);

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: supabaseKey,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: r2Bucket,
})) {
  if (!value) throw new Error(`${name} is required for configured Library batch actions verification.`);
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

async function supabaseRows(path) {
  const response = await supabase(path);
  if (!response.ok) throw new Error(`Could not inspect batch-actions fixture (${response.status}): ${await response.text()}`);
  return response.json();
}

async function app(path, account, init = {}) {
  return fetch(`${baseUrl}${path}`, account ? withAccountAuthorization(account, init) : init);
}

async function appJson(path, account, init = {}) {
  const response = await app(path, account, init);
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function readFixture() {
  try {
    return JSON.parse(await readFile(fixturePath, "utf8"));
  } catch {
    return null;
  }
}

async function writeFixture(fixture) {
  await writeFile(fixturePath, JSON.stringify(fixture), "utf8");
}

async function deleteByOwner(table, ownerId) {
  const response = await supabase(`${table}?owner_id=eq.${encodeURIComponent(ownerId)}`, { method: "DELETE" });
  if (!response.ok) throw new Error(`Could not clean ${table} for owner ${ownerId} (${response.status}): ${await response.text()}`);
}

async function cleanupCollections(ownerId) {
  await deleteByOwner("media_collection_items", ownerId);
  await deleteByOwner("media_collections", ownerId);
}

async function cleanupIdentity(identity) {
  await cleanupCollections(identity.id).catch(() => {});
  await deleteConfiguredTestAccount(identity);
}

async function cleanupFixture() {
  const fixture = await readFixture();
  if (fixture) {
    for (const key of fixture.storageKeys || []) {
      await r2Client.send(new DeleteObjectCommand({ Bucket: r2Bucket, Key: key })).catch(() => {});
    }
    for (const ownerId of fixture.ownerIds || []) {
      await cleanupCollections(ownerId).catch(() => {});
    }
    await rm(fixturePath, { force: true });
  }

  await cleanupIdentity(ownerIdentity);
  await cleanupIdentity(foreignIdentity);
}

async function putObject(key) {
  await r2Client.send(new PutObjectCommand({
    Bucket: r2Bucket,
    Key: key,
    Body: pngBytes,
    ContentType: "image/png",
  }));
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

async function insertRow(table, body) {
  const response = await supabase(`${table}?select=*`, {
    method: "POST",
    headers: { prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Could not create ${table} fixture (${response.status}): ${await response.text()}`);
  return (await response.json())[0];
}

async function createGenerationJob(ownerId, prompt) {
  const now = new Date().toISOString();
  return insertRow("generation_jobs", {
    id: randomUUID(),
    owner_id: ownerId,
    status: "succeeded",
    operation: "create-image",
    output_kind: "image",
    prompt,
    workflow_id: "library-batch-actions-fixture",
    model: "library-batch-actions-fixture",
    ecosystem: "fixture",
    inputs: [],
    parameters: {},
    worker_id: null,
    provider_job_id: null,
    worker_state: "succeeded",
    failover_history: [],
    output_asset_ids: [],
    error_code: null,
    error_message: null,
    started_at: now,
    completed_at: now,
  });
}

async function patchGenerationJob(jobId, patch) {
  const response = await supabase(`generation_jobs?id=eq.${encodeURIComponent(jobId)}&select=*`, {
    method: "PATCH",
    headers: { prefer: "return=representation" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) throw new Error(`Could not patch generation job fixture (${response.status}): ${await response.text()}`);
  return (await response.json())[0];
}

async function createAsset(ownerId, {
  origin = "uploaded",
  generationJobId = null,
  displayName,
  storageKey,
  thumbnailStorageKey = null,
  favorite = false,
}) {
  await putObject(storageKey);
  if (thumbnailStorageKey) await putObject(thumbnailStorageKey);
  return insertRow("media_assets", {
    id: randomUUID(),
    owner_id: ownerId,
    generation_job_id: generationJobId,
    origin,
    kind: "image",
    mime_type: "image/png",
    storage_key: storageKey,
    thumbnail_storage_key: thumbnailStorageKey,
    original_filename: origin === "uploaded" ? `${displayName}.png` : null,
    display_name: displayName,
    size_bytes: pngBytes.length,
    width: 1,
    height: 1,
    duration_ms: null,
    provenance: origin === "generated" ? { prompt: displayName, operation: "create-image", model: "library-batch-actions-fixture" } : {},
    metadata: { verification: "library-batch-actions-v0-1" },
    favorited_at: favorite ? new Date().toISOString() : null,
  });
}

async function createCollection(ownerId, name) {
  return insertRow("media_collections", { id: randomUUID(), owner_id: ownerId, name });
}

async function addMembership(ownerId, collectionId, assetId) {
  return insertRow("media_collection_items", {
    collection_id: collectionId,
    media_asset_id: assetId,
    owner_id: ownerId,
  });
}

async function removeMembership(ownerId, collectionId, assetId) {
  const response = await supabase(
    `media_collection_items?owner_id=eq.${encodeURIComponent(ownerId)}&collection_id=eq.${encodeURIComponent(collectionId)}&media_asset_id=eq.${encodeURIComponent(assetId)}`,
    { method: "DELETE" },
  );
  if (!response.ok) throw new Error(`Could not remove membership fixture (${response.status}): ${await response.text()}`);
}

async function mediaRow(assetId) {
  const rows = await supabaseRows(
    `media_assets?id=eq.${encodeURIComponent(assetId)}&select=id,owner_id,generation_job_id,origin,original_filename,deleted_at,purged_at,favorited_at,storage_key,thumbnail_storage_key,provenance&limit=1`,
  );
  return rows[0] || null;
}

async function membershipExists(ownerId, collectionId, assetId) {
  const rows = await supabaseRows(
    `media_collection_items?owner_id=eq.${encodeURIComponent(ownerId)}&collection_id=eq.${encodeURIComponent(collectionId)}&media_asset_id=eq.${encodeURIComponent(assetId)}&select=media_asset_id&limit=1`,
  );
  return rows.length === 1;
}

async function assertAssetIdentityPreserved(before, after, label) {
  for (const key of ["owner_id", "generation_job_id", "origin", "original_filename", "storage_key", "thumbnail_storage_key"]) {
    assert(before?.[key] === after?.[key], `${label} changed durable ${key} during organization.`);
  }
  assert(JSON.stringify(before?.provenance) === JSON.stringify(after?.provenance), `${label} changed generation/upload provenance during organization.`);
  assert(!after?.deleted_at && !after?.purged_at, `${label} was deleted during organization.`);
  assert(await objectExists(after.storage_key), `${label} primary R2 object changed during organization.`);
  if (after.thumbnail_storage_key) assert(await objectExists(after.thumbnail_storage_key), `${label} thumbnail R2 object changed during organization.`);
}

if (cleanupOnly) {
  await cleanupFixture();
  process.exit(0);
}

await mkdir(artifactDir, { recursive: true });
let browser = null;
let primaryError = null;

try {
  await cleanupFixture();
  const owner = await createConfiguredTestAccount("library-batch-delete");
  const foreign = await createConfiguredTestAccount("library-batch-delete-foreign");
  const fixture = { ownerIds: [owner.id, foreign.id], storageKeys: [] };
  await writeFixture(fixture);

  const collection = await createCollection(owner.id, "RenderLab Batch Actions Collection");
  const foreignCollection = await createCollection(foreign.id, "RenderLab Foreign Batch Actions Collection");

  const generatedJob = await createGenerationJob(owner.id, "RenderLab Batch Actions Generated");
  const generatedKey = `renderlab/batch-actions-fixtures/${generatedJob.id}/generated.png`;
  const generatedThumbKey = `renderlab/batch-actions-fixtures/${generatedJob.id}/generated-thumb.png`;
  fixture.storageKeys.push(generatedKey, generatedThumbKey);
  await writeFixture(fixture);
  const generated = await createAsset(owner.id, {
    origin: "generated",
    generationJobId: generatedJob.id,
    displayName: "RenderLab Batch Actions Generated",
    storageKey: generatedKey,
    thumbnailStorageKey: generatedThumbKey,
    favorite: false,
  });
  await patchGenerationJob(generatedJob.id, { output_asset_ids: [generated.id] });
  await addMembership(owner.id, collection.id, generated.id);

  const uploadedKey = `renderlab/batch-actions-fixtures/${randomUUID()}/uploaded.png`;
  fixture.storageKeys.push(uploadedKey);
  await writeFixture(fixture);
  const uploaded = await createAsset(owner.id, {
    displayName: "RenderLab Batch Actions Uploaded",
    storageKey: uploadedKey,
    favorite: true,
  });
  const uploadSession = await insertRow("media_upload_sessions", {
    id: randomUUID(),
    owner_id: owner.id,
    storage_key: uploadedKey,
    filename: "renderlab-batch-actions-uploaded.png",
    display_name: "RenderLab Batch Actions Uploaded",
    mime_type: "image/png",
    size_bytes: pngBytes.length,
    status: "completed",
    media_asset_id: uploaded.id,
    metadata: { verification: "library-batch-actions-v0-1" },
  });

  const foreignKey = `renderlab/batch-actions-fixtures/${randomUUID()}/foreign.png`;
  fixture.storageKeys.push(foreignKey);
  await writeFixture(fixture);
  const foreignAsset = await createAsset(foreign.id, {
    displayName: "RenderLab Batch Actions Foreign",
    storageKey: foreignKey,
  });

  const generatedIdentityBefore = await mediaRow(generated.id);
  const uploadedIdentityBefore = await mediaRow(uploaded.id);

  // Batch Favorite: validation, 1/24/25 bounds, dedupe, mixed state/privacy, target-state idempotence.
  for (const [body, label] of [
    [{ assetIds: [], favorite: true }, "empty"],
    [{ assetIds: [generated.id], favorite: "yes" }, "non-boolean target"],
    [{ assetIds: [generated.id, "not-a-media-id"], favorite: true }, "invalid UUID"],
  ]) {
    const result = await appJson("/api/media/assets/batch-favorite", owner, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    assert(result.response.status === 400 && result.body?.ok === false, `Batch Favorite accepted ${label}.`);
  }

  const signedOutFavorite = await appJson("/api/media/assets/batch-favorite", null, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ assetIds: [generated.id], favorite: true }),
  });
  assert(signedOutFavorite.response.status === 401 && signedOutFavorite.body?.error?.code === "authentication_required", "Signed-out Batch Favorite did not require authentication.");

  const favoriteBefore25 = await mediaRow(generated.id);
  const favoriteTooMany = await appJson("/api/media/assets/batch-favorite", owner, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ assetIds: [generated.id, ...Array.from({ length: 24 }, () => randomUUID())], favorite: true }),
  });
  assert(favoriteTooMany.response.status === 400, "Batch Favorite accepted 25 entries.");
  assert((await mediaRow(generated.id))?.favorited_at === favoriteBefore25?.favorited_at, "Batch Favorite mutated before rejecting 25 entries.");

  const favorite24 = await appJson("/api/media/assets/batch-favorite", owner, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ assetIds: Array.from({ length: 24 }, () => randomUUID()), favorite: true }),
  });
  assert(favorite24.response.status === 200 && favorite24.body?.summary?.requested === 24 && favorite24.body?.summary?.failed === 24, "Batch Favorite did not accept exactly 24 valid entries.");

  const favoriteMixed = await appJson("/api/media/assets/batch-favorite", owner, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ assetIds: [generated.id, uploaded.id, foreignAsset.id, generated.id], favorite: true }),
  });
  assert(favoriteMixed.response.status === 200 && favoriteMixed.body?.ok, "Mixed Batch Favorite did not complete.");
  assert(favoriteMixed.body.summary?.requested === 3 && favoriteMixed.body.summary?.succeeded === 2 && favoriteMixed.body.summary?.failed === 1, "Batch Favorite summary did not follow the deduplicated result set.");
  const foreignFavorite = favoriteMixed.body.results?.find((result) => result.assetId === foreignAsset.id);
  assert(foreignFavorite?.ok === false && foreignFavorite.error?.code === "asset_not_found", "Foreign Favorite target did not collapse to asset_not_found.");
  assert(Boolean((await mediaRow(generated.id))?.favorited_at) && Boolean((await mediaRow(uploaded.id))?.favorited_at), "Batch Favorite did not end both own assets in the requested state.");
  assert(!(await mediaRow(foreignAsset.id))?.favorited_at, "Batch Favorite changed foreign state.");

  const favoriteRepeat = await appJson("/api/media/assets/batch-favorite", owner, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ assetIds: [generated.id, uploaded.id, generated.id], favorite: true }),
  });
  assert(favoriteRepeat.body?.summary?.requested === 2 && favoriteRepeat.body?.summary?.succeeded === 2, "Repeated target-state Favorite was not idempotent/deduplicated.");

  const favoriteSingle = await appJson("/api/media/assets/batch-favorite", owner, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ assetIds: [generated.id], favorite: false }),
  });
  assert(favoriteSingle.body?.summary?.requested === 1 && favoriteSingle.body?.summary?.succeeded === 1, "Batch Favorite did not accept one item.");
  const unfavoriteBoth = await appJson("/api/media/assets/batch-favorite", owner, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ assetIds: [generated.id, uploaded.id], favorite: false }),
  });
  assert(unfavoriteBoth.body?.summary?.succeeded === 2, "Batch Unfavorite did not complete.");
  assert(!(await mediaRow(generated.id))?.favorited_at && !(await mediaRow(uploaded.id))?.favorited_at, "Batch Unfavorite did not end both own assets in the requested state.");

  // Batch Collection: owner collection prevalidation, bounds, mixed membership/privacy, idempotence.
  const invalidCollectionPath = await appJson("/api/media/collections/not-a-uuid/items/batch", owner, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ assetIds: [generated.id], containsAsset: true }),
  });
  assert(invalidCollectionPath.response.status === 400, "Batch Collection accepted an invalid collection ID.");

  const signedOutCollection = await appJson(`/api/media/collections/${collection.id}/items/batch`, null, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ assetIds: [generated.id], containsAsset: true }),
  });
  assert(signedOutCollection.response.status === 401 && signedOutCollection.body?.error?.code === "authentication_required", "Signed-out Batch Collection did not require authentication.");

  for (const targetCollectionId of [randomUUID(), foreignCollection.id]) {
    const missingCollection = await appJson(`/api/media/collections/${targetCollectionId}/items/batch`, owner, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ assetIds: [generated.id], containsAsset: true }),
    });
    assert(missingCollection.response.status === 404 && missingCollection.body?.error?.code === "collection_not_found", "Missing/foreign collection did not fail the whole request privately.");
  }

  for (const [body, label] of [
    [{ assetIds: [], containsAsset: true }, "empty"],
    [{ assetIds: [generated.id], containsAsset: "yes" }, "non-boolean target"],
    [{ assetIds: [generated.id, "not-a-media-id"], containsAsset: true }, "invalid UUID"],
  ]) {
    const result = await appJson(`/api/media/collections/${collection.id}/items/batch`, owner, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    assert(result.response.status === 400 && result.body?.ok === false, `Batch Collection accepted ${label}.`);
  }

  const membershipBefore25 = await membershipExists(owner.id, collection.id, uploaded.id);
  const collectionTooMany = await appJson(`/api/media/collections/${collection.id}/items/batch`, owner, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ assetIds: [uploaded.id, ...Array.from({ length: 24 }, () => randomUUID())], containsAsset: true }),
  });
  assert(collectionTooMany.response.status === 400, "Batch Collection accepted 25 entries.");
  assert((await membershipExists(owner.id, collection.id, uploaded.id)) === membershipBefore25, "Batch Collection mutated before rejecting 25 entries.");

  const collection24 = await appJson(`/api/media/collections/${collection.id}/items/batch`, owner, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ assetIds: Array.from({ length: 24 }, () => randomUUID()), containsAsset: true }),
  });
  assert(collection24.response.status === 200 && collection24.body?.summary?.requested === 24 && collection24.body?.summary?.failed === 24, "Batch Collection did not accept exactly 24 valid entries.");

  const collectionMixed = await appJson(`/api/media/collections/${collection.id}/items/batch`, owner, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ assetIds: [generated.id, uploaded.id, foreignAsset.id, generated.id], containsAsset: true }),
  });
  assert(collectionMixed.response.status === 200 && collectionMixed.body?.ok, "Mixed Batch Collection did not complete.");
  assert(collectionMixed.body.summary?.requested === 3 && collectionMixed.body.summary?.succeeded === 2 && collectionMixed.body.summary?.failed === 1, "Batch Collection summary did not follow the deduplicated result set.");
  const foreignMembership = collectionMixed.body.results?.find((result) => result.assetId === foreignAsset.id);
  assert(foreignMembership?.ok === false && foreignMembership.error?.code === "asset_not_found", "Foreign collection membership target did not collapse to asset_not_found.");
  assert(await membershipExists(owner.id, collection.id, generated.id) && await membershipExists(owner.id, collection.id, uploaded.id), "Batch Collection Add did not end both own assets in the requested state.");

  const collectionRepeat = await appJson(`/api/media/collections/${collection.id}/items/batch`, owner, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ assetIds: [generated.id, uploaded.id, generated.id], containsAsset: true }),
  });
  assert(collectionRepeat.body?.summary?.requested === 2 && collectionRepeat.body?.summary?.succeeded === 2, "Repeated target-state Collection Add was not idempotent/deduplicated.");

  const collectionRemove = await appJson(`/api/media/collections/${collection.id}/items/batch`, owner, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ assetIds: [generated.id, uploaded.id], containsAsset: false }),
  });
  assert(collectionRemove.body?.summary?.succeeded === 2, "Batch Collection Remove did not complete.");
  assert(!(await membershipExists(owner.id, collection.id, generated.id)) && !(await membershipExists(owner.id, collection.id, uploaded.id)), "Batch Collection Remove did not end both own assets outside the collection.");

  const collectionAddBack = await appJson(`/api/media/collections/${collection.id}/items/batch`, owner, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ assetIds: [generated.id, uploaded.id], containsAsset: true }),
  });
  assert(collectionAddBack.body?.summary?.succeeded === 2, "Batch Collection could not restore target membership for Delete regression.");

  const generatedIdentityAfter = await mediaRow(generated.id);
  const uploadedIdentityAfter = await mediaRow(uploaded.id);
  await assertAssetIdentityPreserved(generatedIdentityBefore, generatedIdentityAfter, "Generated asset");
  await assertAssetIdentityPreserved(uploadedIdentityBefore, uploadedIdentityAfter, "Uploaded asset");
  const uploadRowsAfterOrganization = await supabaseRows(`media_upload_sessions?id=eq.${uploadSession.id}&select=id,media_asset_id&limit=1`);
  assert(uploadRowsAfterOrganization[0]?.media_asset_id === uploaded.id, "Batch organization rewrote uploaded provenance/session identity.");
  const historyAfterOrganization = await supabaseRows(`generation_jobs?id=eq.${generatedJob.id}&select=output_asset_ids&limit=1`);
  assert(historyAfterOrganization[0]?.output_asset_ids?.includes(generated.id), "Batch organization rewrote generation history.");

  // Existing permanent Delete behavior remains separate and unchanged.
  const deleteMixed = await appJson("/api/media/assets/batch-delete", owner, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ assetIds: [generated.id, foreignAsset.id, uploaded.id] }),
  });
  assert(deleteMixed.response.status === 200 && deleteMixed.body?.ok, "Mixed batch delete request did not complete.");
  assert(deleteMixed.body.summary?.requested === 3 && deleteMixed.body.summary?.deleted === 2 && deleteMixed.body.summary?.failed === 1, "Mixed batch delete did not report truthful partial success.");
  const foreignDelete = deleteMixed.body.results?.find((result) => result.assetId === foreignAsset.id);
  assert(foreignDelete?.ok === false && foreignDelete.error?.code === "asset_not_found", "Foreign media did not collapse to not-found inside batch Delete.");

  const generatedRow = await mediaRow(generated.id);
  const uploadedRow = await mediaRow(uploaded.id);
  const foreignRow = await mediaRow(foreignAsset.id);
  assert(generatedRow?.deleted_at && generatedRow?.purged_at, "Generated batch item was not tombstoned and purged.");
  assert(generatedRow?.favorited_at === null, "Generated batch item kept Favorite state after Delete.");
  assert(uploadedRow?.deleted_at && uploadedRow?.purged_at, "Uploaded batch item was not tombstoned and purged.");
  assert(!foreignRow?.deleted_at && !foreignRow?.purged_at, "Foreign media was changed by another account's batch Delete.");
  assert(!(await objectExists(generatedKey)) && !(await objectExists(generatedThumbKey)), "Generated batch R2 objects survived Delete.");
  assert(!(await objectExists(uploadedKey)), "Uploaded batch R2 object survived Delete.");
  assert(await objectExists(foreignKey), "Foreign batch R2 object was removed.");

  const deletedFavorite = await appJson("/api/media/assets/batch-favorite", owner, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ assetIds: [generated.id], favorite: true }),
  });
  assert(deletedFavorite.body?.results?.[0]?.error?.code === "asset_not_found", "Tombstoned media remained eligible for Batch Favorite.");
  const deletedMembership = await appJson(`/api/media/collections/${collection.id}/items/batch`, owner, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ assetIds: [generated.id], containsAsset: true }),
  });
  assert(deletedMembership.body?.results?.[0]?.error?.code === "asset_not_found", "Tombstoned media remained eligible for Batch Collection.");

  const membershipsAfterDelete = await supabaseRows(`media_collection_items?owner_id=eq.${owner.id}&select=media_asset_id`);
  assert(!membershipsAfterDelete.some((row) => row.media_asset_id === generated.id || row.media_asset_id === uploaded.id), "Batch Delete left collection memberships behind.");
  const uploadRows = await supabaseRows(`media_upload_sessions?id=eq.${uploadSession.id}&select=id`);
  assert(uploadRows.length === 0, "Batch Delete left the completed upload session behind.");
  const historyRows = await supabaseRows(`generation_jobs?id=eq.${generatedJob.id}&select=output_asset_ids&limit=1`);
  assert(historyRows[0]?.output_asset_ids?.includes(generated.id), "Batch Delete rewrote generation output history.");

  const repeatedDelete = await appJson("/api/media/assets/batch-delete", owner, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ assetIds: [generated.id, uploaded.id, generated.id] }),
  });
  assert(repeatedDelete.response.status === 200 && repeatedDelete.body?.summary?.requested === 2 && repeatedDelete.body?.summary?.deleted === 2, "Repeated batch Delete did not deduplicate and preserve idempotence.");

  // Configured browser lifecycle: Organize disclosure, chaining, filter pruning, narrow layout, then Delete regression.
  const visualCollection = await createCollection(owner.id, "RenderLab Batch Organize Target");
  const visualGeneratedJob = await createGenerationJob(owner.id, "RenderLab Batch Organize Visual Generated");
  const visualGeneratedKey = `renderlab/batch-actions-fixtures/${visualGeneratedJob.id}/visual-generated.png`;
  fixture.storageKeys.push(visualGeneratedKey);
  await writeFixture(fixture);
  const visualGenerated = await createAsset(owner.id, {
    origin: "generated",
    generationJobId: visualGeneratedJob.id,
    displayName: "RenderLab Batch Organize Visual Generated",
    storageKey: visualGeneratedKey,
    favorite: false,
  });
  await patchGenerationJob(visualGeneratedJob.id, { output_asset_ids: [visualGenerated.id] });

  const visualUploadedKey = `renderlab/batch-actions-fixtures/${randomUUID()}/visual-uploaded.png`;
  fixture.storageKeys.push(visualUploadedKey);
  await writeFixture(fixture);
  const visualUploaded = await createAsset(owner.id, {
    displayName: "RenderLab Batch Organize Visual Uploaded",
    storageKey: visualUploadedKey,
    favorite: true,
  });
  await addMembership(owner.id, visualCollection.id, visualUploaded.id);

  const visualKeepKey = `renderlab/batch-actions-fixtures/${randomUUID()}/visual-keep.png`;
  fixture.storageKeys.push(visualKeepKey);
  await writeFixture(fixture);
  const visualKeep = await createAsset(owner.id, {
    displayName: "RenderLab Batch Organize Visual Keep",
    storageKey: visualKeepKey,
    favorite: true,
  });
  await addMembership(owner.id, visualCollection.id, visualKeep.id);

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1024 }, colorScheme: "dark" });
  const page = await context.newPage();
  await routeLocalAppRequestsWithAccount(page, baseUrl, owner);
  const organizeQuery = encodeURIComponent("RenderLab Batch Organize Visual");

  await page.goto(`${baseUrl}/library?q=${organizeQuery}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByText("RenderLab Batch Organize Visual Generated", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByRole("button", { name: "Select", exact: true }).click();
  await page.getByRole("checkbox", { name: "Select RenderLab Batch Organize Visual Generated", exact: true }).click();
  await page.getByRole("checkbox", { name: "Select RenderLab Batch Organize Visual Uploaded", exact: true }).click();
  await page.getByText("2 selected on this page", { exact: true }).waitFor({ state: "visible" });
  await page.getByRole("button", { name: "Organize", exact: true }).click();
  await page.getByRole("button", { name: "Favorite selected", exact: true }).waitFor({ state: "visible" });
  await page.screenshot({ path: `${artifactDir}/library-batch-organize-desktop-open.png`, fullPage: true });

  await page.getByRole("button", { name: "Favorite selected", exact: true }).click();
  await page.getByText("2 items were favorited.", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByText("2 selected on this page", { exact: true }).waitFor({ state: "visible" });
  await page.getByRole("combobox", { name: "Collection", exact: true }).selectOption(visualCollection.id);
  await page.getByRole("button", { name: "Add selected", exact: true }).click();
  await page.getByText(`2 items were added to “${visualCollection.name}”.`, { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByText("2 selected on this page", { exact: true }).waitFor({ state: "visible" });
  await page.screenshot({ path: `${artifactDir}/library-batch-organize-desktop-complete.png`, fullPage: true });

  assert(Boolean((await mediaRow(visualGenerated.id))?.favorited_at) && Boolean((await mediaRow(visualUploaded.id))?.favorited_at), "Browser Batch Favorite did not reach target state.");
  assert(await membershipExists(owner.id, visualCollection.id, visualGenerated.id) && await membershipExists(owner.id, visualCollection.id, visualUploaded.id), "Browser Batch Collection Add did not reach target state.");
  assert(await objectExists(visualGeneratedKey) && await objectExists(visualUploadedKey), "Browser organization changed R2 content.");

  await page.goto(`${baseUrl}/library?q=${organizeQuery}&favorite=true`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByText("RenderLab Batch Organize Visual Keep", { exact: true }).waitFor({ state: "visible" });
  await page.getByRole("button", { name: "Select", exact: true }).click();
  await page.getByRole("checkbox", { name: "Select RenderLab Batch Organize Visual Generated", exact: true }).click();
  await page.getByRole("checkbox", { name: "Select RenderLab Batch Organize Visual Uploaded", exact: true }).click();
  await page.getByRole("button", { name: "Organize", exact: true }).click();
  await page.getByRole("button", { name: "Unfavorite selected", exact: true }).click();
  await page.getByText("RenderLab Batch Organize Visual Generated", { exact: true }).waitFor({ state: "detached", timeout: 30_000 });
  await page.getByText("RenderLab Batch Organize Visual Uploaded", { exact: true }).waitFor({ state: "detached", timeout: 30_000 });
  await page.getByText("Select media on this page", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  assert(await page.getByRole("checkbox", { checked: true }).count() === 0, "Favorite-filter refresh did not prune removed selected items.");
  await page.screenshot({ path: `${artifactDir}/library-batch-organize-desktop-favorites-pruned.png`, fullPage: true });

  await page.goto(`${baseUrl}/library?q=${organizeQuery}&collection=${encodeURIComponent(visualCollection.id)}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByText("RenderLab Batch Organize Visual Keep", { exact: true }).waitFor({ state: "visible" });
  await page.getByRole("button", { name: "Select", exact: true }).click();
  await page.getByRole("checkbox", { name: "Select RenderLab Batch Organize Visual Generated", exact: true }).click();
  await page.getByRole("checkbox", { name: "Select RenderLab Batch Organize Visual Uploaded", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Organize", exact: true }).click();
  await page.getByRole("combobox", { name: "Collection", exact: true }).selectOption(visualCollection.id);
  await page.screenshot({ path: `${artifactDir}/library-batch-organize-mobile-open.png`, fullPage: true });
  await page.getByRole("button", { name: "Remove selected", exact: true }).click();
  await page.getByText("RenderLab Batch Organize Visual Generated", { exact: true }).waitFor({ state: "detached", timeout: 30_000 });
  await page.getByText("RenderLab Batch Organize Visual Uploaded", { exact: true }).waitFor({ state: "detached", timeout: 30_000 });
  await page.getByText("Select media on this page", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  assert(await page.getByRole("checkbox", { checked: true }).count() === 0, "Collection-filter refresh did not prune removed selected items.");
  await page.screenshot({ path: `${artifactDir}/library-batch-organize-mobile-pruned.png`, fullPage: true });

  assert(!(await membershipExists(owner.id, visualCollection.id, visualGenerated.id)) && !(await membershipExists(owner.id, visualCollection.id, visualUploaded.id)), "Browser Batch Collection Remove did not reach target state.");
  assert(await membershipExists(owner.id, visualCollection.id, visualKeep.id), "Unselected collection member was changed by batch organization.");
  assert(!(await mediaRow(visualGenerated.id))?.favorited_at && !(await mediaRow(visualUploaded.id))?.favorited_at && Boolean((await mediaRow(visualKeep.id))?.favorited_at), "Browser Unfavorite changed the wrong assets.");

  const deleteVisualAssets = [];
  for (const label of ["One", "Two", "Keep"]) {
    const key = `renderlab/batch-actions-fixtures/${randomUUID()}/delete-${label.toLowerCase()}.png`;
    fixture.storageKeys.push(key);
    await writeFixture(fixture);
    const asset = await createAsset(owner.id, {
      displayName: `RenderLab Batch Delete Visual ${label}`,
      storageKey: key,
    });
    deleteVisualAssets.push({ asset, key, label });
  }

  await page.setViewportSize({ width: 1440, height: 1024 });
  const deleteQuery = encodeURIComponent("RenderLab Batch Delete Visual");
  await page.goto(`${baseUrl}/library?q=${deleteQuery}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByText("RenderLab Batch Delete Visual One", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByRole("button", { name: "Select", exact: true }).click();
  await page.getByRole("checkbox", { name: "Select RenderLab Batch Delete Visual One", exact: true }).click();
  await page.getByRole("checkbox", { name: "Select RenderLab Batch Delete Visual Two", exact: true }).click();
  await page.getByText("2 selected on this page", { exact: true }).waitFor({ state: "visible" });
  await page.screenshot({ path: `${artifactDir}/library-batch-delete-desktop-selected.png`, fullPage: true });

  await page.getByRole("button", { name: "Delete 2", exact: true }).click();
  const dialog = page.getByRole("alertdialog");
  await dialog.getByRole("heading", { name: "Delete 2 selected items?", exact: true }).waitFor({ state: "visible" });
  await page.screenshot({ path: `${artifactDir}/library-batch-delete-desktop-confirm.png`, fullPage: true });
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();

  await page.goto(`${baseUrl}/library?q=${deleteQuery}&sort=oldest`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByText("RenderLab Batch Delete Visual One", { exact: true }).waitFor({ state: "visible" });
  await page.getByRole("button", { name: "Select", exact: true }).click();
  assert(await page.getByRole("checkbox", { checked: true }).count() === 0, "Selection survived a Library view change instead of resetting.");

  await page.getByRole("checkbox", { name: "Select RenderLab Batch Delete Visual One", exact: true }).click();
  await page.getByRole("checkbox", { name: "Select RenderLab Batch Delete Visual Two", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Delete 2", exact: true }).click();
  await dialog.getByRole("heading", { name: "Delete 2 selected items?", exact: true }).waitFor({ state: "visible" });
  await page.screenshot({ path: `${artifactDir}/library-batch-delete-mobile-confirm.png`, fullPage: true });
  await dialog.getByRole("button", { name: "Delete 2 permanently", exact: true }).click();

  await page.getByText("2 items were deleted permanently.", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByText("RenderLab Batch Delete Visual Keep", { exact: true }).waitFor({ state: "visible" });
  assert(await page.getByText("RenderLab Batch Delete Visual One", { exact: true }).count() === 0, "Deleted visual item One remained in Library.");
  assert(await page.getByText("RenderLab Batch Delete Visual Two", { exact: true }).count() === 0, "Deleted visual item Two remained in Library.");

  for (const visual of deleteVisualAssets) {
    const row = await mediaRow(visual.asset.id);
    if (visual.label === "Keep") {
      assert(!row?.deleted_at && !row?.purged_at, "Unselected visual media was deleted.");
      assert(await objectExists(visual.key), "Unselected visual R2 object was deleted.");
    } else {
      assert(row?.deleted_at && row?.purged_at, `Selected visual media ${visual.label} was not tombstoned and purged.`);
      assert(!(await objectExists(visual.key)), `Selected visual R2 object ${visual.label} survived deletion.`);
    }
  }

  console.log(`Configured Library Batch Actions verified. owner=${owner.id} foreign=${foreign.id} collection=${collection.id} visualCollection=${visualCollection.id}`);
} catch (error) {
  primaryError = error;
} finally {
  if (browser) await browser.close().catch(() => {});
  try {
    await cleanupFixture();
  } catch (cleanupError) {
    console.error(cleanupError);
    if (!primaryError) primaryError = cleanupError;
  }
}

if (primaryError) throw primaryError;
