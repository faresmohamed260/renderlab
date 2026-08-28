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
const artifactDir = process.env.RENDERLAB_LIBRARY_FAVORITES_ARTIFACT_DIR || "artifacts";
const cleanupOnly = process.argv.includes("--cleanup-only");
const ownerIdentity = configuredTestAccountIdentity("library-favorites-owner");
const foreignIdentity = configuredTestAccountIdentity("library-favorites-foreign");

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
  if (!value) throw new Error(`${name} is required for configured Library Favorites verification.`);
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

async function cleanupFixture() {
  await deleteConfiguredTestAccount(ownerIdentity);
  await deleteConfiguredTestAccount(foreignIdentity);
}

async function createAsset(account, displayName) {
  const id = randomUUID();
  const storageKey = `renderlab/favorite-fixtures/${new Date().toISOString().slice(0, 7).replace("-", "/")}/${id}.png`;
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
      provenance: { prompt: displayName, operation: "create-image", model: "library-favorites-fixture" },
      metadata: { verification: "library-favorites-v0-1" },
      favorited_at: null,
    }),
  });
  if (!response.ok) throw new Error(`Could not create Favorites media fixture (${response.status}): ${await response.text()}`);
  await r2Client.send(new PutObjectCommand({ Bucket: r2Bucket, Key: storageKey, Body: pngBytes, ContentType: "image/png" }));
  return { id, storageKey };
}

async function favoriteApi(account, assetId, favorite) {
  const response = await fetch(
    `${baseUrl}/api/media/assets/${encodeURIComponent(assetId)}/favorite`,
    withAccountAuthorization(account, { method: favorite ? "PUT" : "DELETE" }),
  );
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

async function mediaApi(account, query) {
  const response = await fetch(`${baseUrl}/api/media/assets?${query}`, withAccountAuthorization(account));
  const payload = await response.json().catch(() => null);
  assert(response.ok && payload?.ok, `Favorites media API failed (${response.status}): ${JSON.stringify(payload)}`);
  return payload;
}

async function favoriteTimestamp(assetId) {
  const response = await supabase(`media_assets?id=eq.${encodeURIComponent(assetId)}&select=id,owner_id,favorited_at`);
  if (!response.ok) throw new Error(`Could not inspect favorite timestamp (${response.status}): ${await response.text()}`);
  return (await response.json())[0] || null;
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
  const owner = await createConfiguredTestAccount("library-favorites-owner");
  const foreign = await createConfiguredTestAccount("library-favorites-foreign");
  const favoriteAsset = await createAsset(owner, "Aurora favorite study");
  const ordinaryAsset = await createAsset(owner, "Dune ordinary study");
  const foreignAsset = await createAsset(foreign, "Foreign favorite study");

  const signedOut = await fetch(`${baseUrl}/api/media/assets/${favoriteAsset.id}/favorite`, { method: "PUT" });
  assert(signedOut.status === 401, `Signed-out favorite mutation returned ${signedOut.status}, expected 401.`);

  let result = await favoriteApi(owner, favoriteAsset.id, true);
  assert(result.response.ok && result.payload?.ok && result.payload.asset.isFavorite === true, "Owner could not favorite own asset.");
  const firstTimestamp = (await favoriteTimestamp(favoriteAsset.id))?.favorited_at;
  assert(typeof firstTimestamp === "string" && firstTimestamp.length > 10, "Favorite mutation did not persist favorited_at.");

  result = await favoriteApi(owner, favoriteAsset.id, true);
  assert(result.response.ok && result.payload?.asset?.isFavorite === true, "Repeated favorite PUT was not successful.");
  const secondTimestamp = (await favoriteTimestamp(favoriteAsset.id))?.favorited_at;
  assert(secondTimestamp === firstTimestamp, "Repeated favorite PUT changed the persisted favorite timestamp instead of remaining idempotent.");

  result = await favoriteApi(foreign, foreignAsset.id, true);
  assert(result.response.ok && result.payload?.asset?.isFavorite === true, "Foreign fixture owner could not favorite its own asset.");

  result = await favoriteApi(foreign, favoriteAsset.id, true);
  assert(result.response.status === 404, `Foreign account favorite mutation returned ${result.response.status}, expected 404.`);
  result = await favoriteApi(owner, foreignAsset.id, false);
  assert(result.response.status === 404, `Owner could mutate foreign favorite state (${result.response.status}).`);

  const favorites = await mediaApi(owner, "favorite=true");
  assert(favorites.items.length === 1 && favorites.items[0].id === favoriteAsset.id, "Favorites list did not return exactly the owner's favorite asset.");
  assert(favorites.items[0].isFavorite === true, "Favorite list serialization did not expose favorite state.");

  const composed = await mediaApi(owner, `favorite=true&kind=image&q=${encodeURIComponent("AURORA")}&sort=oldest`);
  assert(composed.items.length === 1 && composed.items[0].id === favoriteAsset.id, "Favorite filter did not compose with kind/search/sort.");
  const noMatch = await mediaApi(owner, `favorite=true&q=${encodeURIComponent("dune")}`);
  assert(noMatch.items.length === 0, "Favorite filter returned a non-favorited search match.");

  const invalidFavorite = await fetch(`${baseUrl}/api/media/assets?favorite=false`, withAccountAuthorization(owner));
  assert(invalidFavorite.status === 400, `Invalid favorite query returned ${invalidFavorite.status}, expected 400.`);

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1024 }, colorScheme: "dark" });
  const page = await context.newPage();
  await routeLocalAppRequestsWithAccount(page, baseUrl, owner);

  await page.goto(`${baseUrl}/library?favorite=true`, { waitUntil: "networkidle", timeout: 60_000 });
  const favoriteCard = page.locator(`a[href="/library/${encodeURIComponent(favoriteAsset.id)}"]`);
  await favoriteCard.waitFor({ state: "visible", timeout: 30_000 });
  assert(await page.locator(`a[href="/library/${encodeURIComponent(ordinaryAsset.id)}"]`).count() === 0, "Favorites browser view rendered non-favorite media.");
  await page.getByRole("link", { name: "Favorites", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.screenshot({ path: `${artifactDir}/library-favorites-desktop.png`, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  await page.evaluate(() => window.scrollTo(0, 0));
  assert(await favoriteCard.isVisible(), "Favorite Library card is not visible on mobile.");
  await page.screenshot({ path: `${artifactDir}/library-favorites-mobile.png`, fullPage: true });

  await page.setViewportSize({ width: 1440, height: 1024 });
  await page.goto(`${baseUrl}/library/${encodeURIComponent(favoriteAsset.id)}`, { waitUntil: "networkidle", timeout: 60_000 });
  const favoriteButton = page.getByRole("button", { name: "Favorited", exact: true });
  await favoriteButton.waitFor({ state: "visible", timeout: 30_000 });
  assert(await favoriteButton.getAttribute("aria-pressed") === "true", "Viewer favorite toggle did not expose pressed state.");
  await page.screenshot({ path: `${artifactDir}/media-favorite-viewer-desktop.png`, fullPage: true });

  await favoriteButton.click();
  const addFavoriteButton = page.getByRole("button", { name: "Favorite", exact: true });
  await addFavoriteButton.waitFor({ state: "visible", timeout: 30_000 });
  assert((await favoriteTimestamp(favoriteAsset.id))?.favorited_at == null, "Viewer unfavorite did not clear favorited_at.");
  result = await favoriteApi(owner, favoriteAsset.id, false);
  assert(result.response.ok && result.payload?.asset?.isFavorite === false, "Repeated DELETE was not idempotently unfavorited.");

  await addFavoriteButton.click();
  await page.getByRole("button", { name: "Favorited", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${artifactDir}/media-favorite-viewer-mobile.png`, fullPage: true });

  const ownerRow = await favoriteTimestamp(favoriteAsset.id);
  const foreignRow = await favoriteTimestamp(foreignAsset.id);
  assert(ownerRow?.owner_id === owner.id && foreignRow?.owner_id === foreign.id, "Favorite mutations changed asset ownership.");

  console.log(`Configured Library Favorites rendered successfully. owner=${owner.id} favorite=${favoriteAsset.id} ordinary=${ordinaryAsset.id} foreign=${foreignAsset.id}`);
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
