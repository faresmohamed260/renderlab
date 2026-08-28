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
  if (!value) throw new Error(`${name} is required for configured Library batch delete verification.`);
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
  if (!response.ok) throw new Error(`Could not inspect batch-delete fixture (${response.status}): ${await response.text()}`);
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
    workflow_id: "library-batch-delete-fixture",
    model: "library-batch-delete-fixture",
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
    provenance: origin === "generated" ? { prompt: displayName, operation: "create-image", model: "library-batch-delete-fixture" } : {},
    metadata: { verification: "library-batch-delete-v0-1" },
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

async function mediaRow(assetId) {
  const rows = await supabaseRows(
    `media_assets?id=eq.${encodeURIComponent(assetId)}&select=id,owner_id,deleted_at,purged_at,favorited_at,storage_key,thumbnail_storage_key&limit=1`,
  );
  return rows[0] || null;
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

  const collection = await createCollection(owner.id, "RenderLab Batch Delete Collection");

  const generatedJob = await createGenerationJob(owner.id, "RenderLab Batch Delete Generated");
  const generatedKey = `renderlab/batch-delete-fixtures/${generatedJob.id}/generated.png`;
  const generatedThumbKey = `renderlab/batch-delete-fixtures/${generatedJob.id}/generated-thumb.png`;
  fixture.storageKeys.push(generatedKey, generatedThumbKey);
  await writeFixture(fixture);
  const generated = await createAsset(owner.id, {
    origin: "generated",
    generationJobId: generatedJob.id,
    displayName: "RenderLab Batch Delete Generated",
    storageKey: generatedKey,
    thumbnailStorageKey: generatedThumbKey,
    favorite: true,
  });
  await patchGenerationJob(generatedJob.id, { output_asset_ids: [generated.id] });
  await addMembership(owner.id, collection.id, generated.id);

  const uploadedKey = `renderlab/batch-delete-fixtures/${randomUUID()}/uploaded.png`;
  fixture.storageKeys.push(uploadedKey);
  await writeFixture(fixture);
  const uploaded = await createAsset(owner.id, {
    displayName: "RenderLab Batch Delete Uploaded",
    storageKey: uploadedKey,
  });
  const uploadSession = await insertRow("media_upload_sessions", {
    id: randomUUID(),
    owner_id: owner.id,
    storage_key: uploadedKey,
    filename: "renderlab-batch-delete-uploaded.png",
    display_name: "RenderLab Batch Delete Uploaded",
    mime_type: "image/png",
    size_bytes: pngBytes.length,
    status: "completed",
    media_asset_id: uploaded.id,
    metadata: { verification: "library-batch-delete-v0-1" },
  });
  await addMembership(owner.id, collection.id, uploaded.id);

  const foreignKey = `renderlab/batch-delete-fixtures/${randomUUID()}/foreign.png`;
  fixture.storageKeys.push(foreignKey);
  await writeFixture(fixture);
  const foreignAsset = await createAsset(foreign.id, {
    displayName: "RenderLab Batch Delete Foreign",
    storageKey: foreignKey,
  });

  const empty = await appJson("/api/media/assets/batch-delete", owner, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ assetIds: [] }),
  });
  assert(empty.response.status === 400 && empty.body?.ok === false, "Batch delete accepted an empty selection.");

  const tooMany = await appJson("/api/media/assets/batch-delete", owner, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ assetIds: Array.from({ length: 25 }, () => randomUUID()) }),
  });
  assert(tooMany.response.status === 400 && tooMany.body?.ok === false, "Batch delete accepted more than one Library page.");

  const invalid = await appJson("/api/media/assets/batch-delete", owner, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ assetIds: ["not-a-media-id"] }),
  });
  assert(invalid.response.status === 400 && invalid.body?.ok === false, "Batch delete accepted an invalid media ID.");

  const signedOut = await appJson("/api/media/assets/batch-delete", null, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ assetIds: [generated.id] }),
  });
  assert(signedOut.response.status === 401 && signedOut.body?.ok === false, "Signed-out batch delete did not require authentication.");

  const mixed = await appJson("/api/media/assets/batch-delete", owner, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ assetIds: [generated.id, foreignAsset.id, uploaded.id] }),
  });
  assert(mixed.response.status === 200 && mixed.body?.ok, "Mixed batch delete request did not complete.");
  assert(mixed.body.summary?.requested === 3, "Mixed batch delete reported the wrong requested count.");
  assert(mixed.body.summary?.deleted === 2 && mixed.body.summary?.failed === 1, "Mixed batch delete did not report truthful partial success.");
  const foreignResult = mixed.body.results?.find((result) => result.assetId === foreignAsset.id);
  assert(foreignResult?.ok === false && foreignResult.error?.code === "asset_not_found", "Foreign media did not collapse to not-found inside the batch result.");

  const generatedRow = await mediaRow(generated.id);
  const uploadedRow = await mediaRow(uploaded.id);
  const foreignRow = await mediaRow(foreignAsset.id);
  assert(generatedRow?.deleted_at && generatedRow?.purged_at, "Generated batch item was not tombstoned and purged.");
  assert(generatedRow?.favorited_at === null, "Generated batch item kept Favorite state.");
  assert(uploadedRow?.deleted_at && uploadedRow?.purged_at, "Uploaded batch item was not tombstoned and purged.");
  assert(!foreignRow?.deleted_at && !foreignRow?.purged_at, "Foreign media was changed by another account's batch request.");
  assert(!(await objectExists(generatedKey)) && !(await objectExists(generatedThumbKey)), "Generated batch R2 objects survived deletion.");
  assert(!(await objectExists(uploadedKey)), "Uploaded batch R2 object survived deletion.");
  assert(await objectExists(foreignKey), "Foreign batch R2 object was removed.");

  const memberships = await supabaseRows(`media_collection_items?owner_id=eq.${owner.id}&select=media_asset_id`);
  assert(!memberships.some((row) => row.media_asset_id === generated.id || row.media_asset_id === uploaded.id), "Batch delete left collection memberships behind.");
  const uploadRows = await supabaseRows(`media_upload_sessions?id=eq.${uploadSession.id}&select=id`);
  assert(uploadRows.length === 0, "Batch delete left the completed upload session behind.");
  const historyRows = await supabaseRows(`generation_jobs?id=eq.${generatedJob.id}&select=output_asset_ids&limit=1`);
  assert(historyRows[0]?.output_asset_ids?.includes(generated.id), "Batch delete rewrote generation output history.");

  const repeated = await appJson("/api/media/assets/batch-delete", owner, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ assetIds: [generated.id, uploaded.id, generated.id] }),
  });
  assert(repeated.response.status === 200 && repeated.body?.ok, "Repeated batch delete was not idempotent.");
  assert(repeated.body.summary?.requested === 2 && repeated.body.summary?.deleted === 2, "Repeated batch delete did not deduplicate and preserve idempotence.");

  const visualAssets = [];
  for (const label of ["One", "Two", "Keep"]) {
    const key = `renderlab/batch-delete-fixtures/${randomUUID()}/visual-${label.toLowerCase()}.png`;
    fixture.storageKeys.push(key);
    await writeFixture(fixture);
    const asset = await createAsset(owner.id, {
      displayName: `RenderLab Batch Delete Visual ${label}`,
      storageKey: key,
    });
    visualAssets.push({ asset, key, label });
  }

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1024 }, colorScheme: "dark" });
  const page = await context.newPage();
  await routeLocalAppRequestsWithAccount(page, baseUrl, owner);
  const query = encodeURIComponent("RenderLab Batch Delete Visual");

  await page.goto(`${baseUrl}/library?q=${query}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
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

  await page.goto(`${baseUrl}/library?q=${query}&sort=oldest`, { waitUntil: "domcontentloaded", timeout: 60_000 });
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

  for (const visual of visualAssets) {
    const row = await mediaRow(visual.asset.id);
    if (visual.label === "Keep") {
      assert(!row?.deleted_at && !row?.purged_at, "Unselected visual media was deleted.");
      assert(await objectExists(visual.key), "Unselected visual R2 object was deleted.");
    } else {
      assert(row?.deleted_at && row?.purged_at, `Selected visual media ${visual.label} was not tombstoned and purged.`);
      assert(!(await objectExists(visual.key)), `Selected visual R2 object ${visual.label} survived deletion.`);
    }
  }

  console.log(`Configured Library Batch Delete verified. owner=${owner.id} foreign=${foreign.id}`);
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
