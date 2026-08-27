import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { chromium } from "@playwright/test";
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
const artifactDir = process.env.RENDERLAB_LIBRARY_DROP_ARTIFACT_DIR || "artifacts";
const fixturePath = process.env.RENDERLAB_LIBRARY_DROP_FIXTURE_PATH || "/tmp/renderlab-library-drop-upload-fixture.json";
const cleanupOnly = process.argv.includes("--cleanup-only");
const fixtureToken = process.env.GITHUB_RUN_ID || "local";
const fixtureFilename = `renderlab-drop-${fixtureToken}-اختبار-画像.png`;
const fixtureDisplayName = fixtureFilename.replace(/\.[^.]+$/, "");
const fixtureAccount = configuredTestAccountIdentity("library-drag-drop");

const pngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAZAAAAEsCAIAAABi1XKVAAAETElEQVR42u3by3GrQBBAUUlFlqRAOATAhgU7hUgAqEp8Buihz9m/Z6un+jLY5fd3Gl4ANfgYASBYAIIFCBaAYAEIFiBYAIIFIFiAYAEIFoBgAYIFIFgAggUIFoBgAQgWIFgAggUgWIBgAQgWgGABggUgWACCBQgWgGABggUgWACCBQgWgGABCBYgWACCBSBYgGABCBaAYAGCBSBYAIIFCBaAYAEIFiBYAIIFIFiAYAEIFoBgAYIFIFgAggUIFoBgAYIFIFgAggUIFoBgAQgWIFgAggUgWIBgAQgWgGABggUgWACCBQgWwG0aI+CIbtz8T/rW2BAsQuZpzX8iYQgWUQq19avoF4JFuE79/erKhWARtFPKhWBRX6eUC8GiylT9/IZlS7CQKtlCsJAq2UKwSJsq2RIspEq2iM7fEqqVT4obFhbYVQs3LNTKZ3fDwrq6auGGhVqZBoKF/TQTr4RYS6+HuGGhVqaEYNlDzEqwsIEmhmBh98wNwbJ1mJ5gYd/MEMHCppkkgmXHME/BwnaZKoKFvTJbBAsQLFwBTBjBwi6ZM4JlizBtwQIQLDzwzRzBsjmYvGABCJaHPOaPYNkWnIJgAQiWBzvOQrCMABAsPNKdCIIFCBYe5jgXwQIQLI9xnI5gAQgWHuDOCMECBAtAsPCu4aQQLECwAAQLbxnOC8ECBAtAsLxf4NQQLECwAAQLQLAAwWI3P7t1dggWIFgAggUgWIBgAQhWKn7N5AQRLECwAAQLQLAAwQIQLADBAgQLQLAABAsQLADBAhAsQLAABAtAsADBYoW+NQMniGABggUgWACCBQgWgGCl49dMzg7BAgQLQLAABAsQLMrxs1unhmABggUgWN4vcF4IFiBYAILlLQMnhWABggUgWN41cEYIFiBYeIA7HQQLQLA8xnEuggUgWB7mOBEECxAsPNKdBYIFCBYe7DgFwcK2mD+CBQgWHvImbwaChc0xcwQLECw88E0bwcIWmTOCZZcwYcECECxcAcwWwbJXmKpgYbvME8HCjpkkgmXTMEPBwr6ZHoKFrTM3BMvuYWKChQ00KwQLe2hKLDRG8KRt7EaTkCo3LGymmSBY2E/TwCuhLc3+eihVbljYWJ8dNyxctaQKNyxS7bBauWHhqiVVCBayJVUIFkmyJVWChWxJFYKFbEkVgkXBCoQtl04hWEQvl04hWEQvl04hWBRox0n9UigEiyvKsiNh8oRgESVhcB5/SwgIFoBgAYIFIFgAggUIFoBgAQgWIFgAggUgWIBgAQgWgGABggUgWACCBQgWgGABCBYgWACCBSBYgGABCBaAYAGCBSBYgGAZASBYAIIFCBaAYAEIFiBYAIIFIFiAYAEIFoBgAYIFIFgAggUIFoBgAQgWIFgAggUgWIBgAQgWgGABggUgWACCBQgWgGABggUgWACCBQgWgGABCBYgWACCBSBYgGABCBaAYAGCBSBYAIIFPNAMNnjReMMTg9AAAAAASUVORK5CYII=",
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
  if (!value) throw new Error(`${name} is required for configured Library drag/drop verification.`);
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
  if (!response.ok) throw new Error(`Supabase Library drag/drop query failed (${response.status}): ${await response.text()}`);
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
  const sessions = await rows(
    `media_upload_sessions?filename=eq.${encodeURIComponent(fixtureFilename)}&select=id,storage_key,media_asset_id`,
  );
  const assets = await rows(
    `media_assets?original_filename=eq.${encodeURIComponent(fixtureFilename)}&select=id,storage_key`,
  );

  const storageKeys = new Set([
    ...sessions.map((session) => session.storage_key).filter(Boolean),
    ...assets.map((asset) => asset.storage_key).filter(Boolean),
    fixture?.storageKey,
  ].filter(Boolean));
  const assetIds = new Set([
    ...sessions.map((session) => session.media_asset_id).filter(Boolean),
    ...assets.map((asset) => asset.id).filter(Boolean),
    fixture?.assetId,
  ].filter(Boolean));

  for (const storageKey of storageKeys) {
    await r2Client.send(new DeleteObjectCommand({ Bucket: r2Bucket, Key: storageKey })).catch(() => {});
  }
  for (const session of sessions) {
    const response = await supabase(`media_upload_sessions?id=eq.${encodeURIComponent(session.id)}`, { method: "DELETE" });
    if (!response.ok) throw new Error(`Could not remove drag/drop upload session (${response.status}): ${await response.text()}`);
  }
  if (fixture?.uploadId && !sessions.some((session) => session.id === fixture.uploadId)) {
    const response = await supabase(`media_upload_sessions?id=eq.${encodeURIComponent(fixture.uploadId)}`, { method: "DELETE" });
    if (!response.ok) throw new Error(`Could not remove tracked drag/drop upload session (${response.status}): ${await response.text()}`);
  }
  for (const assetId of assetIds) {
    const response = await supabase(`media_assets?id=eq.${encodeURIComponent(assetId)}`, { method: "DELETE" });
    if (!response.ok) throw new Error(`Could not remove drag/drop media asset (${response.status}): ${await response.text()}`);
  }

  const remainingSessions = await rows(
    `media_upload_sessions?filename=eq.${encodeURIComponent(fixtureFilename)}&select=id`,
  );
  const remainingAssets = await rows(
    `media_assets?original_filename=eq.${encodeURIComponent(fixtureFilename)}&select=id`,
  );
  if (remainingSessions.length) throw new Error(`Drag/drop cleanup left ${remainingSessions.length} matching upload session(s).`);
  if (remainingAssets.length) throw new Error(`Drag/drop cleanup left ${remainingAssets.length} matching media asset(s).`);

  await rm(fixturePath, { force: true });
  await deleteConfiguredTestAccount(fixtureAccount);
  console.log(`Cleaned Library drag/drop fixtures filename=${fixtureFilename}.`);
}

async function createDataTransfer(page, files) {
  return page.evaluateHandle(({ files: fileSpecs }) => {
    const transfer = new DataTransfer();
    for (const spec of fileSpecs) {
      const binary = atob(spec.base64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      transfer.items.add(new File([bytes], spec.name, { type: spec.mimeType }));
    }
    return transfer;
  }, { files });
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
  await cleanupFixture();
  const account = await createConfiguredTestAccount("library-drag-drop");
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: desktopViewport, colorScheme: "dark" });
  const page = await context.newPage();
  await routeLocalAppRequestsWithAccount(page, baseUrl, account);
  let ticketRequests = 0;
  let completionRequests = 0;
  page.on("request", (request) => {
    if (request.method() !== "POST") return;
    if (request.url().endsWith("/api/media/uploads/upload-tickets")) ticketRequests += 1;
    if (request.url().endsWith("/api/media/uploads/upload-completions")) completionRequests += 1;
  });

  await page.goto(`${baseUrl}/library`, { waitUntil: "networkidle", timeout: 60_000 });

  const surface = page.locator('[data-library-drop-surface="true"]');
  await surface.waitFor({ state: "visible", timeout: 30_000 });
  assert(await page.getByRole("button", { name: "Upload", exact: true }).isVisible(), "Upload button baseline is not visible.");

  const multipleTransfer = await createDataTransfer(page, [
    { name: "one.png", mimeType: "image/png", base64: pngBytes.toString("base64") },
    { name: "two.png", mimeType: "image/png", base64: pngBytes.toString("base64") },
  ]);
  await surface.dispatchEvent("dragenter", { dataTransfer: multipleTransfer });
  await page.getByText("Drop image to add to Library", { exact: true }).waitFor({ state: "visible", timeout: 10_000 });
  await surface.dispatchEvent("drop", { dataTransfer: multipleTransfer });
  await page.getByRole("alert").filter({ hasText: "Drop one image at a time." }).waitFor({ state: "visible", timeout: 10_000 });
  assert(ticketRequests === 0 && completionRequests === 0, "Rejected multi-file drop started an upload request.");
  await multipleTransfer.dispose();

  const transfer = await createDataTransfer(page, [
    { name: fixtureFilename, mimeType: "image/png", base64: pngBytes.toString("base64") },
  ]);
  await surface.dispatchEvent("dragenter", { dataTransfer: transfer });
  await page.getByText("Drop image to add to Library", { exact: true }).waitFor({ state: "visible", timeout: 10_000 });
  await page.screenshot({ path: `${artifactDir}/library-drag-drop-desktop-ready.png`, fullPage: true });

  const ticketPromise = page.waitForResponse(
    (response) => response.url().endsWith("/api/media/uploads/upload-tickets") && response.request().method() === "POST",
    { timeout: 30_000 },
  );
  const completionPromise = page.waitForResponse(
    (response) => response.url().endsWith("/api/media/uploads/upload-completions") && response.request().method() === "POST",
    { timeout: 60_000 },
  );
  await surface.dispatchEvent("drop", { dataTransfer: transfer });
  await transfer.dispose();

  const ticketResponse = await ticketPromise;
  const ticketPayload = await ticketResponse.json();
  assert(ticketResponse.ok() && ticketPayload?.ok && ticketPayload.ticket?.uploadId, `Drag/drop upload ticket failed (${ticketResponse.status()}): ${JSON.stringify(ticketPayload)}`);
  const uploadId = ticketPayload.ticket.uploadId;
  await writeFile(fixturePath, JSON.stringify({ uploadId }), "utf8");

  const completionResponse = await completionPromise;
  const completionPayload = await completionResponse.json();
  assert(completionResponse.ok() && completionPayload?.ok && completionPayload.asset?.id, `Drag/drop completion failed (${completionResponse.status()}): ${JSON.stringify(completionPayload)}`);
  const assetId = completionPayload.asset.id;
  assert(completionPayload.asset.origin === "uploaded", "Drag/drop upload was not promoted as uploaded media.");
  assert(completionPayload.asset.displayName === fixtureDisplayName, "Drag/drop display name was not derived correctly.");
  assert(completionPayload.asset.originalFilename === fixtureFilename, "Drag/drop upload did not preserve the Unicode filename.");
  assert(ticketRequests === 1 && completionRequests === 1, `Single-file drop made unexpected upload requests tickets=${ticketRequests} completions=${completionRequests}.`);

  const sessionRows = await rows(
    `media_upload_sessions?id=eq.${encodeURIComponent(uploadId)}&select=status,storage_key,media_asset_id,filename,display_name,owner_id`,
  );
  const session = sessionRows[0];
  assert(session?.status === "completed" && session.media_asset_id === assetId, "Drag/drop upload session did not complete against the durable asset.");
  assert(session.filename === fixtureFilename, "Drag/drop upload session changed the original filename.");
  assert(session.display_name === fixtureDisplayName, "Drag/drop upload session changed the display name.");
  assert(session.owner_id === account.id, "Drag/drop upload session did not inherit the authenticated account owner.");
  await writeFile(fixturePath, JSON.stringify({ uploadId, assetId, storageKey: session.storage_key }), "utf8");

  const matchingSessions = await rows(
    `media_upload_sessions?filename=eq.${encodeURIComponent(fixtureFilename)}&select=id,media_asset_id,storage_key,owner_id`,
  );
  const matchingAssets = await rows(
    `media_assets?original_filename=eq.${encodeURIComponent(fixtureFilename)}&select=id,storage_key,owner_id`,
  );
  assert(matchingSessions.length === 1, `Single-file drop created ${matchingSessions.length} matching upload sessions.`);
  assert(matchingAssets.length === 1, `Single-file drop created ${matchingAssets.length} matching media assets.`);
  assert(matchingAssets[0]?.id === assetId, "Single-file drop durable asset query did not match the completion asset ID.");
  assert(matchingSessions[0]?.owner_id === account.id && matchingAssets[0]?.owner_id === account.id, "Drag/drop persistence lost the authenticated account owner.");

  const card = page.locator(`a[href="/library/${assetId}"]`);
  await card.waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForTimeout(500);
  assert(await card.getAttribute("aria-label") === `Open ${fixtureDisplayName}`, "Drag/drop Library card did not expose the expected display name.");
  const matchingCards = page.getByRole("link", { name: `Open ${fixtureDisplayName}`, exact: true });
  assert((await matchingCards.count()) === 1, `Library rendered ${await matchingCards.count()} cards for the single dropped asset.`);
  assert((await page.getByRole("status").filter({ hasText: "Added to Library." }).count()) > 0, "Drag/drop success was not announced to assistive technology.");
  assert((await page.locator('[data-library-drop-overlay="true"]').count()) === 0, "Drag/drop overlay remained visible after completion.");
  await page.screenshot({ path: `${artifactDir}/library-drag-drop-desktop-complete.png`, fullPage: true });

  await page.setViewportSize(mobileViewport);
  await page.waitForTimeout(250);
  await page.evaluate(() => window.scrollTo(0, 0));
  assert(await page.getByRole("button", { name: "Upload", exact: true }).isVisible(), "Upload button is not visible on mobile after drag/drop enhancement.");
  assert((await page.locator('[data-library-drop-overlay="true"]').count()) === 0, "Drag/drop affordance is persistently visible on mobile.");
  assert((await page.getByRole("link", { name: `Open ${fixtureDisplayName}`, exact: true }).count()) === 1, "Mobile Library duplicated the dropped asset card.");
  await page.screenshot({ path: `${artifactDir}/library-drag-drop-mobile-complete.png`, fullPage: true });

  console.log(`Configured Library drag/drop upload rendered successfully. owner=${account.id} upload=${uploadId} asset=${assetId}`);
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
