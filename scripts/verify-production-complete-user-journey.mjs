import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
import {
  configuredTestAccountIdentity,
  createConfiguredTestAccount,
  deleteConfiguredTestAccount,
  routeLocalAppRequestsWithAccount,
} from "./lib/configured-test-account.mjs";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "https://renderlab.faresuniform.uk").replace(/\/$/, "");
const artifactDir = process.env.RENDERLAB_COMPLETE_JOURNEY_ARTIFACT_DIR || "artifacts/production-complete-user-journey";
const cleanupOnly = process.argv.includes("--cleanup-only");
const namespace = "production-complete-user-journey";
const desktop = { width: 1440, height: 1024 };
const mobile = { width: 390, height: 844 };

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function screenshot(page, label) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${artifactDir}/${label}.png`, fullPage: true });
}

async function assertNoOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 2, `${label} overflowed horizontally by ${overflow}px.`);
}

async function waitForViewerMedia(page, kind) {
  if (kind === "video") {
    const video = page.locator("video").first();
    await video.waitFor({ state: "visible", timeout: 60_000 });
    await page.waitForFunction(() => {
      const element = document.querySelector("video");
      return element instanceof HTMLVideoElement && element.readyState >= 1 && Number.isFinite(element.duration) && element.duration > 0;
    }, undefined, { timeout: 60_000 });
    assert(await video.getAttribute("controls") !== null, "Viewer video did not expose native controls.");
    return;
  }

  const image = page.locator("main img").first();
  await image.waitFor({ state: "visible", timeout: 60_000 });
  await image.evaluate((element) => {
    if (!(element instanceof HTMLImageElement) || !element.complete || element.naturalWidth <= 0) {
      throw new Error("Viewer image did not load durable pixels.");
    }
  });
}

async function observeActivityToCompletion(page, prompt, label) {
  await page.goto(`${baseUrl}/activity`, { waitUntil: "networkidle", timeout: 60_000 });
  const row = page.locator("li").filter({ hasText: prompt }).first();
  await row.waitFor({ state: "visible", timeout: 60_000 });
  const initialStatus = await row.getAttribute("data-activity-status");
  assert(["queued", "preparing", "running", "persisting", "succeeded"].includes(initialStatus), `${label} had unexpected initial Activity status ${initialStatus}.`);
  await screenshot(page, `${label}-activity-${initialStatus}`);

  const deadline = Date.now() + 30 * 60_000;
  let lastStatus = initialStatus;
  while (Date.now() < deadline) {
    const status = await row.getAttribute("data-activity-status");
    if (status && status !== lastStatus) {
      lastStatus = status;
      console.log(`${label} Activity status=${status}`);
      await screenshot(page, `${label}-activity-${status}`);
    }
    if (status === "succeeded") break;
    if (status === "failed" || status === "cancelled") {
      throw new Error(`${label} reached terminal Activity status ${status}: ${await row.innerText()}`);
    }
    await page.waitForTimeout(5_000);
  }

  assert((await row.getAttribute("data-activity-status")) === "succeeded", `${label} did not complete in Activity within 30 minutes.`);
  await screenshot(page, `${label}-activity-complete`);
  const viewResult = row.getByRole("link", { name: "View result", exact: true });
  await viewResult.waitFor({ state: "visible", timeout: 30_000 });
  await viewResult.click();
  await page.waitForURL(/\/library\/[0-9a-f-]+$/i, { timeout: 60_000 });
  return page.url().split("/").pop();
}

async function verifyViewerBothViewports(page, kind, label) {
  await waitForViewerMedia(page, kind);
  await page.setViewportSize(desktop);
  await page.waitForTimeout(300);
  await assertNoOverflow(page, `${label} desktop Viewer`);
  await screenshot(page, `${label}-viewer-desktop`);
  await page.setViewportSize(mobile);
  await page.waitForTimeout(300);
  await assertNoOverflow(page, `${label} mobile Viewer`);
  await screenshot(page, `${label}-viewer-mobile`);
}

async function submitCurrentCreate(page, { kind, prompt, label, submitViewport }) {
  await page.setViewportSize(submitViewport);
  const promptField = page.getByRole("textbox", { name: "Prompt" });
  await promptField.waitFor({ state: "visible", timeout: 60_000 });
  await promptField.fill(prompt);
  assert(await page.getByRole("radio", { name: kind === "video" ? "Video" : "Image", exact: true }).isChecked(), `${label} opened in the wrong Create mode.`);
  await assertNoOverflow(page, `${label} Create`);

  const generate = page.getByRole("button", { name: "Generate", exact: true });
  await generate.waitFor({ state: "visible", timeout: 30_000 });
  assert(await generate.isEnabled(), `${label} Generate was disabled for a valid fixture request.`);
  const responsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === "/api/generation/jobs" && response.request().method() === "POST";
  }, { timeout: 120_000 });
  await generate.click();
  const response = await responsePromise;
  const payload = await response.json().catch(() => null);
  assert(response.status() === 202 && payload?.ok && payload?.job?.id, `${label} submission failed (${response.status()}): ${JSON.stringify(payload)}`);
  console.log(`${label} accepted job=${payload.job.id}`);

  const active = page.locator("[data-create-lifecycle-state]");
  await active.waitFor({ state: "visible", timeout: 30_000 });
  await screenshot(page, `${label}-create-active-${submitViewport.width}`);

  const assetId = await observeActivityToCompletion(page, prompt, label);
  await verifyViewerBothViewports(page, kind, label);
  return { assetId, jobId: payload.job.id };
}

async function beginContinuation(page, action, expectedMode) {
  await page.setViewportSize(desktop);
  const link = page.getByRole("link", { name: action, exact: true });
  await link.waitFor({ state: "visible", timeout: 30_000 });
  await link.click();
  await page.waitForURL(/\/create\?/, { timeout: 60_000 });
  await page.getByText(expectedMode === "video" ? "Start image" : "Primary image", { exact: true }).waitFor({ state: "visible", timeout: 60_000 });
}

await mkdir(artifactDir, { recursive: true });
if (cleanupOnly) {
  await deleteConfiguredTestAccount(configuredTestAccountIdentity(namespace));
  process.exit(0);
}

let browser;
let account;
try {
  account = await createConfiguredTestAccount(namespace);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: desktop, colorScheme: "dark", reducedMotion: "no-preference" });
  const page = await context.newPage();
  await routeLocalAppRequestsWithAccount(page, baseUrl, account);

  await page.goto(`${baseUrl}/create`, { waitUntil: "networkidle", timeout: 60_000 });
  const image = await submitCurrentCreate(page, {
    kind: "image",
    label: "01-create-image-desktop",
    prompt: "QA journey 01: a matte cobalt-blue sphere centered in a warm gray studio, soft light, no text",
    submitViewport: desktop,
  });

  await beginContinuation(page, "Edit", "image");
  const edited = await submitCurrentCreate(page, {
    kind: "image",
    label: "02-edit-image-mobile",
    prompt: "QA journey 02: keep the cobalt sphere composition and add a narrow amber rim light, no text",
    submitViewport: mobile,
  });

  await beginContinuation(page, "Animate", "video");
  const animated = await submitCurrentCreate(page, {
    kind: "video",
    label: "03-animate-image-desktop",
    prompt: "QA journey 03: slowly rotate the sphere with a steady camera and subtle light movement, no text",
    submitViewport: desktop,
  });

  await page.goto(`${baseUrl}/create`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByRole("radio", { name: "Video", exact: true }).click();
  await page.waitForTimeout(500);
  const video = await submitCurrentCreate(page, {
    kind: "video",
    label: "04-create-video-mobile",
    prompt: "QA journey 04: a cobalt glass sphere rotating slowly on a neutral studio background, steady camera, no text",
    submitViewport: mobile,
  });

  console.log(`Complete production user journey passed owner=${account.id} image=${image.assetId} edited=${edited.assetId} animated=${animated.assetId} video=${video.assetId}`);
} finally {
  if (browser) await browser.close().catch(() => {});
  if (account) await deleteConfiguredTestAccount(account);
}
