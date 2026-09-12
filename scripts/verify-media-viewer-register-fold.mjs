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
const artifactDir = process.env.RENDERLAB_PHASE25_ARTIFACT_DIR || "artifacts";
const cleanupOnly = process.argv.includes("--cleanup-only");
const identity = configuredTestAccountIdentity("phase25-viewer-register-fold");

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: supabaseKey,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  R2_ACCOUNT_ID: r2AccountId,
  R2_ACCESS_KEY_ID: r2AccessKeyId,
  R2_SECRET_ACCESS_KEY: r2SecretAccessKey,
  R2_BUCKET_NAME: r2Bucket,
})) {
  if (!value) throw new Error(`${name} is required for Phase 25 Media Viewer verification.`);
}

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: r2AccessKeyId, secretAccessKey: r2SecretAccessKey },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

const mp4Bytes = Buffer.from("AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAPhbW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAABI8AAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAwx0cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAABI8AAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAEAAAABAAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAASPAAAIAAABAAAAAAKEbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAAAwAAAAOABVxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAACL21pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAe9zdGJsAAAAv3N0c2QAAAAAAAAAAQAAAK9hdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAEAAQABIAAAASAAAAAAAAAABFUxhdmM2MS4xOS4xMDEgbGlieDI2NAAAAAAAAAAAAAAAGP//AAAANWF2Y0MBZAAK/+EAGGdkAAqs2UQmwEQAAAMABAAAAwBgPEiWWAEABmjr48siwP34+AAAAAAQcGFzcAAAAAEAAAABAAAAFGJ0cnQAAAAAAAAYUgAAAAAAAAAYc3R0cwAAAAAAAAABAAAADgAABAAAAAAUc3RzcwAAAAAAAAABAAAAAQAAAIBjdHRzAAAAAAAAAA4AAAABAAAIAAAAAAEAABQAAAAAAQAACAAAAAABAAAAAAAAAAEAAAQAAAAAAQAAFAAAAAABAAAIAAAAAAEAAAAAAAAAAQAABAAAAAABAAAUAAAAAAEAAAgAAAAAAQAAAAAAAAABAAAEAAAAAAEAAAgAAAAAHHN0c2MAAAAAAAAAAQAAAAEAAAAOAAAAAQAAAExzdHN6AAAAAAAAAAAAAAAOAAAC3gAAAAwAAAAMAAAADAAAAAwAAAARAAAADQAAAAwAAAAMAAAAEQAAAA0AAAAMAAAADAAAABIAAAAUc3RjbwAAAAAAAAABAAAEEQAAAGF1ZHRhAAAAWW1ldGEAAAAAAAAAIWhkbHIAAAAAAAAAAG1kaXJhcHBsAAAAAAAAAAAAAAAALGlsc3QAAAAkqXRvbwAAABxkYXRhAAAAAQAAAABMYXZmNjEuNy4xMDMAAAAIZnJlZQAAA5RtZGF0AAACrgYF//+q3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE2NCByMzEwOCAzMWUxOWY5IC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAyMyAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTMgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MzoweDExMyBtZT1oZXggc3VibWU9NyBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0xIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MSA4eDhkY3Q9MSBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0tMiB0aHJlYWRzPTIgbG9va2FoZWFkX3RocmVhZHM9MSBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0zIGJfcHlyYW1pZD0yIGJfYWRhcHQ9MSBiX2JpYXM9MCBkaXJlY3Q9MSB3ZWlnaHRiPTEgb3Blbl9nb3A9MCB3ZWlnaHRwPTIga2V5aW50PTI1MCBrZXlpbnRfbWluPTEyIHNjZW5lY3V0PTQwIGludHJhX3JlZnJlc2g9MCByY19sb29rYWhlYWQ9NDAgcmM9Y3JmIG1idHJlZT0xIGNyZj0yMy4wIHFjb21wPTAuNjAgcXBtaW49MCBxcG1heD02OSBxcHN0ZXA9NCBpcF9yYXRpbz0xLjQwIGFxPTE6MS4wMACAAAAAKGWIhACfjt1/8JO6eprV6bjpxVhWo1Xvo+ZSeYM8v9enH8pAzF5OggUAAAAIQZokbE3/AdUAAAAIQZ5CeI7/UkEAAAAIAZ5hdEJfYMAAAAAIAZ5jakJfYMEAAAANQZpoSahBaJlMCI8CxwAAAAlBnoZFESx3UkEAAAAIAZ6ldEJfYMEAAAAIAZ6nakJfYMAAAAANQZqsSahBbJlMCO8ICAAAAAlBnspFFSx3UkEAAAAIAZ7pdEJfYMAAAAAIAZ7rakJfYMAAAAAOQZrtSahBbJlMCEv/Dkk=", "base64");
const sourceSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1b1d28"/><stop offset="1" stop-color="#52556b"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.28" cy="0.34" r="0.7">
      <stop offset="0" stop-color="#d7d2ff" stop-opacity="0.94"/><stop offset="1" stop-color="#776bd4" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#bg)"/>
  <rect width="1200" height="800" fill="url(#glow)"/>
  <circle cx="310" cy="310" r="180" fill="#eeeaff" fill-opacity="0.88"/>
  <rect x="620" y="160" width="330" height="480" rx="56" fill="#11131c" fill-opacity="0.68"/>
  <path d="M700 560 L865 245 L1015 560 Z" fill="#9a8cff" fill-opacity="0.7"/>
</svg>`;
const resultSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#11131d"/><stop offset="0.56" stop-color="#332c49"/><stop offset="1" stop-color="#7764a8"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.64" cy="0.34" r="0.55">
      <stop offset="0" stop-color="#f1e8ff" stop-opacity="0.9"/><stop offset="1" stop-color="#f1e8ff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#bg)"/>
  <rect width="1200" height="800" fill="url(#glow)"/>
  <path d="M215 640 C360 350 445 220 600 145 C760 205 855 360 975 640 Z" fill="#d9c8ff" fill-opacity="0.3"/>
  <rect x="430" y="165" width="340" height="470" rx="72" fill="#ece6ff" fill-opacity="0.82"/>
  <circle cx="600" cy="330" r="116" fill="#5d4e85" fill-opacity="0.78"/>
  <path d="M510 520 L600 390 L690 520 Z" fill="#171723" fill-opacity="0.86"/>
</svg>`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function serviceRest(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", supabaseKey);
  headers.set("authorization", `Bearer ${supabaseKey}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers });
}

async function putObject(key, body, contentType) {
  await r2Client.send(new PutObjectCommand({
    Bucket: r2Bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
}

async function createAsset(account, {
  displayName,
  kind,
  mimeType,
  body,
  width,
  height,
  durationMs = null,
  origin = "uploaded",
  generationJobId = null,
  generationOutputIndex = null,
  prompt = null,
  operation = null,
  originalFilename = null,
}) {
  const id = randomUUID();
  const extension = kind === "video" ? "mp4" : "svg";
  const storageKey = `renderlab/phase25-viewer/${account.id}/${id}.${extension}`;
  await putObject(storageKey, body, mimeType);
  const now = new Date().toISOString();
  const response = await serviceRest("media_assets", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      id,
      owner_id: account.id,
      generation_job_id: generationJobId,
      generation_output_index: generationOutputIndex,
      origin,
      kind,
      mime_type: mimeType,
      storage_key: storageKey,
      thumbnail_storage_key: null,
      original_filename: originalFilename,
      display_name: displayName,
      size_bytes: Buffer.byteLength(body),
      width,
      height,
      duration_ms: durationMs,
      provenance: {
        ...(prompt ? { prompt } : {}),
        ...(operation ? { operation } : {}),
        model: "RenderLab Phase 25 evidence",
      },
      metadata: { verification: "phase25-viewer-register-fold" },
      created_at: now,
      updated_at: now,
    }),
  });
  if (!response.ok) throw new Error(`Could not create Phase 25 asset (${response.status}): ${await response.text()}`);
  return (await response.json())[0];
}

async function createEditJob(account, sourceId, resultId, prompt) {
  const id = randomUUID();
  const now = new Date().toISOString();
  const response = await serviceRest("generation_jobs", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      id,
      owner_id: account.id,
      status: "succeeded",
      operation: "edit-image",
      output_kind: "image",
      prompt,
      workflow_id: "phase25-viewer-evidence",
      model: "phase25-viewer-evidence",
      ecosystem: "phase25-viewer-evidence",
      inputs: [{ alias: "image1", role: "primary-image", source: { type: "media-asset", id: sourceId } }],
      parameters: { output: { kind: "image", aspectRatio: "original" }, advanced: { seed: 76025, steps: 8, guidance: 2 } },
      worker_id: null,
      provider_job_id: null,
      worker_state: null,
      failover_history: [],
      output_asset_ids: [resultId],
      error_code: null,
      error_message: null,
      created_at: now,
      updated_at: now,
      started_at: now,
      completed_at: now,
    }),
  });
  if (!response.ok) throw new Error(`Could not create Phase 25 generation job (${response.status}): ${await response.text()}`);
  return (await response.json())[0];
}

async function patchAssetJob(assetId, jobId) {
  const response = await serviceRest(`media_assets?id=eq.${encodeURIComponent(assetId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ generation_job_id: jobId, generation_output_index: 0 }),
  });
  if (!response.ok) throw new Error(`Could not attach Phase 25 result to job (${response.status}): ${await response.text()}`);
}

async function noOverflow(page, label) {
  const ok = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  assert(ok, `${label} introduced body horizontal overflow.`);
}

async function shot(page, name) {
  await noOverflow(page, name);
  await page.screenshot({ path: `${artifactDir}/${name}.png`, fullPage: true });
}

async function closeRegisterPanel(page, label) {
  const button = page.getByRole("button", { name: label, exact: true });
  if ((await button.getAttribute("aria-expanded")) === "true") await button.click();
}

async function ensureComparisonClosed(page) {
  const close = page.getByRole("button", { name: "Close comparison", exact: true });
  if (await close.count()) {
    await close.click();
    await page.getByRole("button", { name: "Compare source", exact: true }).waitFor({ state: "visible" });
    const source = page.getByRole("link", { name: "Open source", exact: true });
    if (await source.count()) await source.waitFor({ state: "detached", timeout: 2_000 }).catch(() => {});
  }
  await wait(420);
}

async function captureCompareAt(page, delayMs, suffix) {
  await ensureComparisonClosed(page);
  const compare = page.getByRole("button", { name: "Compare source", exact: true });
  await compare.click();
  if (delayMs) await wait(delayMs);
  await shot(page, `phase25-viewer-compare-${suffix}-desktop`);
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
  const account = await createConfiguredTestAccount("phase25-viewer-register-fold");
  const source = await createAsset(account, {
    displayName: "Aurora study source",
    kind: "image",
    mimeType: "image/svg+xml",
    body: Buffer.from(sourceSvg),
    width: 1200,
    height: 800,
    originalFilename: "aurora-study-source.svg",
  });
  const prompt = "Reframe the aurora study as a quiet violet monolith with a luminous core.";
  const result = await createAsset(account, {
    displayName: "Aurora study — resolved",
    kind: "image",
    mimeType: "image/svg+xml",
    body: Buffer.from(resultSvg),
    width: 1200,
    height: 800,
    origin: "generated",
    prompt,
    operation: "edit-image",
  });
  const job = await createEditJob(account, source.id, result.id, prompt);
  await patchAssetJob(result.id, job.id);
  const video = await createAsset(account, {
    displayName: "Phase 25 motion study",
    kind: "video",
    mimeType: "video/mp4",
    body: mp4Bytes,
    width: 64,
    height: 64,
    durationMs: 1000,
    originalFilename: "phase25-motion-study.mp4",
  });

  browser = await chromium.launch({ headless: true });
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: "dark" });
  const page = await desktop.newPage();
  await routeLocalAppRequestsWithAccount(page, baseUrl, account);

  await page.goto(`${baseUrl}/library/${result.id}`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByRole("heading", { name: "Aurora study — resolved", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByText("CONTINUE FROM MEDIA", { exact: true }).waitFor({ state: "visible" });
  assert((await page.getByText("Actions", { exact: true }).count()) === 0, "Viewer restored a generic Actions section.");
  assert((await page.locator("aside").count()) === 0, "Viewer restored a permanent sidebar/aside.");
  await shot(page, "phase25-viewer-image-default-desktop");

  const frame = page.locator("#media-viewer-comparison figure").first();
  const finePointer = await page.evaluate(() => matchMedia("(hover: hover) and (pointer: fine)").matches);
  if (finePointer) {
    const box = await frame.boundingBox();
    assert(box, "Could not measure Viewer media frame for pointer depth.");
    await page.mouse.move(box.x + box.width * 0.82, box.y + box.height * 0.22);
    await wait(60);
    const depth = await frame.evaluate((element) => [
      element.style.getPropertyValue("--viewer-rx"),
      element.style.getPropertyValue("--viewer-ry"),
    ]);
    assert(depth.some((value) => value && !value.startsWith("0.00")), `Fine-pointer Viewer depth did not respond: ${JSON.stringify(depth)}`);
    await page.mouse.move(20, 20);
    await wait(60);
    const reset = await frame.evaluate((element) => [
      element.style.getPropertyValue("--viewer-rx"),
      element.style.getPropertyValue("--viewer-ry"),
    ]);
    assert(reset.every((value) => value === ""), "Fine-pointer Viewer depth did not clear on pointer leave.");
  } else {
    console.log("Desktop environment did not report fine-pointer hover; bounded pointer-depth assertion skipped.");
  }

  const promptButton = page.getByRole("button", { name: "Prompt", exact: true });
  await promptButton.click();
  await page.getByRole("heading", { name: "PROMPT", exact: true }).waitFor({ state: "visible" });
  await page.getByText(prompt, { exact: true }).waitFor({ state: "visible" });
  await shot(page, "phase25-viewer-prompt-desktop");
  await closeRegisterPanel(page, "Prompt");

  const detailsButton = page.getByRole("button", { name: "Details", exact: true });
  await detailsButton.click();
  await page.getByRole("heading", { name: "DETAILS", exact: true }).waitFor({ state: "visible" });
  await page.getByText("1200 × 800", { exact: true }).waitFor({ state: "visible" });
  await shot(page, "phase25-viewer-details-desktop");
  await closeRegisterPanel(page, "Details");

  const manageButton = page.getByRole("button", { name: "Manage", exact: true });
  await manageButton.click();
  await page.getByRole("heading", { name: "MANAGE", exact: true }).waitFor({ state: "visible" });
  await page.getByRole("button", { name: /Collections/ }).waitFor({ state: "visible" });
  await page.getByRole("button", { name: "Rename", exact: true }).waitFor({ state: "visible" });
  await page.getByRole("button", { name: "Delete", exact: true }).waitFor({ state: "visible" });
  await shot(page, "phase25-viewer-manage-desktop");
  await closeRegisterPanel(page, "Manage");

  const compareButton = page.getByRole("button", { name: "Compare source", exact: true });
  await compareButton.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Close comparison", exact: true }).waitFor({ state: "visible" });
  const sourceLink = page.getByRole("link", { name: "Open source", exact: true });
  await sourceLink.waitFor({ state: "visible" });
  assert((await sourceLink.getAttribute("href")) === `/library/${source.id}`, "Source Fold did not link to the ordinary source Viewer.");
  await ensureComparisonClosed(page);

  await captureCompareAt(page, 0, "t000");
  await captureCompareAt(page, 60, "t060");
  await captureCompareAt(page, 180, "t180");
  await captureCompareAt(page, 360, "t360");

  await ensureComparisonClosed(page);
  await compareButton.click();
  await wait(180);
  await page.getByRole("button", { name: "Close comparison", exact: true }).click();
  await wait(90);
  await shot(page, "phase25-viewer-compare-reversal-090-desktop");
  await page.getByRole("button", { name: "Compare source", exact: true }).waitFor({ state: "visible" });
  if (await sourceLink.count()) await sourceLink.waitFor({ state: "detached", timeout: 2_000 }).catch(() => {});
  assert((await sourceLink.count()) === 0, "Source Fold did not fully close after reversal.");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await compareButton.click();
  await sourceLink.waitFor({ state: "visible" });
  await wait(30);
  const runningReducedAnimations = await page.locator("#media-viewer-comparison").evaluate((element) =>
    element.getAnimations({ subtree: true }).filter((animation) => {
      const duration = Number(animation.effect?.getTiming().duration || 0);
      return animation.playState === "running" && duration > 0;
    }).length,
  );
  assert(runningReducedAnimations === 0, `Reduced-motion Source Fold left ${runningReducedAnimations} running animations.`);
  await shot(page, "phase25-viewer-compare-reduced-motion-desktop");
  await page.getByRole("button", { name: "Close comparison", exact: true }).click();
  await page.emulateMedia({ reducedMotion: "no-preference" });

  await page.goto(`${baseUrl}/library/${video.id}`, { waitUntil: "networkidle", timeout: 60_000 });
  const videoElement = page.locator("video");
  await videoElement.waitFor({ state: "visible", timeout: 30_000 });
  const videoTruth = await videoElement.evaluate((element) => ({ controls: element.controls, playsInline: element.playsInline }));
  assert(videoTruth.controls === true, "Viewer video lost native browser controls.");
  assert(videoTruth.playsInline === true, "Viewer video lost playsInline behavior.");
  await shot(page, "phase25-viewer-video-default-desktop");
  await desktop.close();

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: "dark",
    hasTouch: true,
    isMobile: true,
  });
  const narrow = await mobile.newPage();
  await routeLocalAppRequestsWithAccount(narrow, baseUrl, account);
  await narrow.goto(`${baseUrl}/library/${result.id}`, { waitUntil: "networkidle", timeout: 60_000 });
  await narrow.getByRole("heading", { name: "Aurora study — resolved", exact: true }).waitFor({ state: "visible" });

  const favorite = narrow.getByRole("button", { name: "Favorite", exact: true });
  const download = narrow.getByRole("link", { name: "Download", exact: true });
  for (const [label, locator] of [["Favorite", favorite], ["Download", download]]) {
    const box = await locator.boundingBox();
    assert(box && box.width >= 43.5 && box.height >= 43.5, `${label} quick action missed the 44×44 target: ${JSON.stringify(box)}`);
  }
  await shot(narrow, "phase25-viewer-image-default-narrow");

  const touchFrame = narrow.locator("#media-viewer-comparison figure").first();
  const touchBox = await touchFrame.boundingBox();
  assert(touchBox, "Could not measure touch Viewer media frame.");
  await touchFrame.dispatchEvent("pointermove", {
    pointerType: "touch",
    clientX: touchBox.x + touchBox.width * 0.8,
    clientY: touchBox.y + touchBox.height * 0.2,
  });
  const touchDepth = await touchFrame.evaluate((element) => [
    element.style.getPropertyValue("--viewer-rx"),
    element.style.getPropertyValue("--viewer-ry"),
  ]);
  assert(touchDepth.every((value) => value === ""), "Touch Viewer incorrectly applied pointer-depth transforms.");

  await narrow.getByRole("button", { name: "Details", exact: true }).click();
  await narrow.getByRole("heading", { name: "DETAILS", exact: true }).waitFor({ state: "visible" });
  await shot(narrow, "phase25-viewer-details-narrow");
  await closeRegisterPanel(narrow, "Details");

  await narrow.getByRole("button", { name: "Manage", exact: true }).click();
  await narrow.getByRole("heading", { name: "MANAGE", exact: true }).waitFor({ state: "visible" });
  await shot(narrow, "phase25-viewer-manage-narrow");
  await closeRegisterPanel(narrow, "Manage");

  const narrowCompare = narrow.getByRole("button", { name: "Compare source", exact: true });
  await narrowCompare.click();
  await narrow.getByRole("link", { name: "Open source", exact: true }).waitFor({ state: "visible" });
  const figures = narrow.locator("#media-viewer-comparison figure");
  assert(await figures.count() === 2, "Narrow Source Fold did not render exactly Result + Source.");
  const resultBox = await figures.nth(0).boundingBox();
  const sourceBox = await figures.nth(1).boundingBox();
  assert(resultBox && sourceBox && sourceBox.y >= resultBox.y, `Narrow Source Fold did not keep Result before Source: result=${JSON.stringify(resultBox)} source=${JSON.stringify(sourceBox)}`);
  await shot(narrow, "phase25-viewer-compare-narrow");

  await mobile.close();
  console.log("Phase 25 Media Viewer evidence passed: attached register, singular quick/manage actions, prompt/details disclosures, keyboard Source Fold, temporal/reversal/reduced-motion comparison, responsive narrow stacking, 44×44 quick actions, touch-static media, native video controls and no horizontal overflow.");
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
