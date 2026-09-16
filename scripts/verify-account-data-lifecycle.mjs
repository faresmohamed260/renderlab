import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { chromium } from "@playwright/test";
import { createHash, createHmac } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { routeLocalAppRequestsWithAccount } from "./lib/configured-test-account.mjs";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const r2Bucket = process.env.R2_BUCKET_NAME;
const cronSecret = process.env.CRON_SECRET;
const runToken = process.env.GITHUB_RUN_ID || "local";
const artifactDir = process.env.RENDERLAB_ACCOUNT_DATA_ARTIFACT_DIR || "artifacts/account-data-lifecycle";
const cleanupOnly = process.argv.includes("--cleanup-only");
const workerBaseUrl = process.env.RENDERLAB_TEST_NATIVE_WORKER_GATEWAY_URL || "http://127.0.0.1:4312";

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: r2Bucket,
  CRON_SECRET: cronSecret,
})) {
  if (!value) throw new Error(`${name} is required for configured account-data lifecycle verification.`);
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

const pngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZgZsAAAAASUVORK5CYII=",
  "base64",
);
const thumbnailBytes = Buffer.from("renderlab-219-thumbnail", "utf8");
const sourceBytes = Buffer.from("renderlab-219-source", "utf8");
const runPrefix = `renderlab/account-lifecycle-ci/${runToken}`;
const profileAvatarBytes = Buffer.from(`renderlab-profile-avatar-${runToken}`, "utf8");

function profileAvatarKey(ownerId) {
  return `renderlab/account-profiles/${ownerId}/avatar.webp`;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function fixtureUuid(label) {
  const bytes = Buffer.from(createHash("sha256").update(`renderlab-219-${runToken}-${label}`).digest().subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function fixtureAccount(label, role = "member") {
  const safe = label.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
  return {
    id: fixtureUuid(`user-${label}`),
    email: `renderlab-219-${safe}-${runToken}@example.com`,
    password: `RenderLab-219-${safe}-${runToken}-Pass!`,
    role,
  };
}

const accountA = fixtureAccount("owner-a");
const accountB = fixtureAccount("owner-b");
const accountC = fixtureAccount("non-mfa");
const accountD = fixtureAccount("admin-allow", "admin");
const accounts = [accountA, accountB, accountC, accountD];

const ids = {
  jobA: fixtureUuid("job-a"),
  orphanJobA: fixtureUuid("orphan-job-a"),
  sourceA: fixtureUuid("source-a"),
  assetA: fixtureUuid("asset-a"),
  collectionA: fixtureUuid("collection-a"),
  reservationA: fixtureUuid("reservation-a"),
  invitationA: fixtureUuid("invitation-a"),
  jobB: fixtureUuid("job-b"),
  assetB: fixtureUuid("asset-b"),
  collectionB: fixtureUuid("collection-b"),
};

const keys = {
  sourceA: `${runPrefix}/a/source.png`,
  mediaA: `${runPrefix}/a/media.png`,
  thumbA: `${runPrefix}/a/thumb.webp`,
  mediaB: `${runPrefix}/b/media.png`,
  thumbB: `${runPrefix}/b/thumb.webp`,
  avatarA: profileAvatarKey(accountA.id),
  avatarB: profileAvatarKey(accountB.id),
  avatarC: profileAvatarKey(accountC.id),
};

function deterministicGenerationAssetId(jobId, outputIndex = 0) {
  const bytes = Buffer.from(
    createHash("sha256")
      .update(`renderlab:generation-output:${jobId}:${outputIndex}`)
      .digest()
      .subarray(0, 16),
  );
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const orphanCreatedAt = new Date().toISOString();
const orphanAssetId = deterministicGenerationAssetId(ids.orphanJobA);
const orphanYear = new Date(orphanCreatedAt).getUTCFullYear();
const orphanMonth = String(new Date(orphanCreatedAt).getUTCMonth() + 1).padStart(2, "0");
const orphanOutputKey = `renderlab/generations/${orphanYear}/${orphanMonth}/${orphanAssetId}.png`;

function decodeBase32(value) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const normalized = value.toUpperCase().replace(/=+$/g, "").replace(/\s+/g, "");
  let bits = "";
  for (const character of normalized) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error("Unexpected TOTP secret encoding.");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
    bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  }
  return Buffer.from(bytes);
}

function currentTotp(secret, timeMs = Date.now()) {
  const counter = BigInt(Math.floor(timeMs / 1000 / 30));
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(counter);
  const digest = createHmac("sha1", decodeBase32(secret)).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

async function authAdmin(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceRoleKey);
  headers.set("authorization", `Bearer ${serviceRoleKey}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/auth/v1/admin/${path}`, { ...init, headers });
}

async function serviceRest(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceRoleKey);
  headers.set("authorization", `Bearer ${serviceRoleKey}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers });
}

async function serviceRows(path) {
  const response = await serviceRest(path);
  if (!response.ok) throw new Error(`Supabase fixture query failed (${response.status}): ${await response.text()}`);
  return response.json();
}

async function expectOk(response, label) {
  if (!response.ok) throw new Error(`${label} (${response.status}): ${await response.text()}`);
  return response;
}

async function appFetch(path, token, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  if (token) headers.set("authorization", `Bearer ${token}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${baseUrl}${path}`, { ...init, headers, redirect: "manual" });
}

async function appJson(path, token, init = {}) {
  const response = await appFetch(path, token, init);
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

async function putObject(key, bytes, contentType = "application/octet-stream") {
  await r2Client.send(new PutObjectCommand({ Bucket: r2Bucket, Key: key, Body: bytes, ContentType: contentType }));
}

async function readObject(key) {
  const result = await r2Client.send(new GetObjectCommand({ Bucket: r2Bucket, Key: key }));
  return Buffer.from(await result.Body.transformToByteArray());
}

async function objectExists(key) {
  try {
    await r2Client.send(new HeadObjectCommand({ Bucket: r2Bucket, Key: key }));
    return true;
  } catch (error) {
    if (error?.name === "NotFound" || error?.name === "NoSuchKey" || error?.$metadata?.httpStatusCode === 404) return false;
    throw error;
  }
}

async function deleteObject(key) {
  await r2Client.send(new DeleteObjectCommand({ Bucket: r2Bucket, Key: key })).catch(() => null);
}

async function createUser(account) {
  const response = await authAdmin("users", {
    method: "POST",
    body: JSON.stringify({
      id: account.id,
      email: account.email,
      password: account.password,
      email_confirm: true,
      app_metadata: { renderlab_fixture: "account-data-lifecycle", run: runToken },
    }),
  });
  if (!response.ok) throw new Error(`Could not create ${account.email} (${response.status}): ${await response.text()}`);
  await expectOk(await serviceRest("renderlab_account_access?on_conflict=user_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      user_id: account.id,
      role: account.role,
      status: "active",
      generation_enabled: true,
      max_active_jobs: 4,
      max_jobs_per_hour: 120,
    }),
  }), `Could not create access row for ${account.email}`);
}

async function passwordToken(account) {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: publishableKey, "content-type": "application/json" },
    body: JSON.stringify({ email: account.email, password: account.password }),
  });
  if (!response.ok) throw new Error(`Could not sign in ${account.email} (${response.status}): ${await response.text()}`);
  const payload = await response.json();
  assert(typeof payload.access_token === "string" && payload.access_token.length > 20, `Missing token for ${account.email}.`);
  return payload.access_token;
}

async function enrollTotpAndGetAal2(account) {
  const client = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const signedIn = await client.auth.signInWithPassword({ email: account.email, password: account.password });
  if (signedIn.error) throw signedIn.error;
  const enrollment = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: `RenderLab #219 ${runToken}` });
  if (enrollment.error) throw enrollment.error;
  let lastError = null;
  for (const offset of [0, -30_000, 30_000]) {
    const verified = await client.auth.mfa.challengeAndVerify({
      factorId: enrollment.data.id,
      code: currentTotp(enrollment.data.totp.secret, Date.now() + offset),
    });
    if (!verified.error) {
      const session = await client.auth.getSession();
      if (session.error) throw session.error;
      const accessToken = session.data.session?.access_token;
      assert(accessToken, "AAL2 challenge did not return an access token.");
      return { accessToken, factorId: enrollment.data.id };
    }
    lastError = verified.error;
  }
  throw lastError ?? new Error("Could not verify #219 TOTP fixture.");
}

async function factorCount(userId) {
  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { data, error } = await service.auth.admin.mfa.listFactors({ userId });
  if (error) throw error;
  return data.factors.length;
}

async function cleanupOwner(ownerId) {
  const encoded = encodeURIComponent(ownerId);
  const [uploads, assets, sources, exports] = await Promise.all([
    serviceRows(`media_upload_sessions?owner_id=eq.${encoded}&select=storage_key`).catch(() => []),
    serviceRows(`media_assets?owner_id=eq.${encoded}&select=storage_key,thumbnail_storage_key`).catch(() => []),
    serviceRows(`generation_sources?owner_id=eq.${encoded}&select=storage_key`).catch(() => []),
    serviceRows(`renderlab_account_exports?owner_id=eq.${encoded}&select=storage_key`).catch(() => []),
  ]);
  for (const key of new Set([
    profileAvatarKey(ownerId),
    ...uploads.map((row) => row.storage_key),
    ...assets.flatMap((row) => [row.storage_key, row.thumbnail_storage_key]),
    ...sources.map((row) => row.storage_key),
    ...exports.map((row) => row.storage_key),
  ].filter(Boolean))) {
    await deleteObject(key);
  }

  for (const table of [
    "media_collection_items",
    "media_collections",
    "media_upload_sessions",
    "media_assets",
    "generation_sources",
    "generation_admission_reservations",
    "generation_jobs",
    "renderlab_account_exports",
    "renderlab_account_profiles",
  ]) {
    await serviceRest(`${table}?owner_id=eq.${encoded}`, { method: "DELETE" }).catch(() => null);
  }
  await serviceRest(`renderlab_account_lifecycle?user_id=eq.${encoded}`, { method: "DELETE" }).catch(() => null);
  await serviceRest(`renderlab_account_access?user_id=eq.${encoded}`, { method: "DELETE" }).catch(() => null);
  const userDelete = await authAdmin(`users/${encoded}`, { method: "DELETE" });
  if (!userDelete.ok && userDelete.status !== 404) {
    throw new Error(`Could not clean Auth fixture ${ownerId} (${userDelete.status}): ${await userDelete.text()}`);
  }
}

async function cleanupFixtures() {
  await serviceRest(`renderlab_beta_invitations?id=eq.${encodeURIComponent(ids.invitationA)}`, { method: "DELETE" }).catch(() => null);
  await deleteObject(keys.sourceA);
  await deleteObject(keys.mediaA);
  await deleteObject(keys.thumbA);
  await deleteObject(keys.mediaB);
  await deleteObject(keys.thumbB);
  await deleteObject(keys.avatarA);
  await deleteObject(keys.avatarB);
  await deleteObject(keys.avatarC);
  await deleteObject(orphanOutputKey);
  for (const account of accounts) await cleanupOwner(account.id);
  console.log("RENDERLAB_219_FIXTURE_CLEAN=true");
}

async function seedProductData() {
  const now = new Date().toISOString();
  await putObject(keys.sourceA, sourceBytes, "image/png");
  await putObject(keys.mediaA, pngBytes, "image/png");
  await putObject(keys.thumbA, thumbnailBytes, "image/webp");
  await putObject(keys.mediaB, pngBytes, "image/png");
  await putObject(keys.thumbB, thumbnailBytes, "image/webp");
  await putObject(keys.avatarA, profileAvatarBytes, "image/webp");
  await putObject(keys.avatarB, profileAvatarBytes, "image/webp");
  await putObject(keys.avatarC, profileAvatarBytes, "image/webp");
  await putObject(orphanOutputKey, pngBytes, "image/png");

  await expectOk(await serviceRest("renderlab_account_profiles", {
    method: "POST",
    body: JSON.stringify([
      {
        owner_id: accountA.id,
        display_name: "Profile Owner A",
        avatar_state: "active",
        avatar_content_type: "image/webp",
        avatar_size_bytes: profileAvatarBytes.length,
        avatar_width: 512,
        avatar_height: 512,
        avatar_updated_at: now,
      },
      {
        owner_id: accountB.id,
        display_name: "Profile Sentinel B",
        avatar_state: "active",
        avatar_content_type: "image/webp",
        avatar_size_bytes: profileAvatarBytes.length,
        avatar_width: 512,
        avatar_height: 512,
        avatar_updated_at: now,
      },
      {
        owner_id: accountC.id,
        display_name: "Purge Pending C",
        avatar_state: "purge_pending",
        avatar_content_type: null,
        avatar_size_bytes: null,
        avatar_width: null,
        avatar_height: null,
        avatar_updated_at: null,
      },
    ]),
  }), "Could not seed account profile fixtures");

  await expectOk(await serviceRest("generation_jobs", {
    method: "POST",
    body: JSON.stringify([
      {
        id: ids.jobA,
        owner_id: accountA.id,
        status: "succeeded",
        operation: "create-image",
        output_kind: "image",
        prompt: `private prompt A ${runToken}`,
        workflow_id: "account-data-lifecycle-fixture",
        model: "fixture-model-a",
        ecosystem: "flux2-klein-9b",
        parameters: { output: { kind: "image", aspectRatio: "1:1" }, advanced: { seed: 219 } },
        created_at: now,
        updated_at: now,
        completed_at: now,
      },
      {
        id: ids.orphanJobA,
        owner_id: accountA.id,
        status: "failed",
        operation: "create-image",
        output_kind: "image",
        prompt: `orphan candidate A ${runToken}`,
        workflow_id: "account-data-lifecycle-orphan",
        model: "fixture-model-a",
        ecosystem: "flux2-klein-9b",
        parameters: {},
        created_at: orphanCreatedAt,
        updated_at: orphanCreatedAt,
        completed_at: orphanCreatedAt,
      },
      {
        id: ids.jobB,
        owner_id: accountB.id,
        status: "succeeded",
        operation: "create-image",
        output_kind: "image",
        prompt: `sentinel prompt B ${runToken}`,
        workflow_id: "account-data-lifecycle-sentinel",
        model: "fixture-model-b",
        ecosystem: "flux2-klein-9b",
        parameters: {},
        created_at: now,
        updated_at: now,
        completed_at: now,
      },
    ]),
  }), "Could not seed generation jobs");

  await expectOk(await serviceRest("generation_sources", {
    method: "POST",
    body: JSON.stringify({
      id: ids.sourceA,
      owner_id: accountA.id,
      storage_key: keys.sourceA,
      filename: "private-source-a.png",
      mime_type: "image/png",
      size_bytes: sourceBytes.length,
      width: 1,
      height: 1,
      purpose: "reference",
      status: "ready",
    }),
  }), "Could not seed generation source");

  await expectOk(await serviceRest("media_assets", {
    method: "POST",
    body: JSON.stringify([
      {
        id: ids.assetA,
        owner_id: accountA.id,
        kind: "image",
        mime_type: "image/png",
        storage_key: keys.mediaA,
        thumbnail_storage_key: keys.thumbA,
        origin: "uploaded",
        original_filename: "private-a.png",
        display_name: "Private A",
        size_bytes: pngBytes.length,
        width: 1,
        height: 1,
        favorited_at: now,
        provenance: { source: "user-upload" },
      },
      {
        id: ids.assetB,
        owner_id: accountB.id,
        kind: "image",
        mime_type: "image/png",
        storage_key: keys.mediaB,
        thumbnail_storage_key: keys.thumbB,
        origin: "uploaded",
        original_filename: "sentinel-b.png",
        display_name: "Sentinel B",
        size_bytes: pngBytes.length,
        width: 1,
        height: 1,
        favorited_at: null,
        provenance: { source: "user-upload" },
      },
    ]),
  }), "Could not seed durable media");

  await expectOk(await serviceRest("media_upload_sessions", {
    method: "POST",
    body: JSON.stringify({
      owner_id: accountA.id,
      storage_key: keys.mediaA,
      filename: "private-a.png",
      display_name: "Private A",
      mime_type: "image/png",
      size_bytes: pngBytes.length,
      status: "completed",
      media_asset_id: ids.assetA,
    }),
  }), "Could not seed upload session");

  await expectOk(await serviceRest("media_collections", {
    method: "POST",
    body: JSON.stringify([
      { id: ids.collectionA, owner_id: accountA.id, name: "Private A collection" },
      { id: ids.collectionB, owner_id: accountB.id, name: "Sentinel B collection" },
    ]),
  }), "Could not seed collections");

  await expectOk(await serviceRest("media_collection_items", {
    method: "POST",
    body: JSON.stringify({ collection_id: ids.collectionA, media_asset_id: ids.assetA, owner_id: accountA.id }),
  }), "Could not seed collection item");

  await expectOk(await serviceRest("generation_admission_reservations", {
    method: "POST",
    body: JSON.stringify({
      id: ids.reservationA,
      owner_id: accountA.id,
      admitted_at: now,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      job_id: ids.jobA,
      released_at: now,
    }),
  }), "Could not seed admission reservation");

  await expectOk(await serviceRest("renderlab_beta_invitations", {
    method: "POST",
    body: JSON.stringify({
      id: ids.invitationA,
      normalized_email: accountA.email.toLowerCase(),
      role: "member",
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      claimed_at: now,
      claimed_user_id: accountA.id,
    }),
  }), "Could not seed claimed invitation");
}

async function verifySettingsVisual(tokenA) {
  await mkdir(artifactDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1024 }, colorScheme: "dark" });
    const page = await context.newPage();
    await routeLocalAppRequestsWithAccount(page, baseUrl, { accessToken: tokenA });
    await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle", timeout: 60_000 });
    await page.getByText("Account data export", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
    assert(await page.getByText("Data use", { exact: true }).isVisible(), "Settings is missing Data use transparency.");
    assert(await page.getByRole("button", { name: "Delete account", exact: true }).isVisible(), "Settings is missing Delete account.");
    let overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(overflow <= 1, `Desktop #219 Settings has horizontal overflow: ${overflow}px.`);
    await page.screenshot({ path: `${artifactDir}/settings-data-privacy-desktop.png`, fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(overflow <= 1, `390px #219 Settings has horizontal overflow: ${overflow}px.`);
    const deleteButton = page.getByRole("button", { name: "Delete account", exact: true });
    await deleteButton.scrollIntoViewIfNeeded();
    await deleteButton.click();
    await page.getByRole("heading", { name: "Permanently delete this RenderLab account?", exact: true }).waitFor({ state: "visible" });
    assert(await page.getByLabel("Type DELETE").isVisible(), "Delete dialog is missing typed confirmation.");
    assert(await page.getByLabel("Current password").isVisible(), "Delete dialog is missing current-password proof.");
    overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(overflow <= 1, `390px #219 delete dialog has horizontal overflow: ${overflow}px.`);
    await page.screenshot({ path: `${artifactDir}/settings-data-privacy-mobile-dialog.png`, fullPage: true });
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await context.close();
  } finally {
    await browser.close();
  }
  console.log("RENDERLAB_219_SETTINGS_DESKTOP_MOBILE=true");
}

async function patchAccessStatus(userId, status) {
  return serviceRest(`renderlab_account_access?user_id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
  });
}

async function fastForwardDeletion(userId) {
  const requestedAt = new Date(Date.now() - 8 * 60 * 1000).toISOString();
  const quiescenceUntil = new Date(Date.now() - 60 * 1000).toISOString();
  await expectOk(await serviceRest(`renderlab_account_lifecycle?user_id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: JSON.stringify({ requested_at: requestedAt, quiescence_until: quiescenceUntil, updated_at: new Date().toISOString() }),
  }), `Could not fast-forward deletion ${userId}`);
}

async function completeSimpleDeletion(account, token) {
  await fastForwardDeletion(account.id);
  const { response, payload } = await appJson("/api/account/delete", token, { method: "PUT" });
  assert(response.status === 200 && payload?.process?.state === "complete", `${account.email} deletion did not complete after quiescence.`);
}

if (cleanupOnly) {
  await cleanupFixtures();
  process.exit(0);
}

let primaryError = null;
try {
  await cleanupFixtures();
  for (const account of accounts) await createUser(account);
  const tokenAInitial = await passwordToken(accountA);
  const tokenB = await passwordToken(accountB);
  await passwordToken(accountC);
  await seedProductData();
  await verifySettingsVisual(tokenAInitial);

  const bFactorCountBefore = await factorCount(accountB.id);
  const bAssetBefore = JSON.stringify(await serviceRows(`media_assets?owner_id=eq.${encodeURIComponent(accountB.id)}&select=*&order=id.asc`));
  const bJobBefore = JSON.stringify(await serviceRows(`generation_jobs?owner_id=eq.${encodeURIComponent(accountB.id)}&select=*&order=id.asc`));
  const bMediaBefore = await readObject(keys.mediaB);
  const bThumbBefore = await readObject(keys.thumbB);
  const bProfileBefore = JSON.stringify(await serviceRows(`renderlab_account_profiles?owner_id=eq.${encodeURIComponent(accountB.id)}&select=*`));
  const bAvatarBefore = await readObject(keys.avatarB);

  const mfaA = await enrollTotpAndGetAal2(accountA);
  const tokenAAal1 = await passwordToken(accountA);
  const aal1Export = await appJson("/api/account/data-export", tokenAAal1, { method: "POST" });
  assert(aal1Export.response.status === 403 && aal1Export.payload?.error?.code === "mfa_required", "MFA-enrolled AAL1 export was not blocked.");

  const firstExport = await appJson("/api/account/data-export", mfaA.accessToken, { method: "POST" });
  assert(firstExport.response.status === 200 && firstExport.payload?.export?.status === "failed", "Injected export write failure did not produce a retryable failed export.");
  const secondExport = await appJson("/api/account/data-export", mfaA.accessToken, { method: "POST" });
  assert(secondExport.response.status === 200 && secondExport.payload?.export?.status === "ready", "Export did not converge after the injected R2 write failure.");
  const exportId = secondExport.payload.export.id;
  const exportRows = await serviceRows(`renderlab_account_exports?id=eq.${encodeURIComponent(exportId)}&select=*`);
  const exportRow = exportRows[0];
  assert(exportRow?.storage_key, "Ready export is missing its private R2 key.");

  const bDownload = await appFetch("/api/account/data-export/download", tokenB);
  assert(bDownload.status === 404, `Account B unexpectedly resolved account A export (${bDownload.status}).`);
  const aDownload = await appFetch("/api/account/data-export/download", mfaA.accessToken);
  assert(aDownload.status === 302, `Account A export download expected 302, got ${aDownload.status}.`);
  const signedExportResponse = await fetch(aDownload.headers.get("location"));
  assert(signedExportResponse.ok, `Signed export object could not be read (${signedExportResponse.status}).`);
  const exported = await signedExportResponse.json();
  assert(exported.schemaVersion === 2, "Export schema version mismatch.");
  assert(exported.account?.userId === accountA.id && exported.account?.email === accountA.email, "Export identity mismatch.");
  assert(exported.profile?.displayName === "Profile Owner A", "Export is missing profile display identity.");
  assert(exported.profile?.avatar?.state === "active", "Export is missing active profile-avatar state.");
  assert(exported.profile?.avatar?.contentType === "image/webp" && exported.profile?.avatar?.width === 512 && exported.profile?.avatar?.height === 512, "Export profile-avatar metadata is incorrect.");
  assert(exported.profile?.avatar?.downloadPath === "/api/account/profile/avatar", "Export profile-avatar download path is not owner-authenticated.");
  assert(exported.generationJobs?.some((row) => row.id === ids.jobA && row.prompt?.includes("private prompt A")), "Export is missing generation prompt/history.");
  assert(exported.generationSources?.some((row) => row.id === ids.sourceA), "Export is missing source metadata.");
  assert(exported.mediaAssets?.some((row) => row.id === ids.assetA && row.favorited_at), "Export is missing durable media/Favorite state.");
  assert(exported.mediaUploadSessions?.length >= 1, "Export is missing upload-session state.");
  assert(exported.collections?.some((row) => row.id === ids.collectionA), "Export is missing Collections.");
  assert(exported.collectionItems?.some((row) => row.collection_id === ids.collectionA && row.media_asset_id === ids.assetA), "Export is missing Collection membership.");
  assert(exported.generationAdmissionReservations?.some((row) => row.id === ids.reservationA), "Export is missing admission reservation state.");
  assert(Array.isArray(exported.sessions) && exported.sessions.length >= 1, "Export is missing current session metadata.");
  assert(Array.isArray(exported.mfa) && exported.mfa.length === 1 && exported.mfa[0].type === "totp", "Export is missing sanitized MFA metadata.");
  assert(exported.claimedInvitations?.some((row) => row.id === ids.invitationA), "Export is missing claimed invitation state.");
  assert(exported.durableMediaManifest?.some((row) => row.assetId === ids.assetA && row.downloadPath === `/api/media/assets/${ids.assetA}/download`), "Export durable-media manifest is incorrect.");
  assert(exported.retentionAndProcessing?.renderLabModelTraining === false, "Export does not state RenderLab's no-model-training policy.");
  const exportedText = JSON.stringify(exported);
  for (const forbidden of [keys.sourceA, keys.mediaA, keys.thumbA, keys.avatarA, serviceRoleKey, "provider_job_id", "refresh_token", "access_token"]) {
    assert(!exportedText.includes(forbidden), `Export leaked forbidden internal/secret material: ${forbidden.slice(0, 24)}.`);
  }
  assert(!exportedText.includes(accountB.id) && !exportedText.includes("sentinel prompt B"), "Export leaked Account B state.");
  console.log("RENDERLAB_219_EXPORT_CORRECTNESS=true");

  await expectOk(await serviceRest(`renderlab_account_exports?id=eq.${encodeURIComponent(exportId)}`, {
    method: "PATCH",
    body: JSON.stringify({ expires_at: new Date(Date.now() - 60_000).toISOString(), updated_at: new Date().toISOString() }),
  }), "Could not age export fixture");
  const expiredDownload = await appFetch("/api/account/data-export/download", mfaA.accessToken);
  assert(expiredDownload.status === 404, "Logically expired export remained downloadable.");
  const unauthMaintenance = await fetch(`${baseUrl}/api/internal/maintenance`, { redirect: "manual" });
  assert(unauthMaintenance.status === 401, "Maintenance cron endpoint accepted an unauthenticated request.");
  const maintenance = await fetch(`${baseUrl}/api/internal/maintenance`, {
    headers: { authorization: `Bearer ${cronSecret}` },
  });
  assert(maintenance.ok, `Configured maintenance pass failed (${maintenance.status}): ${await maintenance.text()}`);
  const expiredRows = await serviceRows(`renderlab_account_exports?id=eq.${encodeURIComponent(exportId)}&select=status,storage_key`);
  assert(expiredRows[0]?.status === "expired" && expiredRows[0]?.storage_key === null, "Maintenance did not expire and detach export storage.");
  assert(!(await objectExists(exportRow.storage_key)), "Maintenance did not physically purge the expired export artifact.");
  assert(!(await objectExists(keys.avatarC)), "Maintenance did not purge the pending profile avatar.");
  const profileCRows = await serviceRows(`renderlab_account_profiles?owner_id=eq.${encodeURIComponent(accountC.id)}&select=avatar_state,avatar_content_type,avatar_size_bytes,avatar_width,avatar_height,avatar_updated_at`);
  assert(profileCRows[0]?.avatar_state === "none", "Maintenance did not settle purge-pending profile avatar state.");
  assert(profileCRows[0]?.avatar_content_type === null && profileCRows[0]?.avatar_size_bytes === null && profileCRows[0]?.avatar_width === null && profileCRows[0]?.avatar_height === null && profileCRows[0]?.avatar_updated_at === null, "Maintenance left profile avatar metadata after purge.");
  console.log("RENDERLAB_223_PROFILE_PURGE_MAINTENANCE=true");
  console.log("RENDERLAB_219_EXPORT_EXPIRY_PURGED=true");

  await expectOk(await patchAccessStatus(accountA.id, "suspended"), "Could not suspend A for export policy check");
  const suspendedExport = await appJson("/api/account/data-export", mfaA.accessToken, { method: "POST" });
  assert(suspendedExport.response.status === 200 && suspendedExport.payload?.export?.status === "ready", "Suspended account could not prepare its allowed data export.");
  const suspendedDownload = await appFetch("/api/account/data-export/download", mfaA.accessToken);
  assert(suspendedDownload.status === 302, "Suspended account could not download its allowed data export.");
  await expectOk(await patchAccessStatus(accountA.id, "active"), "Could not restore A before deletion fixture");

  const preissuedTicketResult = await appJson("/api/media/uploads/upload-tickets", mfaA.accessToken, {
    method: "POST",
    body: JSON.stringify({ filename: "late-write.png", displayName: "Late write", mimeType: "image/png", sizeBytes: pngBytes.length }),
  });
  assert(preissuedTicketResult.response.status === 201 && preissuedTicketResult.payload?.ticket?.uploadUrl, "Could not issue pre-deletion upload ticket.");
  const preissuedTicket = preissuedTicketResult.payload.ticket;
  const pendingUploadRows = await serviceRows(`media_upload_sessions?id=eq.${encodeURIComponent(preissuedTicket.uploadId)}&select=storage_key`);
  const lateUploadKey = pendingUploadRows[0]?.storage_key;
  assert(lateUploadKey, "Preissued upload fixture is missing its storage key.");

  const activeGeneration = await appJson("/api/generation/jobs", mfaA.accessToken, {
    method: "POST",
    body: JSON.stringify({ prompt: `active deletion fixture ${runToken}`, output: { kind: "image", aspectRatio: "1:1" }, inputs: [] }),
  });
  assert(activeGeneration.response.status === 202 && activeGeneration.payload?.ok === true, `Could not start active generation fixture: ${JSON.stringify(activeGeneration.payload)}`);
  const activeJobId = activeGeneration.payload.job.id;
  const activeJobRows = await serviceRows(`generation_jobs?id=eq.${encodeURIComponent(activeJobId)}&owner_id=eq.${encodeURIComponent(accountA.id)}&select=provider_job_id,status`);
  const providerJobId = activeJobRows[0]?.provider_job_id;
  assert(providerJobId && activeJobRows[0]?.status === "running", "Active job fixture was not dispatched to the mock worker.");

  const aal1Delete = await appJson("/api/account/delete", tokenAAal1, {
    method: "POST",
    body: JSON.stringify({ currentPassword: accountA.password, confirmation: "DELETE" }),
  });
  assert(aal1Delete.response.status === 403 && aal1Delete.payload?.error?.code === "mfa_recent_step_up_required", "MFA-enrolled AAL1 deletion was not blocked.");
  const wrongPasswordDelete = await appJson("/api/account/delete", mfaA.accessToken, {
    method: "POST",
    body: JSON.stringify({ currentPassword: `${accountA.password}-wrong`, confirmation: "DELETE" }),
  });
  assert(wrongPasswordDelete.response.status === 403 && wrongPasswordDelete.payload?.error?.code === "password_reauthentication_failed", "Wrong current password was not rejected.");
  const acceptedDelete = await appJson("/api/account/delete", mfaA.accessToken, {
    method: "POST",
    body: JSON.stringify({ currentPassword: accountA.password, confirmation: "DELETE" }),
  });
  assert(acceptedDelete.response.status === 202 && acceptedDelete.payload?.deletion?.state === "deleting", "Protected deletion was not accepted after fresh password + TOTP step-up.");
  assert(acceptedDelete.payload?.process?.state === "quiescing", `Deletion should initially quiesce, got ${JSON.stringify(acceptedDelete.payload?.process)}.`);

  const lifecycleRows = await serviceRows(`renderlab_account_lifecycle?user_id=eq.${encodeURIComponent(accountA.id)}&select=*`);
  assert(lifecycleRows[0]?.notification_attempted_at, "Deletion did not attempt its security notification before Auth removal.");
  assert(["accepted", "failed"].includes(lifecycleRows[0]?.notification_state), "Deletion notification outcome was not recorded safely.");
  const accessRowsAfterFreeze = await serviceRows(`renderlab_account_access?user_id=eq.${encodeURIComponent(accountA.id)}&select=status`);
  assert(accessRowsAfterFreeze[0]?.status === "suspended", "Deletion freeze did not suspend product access atomically.");

  const workerStateResponse = await fetch(`${workerBaseUrl}/jobs/${encodeURIComponent(providerJobId)}/state`);
  const workerState = await workerStateResponse.json();
  assert(workerState.cancelled === true && workerState.cancelAttempts >= 1, "Deletion did not settle/cancel the active provider job before cleanup.");

  const latePut = await fetch(preissuedTicket.uploadUrl, {
    method: "PUT",
    headers: preissuedTicket.headers,
    body: pngBytes,
  });
  assert(latePut.ok, `Pre-issued upload URL did not remain valid during its signed window (${latePut.status}).`);
  assert(await objectExists(lateUploadKey), "Late upload object was not written after deletion freeze.");

  const blockedUpload = await appFetch("/api/media/uploads/upload-tickets", mfaA.accessToken, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ filename: "blocked.png", mimeType: "image/png", sizeBytes: pngBytes.length }),
  });
  assert(blockedUpload.status === 401, `Deleting account unexpectedly received a new upload ticket (${blockedUpload.status}).`);
  const blockedGeneration = await appFetch("/api/generation/jobs", mfaA.accessToken, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt: "must be blocked", output: { kind: "image", aspectRatio: "1:1" }, inputs: [] }),
  });
  assert(blockedGeneration.status === 403, `Deleting account unexpectedly started new generation (${blockedGeneration.status}).`);
  const blockedExport = await appJson("/api/account/data-export", mfaA.accessToken, { method: "POST" });
  assert(blockedExport.response.status === 409 && blockedExport.payload?.error?.code === "account_deletion_in_progress", "Deleting account unexpectedly created a new export.");

  for (const table of [
    "generation_sources",
    "generation_jobs",
    "media_assets",
    "media_upload_sessions",
    "media_collections",
    "media_collection_items",
    "generation_admission_reservations",
    "renderlab_account_exports",
    "renderlab_account_profiles",
  ]) {
    const response = await serviceRest(table, { method: "POST", body: JSON.stringify({ owner_id: accountA.id }) });
    const detail = await response.text();
    assert(!response.ok && detail.includes("renderlab_account_deleting"), `${table} service-role insert was not blocked by the deletion guard.`);
  }
  const reactivation = await patchAccessStatus(accountA.id, "active");
  const reactivationDetail = await reactivation.text();
  assert(!reactivation.ok && reactivationDetail.includes("renderlab_account_deleting"), "Deleting account could be reactivated through service-role access mutation.");

  const bTicket = await appJson("/api/media/uploads/upload-tickets", tokenB, {
    method: "POST",
    body: JSON.stringify({ filename: "b-still-works.png", mimeType: "image/png", sizeBytes: pngBytes.length }),
  });
  assert(bTicket.response.status === 201, "Account B could not continue ordinary work while A was deleting.");
  const bTicketRows = await serviceRows(`media_upload_sessions?id=eq.${encodeURIComponent(bTicket.payload.ticket.uploadId)}&select=id`);
  assert(bTicketRows.length === 1, "Account B normal work did not persist its own upload session.");
  await expectOk(await serviceRest(`media_upload_sessions?id=eq.${encodeURIComponent(bTicket.payload.ticket.uploadId)}`, { method: "DELETE" }), "Could not remove B continuity upload session");
  console.log("RENDERLAB_219_FREEZE_RACE_GUARDS=true");

  await fastForwardDeletion(accountA.id);
  const retryR2 = await appJson("/api/account/delete", mfaA.accessToken, { method: "PUT" });
  assert(retryR2.response.status === 202 && retryR2.payload?.process?.state === "retry" && retryR2.payload?.process?.code === "account_test_fault_r2_delete", "Injected R2 deletion failure did not leave deletion retryable.");
  assert(await objectExists(lateUploadKey), "R2 failure fixture unexpectedly removed the late upload before retry.");

  const retryDatabase = await appJson("/api/account/delete", mfaA.accessToken, { method: "PUT" });
  assert(retryDatabase.response.status === 202 && retryDatabase.payload?.process?.code === "account_test_fault_database_finalize", "Injected database finalizer failure did not leave deletion retryable.");
  assert(!(await objectExists(lateUploadKey)) && !(await objectExists(orphanOutputKey)), "Storage cleanup did not remove late/orphan objects before the database finalizer retry.");
  assert(!(await objectExists(keys.avatarA)), "Storage cleanup did not remove the private profile avatar before database finalization.");
  const aMediaStillPresent = await serviceRows(`media_assets?owner_id=eq.${encodeURIComponent(accountA.id)}&select=id&limit=1`);
  assert(aMediaStillPresent.length === 1, "Database product rows disappeared before finalizer commit.");

  const retryAuth = await appJson("/api/account/delete", mfaA.accessToken, { method: "PUT" });
  assert(retryAuth.response.status === 202 && retryAuth.payload?.process?.code === "account_test_fault_auth_delete", "Injected Auth deletion failure did not leave deletion retryable.");
  const aMediaAfterFinalize = await serviceRows(`media_assets?owner_id=eq.${encodeURIComponent(accountA.id)}&select=id&limit=1`);
  assert(aMediaAfterFinalize.length === 0, "Product rows remained after successful transactional finalizer.");
  const userStillExists = await authAdmin(`users/${encodeURIComponent(accountA.id)}`);
  assert(userStillExists.ok, "Auth identity disappeared despite injected post-product-cleanup Auth failure.");
  const invitationAfterFinalize = await serviceRows(`renderlab_beta_invitations?id=eq.${encodeURIComponent(ids.invitationA)}&select=normalized_email,claimed_user_id,deidentified_at`);
  assert(invitationAfterFinalize[0]?.claimed_user_id === null && invitationAfterFinalize[0]?.deidentified_at, "Claimed invitation was not de-identified during product cleanup.");
  assert(invitationAfterFinalize[0]?.normalized_email !== accountA.email.toLowerCase(), "De-identified invitation retained the deleted account email.");

  const completeA = await appJson("/api/account/delete", mfaA.accessToken, { method: "PUT" });
  assert(completeA.response.status === 200 && completeA.payload?.process?.state === "complete", "Deletion did not converge after all injected boundary failures.");
  const staleAfterDelete = await appFetch("/api/account/delete", mfaA.accessToken, { method: "PUT" });
  assert(staleAfterDelete.status === 401, "Deleted Auth identity still authorized account lifecycle requests.");
  const deletedA = await authAdmin(`users/${encodeURIComponent(accountA.id)}`);
  assert(deletedA.status === 404, `Auth identity A still exists after final deletion (${deletedA.status}).`);
  for (const table of [
    "generation_jobs",
    "generation_sources",
    "media_assets",
    "media_upload_sessions",
    "media_collections",
    "media_collection_items",
    "generation_admission_reservations",
    "renderlab_account_exports",
    "renderlab_account_profiles",
  ]) {
    const rows = await serviceRows(`${table}?owner_id=eq.${encodeURIComponent(accountA.id)}&select=*&limit=1`);
    assert(rows.length === 0, `Owner A residue remains in ${table}.`);
  }
  const aAccess = await serviceRows(`renderlab_account_access?user_id=eq.${encodeURIComponent(accountA.id)}&select=user_id`);
  const aLifecycle = await serviceRows(`renderlab_account_lifecycle?user_id=eq.${encodeURIComponent(accountA.id)}&select=user_id`);
  assert(aAccess.length === 0 && aLifecycle.length === 0, "Account access/lifecycle did not cascade with Auth deletion.");
  console.log("RENDERLAB_219_RETRY_IDEMPOTENCY_RESIDUE=true");

  const bAssetAfter = JSON.stringify(await serviceRows(`media_assets?owner_id=eq.${encodeURIComponent(accountB.id)}&select=*&order=id.asc`));
  const bJobAfter = JSON.stringify(await serviceRows(`generation_jobs?owner_id=eq.${encodeURIComponent(accountB.id)}&select=*&order=id.asc`));
  assert(bAssetAfter === bAssetBefore && bJobAfter === bJobBefore, "Account B sentinel database state changed during A deletion.");
  assert(Buffer.compare(await readObject(keys.mediaB), bMediaBefore) === 0, "Account B media object changed during A deletion.");
  assert(Buffer.compare(await readObject(keys.thumbB), bThumbBefore) === 0, "Account B thumbnail object changed during A deletion.");
  const bProfileAfter = JSON.stringify(await serviceRows(`renderlab_account_profiles?owner_id=eq.${encodeURIComponent(accountB.id)}&select=*`));
  assert(bProfileAfter === bProfileBefore, "Account B profile metadata changed during A deletion.");
  assert(Buffer.compare(await readObject(keys.avatarB), bAvatarBefore) === 0, "Account B profile avatar changed during A deletion.");
  assert(await factorCount(accountB.id) === bFactorCountBefore, "Account B MFA state changed during A deletion.");
  const bStillAuthorized = await appFetch("/api/media/assets?limit=24", tokenB);
  assert(bStillAuthorized.status === 200, "Account B session/access stopped working during A deletion.");
  console.log("RENDERLAB_223_PROFILE_EXPORT_DELETE_NONINTERFERENCE=true");
  console.log("RENDERLAB_219_CROSS_ACCOUNT_NON_INTERFERENCE=true");

  const tokenC = await passwordToken(accountC);
  const deleteC = await appJson("/api/account/delete", tokenC, {
    method: "POST",
    body: JSON.stringify({ currentPassword: accountC.password, confirmation: "DELETE" }),
  });
  assert(deleteC.response.status === 202 && deleteC.payload?.error == null, "Ordinary non-MFA member was incorrectly forced to enroll MFA before deletion.");
  await completeSimpleDeletion(accountC, tokenC);
  const deletedC = await authAdmin(`users/${encodeURIComponent(accountC.id)}`);
  assert(deletedC.status === 404, "Non-MFA ordinary member deletion did not complete.");
  console.log("RENDERLAB_219_NON_MFA_DELETE=true");

  const mfaD = await enrollTotpAndGetAal2(accountD);
  const deleteD = await appJson("/api/account/delete", mfaD.accessToken, {
    method: "POST",
    body: JSON.stringify({ currentPassword: accountD.password, confirmation: "DELETE" }),
  });
  assert(deleteD.response.status === 202, `Admin fixture could not self-delete while another active Admin remained (${deleteD.response.status}).`);
  await completeSimpleDeletion(accountD, mfaD.accessToken);
  const deletedD = await authAdmin(`users/${encodeURIComponent(accountD.id)}`);
  assert(deletedD.status === 404, "Protected Admin deletion did not complete with another active Admin present.");
  console.log("RENDERLAB_219_ADMIN_DELETE_ALLOW=true");

  console.log("RENDERLAB_219_CONFIGURED_ACCEPTANCE=true");
} catch (error) {
  primaryError = error;
} finally {
  try {
    await cleanupFixtures();
  } catch (cleanupError) {
    console.error(cleanupError);
    if (!primaryError) primaryError = cleanupError;
  }
}

if (primaryError) throw primaryError;
