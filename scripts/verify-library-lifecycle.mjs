import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { chromium } from "@playwright/test";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const r2Bucket = process.env.R2_BUCKET_NAME;
const artifactDir = process.env.RENDERLAB_LIBRARY_ARTIFACT_DIR || "artifacts";
const fixturePath = process.env.RENDERLAB_LIBRARY_FIXTURE_PATH || "/tmp/renderlab-library-lifecycle-fixture.json";
const cleanupOnly = process.argv.includes("--cleanup-only");
const ignoreHttpsErrors = process.env.RENDERLAB_TEST_IGNORE_HTTPS_ERRORS === "1";
const fixtureFilename = "renderlab-اختبار-画像.png";
const fixtureDisplayName = fixtureFilename.replace(/\.[^.]+$/, "");
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
    return typeof payload?.uploadId === "string" ? payload : null;
  } catch {
    return null;
  }
}

async function cleanupFixture() {
  const fixture = await readFixture();
  if (!fixture) return;

  const sessions = await rows(
    `media_upload_sessions?id=eq.${encodeURIComponent(fixture.uploadId)}&select=id,storage_key,media_asset_id`,
  );
  const session = sessions[0] || null;
  const storageKey = session?.storage_key || fixture.storageKey || null;
  const assetId = session?.media_asset_id || fixture.assetId || null;

  if (storageKey) {
    await r2Client.send(new DeleteObjectCommand({ Bucket: r2Bucket, Key: storageKey })).catch(() => {});
  }

  if (session) {
    const sessionDelete = await supabase(`media_upload_sessions?id=eq.${encodeURIComponent(fixture.uploadId)}`, { method: "DELETE" });
    if (!sessionDelete.ok) throw new Error(`Could not remove Library upload session fixture (${sessionDelete.status}): ${await sessionDelete.text()}`);
  }

  if (assetId) {
    const assetDelete = await supabase(`media_assets?id=eq.${encodeURIComponent(assetId)}`, { method: "DELETE" });
    if (!assetDelete.ok) throw new Error(`Could not remove Library media fixture (${assetDelete.status}): ${await assetDelete.text()}`);
  }

  const remainingSessions = await rows(`media_upload_sessions?id=eq.${encodeURIComponent(fixture.uploadId)}&select=id`);
  if (remainingSessions.length) throw new Error(`Library cleanup left upload session ${fixture.uploadId}.`);
  if (assetId) {
    const remainingAssets = await rows(`media_assets?id=eq.${encodeURIComponent(assetId)}&select=id`);
    if (remainingAssets.length) throw new Error(`Library cleanup left uploaded asset ${assetId}.`);
  }

  await rm(fixturePath, { force: true });
  console.log(`Cleaned configured Library upload fixture upload=${fixture.uploadId}${assetId ? ` asset=${assetId}` : ""}.`);
}

async function imageMetrics(locator, label) {
  const metrics = await locator.evaluate(async (image) => {
    if (!(image instanceof HTMLImageElement)) return null;
    let decodeError = null;
    try {
      await image.decode();
    } catch (error) {
      decodeError = error instanceof Error ? error.message : String(error);
    }
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
      currentSrc: image.currentSrc,
      decodeError,
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

const desktopViewport = { width: 1440, height: 1024 };
const mobileViewport = { width: 390, height: 844 };
let browser = null;
let primaryError = null;

try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: desktopViewport, colorScheme: "dark", ignoreHTTPSErrors: ignoreHttpsErrors });
  const page = await context.newPage();

  await page.goto(`${baseUrl}/library`, { waitUntil: "networkidle", timeout: 60_000 });
  const uploadButton = page.getByRole("button", { name: "Upload", exact: true });
  await uploadButton.waitFor({ state: "visible", timeout: 30_000 });

  const ticketPromise = page.waitForResponse(
    (response) => response.url().endsWith("/api/media/uploads/upload-tickets") && response.request().method() === "POST",
    { timeout: 30_000 },
  );
  const completionPromise = page.waitForResponse(
    (response) => response.url().endsWith("/api/media/uploads/upload-completions") && response.request().method() === "POST",
    { timeout: 60_000 },
  );
  const fileChooserPromise = page.waitForEvent("filechooser", { timeout: 30_000 });
  await uploadButton.click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({
    name: fixtureFilename,
    mimeType: "image/png",
    buffer: pngBytes,
  });

  const ticketResponse = await ticketPromise;
  const ticketPayload = await ticketResponse.json();
  assert(ticketResponse.ok() && ticketPayload?.ok && ticketPayload.ticket?.uploadId, `Browser upload ticket failed (${ticketResponse.status()}): ${JSON.stringify(ticketPayload)}`);
  const uploadId = ticketPayload.ticket.uploadId;
  await writeFile(fixturePath, JSON.stringify({ uploadId }), "utf8");

  const completionResponse = await completionPromise;
  const completionPayload = await completionResponse.json();
  assert(completionResponse.ok() && completionPayload?.ok && completionPayload.asset?.id, `Browser upload completion failed (${completionResponse.status()}): ${JSON.stringify(completionPayload)}`);
  const assetId = completionPayload.asset.id;
  assert(completionPayload.asset.origin === "uploaded", "Browser upload was not promoted as uploaded media.");
  assert(completionPayload.asset.displayName === fixtureDisplayName, "Browser upload display name was not derived correctly.");
  assert(completionPayload.asset.originalFilename === fixtureFilename, "Browser upload did not preserve the original Unicode filename.");
  assert(completionPayload.asset.width === fixtureWidth && completionPayload.asset.height === fixtureHeight, "Browser upload dimensions were not persisted.");

  const sessionRows = await rows(
    `media_upload_sessions?id=eq.${encodeURIComponent(uploadId)}&select=status,storage_key,media_asset_id,filename,display_name`,
  );
  const session = sessionRows[0];
  assert(session?.status === "completed" && session.media_asset_id === assetId, "Browser upload session was not completed against the durable asset.");
  assert(session.filename === fixtureFilename, "Browser upload session changed the original Unicode filename.");
  assert(session.display_name === fixtureDisplayName, "Browser upload session changed the display name.");
  await writeFile(fixturePath, JSON.stringify({ uploadId, assetId, storageKey: session.storage_key }), "utf8");

  await page.getByRole("status").filter({ hasText: "Added to Library." }).waitFor({ state: "visible", timeout: 30_000 });
  const card = page.locator(`a[href="/library/${assetId}"]`);
  await card.waitFor({ state: "visible", timeout: 30_000 });
  assert(await card.getAttribute("aria-label") === `Open ${fixtureDisplayName}`, "Uploaded Library card did not expose the expected display name.");
  const cardImage = card.locator("img");
  await cardImage.waitFor({ state: "visible", timeout: 30_000 });
  const cardMetrics = await imageMetrics(cardImage, "Uploaded Library card image");
  assertRatio(cardMetrics, fixtureWidth / fixtureHeight, "Uploaded Library card image");

  await page.screenshot({ path: `${artifactDir}/library-lifecycle-desktop-grid.png`, fullPage: true });

  await page.setViewportSize(mobileViewport);
  await page.waitForTimeout(250);
  await page.evaluate(() => window.scrollTo(0, 0));
  assert(await page.getByRole("button", { name: "Upload", exact: true }).isVisible(), "Upload control is not visible on the mobile Library layout.");
  await page.screenshot({ path: `${artifactDir}/library-lifecycle-mobile-grid.png`, fullPage: true });

  await page.setViewportSize(desktopViewport);
  await card.click();
  await page.waitForURL(new RegExp(`/library/${assetId}$`), { timeout: 30_000 });

  const viewerImage = page.getByRole("img", { name: fixtureDisplayName });
  await viewerImage.waitFor({ state: "visible", timeout: 30_000 });
  const viewerMetrics = await imageMetrics(viewerImage, "Uploaded Media Viewer image");
  assertRatio(viewerMetrics, fixtureWidth / fixtureHeight, "Uploaded Media Viewer image");
  await page.getByText(/^uploaded image$/i).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByText("Upload", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByText(fixtureFilename, { exact: true }).waitFor({ state: "visible", timeout: 30_000 });

  const edit = page.getByRole("link", { name: "Edit", exact: true });
  const animate = page.getByRole("link", { name: "Animate", exact: true });
  assert(await edit.isVisible(), "Media Viewer did not expose Edit for an uploaded image asset.");
  assert(await animate.isVisible(), "Media Viewer did not expose Animate for an uploaded image asset.");
  assert((await edit.getAttribute("href"))?.includes(`source=${assetId}`), "Edit continuation did not bind the durable uploaded media asset ID.");
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
  await imageMetrics(referencePreview, "Uploaded Create continuation preview");

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${artifactDir}/library-lifecycle-mobile-edit-handoff.png`, fullPage: true });

  await page.setViewportSize(desktopViewport);
  await page.waitForTimeout(250);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${artifactDir}/library-lifecycle-desktop-edit-handoff.png`, fullPage: true });

  console.log(`Configured browser upload -> Library -> Media Viewer -> Edit handoff rendered successfully. upload=${uploadId} asset=${assetId}`);
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