import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { chromium } from "@playwright/test";
import { readFile, rm, writeFile } from "node:fs/promises";
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
const fixturePath = process.env.RENDERLAB_CREATE_UPLOAD_FIXTURE_PATH || "/tmp/renderlab-create-durable-upload-fixture.json";
const cleanupOnly = process.argv.includes("--cleanup-only");
const fixtureAccount = configuredTestAccountIdentity("create-durable-upload");
const fixtureFilename = "renderlab-create-reference.png";
const fixtureDisplayName = "renderlab-create-reference";
const fixtureWidth = 400;
const fixtureHeight = 300;

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
  if (!value) throw new Error(`${name} is required for configured Create durable-upload verification.`);
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
  if (!response.ok) throw new Error(`Supabase Create-upload query failed (${response.status}): ${await response.text()}`);
  return response.json();
}

async function readFixture() {
  try {
    return JSON.parse(await readFile(fixturePath, "utf8"));
  } catch {
    return null;
  }
}

async function cleanupFixture() {
  const fixture = await readFixture();
  if (fixture?.uploadId) {
    const sessions = await rows(`media_upload_sessions?id=eq.${encodeURIComponent(fixture.uploadId)}&select=id,storage_key,media_asset_id`);
    const session = sessions[0] || null;
    const storageKey = session?.storage_key || fixture.storageKey || null;
    const assetId = session?.media_asset_id || fixture.assetId || null;

    if (storageKey) {
      await r2Client.send(new DeleteObjectCommand({ Bucket: r2Bucket, Key: storageKey })).catch(() => {});
    }
    if (session) {
      const response = await supabase(`media_upload_sessions?id=eq.${encodeURIComponent(fixture.uploadId)}`, { method: "DELETE" });
      if (!response.ok) throw new Error(`Could not remove Create upload session fixture (${response.status}).`);
    }
    if (assetId) {
      const assetRows = await rows(`media_assets?id=eq.${encodeURIComponent(assetId)}&select=thumbnail_storage_key`);
      if (assetRows[0]?.thumbnail_storage_key) {
        await r2Client.send(new DeleteObjectCommand({ Bucket: r2Bucket, Key: assetRows[0].thumbnail_storage_key })).catch(() => {});
      }
      const response = await supabase(`media_assets?id=eq.${encodeURIComponent(assetId)}`, { method: "DELETE" });
      if (!response.ok) throw new Error(`Could not remove Create upload media fixture (${response.status}).`);
    }
    await rm(fixturePath, { force: true });
  }
  await deleteConfiguredTestAccount(fixtureAccount);
}

if (cleanupOnly) {
  await cleanupFixture();
  process.exit(0);
}

let browser = null;
let primaryError = null;
try {
  await cleanupFixture();
  const account = await createConfiguredTestAccount("create-durable-upload");
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1024 }, colorScheme: "dark" });
  const page = await context.newPage();
  await routeLocalAppRequestsWithAccount(page, baseUrl, account);

  await page.goto(`${baseUrl}/create`, { waitUntil: "networkidle", timeout: 60_000 });
  const addReference = page.getByRole("button", { name: "Add reference", exact: true });
  await addReference.waitFor({ state: "visible", timeout: 30_000 });
  assert(await addReference.isEnabled(), "Authenticated Create did not enable durable reference upload.");

  const ticketPromise = page.waitForResponse(
    (response) => response.url().endsWith("/api/media/uploads/upload-tickets") && response.request().method() === "POST",
    { timeout: 30_000 },
  );
  const completionPromise = page.waitForResponse(
    (response) => response.url().endsWith("/api/media/uploads/upload-completions") && response.request().method() === "POST",
    { timeout: 60_000 },
  );
  const chooserPromise = page.waitForEvent("filechooser", { timeout: 30_000 });
  await addReference.click();
  const chooser = await chooserPromise;
  await chooser.setFiles({ name: fixtureFilename, mimeType: "image/png", buffer: pngBytes });

  const ticketResponse = await ticketPromise;
  const ticketPayload = await ticketResponse.json();
  assert(ticketResponse.ok() && ticketPayload?.ok && ticketPayload.ticket?.uploadId, `Create upload ticket failed: ${JSON.stringify(ticketPayload)}`);
  const uploadId = ticketPayload.ticket.uploadId;
  await writeFile(fixturePath, JSON.stringify({ uploadId }), "utf8");

  const completionResponse = await completionPromise;
  const completionPayload = await completionResponse.json();
  assert(completionResponse.ok() && completionPayload?.ok && completionPayload.asset?.id, `Create upload completion failed: ${JSON.stringify(completionPayload)}`);
  const asset = completionPayload.asset;
  assert(asset.origin === "uploaded", "Create upload did not become durable uploaded media.");
  assert(asset.generationJobId === null, "Create upload incorrectly depends on a generation job.");
  assert(asset.displayName === fixtureDisplayName, "Create upload display name was not preserved.");
  assert(asset.width === fixtureWidth && asset.height === fixtureHeight, "Create upload dimensions were not persisted.");
  assert(asset.thumbnailUrl?.endsWith(`/api/media/assets/${asset.id}/thumbnail`), "Create durable upload did not receive a thumbnail URL.");

  const sessionRows = await rows(`media_upload_sessions?id=eq.${encodeURIComponent(uploadId)}&select=id,status,storage_key,media_asset_id,owner_id`);
  const session = sessionRows[0];
  assert(session?.status === "completed" && session.media_asset_id === asset.id, "Create upload session was not completed against the durable asset.");
  assert(session.owner_id === account.id, "Create upload session owner mismatch.");
  const assetRows = await rows(`media_assets?id=eq.${encodeURIComponent(asset.id)}&select=id,owner_id,generation_job_id,origin,width,height,storage_key,thumbnail_storage_key,provenance`);
  const assetRow = assetRows[0];
  assert(assetRow?.owner_id === account.id, "Create durable upload owner mismatch.");
  assert(assetRow?.generation_job_id === null && assetRow?.origin === "uploaded", "Create durable upload has incorrect provenance linkage.");
  assert(assetRow?.provenance?.source === "user-upload", "Create durable upload did not use product-wide user-upload provenance.");
  assert(assetRow?.thumbnail_storage_key?.endsWith(`/${asset.id}.webp`), "Create durable upload did not persist its deterministic thumbnail key.");
  await writeFile(fixturePath, JSON.stringify({ uploadId, assetId: asset.id, storageKey: session.storage_key }), "utf8");

  await page.getByText("Editing this image", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByRole("textbox", { name: "Prompt" }).fill("Keep the subject, change the lighting to soft blue hour");

  let submittedBody = null;
  await page.route("**/api/generation/jobs", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    submittedBody = route.request().postDataJSON();
    return route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ ok: false, error: { code: "backend_unavailable", message: "Verification intentionally stops before generation." } }),
    });
  });
  await page.getByRole("button", { name: "Generate", exact: true }).click();
  await page.waitForTimeout(200);
  assert(submittedBody, "Create did not submit a generation request after durable upload.");
  assert(submittedBody.inputs?.length === 1, "Create did not submit exactly one uploaded reference.");
  assert(submittedBody.inputs[0]?.alias === "image1", "Create generation request did not bind the stable image1 alias.");
  assert(submittedBody.inputs[0]?.source?.type === "media-asset", "Create generation request did not bind the durable media-asset identity.");
  assert(submittedBody.inputs[0]?.source?.id === asset.id, "Create generation request referenced the wrong durable media asset.");
  assert(submittedBody.inputs[0]?.role === "primary-image", "Create generation request did not preserve the Edit input role.");

  await page.unroute("**/api/generation/jobs");
  await page.goto(`${baseUrl}/library?q=${encodeURIComponent(fixtureDisplayName)}`, { waitUntil: "networkidle", timeout: 60_000 });
  const card = page.locator(`a[href="/library/${asset.id}"]`);
  await card.waitFor({ state: "visible", timeout: 30_000 });
  assert(await card.getAttribute("aria-label") === `Open ${fixtureDisplayName}`, "Create upload was not visible as ordinary durable Library media.");

  console.log(`Configured Create durable upload verified owner=${account.id} upload=${uploadId} asset=${asset.id}.`);
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
