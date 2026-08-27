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
const fixtureWidth = 400;
const fixtureHeight = 300;

// Deterministic 4:3 PNG: warm gray field with a centered cobalt-blue circle.
const pngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAZAAAAEsCAIAAABi1XKVAAAETElEQVR42u3by3GrQBBAUUlFlqRAOATAhgU7hUgAqEp8Buihz9m/Z6un+jLY5fd3Gl4ANfgYASBYAIIFCBaAYAEIFiBYAIIFIFiAYAEIFoBgAYIFIFgAggUIFoBgAQgWIFgAggUgWIBgAQgWgGABggUgWACCBQgWgGABggUgWACCBQgWgGABCBYgWACCBSBYgGABCBaAYAGCBSBYAIIFCBaAYAEIFiBYAIIFIFiAYAEIFoBgAYIFIFgAggUIFoBgAYIFIFgAggUIFoBgAQgWIFgAggUgWIBgAQgWgGABggUgWACCBQgWwG0aI+CIbtz8T/rW2BAsQuZpzX8iYQgWUQq19avoF4JFuE79/erKhWARtFPKhWBRX6eUC8GiylT9/IZlS7CQKtlCsJAq2UKwSJsq2RIspEq2iM7fEqqVT4obFhbYVQs3LNTKZ3fDwrq6auGGhVqZBoKF/TQTr4RYS6+HuGGhVqaEYNlDzEqwsIEmhmBh98wNwbJ1mJ5gYd/MEMHCppkkgmXHME/BwnaZKoKFvTJbBAsQLFwBTBjBwi6ZM4JlizBtwQIQLDzwzRzBsjmYvGABCJaHPOaPYNkWnIJgAQiWBzvOQrCMABAsPNKdCIIFCBYe5jgXwQIQLI9xnI5gAQgWHuDOCMECBAtAsPCu4aQQLECwAAQLbxnOC8ECBAtAsLxf4NQQLECwAAQLQLAAwWI3P7t1dggWIFgAggUgWIBgAQhWKn7N5AQRLECwAAQLQLAAwQIQLADBAgQLQLAABAsQLADBAhAsQLAABAtAsADBYoW+NQMniGABggUgWACCBQgWgGCl49dMzg7BAgQLQLAABAsQLMrxs1unhmABggUgWN4vcF4IFiBYAILlLQMnhWABggUgWN41cEYIFiBYeIA7HQQLQLA8xnEuggUgWB7mOBEECxAsPNKdBYIFCBYe7DgFwcK2mD+CBQgWHvImbwaChc0xcwQLECw88E0bwcIWmTOCZZcwYcECECxcAcwWwbJXmKpgYbvME8HCjpkkgmXTMEPBwr6ZHoKFrTM3BMvuYWKChQ00KwQLe2hKLDRG8KRt7EaTkCo3LGymmSBY2E/TwCuhLc3+eihVbljYWJ8dNyxctaQKNyxS7bBauWHhqiVVCBayJVUIFkmyJVWChWxJFYKFbEkVgkXBCoQtl04hWEQvl04hWEQvl04hWBRox0n9UigEiyvKsiNh8oRgESVhcB5/SwgIFoBgAYIFIFgAggUIFoBgAQgWIFgAggUgWIBgAQgWgGABggUgWACCBQgWgGABCBYgWACCBSBYgGABCBaAYAGCBSBYgGAZASBYAIIFCBaAYAEIFiBYAIIFIFiAYAEIFoBgAYIFIFgAggUIFoBgAQgWIFgAggUgWIBgAQgWgGABggUgWACCBQgWgGABggUgWACCBQgWgGABCBYgWACCBSBYgGABCBaAYAGCBSBYAIIFPNAMNnjReMMTg9AAAAAASUVORK5CYII=",
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

async function imageMetrics(locator, label) {
  const metrics = await locator.evaluate((image) => {
    if (!(image instanceof HTMLImageElement)) return null;
    const style = window.getComputedStyle(image);
    const rect = image.getBoundingClientRect();
    return {
      complete: image.complete,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      renderedWidth: rect.width,
      renderedHeight: rect.height,
      cssWidth: style.width,
      cssHeight: style.height,
      objectFit: style.objectFit,
      aspectRatio: style.aspectRatio,
    };
  });
  console.log(`${label} metrics=${JSON.stringify(metrics)}`);
  assert(metrics?.complete && metrics.naturalWidth === fixtureWidth && metrics.naturalHeight === fixtureHeight, `${label} did not decode the ${fixtureWidth}×${fixtureHeight} fixture correctly.`);
  return metrics;
}

function assertRatio(metrics, ratio, label) {
  const renderedRatio = metrics.renderedWidth / metrics.renderedHeight;
  assert(Math.abs(renderedRatio - ratio) < 0.03, `${label} rendered at ${renderedRatio.toFixed(3)} instead of ${ratio.toFixed(3)}.`);
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
      width: fixtureWidth,
      height: fixtureHeight,
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

  console.log(`Configured Library fixture ready. asset=${assetId} pngBytes=${pngBytes.length}`);

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: desktopViewport, colorScheme: "dark" });
  const page = await context.newPage();

  await page.goto(`${baseUrl}/library`, { waitUntil: "networkidle", timeout: 60_000 });

  const card = page.getByRole("link", { name: `Open ${fixturePrompt}`, exact: true });
  await card.waitFor({ state: "visible", timeout: 30_000 });
  const cardImage = card.locator("img");
  await cardImage.waitFor({ state: "visible", timeout: 30_000 });
  const cardMetrics = await imageMetrics(cardImage, "Library card image");
  assertRatio(cardMetrics, fixtureWidth / fixtureHeight, "Library card image");

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
  const viewerMetrics = await imageMetrics(viewerImage, "Media Viewer image");
  assertRatio(viewerMetrics, fixtureWidth / fixtureHeight, "Media Viewer image");

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
  await imageMetrics(referencePreview, "Create continuation preview");

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
