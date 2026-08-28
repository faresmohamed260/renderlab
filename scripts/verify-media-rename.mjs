import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
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
const artifactDir = process.env.RENDERLAB_MEDIA_RENAME_ARTIFACT_DIR || "artifacts";
const fixturePath = process.env.RENDERLAB_MEDIA_RENAME_FIXTURE_PATH || "/tmp/renderlab-media-rename-fixture.json";
const cleanupOnly = process.argv.includes("--cleanup-only");
const fixtureAccount = configuredTestAccountIdentity("media-rename");

const uploadedOriginalFilename = "RenderLab-Rename-画像.PNG";
const uploadedInitialDisplayName = "Original Upload Name";
const uploadedRenamedDisplayName = "旅行 Cover 画像";
const expectedUploadedDownloadFilename = "RenderLab-Rename-画像.png";
const generatedPrompt = "RenderLab generated rename verification";
const generatedRenamedDisplayName = "RenderLab Renamed Generated";
const maxDisplayNameLength = 240;

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
  if (!value) throw new Error(`${name} is required for configured media rename verification.`);
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

async function app(path, account, init = {}) {
  return fetch(`${baseUrl}${path}`, withAccountAuthorization(account, init));
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

async function cleanupFixture() {
  const fixture = await readFixture();
  if (fixture) {
    for (const asset of fixture.assets || []) {
      if (asset.id) {
        const response = await supabase(`media_assets?id=eq.${encodeURIComponent(asset.id)}`, { method: "DELETE" });
        if (!response.ok) throw new Error(`Could not remove media rename fixture (${response.status}): ${await response.text()}`);
      }
      if (asset.storageKey) {
        await r2Client.send(new DeleteObjectCommand({ Bucket: r2Bucket, Key: asset.storageKey })).catch(() => {});
      }
    }

    for (const asset of fixture.assets || []) {
      if (!asset.id) continue;
      const response = await supabase(`media_assets?id=eq.${encodeURIComponent(asset.id)}&select=id`);
      if (!response.ok) throw new Error(`Could not verify media rename cleanup (${response.status}): ${await response.text()}`);
      const rows = await response.json();
      if (rows.length) throw new Error(`Media rename cleanup left asset ${asset.id}.`);
    }

    await rm(fixturePath, { force: true });
    console.log(`Cleaned configured media rename fixtures assets=${(fixture.assets || []).map((asset) => asset.id).filter(Boolean).join(",")}.`);
  }
  await deleteConfiguredTestAccount(fixtureAccount);
}

async function createAsset(account, { origin, originalFilename = null, displayName = null, prompt = null }) {
  const id = randomUUID();
  const storageKey = `renderlab/rename-fixtures/${new Date().toISOString().slice(0, 7).replace("-", "/")}/${id}.png`;
  const fixture = await readFixture() || { assets: [] };
  fixture.assets.push({ id, storageKey });
  await writeFixture(fixture);

  await r2Client.send(new PutObjectCommand({
    Bucket: r2Bucket,
    Key: storageKey,
    Body: pngBytes,
    ContentType: "image/png",
  }));

  const provenance = prompt ? { prompt, operation: "create-image", model: "media-rename-fixture" } : {};
  const response = await supabase("media_assets", {
    method: "POST",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({
      id,
      owner_id: account.id,
      generation_job_id: null,
      origin,
      kind: "image",
      mime_type: "image/png",
      storage_key: storageKey,
      thumbnail_storage_key: null,
      original_filename: originalFilename,
      display_name: displayName,
      size_bytes: pngBytes.length,
      width: 1,
      height: 1,
      duration_ms: null,
      provenance,
      metadata: { verification: "media-rename-v0-1" },
    }),
  });
  if (!response.ok) throw new Error(`Could not create media rename fixture (${response.status}): ${await response.text()}`);
  return { id, storageKey, provenance };
}

async function mediaAssetRow(assetId) {
  const response = await supabase(
    `media_assets?id=eq.${encodeURIComponent(assetId)}&select=id,display_name,original_filename,storage_key,provenance,owner_id&limit=1`,
  );
  if (!response.ok) throw new Error(`Could not inspect media rename fixture (${response.status}): ${await response.text()}`);
  return (await response.json())[0] || null;
}

async function renameThroughApi(account, assetId, displayName) {
  return appJson(`/api/media/assets/${encodeURIComponent(assetId)}`, account, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ displayName }),
  });
}

async function searchAssets(account, query) {
  const { response, body } = await appJson(`/api/media/assets?q=${encodeURIComponent(query)}&limit=24`, account);
  assert(response.status === 200 && body?.ok, `Search for ${query} failed with ${response.status}.`);
  return body.items || [];
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
  const account = await createConfiguredTestAccount("media-rename");
  const uploaded = await createAsset(account, {
    origin: "uploaded",
    originalFilename: uploadedOriginalFilename,
    displayName: uploadedInitialDisplayName,
  });
  const generated = await createAsset(account, {
    origin: "generated",
    prompt: generatedPrompt,
  });

  const invalidId = await renameThroughApi(account, "not-a-media-id", "Nope");
  assert(invalidId.response.status === 400 && invalidId.body?.ok === false, "Rename accepted an invalid media asset ID.");

  const blankName = await renameThroughApi(account, uploaded.id, " \t \n ");
  assert(blankName.response.status === 400 && blankName.body?.ok === false, "Rename accepted a blank media name.");

  const tooLongName = await renameThroughApi(account, uploaded.id, "a".repeat(maxDisplayNameLength + 1));
  assert(tooLongName.response.status === 400 && tooLongName.body?.ok === false, "Rename accepted a media name beyond the product bound.");

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1024 },
    colorScheme: "dark",
    acceptDownloads: true,
  });
  const page = await context.newPage();
  await routeLocalAppRequestsWithAccount(page, baseUrl, account);

  await page.goto(`${baseUrl}/library/${generated.id}`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByRole("heading", { name: generatedPrompt, exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByRole("button", { name: "Rename", exact: true }).click();
  const generatedNameInput = page.getByLabel("Media name", { exact: true });
  await generatedNameInput.waitFor({ state: "visible", timeout: 30_000 });
  await page.screenshot({ path: `${artifactDir}/media-rename-desktop-editing.png`, fullPage: true });
  await generatedNameInput.fill("  RenderLab   Renamed   Generated  ");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("heading", { name: generatedRenamedDisplayName, exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.screenshot({ path: `${artifactDir}/media-rename-desktop-renamed.png`, fullPage: true });

  const { response: generatedApiResponse, body: generatedApi } = await appJson(`/api/media/assets/${generated.id}`, account);
  assert(generatedApiResponse.status === 200 && generatedApi?.ok, "Renamed generated media could not be reloaded from the product API.");
  assert(generatedApi.asset.displayName === generatedRenamedDisplayName, "Generated display name was not normalized/persisted truthfully.");
  assert(generatedApi.asset.prompt === generatedPrompt, "Generated rename changed prompt provenance.");

  const generatedRow = await mediaAssetRow(generated.id);
  assert(generatedRow?.display_name === generatedRenamedDisplayName, "Generated rename did not update only the durable display name.");
  assert(generatedRow?.storage_key === generated.storageKey, "Generated rename changed storage identity.");
  assert(generatedRow?.provenance?.prompt === generatedPrompt, "Generated rename mutated durable provenance.");
  assert(generatedRow?.owner_id === account.id, "Generated rename fixture lost its account owner.");

  const generatedSearch = await searchAssets(account, generatedRenamedDisplayName.toLowerCase());
  assert(generatedSearch.some((asset) => asset.id === generated.id), "Library search did not discover the renamed generated asset.");

  await page.goto(`${baseUrl}/library/${uploaded.id}`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByRole("heading", { name: uploadedInitialDisplayName, exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByRole("button", { name: "Rename", exact: true }).click();
  const uploadedNameInput = page.getByLabel("Media name", { exact: true });
  await uploadedNameInput.fill("  旅行   Cover   画像  ");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("heading", { name: uploadedRenamedDisplayName, exact: true }).waitFor({ state: "visible", timeout: 30_000 });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${artifactDir}/media-rename-mobile-renamed.png`, fullPage: true });
  await page.getByRole("button", { name: "Rename", exact: true }).click();
  await page.getByLabel("Media name", { exact: true }).waitFor({ state: "visible" });
  await page.screenshot({ path: `${artifactDir}/media-rename-mobile-editing.png`, fullPage: true });
  await page.getByRole("button", { name: "Cancel", exact: true }).click();

  const uploadedRow = await mediaAssetRow(uploaded.id);
  assert(uploadedRow?.display_name === uploadedRenamedDisplayName, "Uploaded rename did not persist the normalized display name.");
  assert(uploadedRow?.original_filename === uploadedOriginalFilename, "Uploaded rename changed the original filename.");
  assert(uploadedRow?.storage_key === uploaded.storageKey, "Uploaded rename changed storage identity.");
  assert(uploadedRow?.owner_id === account.id, "Uploaded rename fixture lost its account owner.");

  const renamedSearch = await searchAssets(account, uploadedRenamedDisplayName.toLowerCase());
  assert(renamedSearch.some((asset) => asset.id === uploaded.id), "Library search did not discover the renamed uploaded asset.");
  const oldNameSearch = await searchAssets(account, uploadedInitialDisplayName.toLowerCase());
  assert(!oldNameSearch.some((asset) => asset.id === uploaded.id), "Library search still matched the replaced uploaded display name.");

  await page.setViewportSize({ width: 1440, height: 1024 });
  await page.goto(`${baseUrl}/library/${uploaded.id}`, { waitUntil: "networkidle", timeout: 60_000 });
  const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
  await page.getByRole("link", { name: "Download", exact: true }).click();
  const download = await downloadPromise;
  assert(download.suggestedFilename() === expectedUploadedDownloadFilename, `Rename changed uploaded Download filename to ${download.suggestedFilename()}.`);
  const downloadedPath = await download.path();
  assert(downloadedPath, "Renamed uploaded media did not produce a readable download path.");
  assert((await readFile(downloadedPath)).equals(pngBytes), "Renamed uploaded media Download bytes changed.");

  console.log(`Configured Media Viewer Rename verified. owner=${account.id} generated=${generated.id} uploaded=${uploaded.id}`);
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
