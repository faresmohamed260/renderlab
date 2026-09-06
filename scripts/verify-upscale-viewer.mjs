import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { chromium } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import {
  configuredTestAccountIdentity,
  createConfiguredTestAccount,
  deleteConfiguredTestAccount,
  routeLocalAppRequestsWithAccount,
} from "./lib/configured-test-account.mjs";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const r2AccountId = process.env.R2_ACCOUNT_ID;
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const r2Bucket = process.env.R2_BUCKET_NAME;
const artifactDir = process.env.RENDERLAB_PHASE18E_ARTIFACT_DIR || "artifacts";
const cleanupOnly = process.argv.includes("--cleanup-only");
const identity = configuredTestAccountIdentity("phase18e-upscale-viewer");

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: supabaseKey,
  R2_ACCOUNT_ID: r2AccountId,
  R2_ACCESS_KEY_ID: r2AccessKeyId,
  R2_SECRET_ACCESS_KEY: r2SecretAccessKey,
  R2_BUCKET_NAME: r2Bucket,
})) {
  if (!value) throw new Error(`${name} is required for Phase 18E Upscale Viewer verification.`);
}

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: r2AccessKeyId, secretAccessKey: r2SecretAccessKey },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

const pngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function serviceRest(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", supabaseKey);
  headers.set("authorization", `Bearer ${supabaseKey}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers });
}

async function createImageAsset(account, { displayName, width = 1, height = 1 }) {
  const id = randomUUID();
  const storageKey = `renderlab/phase18e-fixtures/${account.id}/${id}.png`;
  await r2Client.send(new PutObjectCommand({
    Bucket: r2Bucket,
    Key: storageKey,
    Body: pngBytes,
    ContentType: "image/png",
  }));

  const response = await serviceRest("media_assets", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      id,
      owner_id: account.id,
      generation_job_id: null,
      generation_output_index: null,
      origin: "uploaded",
      kind: "image",
      mime_type: "image/png",
      storage_key: storageKey,
      thumbnail_storage_key: null,
      original_filename: `${displayName}.png`,
      display_name: displayName,
      size_bytes: pngBytes.length,
      width,
      height,
      duration_ms: null,
      provenance: {},
      metadata: { verification: "phase18e-upscale-viewer" },
    }),
  });
  if (!response.ok) {
    throw new Error(`Could not create Phase 18E media fixture (${response.status}): ${await response.text()}`);
  }
  return (await response.json())[0];
}

async function cleanupFixture() {
  await deleteConfiguredTestAccount(identity);
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
  const account = await createConfiguredTestAccount("phase18e-upscale-viewer");
  const eligibleAsset = await createImageAsset(account, { displayName: "Phase18E eligible image" });
  const secondEligibleAsset = await createImageAsset(account, { displayName: "Phase18E error image" });
  const ineligibleAsset = await createImageAsset(account, {
    displayName: "Phase18E unknown geometry",
    width: null,
    height: null,
  });

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, colorScheme: "dark" });
  const page = await context.newPage();
  await routeLocalAppRequestsWithAccount(page, baseUrl, account);

  let responseMode = "pending-success";
  let releaseSuccess;
  const successGate = new Promise((resolve) => { releaseSuccess = resolve; });
  const capturedPosts = [];

  await page.route("**/api/media/assets/*/upscale", async (route) => {
    const request = route.request();
    if (request.method() !== "POST") {
      await route.continue();
      return;
    }
    capturedPosts.push({ url: request.url(), body: request.postData() });
    if (responseMode === "pending-success") {
      await successGate;
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, job: { id: randomUUID(), status: "queued", operation: "upscale-image" } }),
      });
      return;
    }
    await route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({
        ok: false,
        error: { code: "upscale_not_available", message: "This image cannot be upscaled at 2×." },
      }),
    });
  });

  await page.goto(`${baseUrl}/library/${eligibleAsset.id}`, { waitUntil: "networkidle", timeout: 60_000 });
  const upscaleButton = page.getByRole("button", { name: "Upscale 2×", exact: true });
  await upscaleButton.waitFor({ state: "visible", timeout: 30_000 });
  await page.getByRole("link", { name: "Edit", exact: true }).waitFor({ state: "visible" });
  await page.getByRole("link", { name: "Animate", exact: true }).waitFor({ state: "visible" });
  assert(await upscaleButton.isEnabled(), "Eligible Viewer Upscale action was disabled before submission.");
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), "Eligible desktop Viewer introduced horizontal overflow.");
  await page.screenshot({ path: `${artifactDir}/phase18e-upscale-viewer-eligible-desktop.png`, fullPage: true });

  await upscaleButton.click();
  const startingButton = page.getByRole("button", { name: "Starting upscale…", exact: true });
  await startingButton.waitFor({ state: "visible" });
  assert(await startingButton.isDisabled(), "Starting Upscale action was not submission-locked.");
  await startingButton.evaluate((element) => { element.click(); element.click(); });
  assert(capturedPosts.length === 1, `Duplicate Viewer submits escaped the local lock (${capturedPosts.length} POSTs).`);
  assert(capturedPosts[0].body == null || capturedPosts[0].body === "", "Viewer Upscale submitted browser-controlled settings/body data.");
  await page.screenshot({ path: `${artifactDir}/phase18e-upscale-viewer-starting-desktop.png`, fullPage: true });

  releaseSuccess();
  const acceptedButton = page.getByRole("button", { name: "Upscale started", exact: true });
  await acceptedButton.waitFor({ state: "visible", timeout: 30_000 });
  assert(await acceptedButton.isDisabled(), "Accepted Upscale action did not remain locally locked.");
  await page.getByText("Upscale started. Track progress in Activity.", { exact: true }).waitFor({ state: "visible" });
  const activityLink = page.getByRole("link", { name: "Open Activity", exact: true });
  assert((await activityLink.getAttribute("href")) === "/activity", "Accepted Viewer Upscale did not continue to Activity.");
  assert((await page.getByText("Phase18E eligible image", { exact: true }).count()) > 0, "Accepted Upscale replaced or lost source Viewer context.");
  await page.screenshot({ path: `${artifactDir}/phase18e-upscale-viewer-accepted-desktop.png`, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), "Accepted narrow Viewer introduced horizontal overflow.");
  await activityLink.waitFor({ state: "visible" });
  await page.screenshot({ path: `${artifactDir}/phase18e-upscale-viewer-accepted-narrow.png`, fullPage: true });

  responseMode = "error";
  await page.goto(`${baseUrl}/library/${secondEligibleAsset.id}`, { waitUntil: "networkidle", timeout: 60_000 });
  const errorStartButton = page.getByRole("button", { name: "Upscale 2×", exact: true });
  await errorStartButton.click();
  await page.getByText("This image cannot be upscaled at 2×.", { exact: true }).waitFor({ state: "visible" });
  await page.getByRole("button", { name: "Upscale 2×", exact: true }).waitFor({ state: "visible" });
  assert(await page.getByRole("button", { name: "Upscale 2×", exact: true }).isEnabled(), "Rejected Upscale did not restore a retryable Viewer action.");
  assert((await page.getByRole("link", { name: "Open Activity", exact: true }).count()) === 0, "Rejected Upscale incorrectly exposed Activity success continuation.");
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), "Error narrow Viewer introduced horizontal overflow.");
  await page.screenshot({ path: `${artifactDir}/phase18e-upscale-viewer-error-narrow.png`, fullPage: true });

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto(`${baseUrl}/library/${ineligibleAsset.id}`, { waitUntil: "networkidle", timeout: 60_000 });
  assert((await page.getByRole("button", { name: "Upscale 2×", exact: true }).count()) === 0, "Viewer exposed Upscale for incomplete source geometry.");
  await page.getByRole("link", { name: "Edit", exact: true }).waitFor({ state: "visible" });
  await page.getByRole("link", { name: "Animate", exact: true }).waitFor({ state: "visible" });

  assert(capturedPosts.length === 2, `Unexpected Upscale POST count after success/error proof (${capturedPosts.length}).`);
  console.log("Phase 18E Upscale Viewer verification passed: server-derived presence, 2+1 hierarchy, duplicate lock, payloadless submit, starting/accepted/error feedback, Activity continuation, source stability, reduced-motion narrow layout and ineligible omission.");
} catch (error) {
  primaryError = error;
} finally {
  if (browser) await browser.close().catch(() => {});
  try {
    await cleanupFixture();
  } catch (cleanupError) {
    if (!primaryError) primaryError = cleanupError;
    else console.error(cleanupError);
  }
}

if (primaryError) throw primaryError;
