import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { chromium } from "@playwright/test";
import {
  configuredTestAccountIdentity,
  createConfiguredTestAccount,
  deleteConfiguredTestAccount,
  routeLocalAppRequestsWithAccount,
} from "./lib/configured-test-account.mjs";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "https://renderlab.faresuniform.uk").replace(/\/$/, "");
const artifactDir = process.env.RENDERLAB_COMPLETE_JOURNEY_ARTIFACT_DIR || "artifacts/production-complete-user-journey";
const recordWalkthrough = process.env.RENDERLAB_RECORD_WALKTHROUGH === "true";
const cleanupOnly = process.argv.includes("--cleanup-only");
const namespace = "production-complete-user-journey";
const desktop = { width: 1440, height: 1024 };
const mobile = { width: 390, height: 844 };
const expectedSource = process.env.RENDERLAB_EXPECTED_PRODUCTION_SHA?.trim() || "";
const providerWorkAcknowledged = process.env.RENDERLAB_CONFIRM_BOUNDED_FIXTURE_PROVIDER_WORK === "true";
const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const runId = process.env.GITHUB_RUN_ID || "local";
const runAttempt = process.env.GITHUB_RUN_ATTEMPT || "1";
const bucket = process.env.R2_BUCKET_NAME;
const r2Client = new S3Client({
  region: "auto",
  endpoint: "https://" + process.env.R2_ACCOUNT_ID + ".r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});
const trackedStorageKeys = new Set();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function requireAuditConfig() {
  const required = {
    SUPABASE_URL: supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: bucket,
  };
  for (const [name, value] of Object.entries(required)) {
    assert(Boolean(value), name + " is required for QA-002 production journey verification.");
  }
  assert(/^[0-9a-f]{40}$/i.test(expectedSource), "RENDERLAB_EXPECTED_PRODUCTION_SHA must be an exact 40-character Git SHA.");
  assert(new URL(baseUrl).hostname === "renderlab.faresuniform.uk", "QA-002 must target the live RenderLab custom domain.");
  assert(providerWorkAcknowledged, "QA-002 requires explicit bounded fixture provider-work acknowledgement.");
}

async function serviceRest(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceRoleKey);
  headers.set("authorization", "Bearer " + serviceRoleKey);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(supabaseUrl + "/rest/v1/" + path, { ...init, headers });
}

async function serviceRows(path) {
  const response = await serviceRest(path);
  if (!response.ok) {
    throw new Error("QA-002 service query failed (" + response.status + "): " + await response.text());
  }
  return response.json();
}

async function collectTrackedStorageKeys(ownerId) {
  const encoded = encodeURIComponent(ownerId);
  const [sessions, assets, sources] = await Promise.all([
    serviceRows("media_upload_sessions?owner_id=eq." + encoded + "&select=storage_key"),
    serviceRows("media_assets?owner_id=eq." + encoded + "&select=storage_key,thumbnail_storage_key"),
    serviceRows("generation_sources?owner_id=eq." + encoded + "&select=storage_key"),
  ]);
  trackedStorageKeys.add("renderlab/account-profiles/" + ownerId + "/avatar.webp");
  for (const row of sessions) if (row.storage_key) trackedStorageKeys.add(row.storage_key);
  for (const row of assets) {
    if (row.storage_key) trackedStorageKeys.add(row.storage_key);
    if (row.thumbnail_storage_key) trackedStorageKeys.add(row.thumbnail_storage_key);
  }
  for (const row of sources) if (row.storage_key) trackedStorageKeys.add(row.storage_key);
}

async function objectExists(key) {
  try {
    await r2Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    if (error?.$metadata?.httpStatusCode === 404 || error?.name === "NotFound" || error?.name === "NoSuchKey") return false;
    throw error;
  }
}

async function assertIndependentCleanup(ownerId) {
  const encoded = encodeURIComponent(ownerId);
  for (const [table, column] of [
    ["generation_admission_reservations", "owner_id"],
    ["generation_jobs", "owner_id"],
    ["generation_sources", "owner_id"],
    ["media_upload_sessions", "owner_id"],
    ["media_assets", "owner_id"],
    ["media_collections", "owner_id"],
    ["media_collection_items", "owner_id"],
    ["renderlab_account_profiles", "owner_id"],
    ["renderlab_account_preferences", "owner_id"],
    ["renderlab_account_exports", "owner_id"],
    ["renderlab_account_lifecycle", "user_id"],
    ["renderlab_account_access", "user_id"],
  ]) {
    const rows = await serviceRows(table + "?" + column + "=eq." + encoded + "&select=*&limit=1");
    assert(rows.length === 0, "QA-002 cleanup left " + table + " residue for " + ownerId + ".");
  }

  const auth = await fetch(supabaseUrl + "/auth/v1/admin/users/" + encoded, {
    headers: { apikey: serviceRoleKey, authorization: "Bearer " + serviceRoleKey },
  });
  assert(auth.status === 404, "QA-002 cleanup left the run-owned Auth identity.");

  for (const key of trackedStorageKeys) {
    assert(!(await objectExists(key)), "QA-002 cleanup left a tracked R2 object.");
  }
  return {
    verified: true,
    trackedR2ObjectsChecked: trackedStorageKeys.size,
    contractedDbAuthResidue: 0,
  };
}

async function evidenceFiles() {
  const entries = await readdir(artifactDir, { withFileTypes: true }).catch((error) => {
    if (error?.code === "ENOENT") return [];
    throw error;
  });
  return entries
    .filter((entry) => entry.isFile() && entry.name !== "manifest.json")
    .map((entry) => entry.name)
    .sort();
}

async function verifyVisibleFocus(locator, label) {
  await locator.focus();
  const state = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      focused: document.activeElement === element,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow,
    };
  });
  assert(state.focused, label + " could not receive keyboard focus.");
  const hasOutline = state.outlineStyle !== "none" && state.outlineWidth !== "0px";
  const hasRing = state.boxShadow !== "none" && state.boxShadow !== "";
  assert(hasOutline || hasRing, label + " has no visible focus treatment.");
}

async function verifyPublicCoverage(browser) {
  const desktopContext = await browser.newContext({ viewport: desktop, colorScheme: "dark" });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto(baseUrl, { waitUntil: "networkidle", timeout: 60_000 });
  const openCreate = desktopPage.getByRole("link", { name: "Open Create", exact: true }).first();
  await openCreate.waitFor({ state: "visible", timeout: 30_000 });
  await verifyVisibleFocus(openCreate, "Landing Open Create");
  await assertNoOverflow(desktopPage, "Landing desktop");
  await screenshot(desktopPage, "00-public-landing-desktop");
  await desktopContext.close();

  const mobileContext = await browser.newContext({
    viewport: mobile,
    colorScheme: "dark",
    reducedMotion: "reduce",
  });
  const page = await mobileContext.newPage();
  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByRole("link", { name: "Open Create", exact: true }).first().waitFor({ state: "visible", timeout: 30_000 });
  await assertNoOverflow(page, "Landing mobile reduced motion");
  const runningAnimations = await page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === "running").length);
  assert(runningAnimations === 0, "Landing reduced-motion state still has running animations.");
  await screenshot(page, "00-public-landing-mobile-reduced");

  const gates = [
    {
      route: "/create",
      label: "create",
      text: "Sign in to generate, upload references, and save private media to your Library.",
    },
    { route: "/library", label: "library", text: "Sign in to use Library" },
    { route: "/activity", label: "activity", text: "Sign in to view Activity" },
    { route: "/settings", label: "settings", text: "Sign in to your invited RenderLab account." },
  ];
  for (const gate of gates) {
    await page.goto(baseUrl + gate.route, { waitUntil: "networkidle", timeout: 60_000 });
    await page.getByText(gate.text, { exact: true }).first().waitFor({ state: "visible", timeout: 30_000 });
    await assertNoOverflow(page, "Signed-out " + gate.label + " mobile");
    await screenshot(page, "00-signed-out-" + gate.label + "-mobile");
  }
  await mobileContext.close();
  return gates.map((gate) => gate.route);
}

async function verifyReadOnlyAccountSurfaces(page) {
  const covered = [];
  const surfaces = [
    { route: "/settings", label: "settings", heading: "Settings" },
    { route: "/settings/profile", label: "profile", heading: "Edit profile" },
    { route: "/settings/preferences", label: "preferences", heading: "Create defaults" },
  ];
  for (const surface of surfaces) {
    await page.setViewportSize(desktop);
    await page.goto(baseUrl + surface.route, { waitUntil: "networkidle", timeout: 60_000 });
    await page.getByRole("heading", { name: surface.heading, exact: true }).waitFor({ state: "visible", timeout: 30_000 });
    if (surface.route === "/settings") {
      await page.getByText("Active RenderLab sessions", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
      assert(await page.locator('[data-current-session="true"]').count() === 1, "Settings session inventory did not expose exactly one current fixture session.");
    }
    await assertNoOverflow(page, surface.label + " desktop");
    await screenshot(page, "05-account-" + surface.label + "-desktop");

    await page.setViewportSize(mobile);
    await page.waitForTimeout(250);
    await assertNoOverflow(page, surface.label + " mobile");
    await screenshot(page, "05-account-" + surface.label + "-mobile");
    covered.push(surface.route);
  }
  return covered;
}

async function assertReadOnlyAccountMetadata(ownerId) {
  const encoded = encodeURIComponent(ownerId);
  for (const table of ["renderlab_account_profiles", "renderlab_account_preferences", "renderlab_account_exports"]) {
    const rows = await serviceRows(table + "?owner_id=eq." + encoded + "&select=*&limit=1");
    assert(rows.length === 0, "QA-002 read-only account coverage unexpectedly persisted " + table + ".");
  }
  const lifecycle = await serviceRows("renderlab_account_lifecycle?user_id=eq." + encoded + "&select=*&limit=1");
  assert(lifecycle.length === 0, "QA-002 read-only account coverage unexpectedly created lifecycle state.");
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
  await image.evaluate(async (element) => {
    if (element instanceof HTMLImageElement) await element.decode();
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

async function chooseAspectRatio(page, ratio) {
  const trigger = page.getByRole("button", { name: /^Aspect ratio / });
  await trigger.waitFor({ state: "visible", timeout: 60_000 });
  if ((await trigger.getAttribute("aria-label"))?.includes(ratio)) return;
  await trigger.click();
  const option = page.getByRole("menuitemradio", { name: ratio, exact: true });
  await option.waitFor({ state: "visible", timeout: 30_000 });
  await option.click();
}

async function submitCurrentCreate(page, { kind, prompt, label, submitViewport, aspectRatio }) {
  await page.setViewportSize(submitViewport);
  if (aspectRatio) await chooseAspectRatio(page, aspectRatio);
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
requireAuditConfig();
const ownerIdentity = configuredTestAccountIdentity(namespace);

async function cleanupFixture() {
  await collectTrackedStorageKeys(ownerIdentity.id);
  await deleteConfiguredTestAccount(ownerIdentity);
  return assertIndependentCleanup(ownerIdentity.id);
}

if (cleanupOnly) {
  await cleanupFixture();
  console.log("QA-002 production fixture cleanup completed and independent DB/Auth/R2 absence was verified.");
  process.exit(0);
}

let browser = null;
let account = null;
let primaryError = null;
let cleanup = null;
let publicRoutes = [];
let accountRoutes = [];
const generations = [];

try {
  browser = await chromium.launch({ headless: true });
  publicRoutes = await verifyPublicCoverage(browser);

  account = await createConfiguredTestAccount(namespace);
  const galleryContext = await browser.newContext({ viewport: desktop, colorScheme: "dark", reducedMotion: "no-preference" });
  const galleryPage = await galleryContext.newPage();
  await routeLocalAppRequestsWithAccount(galleryPage, baseUrl, account);

  const galleryExamples = [
    {
      operation: "create-image-cinematic-editorial",
      label: "01-cinematic-editorial-image",
      aspectRatio: "16:9",
      prompt: "Wide cinematic editorial photograph of a fictional explorer in a cobalt raincoat crossing a black volcanic shoreline at blue hour. Wind, ocean mist, wet basalt, restrained amber light at the horizon, realistic fabric and natural human proportions, premium outdoor campaign photography, no text or logos.",
    },
    {
      operation: "create-image-painterly-fantasy",
      label: "02-painterly-fantasy-image",
      aspectRatio: "16:9",
      prompt: "An ancient white stag guardian standing before a moss-covered shrine in a bioluminescent forest after rain. Giant ferns, wet stone steps, floating spores, a reflective stream, cool cyan fungi and one warm shrine lantern. Richly textured painterly fantasy illustration with cinematic depth and sophisticated book-cover finish. Landscape composition, no text or logos.",
    },
    {
      operation: "create-image-graphic-scifi",
      label: "03-graphic-scifi-image",
      aspectRatio: "4:5",
      prompt: "A masked courier in a long vermilion coat standing on a rain-slick skybridge beneath an enormous fractured holographic moon. Dense retro-futurist city canyon, cyan and violet light, reflective pavement, clean cel shading with a detailed painted background, premium animation key art, original character, no readable text or logos.",
    },
    {
      operation: "create-image-surreal-architecture",
      label: "04-surreal-architecture-image",
      aspectRatio: "16:9",
      prompt: "A monumental brutalist observatory rising from a pale salt desert, surrounded by three enormous floating chrome rings casting curved shadows across the sand. Distant black mountains, hard late-afternoon light, board-formed concrete, brushed chrome, restrained surreal architectural concept art with editorial realism, no people, text, or logos.",
    },
    {
      operation: "create-image-stylized-3d",
      label: "05-stylized-3d-image",
      aspectRatio: "16:9",
      prompt: "A small red panda astronomer discovering a glowing miniature blue planet inside an overgrown observatory greenhouse at night. Brass telescope, fogged curved glass, oversized leaves, warm lamps, tactile fur and handcrafted miniature-set materials, premium stylized 3D animated-film still, charming but sophisticated, no text or logos.",
    },
  ];

  for (const example of galleryExamples) {
    await galleryPage.goto(baseUrl + "/create", { waitUntil: "networkidle", timeout: 60_000 });
    const result = await submitCurrentCreate(galleryPage, {
      kind: "image",
      label: example.label,
      prompt: example.prompt,
      submitViewport: desktop,
      aspectRatio: example.aspectRatio,
    });
    generations.push({ operation: example.operation, jobId: result.jobId, assetId: result.assetId });
  }
  await galleryContext.close();

  const context = await browser.newContext({
    viewport: desktop,
    colorScheme: "dark",
    reducedMotion: "no-preference",
    ...(recordWalkthrough ? { recordVideo: { dir: artifactDir + "/video", size: desktop } } : {}),
  });
  const page = await context.newPage();
  await routeLocalAppRequestsWithAccount(page, baseUrl, account);

  await page.goto(baseUrl + "/library?tab=uploads", { waitUntil: "networkidle", timeout: 60_000 });
  const referenceBuffer = await readFile(new URL("../tests/fixtures/renderlab-explorer-reference.webp", import.meta.url));
  const completion = page.waitForResponse(response => new URL(response.url()).pathname === "/api/media/uploads/upload-completions" && response.request().method() === "POST", { timeout: 60_000 });
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Upload", exact: true }).click();
  await (await chooser).setFiles({ name: "Volcanic coast explorer reference.webp", mimeType: "image/webp", buffer: referenceBuffer });
  const response = await completion;
  const payload = await response.json();
  assert(response.ok() && payload?.ok && payload.asset?.id, "Walkthrough upload did not persist the explorer reference.");
  await page.locator('a[href="/library/' + payload.asset.id + '"]').first().waitFor({ state: "visible", timeout: 30_000 });
  await screenshot(page, "00-walkthrough-library-upload");
  await page.locator('a[href="/library/' + payload.asset.id + '"]').first().click();
  await waitForViewerMedia(page, "image");
  await screenshot(page, "00-walkthrough-upload-viewer");

  await beginContinuation(page, "Edit", "image");
  const edited = await submitCurrentCreate(page, {
    kind: "image",
    label: "06-explorer-reference-edit",
    prompt: "Preserve @image1's fictional subject, face, pose, framing, and cobalt raincoat. Transform the atmosphere into a sudden coastal rainstorm with denser sea spray, rain droplets, wet fabric highlights, and a narrow amber rim light from frame right. Keep the result photorealistic and editorial. No text or logos.",
    submitViewport: desktop,
  });
  generations.push({ operation: "edit-image", jobId: edited.jobId, assetId: edited.assetId });

  await beginContinuation(page, "Animate", "video");
  const animated = await submitCurrentCreate(page, {
    kind: "video",
    label: "07-explorer-animation",
    prompt: "Slow cinematic dolly-in. Preserve @image1's face, anatomy, framing, and clothing. Add subtle natural breathing, wind moving the short hair and raincoat fabric, rain and sea spray moving behind the subject, and realistic waves. One continuous shot, steady camera, no cuts, no text.",
    submitViewport: desktop,
  });
  generations.push({ operation: "animate-image", jobId: animated.jobId, assetId: animated.assetId });

  await page.goto(baseUrl + "/create", { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByRole("radio", { name: "Video", exact: true }).click();
  await page.waitForTimeout(500);
  const video = await submitCurrentCreate(page, {
    kind: "video",
    label: "08-explorer-text-video",
    prompt: "Wide establishing shot of a lone fictional explorer in a cobalt raincoat moving carefully across a black volcanic shoreline at blue hour. Ocean mist, wind and sea spray, slow lateral tracking camera, realistic cinematic movement, restrained amber horizon light, one continuous shot, no text or logos.",
    submitViewport: desktop,
  });
  generations.push({ operation: "create-video", jobId: video.jobId, assetId: video.assetId });

  await page.goto(baseUrl + "/library", { waitUntil: "networkidle", timeout: 60_000 });
  for (const generation of generations) {
    await page.locator('a[href="/library/' + generation.assetId + '"]').first().waitFor({ state: "visible", timeout: 30_000 });
  }
  await assertNoOverflow(page, "Library desktop");
  await screenshot(page, "09-library-artistic-range-desktop");
  await page.setViewportSize(mobile);
  await page.waitForTimeout(250);
  await assertNoOverflow(page, "Library mobile");
  await screenshot(page, "09-library-artistic-range-mobile");

  accountRoutes = await verifyReadOnlyAccountSurfaces(page);
  await assertReadOnlyAccountMetadata(account.id);

  console.log("Complete production user journey passed owner=" + account.id + " generations=" + generations.length + ".");
} catch (error) {
  primaryError = error;
  console.error(error);
} finally {
  if (browser) await browser.close().catch(() => {});
  try {
    cleanup = await cleanupFixture();
    console.log("QA-002 production fixture cleanup completed and independent DB/Auth/R2 absence was verified.");
  } catch (cleanupError) {
    console.error(cleanupError);
    cleanup = {
      verified: false,
      error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
    };
    if (!primaryError) primaryError = cleanupError;
  }
}

const manifest = {
  audit: "QA-002",
  runId,
  runAttempt,
  baseUrl,
  expectedProductionSource: expectedSource,
  walkthroughRecordingRequested: recordWalkthrough,
  boundedFixtureProviderWorkAcknowledged: providerWorkAcknowledged,
  providerGenerationCount: generations.length,
  fixtureAccountId: ownerIdentity.id,
  generations,
  publicRoutes,
  accountRoutes,
  cleanup,
  evidenceFiles: await evidenceFiles(),
  passed: !primaryError && cleanup?.verified === true && generations.length === 4,
  completedAt: new Date().toISOString(),
};
await writeFile(artifactDir + "/manifest.json", JSON.stringify(manifest, null, 2) + "\n", "utf8");

if (primaryError) throw primaryError;
assert(generations.length === 8, "QA-002 did not complete exactly eight contracted provider-backed generations.");
console.log("QA-002 permanent production user journey passed.");
