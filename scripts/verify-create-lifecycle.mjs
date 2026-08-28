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
const artifactDir = process.env.RENDERLAB_LIFECYCLE_ARTIFACT_DIR || "artifacts";
const fixturePath = process.env.RENDERLAB_LIFECYCLE_FIXTURE_PATH || "/tmp/renderlab-create-lifecycle-fixture.json";
const cleanupOnly = process.argv.includes("--cleanup-only");
const fixtureAccount = configuredTestAccountIdentity("create-lifecycle");

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: supabaseKey,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: r2Bucket,
})) {
  if (!value) throw new Error(`${name} is required for configured Create lifecycle verification.`);
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
  if (!response.ok) throw new Error(`Supabase lifecycle query failed (${response.status}): ${await response.text()}`);
  return response.json();
}

async function loadAssets(ownerId, jobId) {
  return rows(`media_assets?owner_id=eq.${encodeURIComponent(ownerId)}&generation_job_id=eq.${encodeURIComponent(jobId)}&select=id,storage_key,thumbnail_storage_key,owner_id`);
}

async function cleanupJob(ownerId, jobId) {
  if (!jobId) return;

  const ownerFilter = encodeURIComponent(ownerId);
  const assets = await loadAssets(ownerId, jobId);
  const keys = new Set();
  for (const asset of assets) {
    if (asset.storage_key) keys.add(asset.storage_key);
    if (asset.thumbnail_storage_key) keys.add(asset.thumbnail_storage_key);
  }

  for (const key of keys) {
    await r2Client.send(new DeleteObjectCommand({ Bucket: r2Bucket, Key: key }));
  }

  const mediaDelete = await supabase(`media_assets?owner_id=eq.${ownerFilter}&generation_job_id=eq.${encodeURIComponent(jobId)}`, { method: "DELETE" });
  if (!mediaDelete.ok) throw new Error(`Could not remove lifecycle media fixture (${mediaDelete.status}).`);

  const jobDelete = await supabase(`generation_jobs?owner_id=eq.${ownerFilter}&id=eq.${encodeURIComponent(jobId)}`, { method: "DELETE" });
  if (!jobDelete.ok) throw new Error(`Could not remove lifecycle generation fixture (${jobDelete.status}).`);

  const remainingAssets = await loadAssets(ownerId, jobId);
  const remainingJobs = await rows(`generation_jobs?owner_id=eq.${ownerFilter}&id=eq.${encodeURIComponent(jobId)}&select=id`);
  if (remainingAssets.length || remainingJobs.length) {
    throw new Error(`Lifecycle cleanup was incomplete for owner=${ownerId} job=${jobId}.`);
  }

  console.log(`Cleaned configured Create lifecycle fixture owner=${ownerId} job=${jobId} objects=${keys.size}`);
}

async function readFixtureJobId() {
  try {
    const payload = JSON.parse(await readFile(fixturePath, "utf8"));
    return typeof payload?.jobId === "string" ? payload.jobId : null;
  } catch {
    return null;
  }
}

async function cleanupFixtureFile() {
  const jobId = await readFixtureJobId();
  if (jobId) {
    await cleanupJob(fixtureAccount.id, jobId);
    await rm(fixturePath, { force: true });
  }
  await deleteConfiguredTestAccount(fixtureAccount);
}

if (cleanupOnly) {
  await cleanupFixtureFile();
  process.exit(0);
}

await mkdir(artifactDir, { recursive: true });

const desktopViewport = { width: 1440, height: 1024 };
const mobileViewport = { width: 390, height: 844 };
let browser = null;
let jobId = null;
let primaryError = null;

try {
  await cleanupFixtureFile();
  const account = await createConfiguredTestAccount("create-lifecycle");
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: desktopViewport, colorScheme: "dark" });
  const page = await context.newPage();
  await routeLocalAppRequestsWithAccount(page, baseUrl, account);

  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60_000 });

  const prompt = page.getByRole("textbox", { name: "Prompt" });
  await prompt.waitFor({ state: "visible", timeout: 30_000 });
  await prompt.fill("A clean studio photograph of a matte cobalt-blue sphere centered on a warm gray background, soft even light, no text");

  const generate = page.getByRole("button", { name: "Generate", exact: true });
  assert(await generate.isEnabled(), "Configured Create did not enable Generate with a valid prompt for an authenticated account.");

  const submissionPromise = page.waitForResponse(
    (response) => {
      const url = new URL(response.url());
      return url.pathname === "/api/generation/jobs" && response.request().method() === "POST";
    },
    { timeout: 120_000 },
  );

  await generate.click();
  const submission = await submissionPromise;
  const submissionPayload = await submission.json().catch(() => null);
  assert(submission.status() === 202, `Create submission returned ${submission.status()}: ${JSON.stringify(submissionPayload)}`);
  assert(submissionPayload?.ok && submissionPayload.job?.id, `Create submission did not return a job: ${JSON.stringify(submissionPayload)}`);

  jobId = submissionPayload.job.id;
  await writeFile(fixturePath, JSON.stringify({ jobId }), "utf8");
  const jobRows = await rows(`generation_jobs?owner_id=eq.${encodeURIComponent(account.id)}&id=eq.${encodeURIComponent(jobId)}&select=id,owner_id&limit=1`);
  assert(jobRows[0]?.owner_id === account.id, "Create generation job was not owned by the authenticated fixture account.");
  console.log(`Configured Create lifecycle accepted. owner=${account.id} job=${jobId}`);

  const result = page.getByRole("article", { name: "Generated result" });
  try {
    await result.waitFor({ state: "visible", timeout: 12 * 60_000 });
  } catch {
    const alertText = await page.getByRole("alert").allTextContents().catch(() => []);
    const statusText = await page.getByRole("status").allTextContents().catch(() => []);
    throw new Error(
      `Configured Create did not reach a persisted result. alerts=${JSON.stringify(alertText)} statuses=${JSON.stringify(statusText)}`,
    );
  }

  const assets = await loadAssets(account.id, jobId);
  assert(assets.length > 0, "Configured Create did not persist a durable media asset.");
  assert(assets.every((asset) => asset.owner_id === account.id), "Persisted Create media did not inherit the generation account owner.");

  const resultImage = page.getByRole("img", { name: "Generated result" });
  await resultImage.waitFor({ state: "visible", timeout: 60_000 });
  await page.waitForFunction(
    () => {
      const image = document.querySelector('img[alt="Generated result"]');
      return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
    },
    undefined,
    { timeout: 60_000 },
  );

  const edit = page.getByRole("button", { name: "Edit", exact: true });
  const animate = page.getByRole("button", { name: "Animate", exact: true });
  assert(await edit.isVisible(), "Persisted image result did not expose the Edit continuation action.");
  assert(await animate.isVisible(), "Persisted image result did not expose the Animate continuation action.");

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${artifactDir}/create-lifecycle-desktop-result.png`, fullPage: true });

  await page.setViewportSize(mobileViewport);
  await page.waitForTimeout(250);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${artifactDir}/create-lifecycle-mobile-result.png`, fullPage: true });

  await edit.click();
  await page.getByRole("heading", { name: "Edit an image" }).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByText("Editing this image", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  const referencePreview = page.getByRole("img", { name: "Reference preview" });
  await referencePreview.waitFor({ state: "visible", timeout: 60_000 });
  await page.waitForFunction(
    () => {
      const image = document.querySelector('img[alt="Reference preview"]');
      return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
    },
    undefined,
    { timeout: 60_000 },
  );

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${artifactDir}/create-lifecycle-mobile-edit-continuation.png`, fullPage: true });

  await page.setViewportSize(desktopViewport);
  await page.waitForTimeout(250);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${artifactDir}/create-lifecycle-desktop-edit-continuation.png`, fullPage: true });

  console.log("Configured Create generation -> owned persisted result -> Edit continuation rendered successfully at desktop and mobile widths.");
} catch (error) {
  primaryError = error;
} finally {
  if (browser) await browser.close().catch(() => {});

  try {
    if (jobId) {
      await cleanupJob(fixtureAccount.id, jobId);
      await rm(fixturePath, { force: true });
    }
    await deleteConfiguredTestAccount(fixtureAccount);
  } catch (cleanupError) {
    console.error(cleanupError);
    if (!primaryError) primaryError = cleanupError;
  }
}

if (primaryError) throw primaryError;
