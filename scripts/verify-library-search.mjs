import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { chromium } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const r2Bucket = process.env.R2_BUCKET_NAME;
const artifactDir = process.env.RENDERLAB_LIBRARY_SEARCH_ARTIFACT_DIR || "artifacts";
const fixturePath = process.env.RENDERLAB_LIBRARY_SEARCH_FIXTURE_PATH || "/tmp/renderlab-library-search-fixture.json";
const cleanupOnly = process.argv.includes("--cleanup-only");
const uploadedFilename = "RenderLab-Search-画像.PNG";
const uploadedDisplayName = "RenderLab Search 画像";
const generatedPrompt = "Cobalt aurora 100%_* over glass desert";

const pngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZPZkAAAAASUVORK5CYII=",
  "base64",
);

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: supabaseKey,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: r2Bucket,
})) {
  if (!value) throw new Error(`${name} is required for configured Library search verification.`);
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
  if (!fixture) return;

  for (const asset of fixture.assets || []) {
    if (asset.id) {
      const response = await supabase(`media_assets?id=eq.${encodeURIComponent(asset.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error(`Could not remove Library search media fixture (${response.status}): ${await response.text()}`);
    }
    if (asset.storageKey) {
      await r2Client.send(new DeleteObjectCommand({ Bucket: r2Bucket, Key: asset.storageKey })).catch(() => {});
    }
  }

  for (const asset of fixture.assets || []) {
    if (!asset.id) continue;
    const response = await supabase(`media_assets?id=eq.${encodeURIComponent(asset.id)}&select=id`);
    if (!response.ok) throw new Error(`Could not verify Library search cleanup (${response.status}): ${await response.text()}`);
    const rows = await response.json();
    if (rows.length) throw new Error(`Library search cleanup left media asset ${asset.id}.`);
  }

  await rm(fixturePath, { force: true });
  console.log(`Cleaned configured Library search fixture assets=${(fixture.assets || []).map((asset) => asset.id).filter(Boolean).join(",")}.`);
}

async function createAsset({ origin, originalFilename = null, displayName = null, prompt = null }) {
  const id = randomUUID();
  const storageKey = `renderlab/search-fixtures/${new Date().toISOString().slice(0, 7).replace("-", "/")}/${id}.png`;
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
      provenance: prompt ? { prompt, operation: "create-image", model: "library-search-fixture" } : {},
      metadata: { verification: "library-search-v0-1" },
    }),
  });
  if (!response.ok) throw new Error(`Could not create Library search media fixture (${response.status}): ${await response.text()}`);
  return { id, storageKey };
}

async function mediaApi(query) {
  const response = await fetch(`${baseUrl}/api/media/assets?${query}`);
  const payload = await response.json().catch(() => null);
  assert(response.ok && payload?.ok, `Library search API failed (${response.status}): ${JSON.stringify(payload)}`);
  return payload;
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
  const uploaded = await createAsset({
    origin: "uploaded",
    originalFilename: uploadedFilename,
    displayName: uploadedDisplayName,
  });
  const generated = await createAsset({
    origin: "generated",
    prompt: generatedPrompt,
  });

  const promptSearch = await mediaApi(`q=${encodeURIComponent("COBALT AURORA")}`);
  assert(promptSearch.items.some((asset) => asset.id === generated.id), "Case-insensitive prompt search did not return the generated fixture.");
  assert(!promptSearch.items.some((asset) => asset.id === uploaded.id), "Prompt search returned an unrelated uploaded fixture.");

  const filenameSearch = await mediaApi(`q=${encodeURIComponent("画像.png")}`);
  assert(filenameSearch.items.some((asset) => asset.id === uploaded.id), "Case-insensitive Unicode filename search did not return the uploaded fixture.");
  assert(!filenameSearch.items.some((asset) => asset.id === generated.id), "Filename search returned an unrelated generated fixture.");

  const literalSearch = await mediaApi(`q=${encodeURIComponent("100%_*")}`);
  assert(literalSearch.items.some((asset) => asset.id === generated.id), "Literal wildcard-character prompt search did not return the expected fixture.");

  const kindSearch = await mediaApi(`kind=video&q=${encodeURIComponent("aurora")}`);
  assert(kindSearch.items.length === 0, "Library kind filtering did not constrain search results.");

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1024 }, colorScheme: "dark" });
  const page = await context.newPage();

  await page.goto(`${baseUrl}/library?q=${encodeURIComponent("cobalt aurora")}`, { waitUntil: "networkidle", timeout: 60_000 });
  const searchbox = page.getByRole("searchbox", { name: "Search Library" });
  await searchbox.waitFor({ state: "visible", timeout: 30_000 });
  assert(await searchbox.inputValue() === "cobalt aurora", "Library search input did not reflect URL-owned query state.");

  const generatedCard = page.getByRole("link", { name: `Open ${generatedPrompt}`, exact: true });
  await generatedCard.waitFor({ state: "visible", timeout: 30_000 });
  assert(await page.getByRole("link", { name: `Open ${uploadedDisplayName}`, exact: true }).count() === 0, "Browser prompt search rendered an unrelated upload.");
  const imageFilterHref = await page.getByRole("link", { name: "Images", exact: true }).getAttribute("href");
  assert(imageFilterHref === "/library?kind=image&q=cobalt+aurora", `Media-kind link did not preserve search query: ${imageFilterHref}`);

  await page.screenshot({ path: `${artifactDir}/library-search-desktop-results.png`, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  await page.evaluate(() => window.scrollTo(0, 0));
  assert(await searchbox.isVisible(), "Library search field is not visible on mobile.");
  assert(await generatedCard.isVisible(), "Library search result is not visible on mobile.");
  await page.screenshot({ path: `${artifactDir}/library-search-mobile-results.png`, fullPage: true });

  await page.setViewportSize({ width: 1440, height: 1024 });
  await searchbox.fill("画像.png");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.waitForURL((url) => url.pathname === "/library" && url.searchParams.get("q") === "画像.png", { timeout: 30_000 });
  const uploadedCard = page.getByRole("link", { name: `Open ${uploadedDisplayName}`, exact: true });
  await uploadedCard.waitFor({ state: "visible", timeout: 30_000 });
  assert(await page.getByRole("link", { name: `Open ${generatedPrompt}`, exact: true }).count() === 0, "Browser filename search rendered an unrelated generated asset.");

  await searchbox.fill("not-present-in-renderlab");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.waitForURL((url) => url.pathname === "/library" && url.searchParams.get("q") === "not-present-in-renderlab", { timeout: 30_000 });
  await page.getByRole("heading", { name: "No media matches “not-present-in-renderlab”", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  const clearSearch = page.getByRole("link", { name: "Clear search", exact: true });
  await clearSearch.waitFor({ state: "visible", timeout: 30_000 });
  await page.screenshot({ path: `${artifactDir}/library-search-desktop-empty.png`, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${artifactDir}/library-search-mobile-empty.png`, fullPage: true });

  console.log(`Configured Library search rendered successfully. uploaded=${uploaded.id} generated=${generated.id}`);
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
