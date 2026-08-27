import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { chromium } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import {
  configuredTestAccountIdentity,
  createConfiguredTestAccount,
  deleteConfiguredTestAccount,
  routeLocalAppRequestsWithAccount,
} from "./lib/configured-test-account.mjs";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const r2Bucket = process.env.R2_BUCKET_NAME;
const artifactDir = process.env.RENDERLAB_MEDIA_DOWNLOAD_ARTIFACT_DIR || "artifacts";
const fixturePath = process.env.RENDERLAB_MEDIA_DOWNLOAD_FIXTURE_PATH || "/tmp/renderlab-media-download-fixture.json";
const cleanupOnly = process.argv.includes("--cleanup-only");
const fixtureAccount = configuredTestAccountIdentity("media-download");
const uploadedFilename = "RenderLab-Download-画像.PNG";
const uploadedDisplayName = "RenderLab Download 画像";
const expectedUploadedFilename = "RenderLab-Download-画像.png";
const generatedPrompt = "RenderLab generated download verification";

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
  if (!value) throw new Error(`${name} is required for configured media download verification.`);
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
        if (!response.ok) {
          throw new Error(`Could not remove media download fixture (${response.status}): ${await response.text()}`);
        }
      }
      if (asset.storageKey) {
        await r2Client.send(new DeleteObjectCommand({ Bucket: r2Bucket, Key: asset.storageKey })).catch(() => {});
      }
    }

    for (const asset of fixture.assets || []) {
      if (!asset.id) continue;
      const response = await supabase(`media_assets?id=eq.${encodeURIComponent(asset.id)}&select=id`);
      if (!response.ok) throw new Error(`Could not verify media download cleanup (${response.status}): ${await response.text()}`);
      const rows = await response.json();
      if (rows.length) throw new Error(`Media download cleanup left asset ${asset.id}.`);
    }

    await rm(fixturePath, { force: true });
    console.log(`Cleaned configured media download fixtures assets=${(fixture.assets || []).map((asset) => asset.id).filter(Boolean).join(",")}.`);
  }
  await deleteConfiguredTestAccount(fixtureAccount);
}

async function createAsset(account, { origin, originalFilename = null, displayName = null, prompt = null }) {
  const id = randomUUID();
  const storageKey = `renderlab/download-fixtures/${new Date().toISOString().slice(0, 7).replace("-", "/")}/${id}.png`;
  const fixture = await readFixture() || { assets: [] };
  fixture.assets.push({ id, storageKey });
  await writeFixture(fixture);

  await r2Client.send(new PutObjectCommand({
    Bucket: r2Bucket,
    Key: storageKey,
    Body: pngBytes,
    ContentType: "image/png",
  }));

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
      provenance: prompt ? { prompt, operation: "create-image", model: "media-download-fixture" } : {},
      metadata: { verification: "media-download-v0-1" },
    }),
  });
  if (!response.ok) throw new Error(`Could not create media download fixture (${response.status}): ${await response.text()}`);
  return { id, storageKey };
}

async function verifyDownload(page, expectedFilename, label) {
  const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
  await page.getByRole("link", { name: "Download", exact: true }).click();
  const download = await downloadPromise;
  const suggestedFilename = download.suggestedFilename();
  assert(suggestedFilename === expectedFilename, `${label} suggested ${suggestedFilename} instead of ${expectedFilename}.`);
  const path = await download.path();
  assert(path, `${label} did not produce a readable download path.`);
  const bytes = await readFile(path);
  assert(bytes.equals(pngBytes), `${label} bytes did not match the durable R2 object.`);
  console.log(`${label} filename=${suggestedFilename} bytes=${bytes.length}`);
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
  const account = await createConfiguredTestAccount("media-download");
  const uploaded = await createAsset(account, {
    origin: "uploaded",
    originalFilename: uploadedFilename,
    displayName: uploadedDisplayName,
  });
  const generated = await createAsset(account, {
    origin: "generated",
    prompt: generatedPrompt,
  });

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1024 },
    colorScheme: "dark",
    acceptDownloads: true,
  });
  const page = await context.newPage();
  await routeLocalAppRequestsWithAccount(page, baseUrl, account);

  await page.goto(`${baseUrl}/library/${uploaded.id}`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByRole("heading", { name: uploadedDisplayName, exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  const downloadLink = page.getByRole("link", { name: "Download", exact: true });
  await downloadLink.waitFor({ state: "visible", timeout: 30_000 });
  assert((await downloadLink.getAttribute("href")) === `/api/media/assets/${uploaded.id}/download`, "Uploaded Viewer Download did not use the product media route.");

  await page.screenshot({ path: `${artifactDir}/media-download-desktop-uploaded.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  assert(await downloadLink.isVisible(), "Download action is not visible on the mobile Media Viewer.");
  await page.screenshot({ path: `${artifactDir}/media-download-mobile-uploaded.png`, fullPage: true });

  await page.setViewportSize({ width: 1440, height: 1024 });
  await page.waitForTimeout(250);
  await verifyDownload(page, expectedUploadedFilename, "Uploaded media download");

  await page.goto(`${baseUrl}/library/${generated.id}`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByRole("heading", { name: generatedPrompt, exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  const expectedGeneratedFilename = `renderlab-image-${generated.id.slice(0, 8)}.png`;
  await page.screenshot({ path: `${artifactDir}/media-download-desktop-generated.png`, fullPage: true });
  await verifyDownload(page, expectedGeneratedFilename, "Generated media download");

  console.log(`Configured Media Viewer downloads verified. owner=${account.id} uploaded=${uploaded.id} generated=${generated.id}`);
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
