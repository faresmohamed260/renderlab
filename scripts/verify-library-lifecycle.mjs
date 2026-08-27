import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { chromium } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const r2Bucket = process.env.R2_BUCKET_NAME;
const artifactDir = process.env.RENDERLAB_LIBRARY_ARTIFACT_DIR || "artifacts";
const fixturePath = process.env.RENDERLAB_LIBRARY_FIXTURE_PATH || "/tmp/renderlab-library-lifecycle-fixture.json";
const cleanupOnly = process.argv.includes("--cleanup-only");
const fixturePrompt = "Phase 4 Library verification image";

const pngBytes = Buffer.from(
  "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",
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
  if (!value) throw new Error(`${name} is required for configured Library lifecycle verification.`);
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

async function rows(path) {
  const response = await supabase(path);
  if (!response.ok) throw new Error(`Supabase Library lifecycle query failed (${response.status}): ${await response.text()}`);
  return response.json();
}

async function readFixture() {
  try {
    const payload = JSON.parse(await readFile(fixturePath, "utf8"));
    return typeof payload?.assetId === "string" && typeof payload?.storageKey === "string" ? payload : null;
  } catch {
    return null;
  }
}

async function cleanupFixture() {
  const fixture = await readFixture();
  if (!fixture) return;

  await r2Client.send(new DeleteObjectCommand({ Bucket: r2Bucket, Key: fixture.storageKey }));

  const deletion = await supabase(`media_assets?id=eq.${encodeURIComponent(fixture.assetId)}`, { method: "DELETE" });
  if (!deletion.ok) throw new Error(`Could not remove Library media fixture (${deletion.status}): ${await deletion.text()}`);

  const remaining = await rows(`media_assets?id=eq.${encodeURIComponent(fixture.assetId)}&select=id`);
  if (remaining.length) throw new Error(`Library cleanup was incomplete for asset ${fixture.assetId}.`);

  await rm(fixturePath, { force: true });
  console.log(`Cleaned configured Library fixture asset=${fixture.assetId} objects=1`);
}

if (cleanupOnly) {
  await cleanupFixture();
  process.exit(0);
}

await mkdir(artifactDir, { recursive: true });

const assetId = randomUUID();
const storageKey = `renderlab/test-fixtures/library/${assetId}.png`;
const fixture = { assetId, storageKey };
const desktopViewport = { width: 1440, height: 1024 };
const mobileViewport = { width: 390, height: 844 };
let browser = null;
let primaryError = null;

try {
  await writeFile(fixturePath, JSON.stringify(fixture), "utf8");

  await r2Client.send(new PutObjectCommand({
    Bucket: r2Bucket,
    Key: storageKey,
    Body: pngBytes,
    ContentType: "image/png",
  }));

  const insertion = await supabase("media_assets", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      id: assetId,
      generation_job_id: null,
      kind: "image",
      mime_type: "image/png",
      storage_key: storageKey,
      thumbnail_storage_key: null,
      width: 640,
      height: 480,
      duration_ms: null,
      provenance: {
        prompt: fixturePrompt,
        model: "integration-fixture",
        operation: "create-image",
      },
      metadata: { integrationFixture: "library-v0.1" },
    }),
  });
  if (!insertion.ok) throw new Error(`Could not create Library media fixture (${insertion.status}): ${await insertion.text()}`);

  console.log(`Configured Library fixture ready. asset=${assetId}`);

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: desktopViewport, colorScheme: "dark" });
  const page = await context.newPage();

  await page.goto(`${baseUrl}/library`, { waitUntil: "networkidle", timeout: 60_000 });

  const card = page.getByRole("link", { name: `Open ${fixturePrompt}`, exact: true });
  await card.waitFor({ state: "visible", timeout: 30_000 });
  const cardImage = card.locator("img");
  await cardImage.waitFor({ state: "visible", timeout: 30_000 });
  await cardImage.evaluate((image) => {
    if (!(image instanceof HTMLImageElement) || !image.complete || image.naturalWidth < 1) {
      throw new Error("Library fixture image did not load through the product media endpoint.");
    }
  });

  await page.screenshot({ path: `${artifactDir}/library-lifecycle-desktop-grid.png`, fullPage: true });

  await page.setViewportSize(mobileViewport);
  await page.waitForTimeout(250);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${artifactDir}/library-lifecycle-mobile-grid.png`, fullPage: true });

  await page.setViewportSize(desktopViewport);
  await card.click();
  await page.waitForURL(new RegExp(`/library/${assetId}$`), { timeout: 30_000 });

  const viewerImage = page.getByRole("img", { name: fixturePrompt });
  await viewerImage.waitFor({ state: "visible", timeout: 30_000 });
  await viewerImage.evaluate((image) => {
    if (!(image instanceof HTMLImageElement) || !image.complete || image.naturalWidth < 1) {
      throw new Error("Media Viewer fixture image did not load through the product media endpoint.");
    }
  });

  const edit = page.getByRole("link", { name: "Edit", exact: true });
  const animate = page.getByRole("link", { name: "Animate", exact: true });
  assert(await edit.isVisible(), "Media Viewer did not expose Edit for a persisted image asset.");
  assert(await animate.isVisible(), "Media Viewer did not expose Animate for a persisted image asset.");
  assert((await edit.getAttribute("href"))?.includes(`source=${assetId}`), "Edit continuation did not bind the durable media asset ID.");
  assert((await edit.getAttribute("href"))?.includes("action=edit-image"), "Edit continuation did not bind the capability action ID.");
  assert((await animate.getAttribute("href"))?.includes("action=animate-image"), "Animate continuation did not bind the capability action ID.");

  await page.screenshot({ path: `${artifactDir}/library-lifecycle-desktop-viewer.png`, fullPage: true });

  await page.setViewportSize(mobileViewport);
  await page.waitForTimeout(250);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${artifactDir}/library-lifecycle-mobile-viewer.png`, fullPage: true });

  await edit.click();
  await page.waitForURL((url) => url.pathname === "/" && url.searchParams.get("source") === assetId && url.searchParams.get("action") === "edit-image", { timeout: 30_000 });
  await page.getByRole("heading", { name: "Edit an image", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByText("Editing this image", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByRole("button", { name: "Image", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  assert(await page.getByRole("button", { name: "Image", exact: true }).getAttribute("aria-pressed") === "true", "Validated Edit continuation did not initialize Image output.");

  const referencePreview = page.getByRole("img", { name: "Reference preview" });
  await referencePreview.waitFor({ state: "visible", timeout: 30_000 });
  await referencePreview.evaluate((image) => {
    if (!(image instanceof HTMLImageElement) || !image.complete || image.naturalWidth < 1) {
      throw new Error("Create continuation preview did not load the durable media asset.");
    }
  });

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${artifactDir}/library-lifecycle-mobile-edit-handoff.png`, fullPage: true });

  await page.setViewportSize(desktopViewport);
  await page.waitForTimeout(250);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${artifactDir}/library-lifecycle-desktop-edit-handoff.png`, fullPage: true });

  console.log("Configured Library -> Media Viewer -> Edit handoff rendered successfully at desktop and mobile widths.");
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
