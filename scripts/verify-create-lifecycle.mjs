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
const secondaryReferenceBytes = Buffer.from(
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

async function assertCompactCreateControlRow(page, label) {
  const metrics = await page.locator("[data-create-primary-controls]").evaluate((row) => {
    const controls = [...row.querySelectorAll('[data-slot="button"], [data-slot="toggle-group"]')]
      .map((element) => element.getBoundingClientRect())
      .filter((rect) => rect.width > 4 && rect.height > 4);
    const tops = controls.map((rect) => rect.top);
    return {
      count: controls.length,
      topSpread: tops.length ? Math.max(...tops) - Math.min(...tops) : 0,
      overflow: row.scrollWidth - row.clientWidth,
    };
  });
  assert(metrics.count >= 5, `${label} did not expose the expected compact primary controls: ${JSON.stringify(metrics)}`);
  assert(metrics.topSpread <= 2, `${label} primary controls wrapped onto multiple rows: ${JSON.stringify(metrics)}`);
  assert(metrics.overflow <= 2, `${label} primary controls overflowed horizontally: ${JSON.stringify(metrics)}`);
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

  await page.goto(`${baseUrl}/create`, { waitUntil: "networkidle", timeout: 60_000 });

  const prompt = page.getByRole("textbox", { name: "Prompt" });
  await prompt.waitFor({ state: "visible", timeout: 30_000 });
  await prompt.fill("A clean studio photograph of a matte cobalt-blue sphere centered on a warm gray background, soft even light, no text");

  const generate = page.getByRole("button", { name: "Generate", exact: true });
  assert(await generate.isEnabled(), "Configured Create did not enable Generate with a valid prompt for an authenticated account.");

  const imageModel = page.getByRole("button", { name: "Image model FLUX.2 Klein", exact: true });
  assert((await imageModel.textContent())?.trim() === "FLUX", "Image model trigger did not use the compact FLUX label.");
  await imageModel.click();
  assert(
    (await page.getByRole("menuitemradio", { name: /FLUX\.2 Klein/ }).getAttribute("data-state")) === "checked",
    "FLUX was not the default Image model.",
  );
  await page.getByRole("menuitemradio", { name: /Qwen Image Edit/ }).click();
  const qwenModelButton = page.getByRole("button", { name: "Image model Qwen Image Edit", exact: true });
  await qwenModelButton.waitFor({ state: "visible" });
  assert((await qwenModelButton.textContent())?.trim() === "Qwen", "Image model trigger did not use the compact Qwen label.");
  await page.getByRole("button", { name: "Open Advanced controls" }).click();
  await page.getByText("Qwen uses its optimized fixed 4-step image tuning.", { exact: false }).waitFor({ state: "visible" });
  assert(await page.getByLabel("Steps").count() === 0, "Qwen incorrectly exposed configurable Steps.");
  assert(await page.getByLabel("Guidance").count() === 0, "Qwen incorrectly exposed configurable Guidance.");
  await page.screenshot({ path: `${artifactDir}/create-lifecycle-desktop-image-model-qwen.png`, fullPage: true });
  await page.getByRole("button", { name: "Close Advanced controls" }).click();

  let capturedQwenRequest = null;
  await page.route("**/api/generation/jobs", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    capturedQwenRequest = route.request().postDataJSON();
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ ok: false, error: { code: "invalid_request", message: "Intentional image-model serialization probe." } }),
    });
  }, { times: 1 });
  await generate.click();
  await page.waitForTimeout(250);
  assert(capturedQwenRequest?.model === "qwen-image-edit-2511", `Create did not serialize Qwen model intent: ${JSON.stringify(capturedQwenRequest)}`);
  assert(!("steps" in (capturedQwenRequest?.advanced || {})), "Qwen serialized FLUX-only Steps.");
  assert(!("guidance" in (capturedQwenRequest?.advanced || {})), "Qwen serialized FLUX-only Guidance.");
  await page.unroute("**/api/generation/jobs");
  await page.getByRole("button", { name: "Image model Qwen Image Edit", exact: true }).click();
  await page.getByRole("menuitemradio", { name: /FLUX\.2 Klein/ }).click();

  const videoMode = page.getByRole("radio", { name: "Video", exact: true });
  await videoMode.click();
  const videoSettings = page.getByRole("button", { name: /^Video settings\./ });
  assert(
    (await videoSettings.getAttribute("aria-label")) === "Video settings. Resolution 480p. Duration 5 seconds. Audio on",
    `Video settings did not initialize to the Phase 7D defaults: ${await videoSettings.getAttribute("aria-label")}`,
  );
  await videoSettings.click();
  const defaultResolution = page.getByRole("menuitemradio", { name: "480p", exact: true });
  assert((await defaultResolution.getAttribute("data-state")) === "checked", "480p was not the selected Video resolution default.");
  assert(await page.getByRole("menuitemradio", { name: "2K", exact: true }).isVisible(), "2K resolution is not reachable in Video settings.");
  assert(await page.getByRole("menuitemradio", { name: "4K", exact: true }).count() === 0, "Disabled 4K leaked into Video settings.");
  assert(await page.getByRole("menuitem", { name: /Advanced controls/ }).count() === 0, "Advanced controls are still nested inside Video settings.");
  await page.screenshot({ path: `${artifactDir}/create-lifecycle-desktop-video-settings.png`, fullPage: true });
  await page.getByRole("menuitemradio", { name: "1080p", exact: true }).click();
  assert((await videoSettings.textContent())?.includes("1080p · 5 s"), "Video settings trigger did not summarize resolution and duration.");

  const videoAdvancedButton = page.getByRole("button", { name: "Open Advanced controls", exact: true });
  await videoAdvancedButton.waitFor({ state: "visible", timeout: 10_000 });
  await videoAdvancedButton.click();
  await page.getByLabel("Frame rate").waitFor({ state: "visible", timeout: 10_000 });
  assert(await page.getByLabel("Steps").count() === 0, "Inactive Video Steps control is still rendered.");
  assert(await page.getByLabel("Guidance").count() === 0, "Inactive Video Guidance control is still rendered.");
  await page.screenshot({ path: `${artifactDir}/create-lifecycle-desktop-video-advanced.png`, fullPage: true });
  await page.getByRole("button", { name: "Close Advanced controls", exact: true }).click();

  await page.setViewportSize(mobileViewport);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("radio", { name: "Image", exact: true }).click();
  const mobileImageModel = page.getByRole("button", { name: "Image model FLUX.2 Klein", exact: true });
  await mobileImageModel.waitFor({ state: "visible" });
  await assertCompactCreateControlRow(page, "Mobile Image");
  await page.screenshot({ path: `${artifactDir}/create-lifecycle-mobile-image-controls.png`, fullPage: true });
  await mobileImageModel.click();
  await page.getByText("Image model", { exact: true }).waitFor({ state: "visible" });
  await page.screenshot({ path: `${artifactDir}/create-lifecycle-mobile-image-model.png`, fullPage: true });
  await page.keyboard.press("Escape");
  await page.getByRole("radio", { name: "Video", exact: true }).click();
  const reducedModeControl = page.locator('[data-create-motion="mode-control"]');
  await page.waitForFunction(
    () => document.querySelectorAll('[data-create-motion="mode-control"]').length === 1,
    undefined,
    { timeout: 10_000 },
  );
  await reducedModeControl.waitFor({ state: "visible", timeout: 10_000 });
  const reducedModeTransform = await reducedModeControl.evaluate((element) => getComputedStyle(element).transform);
  assert(reducedModeTransform === "none", `Reduced-motion mode transition still applied a transform: ${reducedModeTransform}`);
  await assertCompactCreateControlRow(page, "Mobile Video");
  await page.screenshot({ path: `${artifactDir}/create-lifecycle-mobile-video-controls-reduced.png`, fullPage: true });
  await videoSettings.click();
  await page.getByText("Resolution", { exact: true }).waitFor({ state: "visible", timeout: 10_000 });
  await page.screenshot({ path: `${artifactDir}/create-lifecycle-mobile-video-settings-reduced.png`, fullPage: true });
  await page.keyboard.press("Escape");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize(desktopViewport);

  let capturedVideoRequest = null;
  await page.route("**/api/generation/jobs", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    capturedVideoRequest = route.request().postDataJSON();
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ ok: false, error: { code: "invalid_request", message: "Intentional Phase 7D browser serialization probe." } }),
    });
  }, { times: 1 });
  await generate.click();
  await page.waitForTimeout(250);
  assert(capturedVideoRequest?.output?.resolution === "1080p", `Create did not serialize the selected Video resolution: ${JSON.stringify(capturedVideoRequest)}`);
  assert(capturedVideoRequest?.advanced?.frameRate === 24, "Create did not serialize the Video frame rate.");
  assert(!("steps" in (capturedVideoRequest?.advanced || {})), "Create still serialized inactive Video Steps.");
  assert(!("guidance" in (capturedVideoRequest?.advanced || {})), "Create still serialized inactive Video Guidance.");
  await page.unroute("**/api/generation/jobs");

  await page.getByRole("radio", { name: "Image", exact: true }).click();
  const closeAdvanced = page.getByRole("button", { name: "Close Advanced controls" });
  if (await closeAdvanced.isVisible()) await closeAdvanced.click();
  assert(await page.getByLabel("Steps").count() === 0, "Closed Image Advanced controls unexpectedly remained visible.");
  assert(await generate.isEnabled(), "Configured Create did not restore Image Generate after the Video serialization probe.");

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

  const addReference = page.getByRole("button", { name: "Add reference", exact: true });
  assert(await addReference.isEnabled(), "Edit continuation did not allow a second Image reference.");

  const secondTicketPromise = page.waitForResponse(
    (response) => response.url().endsWith("/api/media/uploads/upload-tickets") && response.request().method() === "POST",
    { timeout: 30_000 },
  );
  const secondCompletionPromise = page.waitForResponse(
    (response) => response.url().endsWith("/api/media/uploads/upload-completions") && response.request().method() === "POST",
    { timeout: 60_000 },
  );
  const secondChooserPromise = page.waitForEvent("filechooser", { timeout: 30_000 });
  await addReference.click();
  const secondChooser = await secondChooserPromise;
  await secondChooser.setFiles({
    name: "phase-7b-secondary-reference.png",
    mimeType: "image/png",
    buffer: secondaryReferenceBytes,
  });
  await secondTicketPromise;
  const secondCompletion = await secondCompletionPromise;
  const secondCompletionPayload = await secondCompletion.json().catch(() => null);
  assert(secondCompletion.ok() && secondCompletionPayload?.ok && secondCompletionPayload.asset?.id, `Second Create reference upload failed: ${JSON.stringify(secondCompletionPayload)}`);
  const originalSecondaryAssetId = secondCompletionPayload.asset.id;

  const image1Mention = page.getByRole("button", { name: "Mention @image1" });
  const image2Mention = page.getByRole("button", { name: "Mention @image2" });
  await image2Mention.waitFor({ state: "visible", timeout: 30_000 });
  await page.getByText("Primary image", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByText("Reference image", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  assert(!(await addReference.isEnabled()), "Add reference remained enabled after reaching the two-image product maximum.");

  await page.waitForFunction(
    () => {
      const images = Array.from(document.querySelectorAll('img[alt^="Reference @"]'));
      return images.length === 2 && images.every((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0);
    },
    undefined,
    { timeout: 60_000 },
  );

  await page.setViewportSize(desktopViewport);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${artifactDir}/create-lifecycle-desktop-multi-reference.png`, fullPage: true });

  await image1Mention.click();
  const image1MenuItem = page.getByRole("menuitem", { name: /@image1/ });
  const image2MenuItem = page.getByRole("menuitem", { name: /@image2/ });
  await image1MenuItem.waitFor({ state: "visible", timeout: 30_000 });
  await image2MenuItem.waitFor({ state: "visible", timeout: 30_000 });
  assert(await image1MenuItem.locator("img").count() === 1, "Multi-reference picker did not render @image1 thumbnail.");
  assert(await image2MenuItem.locator("img").count() === 1, "Multi-reference picker did not render @image2 thumbnail.");
  await page.screenshot({ path: `${artifactDir}/create-lifecycle-desktop-multi-reference-picker.png`, fullPage: true });
  await image1MenuItem.click();
  assert((await prompt.inputValue()).includes("@image1"), "Multi-reference picker did not insert @image1.");

  await image2Mention.click();
  await page.getByRole("menuitem", { name: /@image2/ }).click();
  assert((await prompt.inputValue()).includes("@image2"), "Multi-reference picker did not insert @image2.");

  const replacementCompletionPromise = page.waitForResponse(
    (response) => response.url().endsWith("/api/media/uploads/upload-completions") && response.request().method() === "POST",
    { timeout: 60_000 },
  );
  const replacementChooserPromise = page.waitForEvent("filechooser", { timeout: 30_000 });
  await page.getByRole("button", { name: "Reference actions for @image2" }).click();
  await page.getByRole("menuitem", { name: "Replace image", exact: true }).click();
  const replacementChooser = await replacementChooserPromise;
  await replacementChooser.setFiles({
    name: "phase-7b-secondary-replacement.png",
    mimeType: "image/png",
    buffer: secondaryReferenceBytes,
  });
  const replacementCompletion = await replacementCompletionPromise;
  const replacementPayload = await replacementCompletion.json().catch(() => null);
  assert(replacementCompletion.ok() && replacementPayload?.ok && replacementPayload.asset?.id, `Second-reference replacement failed: ${JSON.stringify(replacementPayload)}`);
  const replacementSecondaryAssetId = replacementPayload.asset.id;
  assert(replacementSecondaryAssetId !== originalSecondaryAssetId, "Reference replacement did not produce a new durable media identity.");
  await page.getByRole("button", { name: "Mention @image2" }).waitFor({ state: "visible", timeout: 30_000 });

  await page.setViewportSize(mobileViewport);
  await page.waitForTimeout(250);
  const mobileReferenceActions = page.getByRole("button", { name: "Reference actions for @image2" });
  const mobileActionsBox = await mobileReferenceActions.boundingBox();
  assert(mobileActionsBox && mobileActionsBox.x >= 0 && mobileActionsBox.x + mobileActionsBox.width <= mobileViewport.width, "Two-reference actions overflowed the mobile viewport.");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${artifactDir}/create-lifecycle-mobile-multi-reference.png`, fullPage: true });

  await page.setViewportSize(desktopViewport);
  await page.waitForTimeout(250);
  const movingReference = page.locator('[data-reference-alias="image2"]');
  const beforeReorder = await movingReference.boundingBox();
  assert(beforeReorder, "Could not measure @image2 before reference reorder.");
  await page.getByRole("button", { name: "Reference actions for @image2" }).click();
  await page.getByRole("menuitem", { name: "Make primary", exact: true }).click();
  await page.waitForFunction(
    () => {
      const element = document.querySelector('[data-reference-alias="image2"]');
      return element && getComputedStyle(element).transform !== "none";
    },
    undefined,
    { timeout: 2_000 },
  );
  await page.waitForFunction(
    () => {
      const element = document.querySelector('[data-reference-alias="image2"]');
      return element && getComputedStyle(element).transform === "none";
    },
    undefined,
    { timeout: 3_000 },
  );
  const afterReorder = await movingReference.boundingBox();
  assert(afterReorder && afterReorder.y < beforeReorder.y, "@image2 did not visibly move into the primary reference slot.");
  await page.screenshot({ path: `${artifactDir}/create-lifecycle-desktop-reference-reordered.png`, fullPage: true });

  const primaryRow = page.getByText("Primary image", { exact: true }).locator("..").locator("..");
  const secondaryRow = page.getByText("Reference image", { exact: true }).locator("..").locator("..");
  assert(await primaryRow.getByRole("button", { name: "Mention @image2" }).count() === 1, "Make primary changed @image2 identity instead of moving its slot.");
  assert(await secondaryRow.getByRole("button", { name: "Mention @image1" }).count() === 1, "Make primary changed @image1 identity instead of moving its slot.");

  await prompt.fill("Place @image1 on the left and @image2 on the right");
  let reorderedBody = null;
  await page.route("**/api/generation/jobs", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    reorderedBody = route.request().postDataJSON();
    return route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ ok: false, error: { code: "verification_stop", message: "Verification intentionally stops before a second model generation." } }),
    });
  });
  const generateAfterReorder = page.getByRole("button", { name: "Generate", exact: true });
  assert(await generateAfterReorder.isEnabled(), "Generate was not enabled for a valid two-reference request.");
  await generateAfterReorder.click();
  await page.waitForTimeout(250);
  assert(reorderedBody?.inputs?.length === 2, `Two-reference Create request had the wrong input count: ${JSON.stringify(reorderedBody)}`);
  assert(reorderedBody.inputs[0]?.alias === "image2" && reorderedBody.inputs[0]?.role === "primary-image", `Primary reordered slot was not stable @image2: ${JSON.stringify(reorderedBody.inputs)}`);
  assert(reorderedBody.inputs[0]?.source?.type === "media-asset" && reorderedBody.inputs[0]?.source?.id === replacementSecondaryAssetId, "Primary reordered slot did not use the replaced durable @image2 asset.");
  assert(reorderedBody.inputs[1]?.alias === "image1" && reorderedBody.inputs[1]?.role === "reference", `Secondary reordered slot was not stable @image1: ${JSON.stringify(reorderedBody.inputs)}`);
  assert(reorderedBody.inputs[1]?.source?.type === "media-asset" && reorderedBody.inputs[1]?.source?.id === assets[0].id, "Secondary reordered slot did not preserve the original durable @image1 asset.");
  await page.unroute("**/api/generation/jobs");

  await page.getByRole("radio", { name: "Video", exact: true }).click();
  assert(await page.getByRole("radio", { name: "Image", exact: true }).isChecked(), "Two-reference Image request silently switched to Video.");
  assert(!(await page.getByRole("radio", { name: "Video", exact: true }).isChecked()), "Video became selected while two references were still attached.");
  await page.getByText(/Remove one reference before switching to Video/).waitFor({ state: "visible", timeout: 30_000 });

  await page.getByRole("button", { name: "Remove @image1" }).click();
  assert(!(await generateAfterReorder.isEnabled()), "Generate remained enabled after a referenced @image1 attachment was removed.");
  await page.getByText(/@image1 no longer has an attached image/).waitFor({ state: "visible", timeout: 30_000 });
  await prompt.fill((await prompt.inputValue()).replace("@image1", "").replace(/\s+/g, " ").trim());
  assert(await generateAfterReorder.isEnabled(), "Generate did not recover after the unresolved @image1 mention was removed.");

  await page.getByRole("radio", { name: "Video", exact: true }).click();
  await page.getByRole("heading", { name: "Animate an image" }).waitFor({ state: "visible", timeout: 30_000 });
  assert(await page.getByRole("radio", { name: "Video", exact: true }).isChecked(), "Video did not become available after returning to one reference.");
  assert(await page.getByRole("button", { name: "Mention @image2" }).isVisible(), "Remaining @image2 identity was lost when switching to Video.");

  console.log("Configured Create generation -> durable two-reference attach/replace -> stable alias mention -> Make primary reorder -> Video limit/unresolved guard verified successfully.");
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
