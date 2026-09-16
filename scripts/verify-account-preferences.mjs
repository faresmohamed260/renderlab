import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { chromium } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import {
  createConfiguredTestAccount,
  deleteConfiguredTestAccount,
  configuredTestAccountIdentity,
  routeLocalAppRequestsWithAccount,
} from "./lib/configured-test-account.mjs";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const artifactDir = process.env.RENDERLAB_ACCOUNT_PREFERENCES_ARTIFACT_DIR || "artifacts/account-preferences";
const cleanupOnly = process.argv.includes("--cleanup-only");
const namespaces = ["preferences-owner-a", "preferences-owner-b", "preferences-delete"];
const runToken = process.env.GITHUB_RUN_ID || "local";

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
})) {
  if (!value) throw new Error(`${name} is required for configured #220 verification.`);
}

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});
const bucket = process.env.R2_BUCKET_NAME;
const pngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZgZsAAAAASUVORK5CYII=",
  "base64",
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function fixtureUuid(label) {
  const bytes = Buffer.from(createHash("sha256").update(`renderlab-220-${runToken}-${label}`).digest().subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const recipeJobId = fixtureUuid("recipe-job");
const continuationAssetId = fixtureUuid("continuation-asset");
const continuationKey = `renderlab/account-preferences-ci/${runToken}/continuation.png`;

async function serviceRest(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceRoleKey);
  headers.set("authorization", `Bearer ${serviceRoleKey}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers });
}

async function serviceRows(path) {
  const response = await serviceRest(path);
  if (!response.ok) throw new Error(`Configured #220 database query failed (${response.status}): ${await response.text()}`);
  return response.json();
}

async function expectOk(response, label) {
  if (!response.ok) throw new Error(`${label} (${response.status}): ${await response.text()}`);
  return response;
}

async function authAdmin(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceRoleKey);
  headers.set("authorization", `Bearer ${serviceRoleKey}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/auth/v1/admin/${path}`, { ...init, headers });
}

async function appFetch(path, accessToken, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${baseUrl}${path}`, { ...init, headers, redirect: init.redirect ?? "manual" });
}

async function appJson(path, accessToken, init = {}) {
  const response = await appFetch(path, accessToken, init);
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

async function passwordToken(account) {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: publishableKey, "content-type": "application/json" },
    body: JSON.stringify({ email: account.email, password: account.password }),
  });
  if (!response.ok) throw new Error(`Configured #220 second-session sign-in failed (${response.status}).`);
  const payload = await response.json();
  assert(typeof payload.access_token === "string" && payload.access_token.length > 20, "Configured #220 second-session token missing.");
  return payload.access_token;
}

async function putObject(key, bytes, contentType = "image/png") {
  await r2.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes, ContentType: contentType }));
}

async function deleteObject(key) {
  await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch(() => null);
}

async function objectExists(key) {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    if (error?.name === "NotFound" || error?.name === "NoSuchKey" || error?.$metadata?.httpStatusCode === 404) return false;
    throw error;
  }
}

async function deletePreferenceRow(ownerId) {
  await serviceRest(`renderlab_account_preferences?owner_id=eq.${encodeURIComponent(ownerId)}`, { method: "DELETE" }).catch(() => null);
}

async function cleanupFixtures(accounts = []) {
  await deleteObject(continuationKey);
  const targets = accounts.length ? accounts : namespaces.map((namespace) => configuredTestAccountIdentity(namespace));
  for (const account of targets) {
    await deletePreferenceRow(account.id);
    await deleteConfiguredTestAccount(account).catch(() => null);
  }
  console.log("RENDERLAB_220_FIXTURE_CLEAN=true");
}

async function savePreferences(accessToken, create) {
  const result = await appJson("/api/account/preferences", accessToken, {
    method: "PUT",
    body: JSON.stringify({ create }),
  });
  assert(result.response.status === 200 && result.payload?.ok === true, `Preference save failed (${result.response.status}): ${JSON.stringify(result.payload)}`);
  return result.payload.preferences;
}

async function getPreferences(accessToken) {
  const result = await appJson("/api/account/preferences", accessToken);
  assert(result.response.status === 200 && result.payload?.ok === true, `Preference read failed (${result.response.status}).`);
  return result.payload.preferences;
}

async function createState(page) {
  await page.locator('[data-create-mode-switch="true"] [data-state="on"]').waitFor({ state: "visible", timeout: 30_000 });
  const mode = (await page.locator('[data-create-mode-switch="true"] [data-state="on"]').innerText()).trim().toLowerCase();
  const aspect = await page.locator('button[aria-label^="Aspect ratio "]').getAttribute("aria-label");
  const videoButton = page.locator('button[aria-label^="Video settings."]');
  return {
    mode,
    aspect: aspect?.replace("Aspect ratio ", "") ?? null,
    video: await videoButton.count() ? await videoButton.getAttribute("aria-label") : null,
    prompt: await page.getByLabel("Prompt").inputValue(),
  };
}

async function verifySettingsAndCreate(accountA, accountB) {
  await mkdir(artifactDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const contextA = await browser.newContext({ viewport: { width: 1440, height: 1024 }, colorScheme: "dark" });
    const pageA = await contextA.newPage();
    await routeLocalAppRequestsWithAccount(pageA, baseUrl, accountA);

    await pageA.goto(`${baseUrl}/settings`, { waitUntil: "networkidle", timeout: 60_000 });
    await pageA.getByRole("link", { name: "Manage preferences", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
    await pageA.getByRole("link", { name: "Manage preferences", exact: true }).click();
    await pageA.getByRole("heading", { name: "Create defaults", exact: true }).waitFor({ state: "visible" });
    assert((await pageA.getByLabel("Default Create mode").inputValue()) === "image", "Default preference UI did not start from Image.");
    await pageA.getByLabel("Default Create mode").selectOption("image");
    await pageA.getByLabel("Default Image aspect ratio").selectOption("4:5");
    await pageA.getByLabel("Default Video resolution").selectOption("1080p");
    await pageA.getByLabel("Default Video duration").selectOption("20");
    await pageA.getByLabel("Default Video audio").selectOption("off");
    await pageA.getByRole("button", { name: "Save defaults", exact: true }).click();
    await pageA.getByText("Create defaults saved.", { exact: true }).waitFor({ state: "visible" });
    await pageA.getByText("Using saved account defaults across signed-in devices.", { exact: true }).waitFor({ state: "visible" });
    let overflow = await pageA.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(overflow <= 1, `Desktop #220 Settings has horizontal overflow: ${overflow}px.`);
    await pageA.screenshot({ path: `${artifactDir}/preferences-settings-desktop.png`, fullPage: true });

    const secondToken = await passwordToken(accountA);
    const secondAccount = { ...accountA, accessToken: secondToken };
    const contextSecond = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "dark", reducedMotion: "reduce" });
    const pageSecond = await contextSecond.newPage();
    await routeLocalAppRequestsWithAccount(pageSecond, baseUrl, secondAccount);
    await pageSecond.goto(`${baseUrl}/settings/preferences`, { waitUntil: "networkidle", timeout: 60_000 });
    assert((await pageSecond.getByLabel("Default Image aspect ratio").inputValue()) === "4:5", "Second session did not receive saved Image ratio.");
    assert((await pageSecond.getByLabel("Default Video resolution").inputValue()) === "1080p", "Second session did not receive saved Video resolution.");
    assert((await pageSecond.getByLabel("Default Video duration").inputValue()) === "20", "Second session did not receive saved Video duration.");
    assert((await pageSecond.getByLabel("Default Video audio").inputValue()) === "off", "Second session did not receive saved Video audio.");
    overflow = await pageSecond.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(overflow <= 1, `390px #220 Settings has horizontal overflow: ${overflow}px.`);
    await pageSecond.screenshot({ path: `${artifactDir}/preferences-settings-mobile-reduced-motion.png`, fullPage: true });

    await pageSecond.goto(`${baseUrl}/create`, { waitUntil: "networkidle", timeout: 60_000 });
    let state = await createState(pageSecond);
    assert(state.mode === "image" && state.aspect === "4:5", `Clean Image draft ignored saved defaults: ${JSON.stringify(state)}`);
    await pageSecond.screenshot({ path: `${artifactDir}/preferences-create-image-mobile.png`, fullPage: true });

    const videoPrefs = {
      outputKind: "video",
      imageAspectRatio: "4:5",
      videoResolution: "1080p",
      videoDurationSeconds: 20,
      videoAudioEnabled: false,
    };
    await savePreferences(secondToken, videoPrefs);
    await pageSecond.goto(`${baseUrl}/create`, { waitUntil: "networkidle", timeout: 60_000 });
    state = await createState(pageSecond);
    assert(state.mode === "video" && state.aspect === "16:9", `Clean Video draft ignored saved mode/default geometry: ${JSON.stringify(state)}`);
    assert(state.video?.includes("Resolution 1080p") && state.video.includes("Duration 20 seconds") && state.video.includes("Audio off"), `Clean Video draft ignored saved Video defaults: ${state.video}`);

    const bPrefs = {
      outputKind: "image",
      imageAspectRatio: "21:9",
      videoResolution: "2K",
      videoDurationSeconds: 30,
      videoAudioEnabled: true,
    };
    await savePreferences(accountB.accessToken, bPrefs);
    const bBefore = JSON.stringify(await serviceRows(`renderlab_account_preferences?owner_id=eq.${encodeURIComponent(accountB.id)}&select=*`));

    const extraOwner = await appJson("/api/account/preferences", secondToken, {
      method: "PUT",
      body: JSON.stringify({ create: videoPrefs, ownerId: accountB.id }),
    });
    assert(extraOwner.response.status === 400 && extraOwner.payload?.error?.code === "account_preferences_invalid", "Preference API accepted browser-supplied owner identity.");
    const bAfter = JSON.stringify(await serviceRows(`renderlab_account_preferences?owner_id=eq.${encodeURIComponent(accountB.id)}&select=*`));
    assert(bAfter === bBefore, "Account A preference mutation changed Account B state.");

    await contextSecond.close();
    await contextA.close();
    console.log("RENDERLAB_220_SETTINGS_CREATE_PORTABILITY=true");
    console.log("RENDERLAB_220_PREFERENCE_ISOLATION=true");
    return { secondToken, bBefore };
  } finally {
    await browser.close();
  }
}

async function seedPrecedenceFixtures(accountA) {
  const now = new Date().toISOString();
  await expectOk(await serviceRest("generation_jobs", {
    method: "POST",
    body: JSON.stringify({
      id: recipeJobId,
      owner_id: accountA.id,
      status: "succeeded",
      operation: "create-video",
      output_kind: "video",
      prompt: `recipe wins ${runToken}`,
      workflow_id: "account-preferences-recipe",
      model: "ltx25-redgraft",
      ecosystem: "ltx25-redgraft",
      inputs: [],
      parameters: {
        model: "ltx25-redgraft",
        output: { kind: "video", aspectRatio: "9:16", resolution: "720p", durationSeconds: 10, audioEnabled: true },
        advanced: { seed: 42, frameRate: 24 },
      },
      created_at: now,
      updated_at: now,
      completed_at: now,
    }),
  }), "Could not seed #220 recipe fixture");

  await putObject(continuationKey, pngBytes);
  await expectOk(await serviceRest("media_assets", {
    method: "POST",
    body: JSON.stringify({
      id: continuationAssetId,
      owner_id: accountA.id,
      kind: "image",
      mime_type: "image/png",
      storage_key: continuationKey,
      thumbnail_storage_key: null,
      origin: "uploaded",
      original_filename: "continuation.png",
      display_name: "Continuation fixture",
      size_bytes: pngBytes.length,
      width: 1,
      height: 1,
      provenance: { source: "user-upload" },
    }),
  }), "Could not seed #220 continuation fixture");
}

async function verifyPrecedenceAndFallback(accountA, secondToken) {
  await seedPrecedenceFixtures(accountA);
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "dark" });
    const page = await context.newPage();
    await routeLocalAppRequestsWithAccount(page, baseUrl, { ...accountA, accessToken: secondToken });

    await page.goto(`${baseUrl}/create?recipe=${recipeJobId}`, { waitUntil: "networkidle", timeout: 60_000 });
    let state = await createState(page);
    assert(state.mode === "video" && state.aspect === "9:16" && state.prompt === `recipe wins ${runToken}`, `Saved recipe did not override preferences: ${JSON.stringify(state)}`);
    assert(state.video?.includes("Resolution 720p") && state.video.includes("Duration 10 seconds") && state.video.includes("Audio on"), `Saved recipe Video settings did not override preferences: ${state.video}`);

    await page.goto(`${baseUrl}/create?source=${continuationAssetId}&action=animate-image`, { waitUntil: "networkidle", timeout: 60_000 });
    state = await createState(page);
    assert(state.mode === "video" && state.aspect === "Original", `Media continuation did not override preference geometry: ${JSON.stringify(state)}`);
    assert(state.video?.includes("Resolution 480p") && state.video.includes("Duration 5 seconds") && state.video.includes("Audio on"), `Media continuation incorrectly inherited account Video defaults: ${state.video}`);

    await context.close();
  } finally {
    await browser.close();
  }

  await expectOk(await serviceRest(`renderlab_account_preferences?owner_id=eq.${encodeURIComponent(accountA.id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      create_output_kind: "obsolete",
      create_image_aspect_ratio: "99:99",
      create_video_resolution: "8K",
      create_video_duration_seconds: 17,
      create_video_audio_enabled: false,
      updated_at: new Date().toISOString(),
    }),
  }), "Could not seed stale #220 preference values");
  const stale = await getPreferences(secondToken);
  assert(stale.source === "saved", "Stale stored row lost its saved-state identity.");
  assert(stale.create.outputKind === "image" && stale.create.imageAspectRatio === "1:1", `Stale Image values did not fall back safely: ${JSON.stringify(stale.create)}`);
  assert(stale.create.videoResolution === "480p" && stale.create.videoDurationSeconds === 5 && stale.create.videoAudioEnabled === false, `Stale Video values did not fall back safely: ${JSON.stringify(stale.create)}`);

  const reset = await appJson("/api/account/preferences", secondToken, { method: "DELETE" });
  assert(reset.response.status === 200 && reset.payload?.preferences?.source === "product-defaults", "Reset did not restore current product-default semantics.");
  const rows = await serviceRows(`renderlab_account_preferences?owner_id=eq.${encodeURIComponent(accountA.id)}&select=owner_id`);
  assert(rows.length === 0, "Reset persisted a snapshot row instead of deleting preferences.");
  console.log("RENDERLAB_220_PRECEDENCE_STALE_RESET=true");
}

async function verifyExportDeletion(accountDelete, accountB, bBefore) {
  const deletePrefs = {
    outputKind: "video",
    imageAspectRatio: "3:2",
    videoResolution: "720p",
    videoDurationSeconds: 15,
    videoAudioEnabled: false,
  };
  await savePreferences(accountDelete.accessToken, deletePrefs);

  const exportResult = await appJson("/api/account/data-export", accountDelete.accessToken, { method: "POST" });
  assert(exportResult.response.status === 200 && exportResult.payload?.export?.status === "ready", `#220 export did not become ready: ${JSON.stringify(exportResult.payload)}`);
  const exportRows = await serviceRows(`renderlab_account_exports?owner_id=eq.${encodeURIComponent(accountDelete.id)}&select=id,storage_key,schema_version&order=requested_at.desc,id.desc&limit=1`);
  const exportRow = exportRows[0];
  assert(exportRow?.schema_version === 3 && exportRow.storage_key, "#220 export row did not record schema v3/private storage.");
  const download = await appFetch("/api/account/data-export/download", accountDelete.accessToken);
  assert(download.status === 302 && download.headers.get("location"), `#220 export download expected 302, got ${download.status}.`);
  const signed = await fetch(download.headers.get("location"));
  assert(signed.ok, `#220 signed export could not be read (${signed.status}).`);
  const exported = await signed.json();
  assert(exported.schemaVersion === 3 && exported.preferences?.source === "saved", "#220 export omitted preference source/version.");
  assert(JSON.stringify(exported.preferences?.create) === JSON.stringify(deletePrefs), `#220 export preference payload mismatch: ${JSON.stringify(exported.preferences?.create)}`);

  const accepted = await appJson("/api/account/delete", accountDelete.accessToken, {
    method: "POST",
    body: JSON.stringify({ currentPassword: accountDelete.password, confirmation: "DELETE" }),
  });
  assert(accepted.response.status === 202 && accepted.payload?.deletion?.state === "deleting", `#220 deletion was not accepted: ${JSON.stringify(accepted.payload)}`);
  await expectOk(await serviceRest(`renderlab_account_lifecycle?user_id=eq.${encodeURIComponent(accountDelete.id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      requested_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      quiescence_until: new Date(Date.now() - 60_000).toISOString(),
      updated_at: new Date().toISOString(),
    }),
  }), "Could not fast-forward #220 deletion fixture");
  const completed = await appJson("/api/account/delete", accountDelete.accessToken, { method: "PUT" });
  assert(completed.response.status === 200 && completed.payload?.process?.state === "complete", `#220 deletion did not complete: ${JSON.stringify(completed.payload)}`);

  const deletedUser = await authAdmin(`users/${encodeURIComponent(accountDelete.id)}`);
  assert(deletedUser.status === 404, `#220 deletion left Auth identity (${deletedUser.status}).`);
  const preferenceResidue = await serviceRows(`renderlab_account_preferences?owner_id=eq.${encodeURIComponent(accountDelete.id)}&select=owner_id`);
  assert(preferenceResidue.length === 0, "#220 deletion left preference residue.");
  assert(!(await objectExists(exportRow.storage_key)), "#220 deletion left private export storage residue.");
  const bAfter = JSON.stringify(await serviceRows(`renderlab_account_preferences?owner_id=eq.${encodeURIComponent(accountB.id)}&select=*`));
  assert(bAfter === bBefore, "Deleting another account changed Account B preferences.");
  console.log("RENDERLAB_220_EXPORT_DELETE_NONINTERFERENCE=true");
}

if (cleanupOnly) {
  await cleanupFixtures();
  process.exit(0);
}

const accounts = [];
let primaryError = null;
try {
  await cleanupFixtures();
  const accountA = await createConfiguredTestAccount(namespaces[0]);
  const accountB = await createConfiguredTestAccount(namespaces[1]);
  const accountDelete = await createConfiguredTestAccount(namespaces[2]);
  accounts.push(accountA, accountB, accountDelete);

  const defaultsA = await getPreferences(accountA.accessToken);
  assert(defaultsA.source === "product-defaults", "Missing preference row did not follow product defaults.");
  assert(defaultsA.create.outputKind === "image" && defaultsA.create.imageAspectRatio === "1:1" && defaultsA.create.videoResolution === "480p" && defaultsA.create.videoDurationSeconds === 5 && defaultsA.create.videoAudioEnabled === true, `Initial effective defaults are incorrect: ${JSON.stringify(defaultsA.create)}`);

  const { secondToken, bBefore } = await verifySettingsAndCreate(accountA, accountB);
  await verifyPrecedenceAndFallback(accountA, secondToken);
  await verifyExportDeletion(accountDelete, accountB, bBefore);
  console.log("RENDERLAB_220_CONFIGURED_ACCEPTANCE=true");
} catch (error) {
  primaryError = error;
} finally {
  try {
    await deleteObject(continuationKey);
    for (const account of accounts) await deletePreferenceRow(account.id);
    await cleanupFixtures(accounts);
  } catch (cleanupError) {
    console.error(cleanupError);
    if (!primaryError) primaryError = cleanupError;
  }
}

if (primaryError) throw primaryError;
