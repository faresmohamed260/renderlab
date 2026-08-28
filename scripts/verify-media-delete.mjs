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
const artifactDir = process.env.RENDERLAB_MEDIA_DELETE_ARTIFACT_DIR || "artifacts";
const fixturePath = process.env.RENDERLAB_MEDIA_DELETE_FIXTURE_PATH || "/tmp/renderlab-media-delete-fixture.json";
const cleanupOnly = process.argv.includes("--cleanup-only");
const ownerIdentity = configuredTestAccountIdentity("media-delete");
const foreignIdentity = configuredTestAccountIdentity("media-delete-foreign");

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
  if (!value) throw new Error(`${name} is required for configured media delete verification.`);
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
  if (!response.ok) throw new Error(`Could not inspect delete fixture (${response.status}): ${await response.text()}`);
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
  await cleanupCollections(identity.id);
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

async function createGenerationJob(ownerId, { prompt, inputs = [], outputAssetIds = [] }) {
  const now = new Date().toISOString();
  return insertRow("generation_jobs", {
    id: randomUUID(),
    owner_id: ownerId,
    status: "succeeded",
    operation: inputs.length ? "edit-image" : "create-image",
    output_kind: "image",
    prompt,
    workflow_id: "media-delete-fixture",
    model: "media-delete-fixture",
    ecosystem: "fixture",
    inputs,
    parameters: {},
    worker_id: null,
    provider_job_id: null,
    worker_state: "succeeded",
    failover_history: [],
    output_asset_ids: outputAssetIds,
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

async function createAsset(ownerId, { origin, generationJobId = null, displayName, storageKey, thumbnailStorageKey = null, favorite = false }) {
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
    provenance: origin === "generated" ? { prompt: displayName, operation: "create-image", model: "media-delete-fixture" } : {},
    metadata: { verification: "media-delete-v0-1" },
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

async function assertProductMissing(account, assetId) {
  const metadata = await appJson(`/api/media/assets/${assetId}`, account);
  assert(metadata.response.status === 404 && metadata.body?.ok === false, "Deleted media remained available through the metadata API.");

  const favorite = await appJson(`/api/media/assets/${assetId}/favorite`, account, { method: "PUT" });
  assert(favorite.response.status === 404 && favorite.body?.ok === false, "Deleted media could still be favorited.");

  const rename = await appJson(`/api/media/assets/${assetId}`, account, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ displayName: "Should not rename" }),
  });
  assert(rename.response.status === 404 && rename.body?.ok === false, "Deleted media could still be renamed.");

  const content = await app(`/api/media/assets/${assetId}/content`, account, { redirect: "manual" });
  assert(content.status === 404, `Deleted media content route returned ${content.status} instead of 404.`);

  const download = await app(`/api/media/assets/${assetId}/download`, account, { redirect: "manual" });
  assert(download.status === 404, `Deleted media download route returned ${download.status} instead of 404.`);

  const list = await appJson(`/api/media/assets?q=${encodeURIComponent("RenderLab Delete")}&limit=24`, account);
  assert(list.response.status === 200 && list.body?.ok, "Library list failed after deletion.");
  assert(!list.body.items.some((asset) => asset.id === assetId), "Deleted media remained in the Library list.");
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
  await cleanupCollections(ownerIdentity.id);
  await cleanupCollections(foreignIdentity.id);
  const owner = await createConfiguredTestAccount("media-delete");
  const foreign = await createConfiguredTestAccount("media-delete-foreign");

  const fixture = {
    ownerIds: [owner.id, foreign.id],
    storageKeys: [],
  };
  await writeFixture(fixture);

  const generatedJob = await createGenerationJob(owner.id, { prompt: "RenderLab Delete Generated" });
  const generatedStorageKey = `renderlab/delete-fixtures/${generatedJob.id}/generated.png`;
  const generatedThumbnailKey = `renderlab/delete-fixtures/${generatedJob.id}/generated-thumb.png`;
  fixture.storageKeys.push(generatedStorageKey, generatedThumbnailKey);
  await writeFixture(fixture);

  const generated = await createAsset(owner.id, {
    origin: "generated",
    generationJobId: generatedJob.id,
    displayName: "RenderLab Delete Generated",
    storageKey: generatedStorageKey,
    thumbnailStorageKey: generatedThumbnailKey,
    favorite: true,
  });
  await patchGenerationJob(generatedJob.id, { output_asset_ids: [generated.id] });

  const historyInput = [{ source: { type: "media-asset", id: generated.id }, role: "primary-image" }];
  const historyJob = await createGenerationJob(owner.id, {
    prompt: "RenderLab Delete History Consumer",
    inputs: historyInput,
  });

  const uploadedStorageKey = `renderlab/delete-fixtures/${randomUUID()}/uploaded.png`;
  fixture.storageKeys.push(uploadedStorageKey);
  await writeFixture(fixture);
  const uploaded = await createAsset(owner.id, {
    origin: "uploaded",
    displayName: "RenderLab Delete Uploaded",
    storageKey: uploadedStorageKey,
  });
  const uploadSession = await insertRow("media_upload_sessions", {
    id: randomUUID(),
    owner_id: owner.id,
    storage_key: uploadedStorageKey,
    filename: "renderlab-delete-uploaded.png",
    display_name: "RenderLab Delete Uploaded",
    mime_type: "image/png",
    size_bytes: pngBytes.length,
    status: "completed",
    media_asset_id: uploaded.id,
    metadata: { verification: "media-delete-v0-1" },
  });

  const collection = await createCollection(owner.id, "RenderLab Delete Collection");
  await addMembership(owner.id, collection.id, generated.id);
  await addMembership(owner.id, collection.id, uploaded.id);

  const invalid = await appJson("/api/media/assets/not-a-media-id", owner, { method: "DELETE" });
  assert(invalid.response.status === 400 && invalid.body?.ok === false, "Delete accepted an invalid media asset ID.");

  const signedOut = await appJson(`/api/media/assets/${generated.id}`, null, { method: "DELETE" });
  assert(signedOut.response.status === 401 && signedOut.body?.ok === false, "Signed-out delete did not require authentication.");

  const foreignDelete = await appJson(`/api/media/assets/${generated.id}`, foreign, { method: "DELETE" });
  assert(foreignDelete.response.status === 404 && foreignDelete.body?.ok === false, "Foreign account could distinguish/delete another owner's media.");
  assert(await objectExists(generatedStorageKey), "Foreign delete removed the owner's R2 object.");

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1024 }, colorScheme: "dark" });
  const page = await context.newPage();
  await routeLocalAppRequestsWithAccount(page, baseUrl, owner);

  await page.goto(`${baseUrl}/library/${generated.id}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByRole("heading", { name: "RenderLab Delete Generated", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  const dialog = page.getByRole("alertdialog");
  await dialog.getByRole("heading", { name: "Delete media?", exact: true }).waitFor({ state: "visible", timeout: 10_000 });
  await page.screenshot({ path: `${artifactDir}/media-delete-desktop-confirm.png`, fullPage: true });
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("heading", { name: "RenderLab Delete Generated", exact: true }).waitFor({ state: "visible" });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await dialog.getByRole("heading", { name: "Delete media?", exact: true }).waitFor({ state: "visible" });
  await page.screenshot({ path: `${artifactDir}/media-delete-mobile-confirm.png`, fullPage: true });
  await dialog.getByRole("button", { name: "Delete permanently", exact: true }).click();
  await page.waitForURL((url) => url.pathname === "/library", { timeout: 30_000 });

  const generatedRow = await mediaRow(generated.id);
  assert(generatedRow?.deleted_at, "Delete did not tombstone the generated media row.");
  assert(generatedRow?.purged_at, "Delete did not record completed R2 purge for generated media.");
  assert(generatedRow?.favorited_at === null, "Delete did not clear Favorite state.");
  assert(!(await objectExists(generatedStorageKey)), "Generated primary R2 object survived deletion.");
  assert(!(await objectExists(generatedThumbnailKey)), "Generated thumbnail R2 object survived deletion.");

  const generatedMembership = await supabaseRows(`media_collection_items?media_asset_id=eq.${generated.id}&select=media_asset_id`);
  assert(generatedMembership.length === 0, "Delete left generated media in a collection.");

  const sourceJobRows = await supabaseRows(`generation_jobs?id=eq.${generatedJob.id}&select=output_asset_ids&limit=1`);
  assert(sourceJobRows[0]?.output_asset_ids?.includes(generated.id), "Delete rewrote generation output history.");
  const historyJobRows = await supabaseRows(`generation_jobs?id=eq.${historyJob.id}&select=inputs&limit=1`);
  assert(historyJobRows[0]?.inputs?.[0]?.source?.id === generated.id, "Delete rewrote generation input history.");

  const membershipReinsert = await supabase("media_collection_items", {
    method: "POST",
    body: JSON.stringify({ collection_id: collection.id, media_asset_id: generated.id, owner_id: owner.id }),
  });
  assert(!membershipReinsert.ok, "Database allowed a tombstoned asset to rejoin a collection.");

  const jobsBeforeReuse = await supabaseRows(`generation_jobs?owner_id=eq.${owner.id}&select=id`);
  const reuse = await appJson("/api/generation/jobs", owner, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      prompt: "Deleted media must not be reusable",
      output: { kind: "image", aspectRatio: "1:1" },
      inputs: [{ source: { type: "media-asset", id: generated.id }, role: "primary-image" }],
    }),
  });
  assert(reuse.response.status === 502 && reuse.body?.ok === false, `Deleted media reuse returned unexpected status ${reuse.response.status}.`);
  assert(reuse.body?.error?.code === "generation_submission_failed", "Deleted media reuse did not fail at the generation product boundary.");
  const jobsAfterReuse = await supabaseRows(`generation_jobs?owner_id=eq.${owner.id}&select=id`);
  assert(jobsAfterReuse.length === jobsBeforeReuse.length, "Deleted media reuse created a generation job before rejection.");

  await assertProductMissing(owner, generated.id);

  const uploadedDelete = await appJson(`/api/media/assets/${uploaded.id}`, owner, { method: "DELETE" });
  assert(uploadedDelete.response.status === 200 && uploadedDelete.body?.ok, "Uploaded media delete did not complete.");
  const uploadedRow = await mediaRow(uploaded.id);
  assert(uploadedRow?.deleted_at && uploadedRow?.purged_at, "Uploaded media was not tombstoned and purged.");
  assert(!(await objectExists(uploadedStorageKey)), "Uploaded media R2 object survived deletion.");
  const uploadRows = await supabaseRows(`media_upload_sessions?id=eq.${uploadSession.id}&select=id`);
  assert(uploadRows.length === 0, "Delete left the completed upload session linked to the tombstone.");
  const uploadedMembership = await supabaseRows(`media_collection_items?media_asset_id=eq.${uploaded.id}&select=media_asset_id`);
  assert(uploadedMembership.length === 0, "Delete left uploaded media in a collection.");

  const repeatedDelete = await appJson(`/api/media/assets/${uploaded.id}`, owner, { method: "DELETE" });
  assert(repeatedDelete.response.status === 200 && repeatedDelete.body?.ok, "Repeated delete was not idempotent.");

  console.log(`Configured Media Delete verified. owner=${owner.id} generated=${generated.id} uploaded=${uploaded.id}`);
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
