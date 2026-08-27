import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { chromium } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const r2Bucket = process.env.R2_BUCKET_NAME;
const artifactDir = process.env.RENDERLAB_LIBRARY_HISTORY_ARTIFACT_DIR || "artifacts";
const fixturePath = process.env.RENDERLAB_LIBRARY_HISTORY_FIXTURE_PATH || "/tmp/renderlab-library-history-fixture.json";
const cleanupOnly = process.argv.includes("--cleanup-only");

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
  if (!value) throw new Error(`${name} is required for configured Library history verification.`);
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
      if (!response.ok) throw new Error(`Could not remove Library history media fixture (${response.status}): ${await response.text()}`);
    }
    if (asset.storageKey) {
      await r2Client.send(new DeleteObjectCommand({ Bucket: r2Bucket, Key: asset.storageKey })).catch(() => {});
    }
  }

  for (const asset of fixture.assets || []) {
    if (!asset.id) continue;
    const response = await supabase(`media_assets?id=eq.${encodeURIComponent(asset.id)}&select=id`);
    if (!response.ok) throw new Error(`Could not verify Library history cleanup (${response.status}): ${await response.text()}`);
    const rows = await response.json();
    if (rows.length) throw new Error(`Library history cleanup left media asset ${asset.id}.`);
  }

  await rm(fixturePath, { force: true });
  console.log(`Cleaned configured Library history fixture assets=${(fixture.assets || []).map((asset) => asset.id).filter(Boolean).join(",")}.`);
}

async function createAsset({ displayName, createdAt }) {
  const id = randomUUID();
  const storageKey = `renderlab/history-fixtures/${new Date().toISOString().slice(0, 7).replace("-", "/")}/${id}.png`;
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
      provenance: { operation: "create-image", model: "library-history-fixture" },
      metadata: { verification: "library-history-order-v0-1" },
      created_at: createdAt,
      updated_at: createdAt,
    }),
  });
  if (!response.ok) throw new Error(`Could not create Library history media fixture (${response.status}): ${await response.text()}`);
  return { id, storageKey };
}

async function mediaApi(query) {
  const response = await fetch(`${baseUrl}/api/media/assets?${query}`);
  const payload = await response.json().catch(() => null);
  assert(response.ok && payload?.ok, `Library history API failed (${response.status}): ${JSON.stringify(payload)}`);
  return payload;
}

function orderedFixtureHrefs(page, ids) {
  const selector = ids.map((id) => `a[href="/library/${encodeURIComponent(id)}"]`).join(",");
  return page.locator(selector).evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")));
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
  const token = `RenderLab History ${randomUUID().slice(0, 8)}`;
  const now = Date.now();
  const olderCreatedAt = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
  const newerCreatedAt = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const older = await createAsset({ displayName: `${token} Older`, createdAt: olderCreatedAt });
  const newer = await createAsset({ displayName: `${token} Newer`, createdAt: newerCreatedAt });
  const query = encodeURIComponent(token);

  const newest = await mediaApi(`q=${query}&sort=newest`);
  assert(newest.items.length === 2, `Newest history query returned ${newest.items.length} fixtures instead of 2.`);
  assert(newest.items[0].id === newer.id && newest.items[1].id === older.id, "Newest history query did not return newest-first fixture order.");

  const oldest = await mediaApi(`q=${query}&sort=oldest`);
  assert(oldest.items.length === 2, `Oldest history query returned ${oldest.items.length} fixtures instead of 2.`);
  assert(oldest.items[0].id === older.id && oldest.items[1].id === newer.id, "Oldest history query did not return oldest-first fixture order.");

  const firstPage = await mediaApi(`q=${query}&sort=oldest&limit=1&offset=0`);
  assert(firstPage.items.length === 1 && firstPage.items[0].id === older.id, "Oldest-first first page did not begin with the older fixture.");
  assert(firstPage.page.hasMore === true, "Oldest-first first page did not report a second page.");

  const secondPage = await mediaApi(`q=${query}&sort=oldest&limit=1&offset=1`);
  assert(secondPage.items.length === 1 && secondPage.items[0].id === newer.id, "Oldest-first second page did not contain the newer fixture.");
  assert(secondPage.page.hasMore === false, "Oldest-first second page incorrectly reported more matching fixtures.");

  const kindConstrained = await mediaApi(`q=${query}&sort=oldest&kind=video`);
  assert(kindConstrained.items.length === 0, "Library history ordering did not compose with media-kind filtering.");

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1024 }, colorScheme: "dark" });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/library?q=${query}&sort=oldest`, { waitUntil: "domcontentloaded", timeout: 60_000 });

  const sortButton = page.getByRole("button", { name: "Oldest first", exact: true });
  await sortButton.waitFor({ state: "visible", timeout: 30_000 });
  const oldestOrder = await orderedFixtureHrefs(page, [older.id, newer.id]);
  assert(oldestOrder[0] === `/library/${older.id}` && oldestOrder[1] === `/library/${newer.id}`, `Browser oldest-first order was incorrect: ${JSON.stringify(oldestOrder)}`);

  const imagesHref = await page.getByRole("link", { name: "Images", exact: true }).getAttribute("href");
  assert(imagesHref === `/library?kind=image&q=${encodeURIComponent(token).replace(/%20/g, "+")}&sort=oldest`, `Kind link did not preserve oldest-first state: ${imagesHref}`);

  await page.screenshot({ path: `${artifactDir}/library-history-desktop-oldest.png`, fullPage: true });

  await sortButton.click();
  const oldestRadio = page.getByRole("menuitemradio", { name: "Oldest first", exact: true });
  await oldestRadio.waitFor({ state: "visible", timeout: 30_000 });
  assert(await oldestRadio.getAttribute("aria-checked") === "true", "Oldest-first dropdown item was not marked selected.");
  await page.screenshot({ path: `${artifactDir}/library-history-desktop-menu.png`, fullPage: true });

  await page.getByRole("menuitemradio", { name: "Newest first", exact: true }).click();
  await page.waitForURL((url) =>
    url.pathname === "/library"
    && url.searchParams.get("q") === token
    && !url.searchParams.has("sort")
    && !url.searchParams.has("offset"),
    { timeout: 30_000 },
  );
  await page.getByRole("button", { name: "Newest first", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  const newestOrder = await orderedFixtureHrefs(page, [older.id, newer.id]);
  assert(newestOrder[0] === `/library/${newer.id}` && newestOrder[1] === `/library/${older.id}`, `Browser newest-first order was incorrect: ${JSON.stringify(newestOrder)}`);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  await page.evaluate(() => window.scrollTo(0, 0));
  assert(await page.getByRole("button", { name: "Newest first", exact: true }).isVisible(), "Library history sort control is not visible on mobile.");
  await page.screenshot({ path: `${artifactDir}/library-history-mobile-newest.png`, fullPage: true });

  console.log(`Configured Library history ordering rendered successfully. older=${older.id} newer=${newer.id}`);
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
