import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { chromium } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
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
const artifactDir = process.env.RENDERLAB_LIBRARY_COLLECTIONS_ARTIFACT_DIR || "artifacts";
const cleanupOnly = process.argv.includes("--cleanup-only");
const ownerIdentity = configuredTestAccountIdentity("library-collections-owner");
const foreignIdentity = configuredTestAccountIdentity("library-collections-foreign");

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
  if (!value) throw new Error(`${name} is required for configured Library Collections verification.`);
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

async function cleanupCollectionOwner(ownerId) {
  const encodedOwner = encodeURIComponent(ownerId);
  for (const table of ["media_collection_items", "media_collections"]) {
    const response = await supabase(`${table}?owner_id=eq.${encodedOwner}`, { method: "DELETE" });
    if (!response.ok) {
      throw new Error(`Could not clean ${table} for ${ownerId} (${response.status}): ${await response.text()}`);
    }
  }
}

async function cleanupFixture() {
  for (const identity of [ownerIdentity, foreignIdentity]) {
    await cleanupCollectionOwner(identity.id);
    await deleteConfiguredTestAccount(identity);
  }
}

async function createFixtureAccount(namespace, identity) {
  await cleanupCollectionOwner(identity.id);
  return createConfiguredTestAccount(namespace);
}

async function createAsset(account, displayName, favorite = false) {
  const id = randomUUID();
  const storageKey = `renderlab/collection-fixtures/${new Date().toISOString().slice(0, 7).replace("-", "/")}/${id}.png`;
  const response = await supabase("media_assets", {
    method: "POST",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({
      id,
      owner_id: account.id,
      generation_job_id: null,
      origin: "generated",
      kind: "image",
      mime_type: "image/png",
      storage_key: storageKey,
      thumbnail_storage_key: null,
      original_filename: null,
      display_name: displayName,
      size_bytes: pngBytes.length,
      width: 1,
      height: 1,
      duration_ms: null,
      provenance: { prompt: displayName, operation: "create-image", model: "library-collections-fixture" },
      metadata: { verification: "library-collections-v0-1" },
      favorited_at: favorite ? new Date().toISOString() : null,
    }),
  });
  if (!response.ok) throw new Error(`Could not create Collections media fixture (${response.status}): ${await response.text()}`);
  await r2Client.send(new PutObjectCommand({ Bucket: r2Bucket, Key: storageKey, Body: pngBytes, ContentType: "image/png" }));
  return { id, storageKey };
}

async function createCollection(account, name) {
  const response = await fetch(`${baseUrl}/api/media/collections`, withAccountAuthorization(account, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  }));
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

async function setMembership(account, collectionId, assetId, include) {
  const response = await fetch(
    `${baseUrl}/api/media/collections/${encodeURIComponent(collectionId)}/items/${encodeURIComponent(assetId)}`,
    withAccountAuthorization(account, { method: include ? "PUT" : "DELETE" }),
  );
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

async function listCollections(account, assetId = null) {
  const query = assetId ? `?assetId=${encodeURIComponent(assetId)}` : "";
  const response = await fetch(`${baseUrl}/api/media/collections${query}`, withAccountAuthorization(account));
  const payload = await response.json().catch(() => null);
  assert(response.ok && payload?.ok, `Collections API failed (${response.status}): ${JSON.stringify(payload)}`);
  return payload.collections;
}

async function mediaApi(account, query) {
  const response = await fetch(`${baseUrl}/api/media/assets?${query}`, withAccountAuthorization(account));
  const payload = await response.json().catch(() => null);
  assert(response.ok && payload?.ok, `Collection media API failed (${response.status}): ${JSON.stringify(payload)}`);
  return payload;
}

async function membershipRows(collectionId, assetId) {
  const response = await supabase(
    `media_collection_items?collection_id=eq.${encodeURIComponent(collectionId)}&media_asset_id=eq.${encodeURIComponent(assetId)}&select=collection_id,media_asset_id,owner_id,created_at`,
  );
  if (!response.ok) throw new Error(`Could not inspect collection membership (${response.status}): ${await response.text()}`);
  return response.json();
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
  const owner = await createFixtureAccount("library-collections-owner", ownerIdentity);
  const foreign = await createFixtureAccount("library-collections-foreign", foreignIdentity);
  const collectionAsset = await createAsset(owner, "Aurora collection study", true);
  const ordinaryAsset = await createAsset(owner, "Dune ordinary study");
  const foreignAsset = await createAsset(foreign, "Foreign collection study");

  const signedOutCreate = await fetch(`${baseUrl}/api/media/collections`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Signed out" }),
  });
  assert(signedOutCreate.status === 401, `Signed-out collection creation returned ${signedOutCreate.status}, expected 401.`);

  let result = await createCollection(owner, "Mood Board");
  assert(result.response.status === 201 && result.payload?.ok, `Owner collection creation failed: ${JSON.stringify(result.payload)}`);
  const ownerCollection = result.payload.collection;
  assert(ownerCollection.name === "Mood Board" && ownerCollection.containsAsset === false, "Created collection contract is incorrect.");

  result = await createCollection(owner, "  Mood   Board  ");
  assert(result.response.status === 400, `Duplicate normalized collection name returned ${result.response.status}, expected 400.`);

  result = await createCollection(foreign, "Foreign Board");
  assert(result.response.status === 201 && result.payload?.ok, "Foreign fixture owner could not create its own collection.");
  const foreignCollection = result.payload.collection;

  const ownerCollections = await listCollections(owner);
  assert(ownerCollections.length === 1 && ownerCollections[0].id === ownerCollection.id, "Owner collection list leaked or omitted collections.");
  const foreignCollections = await listCollections(foreign);
  assert(foreignCollections.length === 1 && foreignCollections[0].id === foreignCollection.id, "Foreign collection list was not owner-scoped.");

  result = await setMembership(owner, ownerCollection.id, collectionAsset.id, true);
  assert(result.response.ok && result.payload?.ok && result.payload.collection.containsAsset === true, "Owner could not add own media to own collection.");
  const firstRows = await membershipRows(ownerCollection.id, collectionAsset.id);
  assert(firstRows.length === 1 && firstRows[0].owner_id === owner.id, "Collection membership did not persist the owner exactly once.");
  const firstCreatedAt = firstRows[0].created_at;

  result = await setMembership(owner, ownerCollection.id, collectionAsset.id, true);
  assert(result.response.ok && result.payload?.collection?.containsAsset === true, "Repeated collection PUT was not successful.");
  const secondRows = await membershipRows(ownerCollection.id, collectionAsset.id);
  assert(secondRows.length === 1 && secondRows[0].created_at === firstCreatedAt, "Repeated collection PUT changed membership instead of remaining idempotent.");

  result = await setMembership(foreign, foreignCollection.id, collectionAsset.id, true);
  assert(result.response.status === 404 && result.payload?.error?.code === "asset_not_found", "Foreign collection could add another account's asset.");
  result = await setMembership(owner, ownerCollection.id, foreignAsset.id, true);
  assert(result.response.status === 404 && result.payload?.error?.code === "asset_not_found", "Owner collection could add foreign media.");
  result = await setMembership(owner, foreignCollection.id, collectionAsset.id, true);
  assert(result.response.status === 404 && result.payload?.error?.code === "collection_not_found", "Owner could mutate a foreign collection.");

  const badCollectionLink = await supabase("media_collection_items", {
    method: "POST",
    body: JSON.stringify({ collection_id: foreignCollection.id, media_asset_id: collectionAsset.id, owner_id: owner.id }),
  });
  assert(!badCollectionLink.ok, "Database accepted a cross-owner collection link.");
  const badAssetLink = await supabase("media_collection_items", {
    method: "POST",
    body: JSON.stringify({ collection_id: ownerCollection.id, media_asset_id: foreignAsset.id, owner_id: owner.id }),
  });
  assert(!badAssetLink.ok, "Database accepted a cross-owner media link.");

  const immutableOwner = await supabase(
    `media_collections?id=eq.${encodeURIComponent(ownerCollection.id)}`,
    { method: "PATCH", body: JSON.stringify({ owner_id: foreign.id }) },
  );
  assert(!immutableOwner.ok, "Database allowed collection owner reassignment.");

  const collectionList = await mediaApi(owner, `collection=${encodeURIComponent(ownerCollection.id)}`);
  assert(collectionList.items.length === 1 && collectionList.items[0].id === collectionAsset.id, "Collection media list did not return exactly its member.");
  const composed = await mediaApi(
    owner,
    `collection=${encodeURIComponent(ownerCollection.id)}&favorite=true&kind=image&q=${encodeURIComponent("AURORA")}&sort=oldest`,
  );
  assert(composed.items.length === 1 && composed.items[0].id === collectionAsset.id, "Collection filter did not compose with Favorites/kind/search/sort.");
  const noMatch = await mediaApi(owner, `collection=${encodeURIComponent(ownerCollection.id)}&q=${encodeURIComponent("dune")}`);
  assert(noMatch.items.length === 0, "Collection filter returned a non-member search match.");

  const invalidCollection = await fetch(`${baseUrl}/api/media/assets?collection=not-a-uuid`, withAccountAuthorization(owner));
  assert(invalidCollection.status === 400, `Invalid collection query returned ${invalidCollection.status}, expected 400.`);

  const memberships = await listCollections(owner, collectionAsset.id);
  assert(memberships.length === 1 && memberships[0].containsAsset === true, "Collection list did not expose current-asset membership.");

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1024 }, colorScheme: "dark" });
  const page = await context.newPage();
  await routeLocalAppRequestsWithAccount(page, baseUrl, owner);

  await page.goto(`${baseUrl}/library/${encodeURIComponent(collectionAsset.id)}`, { waitUntil: "networkidle", timeout: 60_000 });
  const collectionsButton = page.getByRole("button", { name: /Collections/ });
  await collectionsButton.waitFor({ state: "visible", timeout: 30_000 });
  await collectionsButton.click();
  const moodButton = page.getByRole("button", { name: "Mood Board", exact: true });
  await moodButton.waitFor({ state: "visible", timeout: 30_000 });
  assert(await moodButton.getAttribute("aria-pressed") === "true", "Viewer collection membership did not render pressed state.");
  await page.screenshot({ path: `${artifactDir}/media-collections-viewer-desktop.png`, fullPage: true });

  await page.getByLabel("New collection").fill("Client Selects");
  await page.getByRole("button", { name: "Create and add", exact: true }).click();
  const clientButton = page.getByRole("button", { name: "Client Selects", exact: true });
  await clientButton.waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForFunction(
    () => Array.from(document.querySelectorAll('button[aria-pressed="true"]'))
      .some((button) => button.textContent?.trim() === "Client Selects"),
    null,
    { timeout: 30_000 },
  );
  assert(await clientButton.getAttribute("aria-pressed") === "true", "Viewer create-and-add did not persist collection membership.");

  await moodButton.click();
  await page.waitForFunction(
    () => document.querySelector('button[aria-pressed="false"]')?.textContent?.includes("Mood Board") === true,
    null,
    { timeout: 30_000 },
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${artifactDir}/media-collections-viewer-mobile.png`, fullPage: true });

  const afterUiCollections = await listCollections(owner, collectionAsset.id);
  const clientCollection = afterUiCollections.find((collection) => collection.name === "Client Selects");
  const moodAfter = afterUiCollections.find((collection) => collection.id === ownerCollection.id);
  assert(clientCollection?.containsAsset === true, "Created Client Selects collection is missing the asset.");
  assert(moodAfter?.containsAsset === false, "Viewer removal did not clear Mood Board membership.");

  await page.setViewportSize({ width: 1440, height: 1024 });
  await page.goto(`${baseUrl}/library?collection=${encodeURIComponent(clientCollection.id)}`, { waitUntil: "networkidle", timeout: 60_000 });
  const collectionCard = page.locator(`a[href="/library/${encodeURIComponent(collectionAsset.id)}"]`);
  await collectionCard.waitFor({ state: "visible", timeout: 30_000 });
  assert(await page.locator(`a[href="/library/${encodeURIComponent(ordinaryAsset.id)}"]`).count() === 0, "Collection browser view rendered non-member media.");
  await page.getByRole("button", { name: "Client Selects", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.screenshot({ path: `${artifactDir}/library-collections-desktop.png`, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  await page.evaluate(() => window.scrollTo(0, 0));
  assert(await collectionCard.isVisible(), "Collection Library card is not visible on mobile.");
  await page.screenshot({ path: `${artifactDir}/library-collections-mobile.png`, fullPage: true });

  console.log(`Configured Library Collections rendered successfully. owner=${owner.id} asset=${collectionAsset.id} collection=${clientCollection.id}`);
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
