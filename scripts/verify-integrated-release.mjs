import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { chromium } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import {
  configuredTestAccountIdentity,
  createConfiguredTestAccount,
  deleteConfiguredTestAccount,
  routeLocalAppRequestsWithAccount,
  withAccountAuthorization,
} from "./lib/configured-test-account.mjs";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const r2Bucket = process.env.R2_BUCKET_NAME;
const generationBackendUrl = process.env.RENDERLAB_GENERATION_BACKEND_URL;
const generationBackendToken = process.env.RENDERLAB_GENERATION_BACKEND_TOKEN;
const artifactDir = process.env.RENDERLAB_RELEASE_ARTIFACT_DIR || "artifacts";
const cleanupOnly = process.argv.includes("--cleanup-only");
const ownerIdentity = configuredTestAccountIdentity("integrated-release-owner");
const foreignIdentity = configuredTestAccountIdentity("integrated-release-foreign");
const generatedDisplayName = "Phase 12 integrated release result";
const generatedPrompt = "Phase 12 integrated release study";
const retryPrompt = "Phase 12 recovery study";
const pngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZPZkAAAAASUVORK5CYII=",
  "base64",
);

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: r2Bucket,
  RENDERLAB_GENERATION_BACKEND_URL: generationBackendUrl,
  RENDERLAB_GENERATION_BACKEND_TOKEN: generationBackendToken,
})) {
  if (!value) throw new Error(`${name} is required for Phase 12 Integrated Release verification.`);
}

const backendAddress = new URL(generationBackendUrl);
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
const mockStorageKeys = new Set();
let mockBackend = null;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function serviceRest(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceRoleKey);
  headers.set("authorization", `Bearer ${serviceRoleKey}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers });
}

async function rows(path) {
  const response = await serviceRest(path);
  if (!response.ok) throw new Error(`Integrated Release Supabase query failed (${response.status}): ${await response.text()}`);
  return response.json();
}

async function expectServiceSuccess(response, label) {
  if (!response.ok) throw new Error(`${label} (${response.status}): ${await response.text()}`);
  return response;
}

async function setAccountAccess(userId, patch) {
  await expectServiceSuccess(
    await serviceRest(`renderlab_account_access?user_id=eq.${encodeURIComponent(userId)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
    }),
    `Could not update Integrated Release access ${userId}`,
  );
}

function operationForRequest(request) {
  const hasInput = Array.isArray(request.inputs) && request.inputs.length > 0;
  if (request.output?.kind === "video") return hasInput ? "animate-image" : "create-video";
  return hasInput ? "edit-image" : "create-image";
}

function publicJob(row) {
  return {
    id: row.id,
    status: row.status,
    operation: row.operation,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    outputAssetIds: row.output_asset_ids ?? [],
    ...(row.error_message
      ? { error: { code: row.error_code || "generation_failed", message: row.error_message } }
      : {}),
  };
}

async function readRequestJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : null;
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(payload));
}

async function persistMockSubmission(ownerId, request) {
  assert(request?.output?.kind === "image", "Integrated mock backend received an unexpected non-image request.");
  const jobId = randomUUID();
  const assetId = randomUUID();
  const now = new Date().toISOString();
  const operation = operationForRequest(request);
  const storageKey = `renderlab/integrated-release/${process.env.GITHUB_RUN_ID || "local"}/${assetId}.png`;
  mockStorageKeys.add(storageKey);

  const jobResponse = await serviceRest("generation_jobs", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      id: jobId,
      owner_id: ownerId,
      status: "queued",
      operation,
      output_kind: "image",
      prompt: request.prompt,
      workflow_id: "phase-12-integrated-release-mock",
      model: "phase-12-integrated-release-mock",
      ecosystem: "phase-12-integrated-release-mock",
      inputs: request.inputs ?? [],
      parameters: { output: request.output, advanced: request.advanced ?? {} },
      output_asset_ids: [],
      created_at: now,
      updated_at: now,
      started_at: now,
      completed_at: null,
    }),
  });
  if (!jobResponse.ok) throw new Error(`Integrated mock backend could not create job (${jobResponse.status}): ${await jobResponse.text()}`);

  await r2Client.send(new PutObjectCommand({
    Bucket: r2Bucket,
    Key: storageKey,
    Body: pngBytes,
    ContentType: "image/png",
  }));

  const assetResponse = await serviceRest("media_assets", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      id: assetId,
      owner_id: ownerId,
      generation_job_id: jobId,
      origin: "generated",
      kind: "image",
      mime_type: "image/png",
      storage_key: storageKey,
      thumbnail_storage_key: null,
      original_filename: null,
      display_name: generatedDisplayName,
      size_bytes: pngBytes.length,
      width: 1,
      height: 1,
      duration_ms: null,
      provenance: { prompt: request.prompt, operation, model: "phase-12-integrated-release-mock" },
      metadata: { verification: "phase-12-integrated-release" },
      favorited_at: null,
    }),
  });
  if (!assetResponse.ok) throw new Error(`Integrated mock backend could not persist media (${assetResponse.status}): ${await assetResponse.text()}`);

  const completedAt = new Date().toISOString();
  const completionResponse = await serviceRest(`generation_jobs?id=eq.${encodeURIComponent(jobId)}&owner_id=eq.${encodeURIComponent(ownerId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      status: "succeeded",
      output_asset_ids: [assetId],
      updated_at: completedAt,
      completed_at: completedAt,
    }),
  });
  if (!completionResponse.ok) throw new Error(`Integrated mock backend could not complete job (${completionResponse.status}): ${await completionResponse.text()}`);
  const completed = (await completionResponse.json())[0];
  return { job: completed, assetId };
}

async function startMockBackend() {
  if (mockBackend) return;
  mockBackend = createServer(async (request, response) => {
    try {
      if (request.headers.authorization !== `Bearer ${generationBackendToken}`) {
        sendJson(response, 401, { message: "Integrated mock backend authorization failed." });
        return;
      }
      const ownerId = request.headers["x-renderlab-owner-id"];
      if (typeof ownerId !== "string" || !ownerId) {
        sendJson(response, 400, { message: "Integrated mock backend owner identity missing." });
        return;
      }
      const requestUrl = new URL(request.url || "/", generationBackendUrl);
      if (request.method === "POST" && requestUrl.pathname === "/jobs") {
        const body = await readRequestJson(request);
        const persisted = await persistMockSubmission(ownerId, body);
        sendJson(response, 202, { job: publicJob(persisted.job) });
        return;
      }
      const match = request.method === "GET" ? requestUrl.pathname.match(/^\/jobs\/([^/]+)$/) : null;
      if (match) {
        const jobId = decodeURIComponent(match[1]);
        const found = await rows(
          `generation_jobs?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(jobId)}&select=*&limit=1`,
        );
        if (!found[0]) {
          sendJson(response, 404, { message: "Not found" });
          return;
        }
        sendJson(response, 200, { job: publicJob(found[0]) });
        return;
      }
      sendJson(response, 404, { message: "Not found" });
    } catch (error) {
      console.error(error);
      sendJson(response, 500, { message: "Integrated mock backend failed." });
    }
  });
  await new Promise((resolve, reject) => {
    mockBackend.once("error", reject);
    mockBackend.listen(Number(backendAddress.port || 80), backendAddress.hostname, resolve);
  });
}

async function stopMockBackend() {
  if (!mockBackend) return;
  const server = mockBackend;
  mockBackend = null;
  await new Promise((resolve) => server.close(resolve));
}

async function createFailedRetryJob(ownerId, assetId) {
  const id = randomUUID();
  const now = new Date().toISOString();
  await expectServiceSuccess(
    await serviceRest("generation_jobs", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        id,
        owner_id: ownerId,
        status: "failed",
        operation: "edit-image",
        output_kind: "image",
        prompt: retryPrompt,
        workflow_id: "phase-12-retry-historical-workflow",
        model: "phase-12-retry-historical-model",
        ecosystem: "phase-12-retry-historical-ecosystem",
        inputs: [{ alias: "image1", role: "primary-image", source: { type: "media-asset", id: assetId } }],
        parameters: {
          output: { kind: "image", aspectRatio: "original" },
          advanced: { seed: 12, steps: 8, guidance: 2 },
        },
        output_asset_ids: [],
        error_code: "generation_failed",
        error_message: "Sanitized Phase 12 recovery fixture failure.",
        created_at: now,
        updated_at: now,
        started_at: now,
        completed_at: now,
      }),
    }),
    "Could not create Integrated Release recovery job",
  );
  return id;
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 1, `${label} has horizontal overflow: ${overflow}px`);
}

async function verifyFocus(locator, label) {
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
  assert(state.focused, `${label} could not receive keyboard focus.`);
  const hasOutline = state.outlineStyle !== "none" && state.outlineWidth !== "0px";
  const hasRing = state.boxShadow !== "none" && state.boxShadow !== "";
  assert(hasOutline || hasRing, `${label} has no visible focus treatment.`);
}

async function assertExactOwnerCleanup(ownerId) {
  for (const table of [
    "generation_admission_reservations",
    "generation_jobs",
    "generation_sources",
    "media_upload_sessions",
    "media_assets",
  ]) {
    const remaining = await rows(`${table}?owner_id=eq.${encodeURIComponent(ownerId)}&select=id&limit=1`);
    assert(remaining.length === 0, `Integrated Release cleanup left ${table} rows for ${ownerId}.`);
  }
  const access = await rows(`renderlab_account_access?user_id=eq.${encodeURIComponent(ownerId)}&select=user_id&limit=1`);
  assert(access.length === 0, `Integrated Release cleanup left account access for ${ownerId}.`);
}

async function cleanupFixture() {
  await stopMockBackend().catch(() => {});
  await deleteConfiguredTestAccount(ownerIdentity).catch(() => {});
  await deleteConfiguredTestAccount(foreignIdentity).catch(() => {});
  for (const key of mockStorageKeys) {
    await r2Client.send(new DeleteObjectCommand({ Bucket: r2Bucket, Key: key })).catch(() => {});
  }
  mockStorageKeys.clear();
  await assertExactOwnerCleanup(ownerIdentity.id);
  await assertExactOwnerCleanup(foreignIdentity.id);
}

if (cleanupOnly) {
  await cleanupFixture();
  console.log("Phase 12 Integrated Release exact fixture cleanup completed.");
  process.exit(0);
}

await mkdir(artifactDir, { recursive: true });
let browser = null;
let primaryError = null;

try {
  await cleanupFixture();
  await startMockBackend();
  const owner = await createConfiguredTestAccount("integrated-release-owner");
  const foreign = await createConfiguredTestAccount("integrated-release-foreign");

  browser = await chromium.launch({ headless: true });

  const landingContext = await browser.newContext({ viewport: { width: 1440, height: 1100 }, colorScheme: "dark" });
  const landing = await landingContext.newPage();
  await landing.goto(baseUrl, { waitUntil: "networkidle", timeout: 60_000 });
  await landing.getByRole("heading", { name: "Create images. Shape them. Put them in motion." }).waitFor({ state: "visible" });
  assert(await landing.getByRole("complementary", { name: "Application navigation" }).count() === 0, "Integrated landing rendered AppShell navigation.");
  const openCreate = landing.getByRole("link", { name: /Open Create/ }).first();
  const signIn = landing.getByRole("link", { name: "Sign in", exact: true }).first();
  assert((await openCreate.getAttribute("href")) === "/create", "Integrated landing Open Create does not target /create.");
  assert((await signIn.getAttribute("href")) === "/settings", "Integrated landing Sign in does not target /settings.");
  await verifyFocus(openCreate, "Integrated landing Open Create");
  await verifyFocus(signIn, "Integrated landing Sign in");
  await assertNoHorizontalOverflow(landing, "Integrated landing desktop");
  await landing.screenshot({ path: `${artifactDir}/release-landing-desktop.png`, fullPage: true });
  await landingContext.close();

  const narrowLandingContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: "dark",
    reducedMotion: "reduce",
  });
  const narrowLanding = await narrowLandingContext.newPage();
  await narrowLanding.goto(baseUrl, { waitUntil: "networkidle", timeout: 60_000 });
  await narrowLanding.getByRole("heading", { name: "Create images. Shape them. Put them in motion." }).waitFor({ state: "visible" });
  await assertNoHorizontalOverflow(narrowLanding, "Integrated landing narrow");
  const runningAnimations = await narrowLanding.evaluate(() => document.getAnimations().filter((animation) => animation.playState === "running").length);
  assert(runningAnimations === 0, `Integrated reduced-motion landing has ${runningAnimations} running animation(s).`);
  await narrowLanding.screenshot({ path: `${artifactDir}/release-landing-narrow-reduced.png`, fullPage: true });
  await narrowLandingContext.close();

  const signedOutContext = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "dark" });
  const signedOutActivity = await signedOutContext.newPage();
  await signedOutActivity.goto(`${baseUrl}/activity`, { waitUntil: "networkidle", timeout: 60_000 });
  await signedOutActivity.getByRole("heading", { name: "Sign in to view Activity" }).waitFor({ state: "visible" });
  await signedOutContext.close();

  const ownerContext = await browser.newContext({ viewport: { width: 1440, height: 1024 }, colorScheme: "dark" });
  const page = await ownerContext.newPage();
  await routeLocalAppRequestsWithAccount(page, baseUrl, owner);

  await page.goto(`${baseUrl}/create`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByRole("textbox", { name: "Prompt" }).fill(generatedPrompt);
  const generate = page.getByRole("button", { name: "Generate", exact: true });
  assert(await generate.isEnabled(), "Integrated Create Generate is disabled for a valid authenticated request.");
  const submissionPromise = page.waitForResponse(
    (response) => new URL(response.url()).pathname === "/api/generation/jobs" && response.request().method() === "POST",
    { timeout: 60_000 },
  );
  await generate.click();
  const submission = await submissionPromise;
  const submissionPayload = await submission.json().catch(() => null);
  assert(submission.status() === 202 && submissionPayload?.ok && submissionPayload.job?.id, `Integrated Create submission failed (${submission.status()}): ${JSON.stringify(submissionPayload)}`);
  const jobId = submissionPayload.job.id;
  await page.getByRole("article", { name: "Generated result" }).waitFor({ state: "visible", timeout: 60_000 });
  await assertNoHorizontalOverflow(page, "Integrated Create desktop");
  await page.screenshot({ path: `${artifactDir}/release-create-desktop.png`, fullPage: true });

  const jobRows = await rows(`generation_jobs?owner_id=eq.${encodeURIComponent(owner.id)}&id=eq.${encodeURIComponent(jobId)}&select=id,status,output_asset_ids&limit=1`);
  assert(jobRows[0]?.status === "succeeded" && jobRows[0]?.output_asset_ids?.length === 1, "Integrated Create did not persist one succeeded durable result.");
  const assetId = jobRows[0].output_asset_ids[0];
  const assetRows = await rows(`media_assets?owner_id=eq.${encodeURIComponent(owner.id)}&id=eq.${encodeURIComponent(assetId)}&select=id,owner_id,storage_key,favorited_at&limit=1`);
  assert(assetRows[0]?.owner_id === owner.id, "Integrated durable result did not preserve owner identity.");

  const anonymousMedia = await fetch(`${baseUrl}/api/media/assets/${encodeURIComponent(assetId)}`);
  assert(anonymousMedia.status === 401, `Integrated signed-out media read returned ${anonymousMedia.status}, expected 401.`);
  const foreignMedia = await fetch(
    `${baseUrl}/api/media/assets/${encodeURIComponent(assetId)}`,
    withAccountAuthorization(foreign),
  );
  assert(foreignMedia.status === 404, `Integrated foreign media read returned ${foreignMedia.status}, expected 404.`);

  await page.goto(`${baseUrl}/library`, { waitUntil: "networkidle", timeout: 60_000 });
  const libraryCard = page.locator(`a[href="/library/${encodeURIComponent(assetId)}"]`);
  await libraryCard.waitFor({ state: "visible", timeout: 30_000 });
  await assertNoHorizontalOverflow(page, "Integrated Library desktop");
  await page.screenshot({ path: `${artifactDir}/release-library-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  await assertNoHorizontalOverflow(page, "Integrated Library narrow");
  await page.screenshot({ path: `${artifactDir}/release-library-narrow.png`, fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1024 });

  await page.goto(`${baseUrl}/library/${encodeURIComponent(assetId)}`, { waitUntil: "networkidle", timeout: 60_000 });
  const edit = page.getByRole("link", { name: "Edit", exact: true });
  await edit.waitFor({ state: "visible", timeout: 30_000 });
  const favorite = page.getByRole("button", { name: "Favorite", exact: true });
  await favorite.waitFor({ state: "visible", timeout: 30_000 });
  await favorite.click();
  await page.getByRole("button", { name: "Favorited", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  const favoritedRows = await rows(`media_assets?id=eq.${encodeURIComponent(assetId)}&owner_id=eq.${encodeURIComponent(owner.id)}&select=favorited_at&limit=1`);
  assert(typeof favoritedRows[0]?.favorited_at === "string", "Integrated Viewer Favorite did not persist organization state.");
  await assertNoHorizontalOverflow(page, "Integrated Viewer desktop");
  await page.screenshot({ path: `${artifactDir}/release-viewer-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${artifactDir}/release-viewer-narrow.png`, fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1024 });

  await edit.click();
  await page.waitForURL(
    (url) => url.pathname === "/create" && url.searchParams.get("source") === assetId && url.searchParams.get("action") === "edit-image",
    { timeout: 30_000 },
  );
  await page.getByRole("heading", { name: "Edit an image", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByText("Editing this image", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });

  const retryJobId = await createFailedRetryJob(owner.id, assetId);
  await page.goto(`${baseUrl}/activity`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByText(generatedPrompt, { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  const retryRow = page.locator("li").filter({ hasText: retryPrompt }).first();
  await retryRow.waitFor({ state: "visible", timeout: 30_000 });
  const retryButton = retryRow.getByRole("button", { name: "Retry", exact: true });
  await retryButton.waitFor({ state: "visible", timeout: 30_000 });
  await retryButton.click();
  await retryRow.getByText("Retry started. A new job was added to Activity.", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  const historicalRetry = await rows(`generation_jobs?id=eq.${encodeURIComponent(retryJobId)}&owner_id=eq.${encodeURIComponent(owner.id)}&select=status&limit=1`);
  assert(historicalRetry[0]?.status === "failed", "Integrated Retry mutated the historical failed job.");
  await assertNoHorizontalOverflow(page, "Integrated Activity desktop");
  await page.screenshot({ path: `${artifactDir}/release-activity-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${artifactDir}/release-activity-narrow.png`, fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1024 });

  await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByRole("heading", { name: "Account", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByText(owner.email, { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByText("Active", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.screenshot({ path: `${artifactDir}/release-settings-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${artifactDir}/release-settings-narrow.png`, fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1024 });

  const memberAdmin = await fetch(`${baseUrl}/api/admin/accounts`, withAccountAuthorization(foreign));
  assert(memberAdmin.status === 403, `Integrated member Admin boundary returned ${memberAdmin.status}, expected 403.`);
  await setAccountAccess(owner.id, { role: "admin", status: "active" });
  const adminApi = await fetch(`${baseUrl}/api/admin/accounts`, withAccountAuthorization(owner));
  assert(adminApi.status === 200, `Integrated fresh Admin boundary returned ${adminApi.status}, expected 200.`);
  await page.goto(`${baseUrl}/admin`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByRole("main").getByRole("heading", { name: "Admin", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByRole("heading", { name: "Access", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByRole("heading", { name: "Generation controls", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await assertNoHorizontalOverflow(page, "Integrated Admin desktop");
  await page.screenshot({ path: `${artifactDir}/release-admin-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  await assertNoHorizontalOverflow(page, "Integrated Admin narrow");
  await page.screenshot({ path: `${artifactDir}/release-admin-narrow.png`, fullPage: true });

  await ownerContext.close();
  console.log(`Phase 12 Integrated Release verified. owner=${owner.id} foreign=${foreign.id} job=${jobId} asset=${assetId} retry=${retryJobId}`);
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
