import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  configuredTestAccountIdentity,
  createConfiguredTestAccount,
  deleteConfiguredTestAccount,
} from "./lib/configured-test-account.mjs";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const maintenanceSecret = process.env.RENDERLAB_MAINTENANCE_SECRET;
const bucket = process.env.R2_BUCKET_NAME;
const ownerIdentity = configuredTestAccountIdentity("maintenance-owner");
const fixtureKeys = new Set();

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: supabaseKey,
  RENDERLAB_MAINTENANCE_SECRET: maintenanceSecret,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: bucket,
})) {
  if (!value) throw new Error(`${name} is required for Phase 15 maintenance verification.`);
}
if (process.env.RENDERLAB_TEST_MAINTENANCE_OWNER_SCOPE !== "true") {
  throw new Error("Maintenance verification requires explicit owner scoping.");
}
if (process.env.RENDERLAB_TEST_MAINTENANCE_OWNER_ID !== ownerIdentity.id) {
  throw new Error("Maintenance owner scope does not match the run-owned fixture account.");
}

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});
const imageBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZgZsAAAAASUVORK5CYII=",
  "base64",
);

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
  if (!response.ok) throw new Error(`Maintenance query failed (${response.status}): ${await response.text()}`);
  return response.json();
}

async function mutate(path, init = {}) {
  const response = await supabase(path, init);
  if (!response.ok) throw new Error(`Maintenance mutation failed (${response.status}): ${await response.text()}`);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function putObject(key) {
  fixtureKeys.add(key);
  await r2.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: imageBytes, ContentType: "image/png" }));
}

async function objectExists(key) {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    const status = error?.$metadata?.httpStatusCode;
    if (status === 404 || error?.name === "NotFound" || error?.name === "NoSuchKey") return false;
    throw error;
  }
}

const oldAt = new Date(Date.now() - 30 * 60 * 60_000).toISOString();
const recentAt = new Date(Date.now() - 60 * 60_000).toISOString();
const quiescentAt = new Date(Date.now() - 20 * 60_000).toISOString();

async function createSource(ownerId, label, status, createdAt = oldAt, failureKey = false) {
  const id = randomUUID();
  const key = failureKey
    ? `renderlab/maintenance-fail-delete/source-${id}.png`
    : `renderlab/maintenance-fixtures/source-${label}-${id}.png`;
  await putObject(key);
  const inserted = await mutate("generation_sources?select=*", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      id,
      owner_id: ownerId,
      storage_key: key,
      filename: `${label}.png`,
      mime_type: "image/png",
      size_bytes: imageBytes.length,
      purpose: "reference",
      status,
      metadata: { verification: "phase15-maintenance" },
      created_at: createdAt,
      updated_at: createdAt,
    }),
  });
  return inserted[0];
}

async function createReferenceJob(ownerId, sourceId, label) {
  const id = randomUUID();
  const inserted = await mutate("generation_jobs?select=*", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      id,
      owner_id: ownerId,
      status: "failed",
      operation: "edit-image",
      output_kind: "image",
      prompt: `Phase 15 maintenance ${label}`,
      workflow_id: "phase15-maintenance-fixture",
      model: "phase15-maintenance-fixture",
      ecosystem: "flux2-klein-9b",
      inputs: [{ alias: "image1", role: "primary-image", source: { type: "temporary-source", id: sourceId } }],
      parameters: { output: { kind: "image", aspectRatio: "original" }, advanced: {} },
      output_asset_ids: [],
      error_code: "fixture",
      error_message: "fixture",
      created_at: oldAt,
      updated_at: oldAt,
      completed_at: oldAt,
    }),
  });
  return inserted[0];
}

async function createUpload(ownerId, label, status = "pending", createdAt = oldAt) {
  const id = randomUUID();
  const key = `renderlab/maintenance-fixtures/upload-${label}-${id}.png`;
  await putObject(key);
  const inserted = await mutate("media_upload_sessions?select=*", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      id,
      owner_id: ownerId,
      storage_key: key,
      filename: `${label}.png`,
      display_name: label,
      mime_type: "image/png",
      size_bytes: imageBytes.length,
      status,
      metadata: { verification: "phase15-maintenance" },
      created_at: createdAt,
      updated_at: createdAt,
    }),
  });
  return inserted[0];
}

async function createMedia(ownerId, key, { deleted = false } = {}) {
  const id = randomUUID();
  fixtureKeys.add(key);
  const inserted = await mutate("media_assets?select=*", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      id,
      owner_id: ownerId,
      generation_job_id: null,
      origin: "uploaded",
      kind: "image",
      mime_type: "image/png",
      storage_key: key,
      thumbnail_storage_key: null,
      original_filename: "maintenance.png",
      display_name: "Maintenance fixture",
      size_bytes: imageBytes.length,
      provenance: { source: "phase15-maintenance" },
      metadata: {},
      created_at: oldAt,
      updated_at: oldAt,
      deleted_at: deleted ? oldAt : null,
      purged_at: null,
    }),
  });
  return inserted[0];
}

async function maintenance(auth = maintenanceSecret) {
  const response = await fetch(`${baseUrl}/api/internal/maintenance`, {
    method: "POST",
    headers: auth ? { authorization: `Bearer ${auth}` } : {},
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}

async function getSource(id) {
  return (await rows(`generation_sources?owner_id=eq.${ownerIdentity.id}&id=eq.${id}&select=*&limit=1`))[0] ?? null;
}
async function getUpload(id) {
  return (await rows(`media_upload_sessions?owner_id=eq.${ownerIdentity.id}&id=eq.${id}&select=*&limit=1`))[0] ?? null;
}
async function getMedia(id) {
  return (await rows(`media_assets?owner_id=eq.${ownerIdentity.id}&id=eq.${id}&select=*&limit=1`))[0] ?? null;
}
async function backdateCleaning(table, id) {
  await mutate(`${table}?owner_id=eq.${ownerIdentity.id}&id=eq.${id}&status=eq.cleaning`, {
    method: "PATCH",
    body: JSON.stringify({ updated_at: quiescentAt }),
  });
}

async function cleanup() {
  for (const key of fixtureKeys) {
    await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch(() => {});
  }
  fixtureKeys.clear();
  await deleteConfiguredTestAccount(ownerIdentity).catch(() => {});
}

try {
  await cleanup();
  const owner = await createConfiguredTestAccount("maintenance-owner");

  const pending = await createSource(owner.id, "pending", "pending");
  const ready = await createSource(owner.id, "ready", "ready");
  const failDelete = await createSource(owner.id, "delete-fault", "failed", oldAt, true);
  const lateReference = await createSource(owner.id, "late-reference", "ready");
  const referenced = await createSource(owner.id, "referenced", "ready");
  const recent = await createSource(owner.id, "recent", "ready", recentAt);
  await createReferenceJob(owner.id, referenced.id, "preexisting reference");

  const uploadPending = await createUpload(owner.id, "pending");
  const uploadFailed = await createUpload(owner.id, "failed", "failed");
  const uploadAdopt = await createUpload(owner.id, "adopt");
  const uploadRecent = await createUpload(owner.id, "recent", "pending", recentAt);

  const purgeKey = `renderlab/maintenance-fixtures/purge-${randomUUID()}.png`;
  await putObject(purgeKey);
  const purgeAsset = await createMedia(owner.id, purgeKey, { deleted: true });

  const unauthenticated = await maintenance(null);
  assert(unauthenticated.status === 401, "Maintenance endpoint accepted an unauthenticated request.");
  const wrongSecret = await maintenance("wrong-secret");
  assert(wrongSecret.status === 401, "Maintenance endpoint accepted the wrong secret.");

  const first = await maintenance();
  assert(first.status === 200 && first.body?.ok, `First maintenance pass failed: ${JSON.stringify(first)}`);
  assert(first.body.summary.sourceClaims.claimed === 4, `Expected four source cleanup claims: ${JSON.stringify(first.body.summary)}`);
  assert(first.body.summary.sourceClaims.skippedReferenced >= 1, "Referenced stale source was not reported as protected.");
  assert(first.body.summary.uploadClaims.claimed === 3, "Expected three stale upload cleanup claims.");
  assert(first.body.summary.mediaPurges.purged === 1, "Pending tombstone purge was not retried successfully.");

  for (const source of [pending, ready, failDelete, lateReference]) {
    assert((await getSource(source.id))?.status === "cleaning", `Source ${source.id} was not claimed for cleanup.`);
    assert(await objectExists(source.storage_key), `Source object ${source.storage_key} was deleted during claim pass.`);
  }
  assert((await getSource(referenced.id))?.status === "ready", "Referenced source was claimed or mutated.");
  assert((await getSource(recent.id))?.status === "ready", "Recent source was claimed by age-based maintenance.");
  assert((await getUpload(uploadRecent.id))?.status === "pending", "Recent upload was claimed by maintenance.");
  assert((await getMedia(purgeAsset.id))?.purged_at, "Tombstoned media did not record purged_at.");
  assert(!(await objectExists(purgeKey)), "Tombstoned media primary object still exists after purge.");

  // Simulate a product request that validated the source before maintenance claimed it.
  // The later job reference must win and restore the source instead of deleting bytes.
  await createReferenceJob(owner.id, lateReference.id, "late in-flight reference");

  // Simulate upload promotion after the cleanup claim but before the quiescent delete pass.
  const adoptedAsset = await createMedia(owner.id, uploadAdopt.storage_key);

  for (const source of [pending, ready, failDelete, lateReference]) await backdateCleaning("generation_sources", source.id);
  for (const upload of [uploadPending, uploadFailed, uploadAdopt]) await backdateCleaning("media_upload_sessions", upload.id);

  const second = await maintenance();
  assert(second.status === 200 && second.body?.ok, `Second maintenance pass failed: ${JSON.stringify(second)}`);
  assert(second.body.summary.sourceCleanup.deleted === 2, `Expected two source deletions: ${JSON.stringify(second.body.summary.sourceCleanup)}`);
  assert(second.body.summary.sourceCleanup.restoredReferenced === 1, "Late referenced source was not restored.");
  assert(second.body.summary.sourceCleanup.failed === 1, "Injected source R2 deletion failure was not surfaced.");
  assert(second.body.summary.uploadCleanup.deleted === 2, "Stale unpromoted uploads were not deleted.");
  assert(second.body.summary.uploadCleanup.adopted === 1, "Promoted upload was not adopted instead of deleted.");

  assert((await getSource(pending.id)) === null && !(await objectExists(pending.storage_key)), "Pending source did not converge to full cleanup.");
  assert((await getSource(ready.id)) === null && !(await objectExists(ready.storage_key)), "Ready unreferenced source did not converge to cleanup.");
  assert((await getSource(lateReference.id))?.status === "ready" && await objectExists(lateReference.storage_key), "Late referenced source was not preserved.");
  assert((await getSource(failDelete.id))?.status === "cleaning" && await objectExists(failDelete.storage_key), "Failed R2 deletion did not leave source retryable.");
  assert((await getUpload(uploadPending.id)) === null && !(await objectExists(uploadPending.storage_key)), "Pending upload staging did not clean.");
  assert((await getUpload(uploadFailed.id)) === null && !(await objectExists(uploadFailed.storage_key)), "Failed upload staging did not clean.");
  const adoptedUpload = await getUpload(uploadAdopt.id);
  assert(adoptedUpload?.status === "completed" && adoptedUpload.media_asset_id === adoptedAsset.id, "Promoted upload cleanup claim was not adopted.");
  assert(await objectExists(uploadAdopt.storage_key), "Adopted durable upload object was deleted.");

  await backdateCleaning("generation_sources", failDelete.id);
  const third = await maintenance();
  assert(third.status === 200 && third.body?.ok, "Third maintenance retry failed.");
  assert((await getSource(failDelete.id)) === null && !(await objectExists(failDelete.storage_key)), "Retryable source cleanup did not converge after transient delete failure.");

  console.log("Phase 15 maintenance verification passed: bounded claims, reference restoration, upload adoption, retryable R2 failure and pending media purge semantics.");
} finally {
  await cleanup();
}
