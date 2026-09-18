import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { spawnSync } from "node:child_process";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { configuredTestAccountIdentity } from "./lib/configured-test-account.mjs";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "https://renderlab.faresuniform.uk").replace(/\/$/, "");
const expectedSource = process.env.RENDERLAB_EXPECTED_PRODUCTION_SHA?.trim() || "";
const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const runId = process.env.GITHUB_RUN_ID || "local";
const artifactDir = process.env.RENDERLAB_QA004_ARTIFACT_DIR || "artifacts/qa004-production-account-security-data";
const cleanupOnly = process.argv.includes("--cleanup-only");
const configuredNamespaces = [
  "profile-owner-a",
  "profile-owner-b",
  "profile-unadmitted",
  "profile-mfa",
  "preferences-owner-a",
  "preferences-owner-b",
  "preferences-delete",
];

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
  RENDERLAB_EXPECTED_PRODUCTION_SHA: expectedSource,
})) {
  if (!value) throw new Error(name + " is required for QA-004 production audit.");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(/^[0-9a-f]{40}$/i.test(expectedSource), "RENDERLAB_EXPECTED_PRODUCTION_SHA must be an exact 40-character Git SHA.");
assert(new URL(baseUrl).hostname === "renderlab.faresuniform.uk", "QA-004 must target the live RenderLab custom domain.");

const service = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

const r2 = new S3Client({
  region: "auto",
  endpoint: "https://" + process.env.R2_ACCOUNT_ID + ".r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});
const bucket = process.env.R2_BUCKET_NAME;

function runNode(script, args, label) {
  console.log("QA-004 child start: " + label);
  const result = spawnSync(process.execPath, [script, ...(args || [])], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(label + " failed with exit code " + result.status + ".");
  console.log("QA-004 child passed: " + label);
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
  if (!response.ok) throw new Error("QA-004 service query failed (" + response.status + "): " + await response.text());
  return response.json();
}

async function authUserExists(id) {
  const response = await fetch(supabaseUrl + "/auth/v1/admin/users/" + encodeURIComponent(id), {
    headers: { apikey: serviceRoleKey, authorization: "Bearer " + serviceRoleKey },
  });
  if (response.status === 404) return false;
  if (!response.ok) throw new Error("QA-004 Auth read failed (" + response.status + "): " + await response.text());
  return true;
}

async function objectExists(key) {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    if (error?.$metadata?.httpStatusCode === 404 || error?.name === "NotFound" || error?.name === "NoSuchKey") return false;
    throw error;
  }
}

async function listAllUsers() {
  const users = [];
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const batch = data?.users ?? [];
    users.push(...batch);
    if (batch.length < 1000) return users;
  }
  throw new Error("QA-004 Auth fixture scan exceeded pagination safety limit.");
}

async function cleanupSessionRunUsers() {
  const users = await listAllUsers();
  const prefix = runId + "-";
  let removed = 0;
  for (const user of users) {
    const tag = user.app_metadata?.renderlab_fixture;
    const marker = String(user.app_metadata?.run || "");
    if (!["session-controls", "session-controls-control"].includes(tag) || !marker.startsWith(prefix)) continue;
    const accessDelete = await service.from("renderlab_account_access").delete().eq("user_id", user.id);
    if (accessDelete.error) throw accessDelete.error;
    const deleted = await service.auth.admin.deleteUser(user.id);
    if (deleted.error && !/not found/i.test(deleted.error.message)) throw deleted.error;
    removed += 1;
  }
  console.log("QA004_SESSION_RUN_USERS_REMOVED=" + removed);
}

async function cleanupChildren() {
  const errors = [];
  for (const [script, args, label] of [
    ["scripts/verify-account-profile-credential.mjs", ["--cleanup-only"], "profile/credential cleanup"],
    ["scripts/cleanup-account-preferences-fixtures.mjs", [], "preferences/export/delete cleanup"],
  ]) {
    try {
      runNode(script, args, label);
    } catch (error) {
      errors.push(error);
      console.error(error);
    }
  }
  try {
    await cleanupSessionRunUsers();
  } catch (error) {
    errors.push(error);
    console.error(error);
  }
  if (errors.length) throw new Error("QA-004 cleanup had " + errors.length + " failure(s).");
}

async function assertConfiguredOwnerAbsent(account) {
  const owner = encodeURIComponent(account.id);
  const ownerTables = [
    "generation_admission_reservations",
    "generation_jobs",
    "generation_sources",
    "media_assets",
    "media_upload_sessions",
    "media_collections",
    "media_collection_items",
    "renderlab_account_exports",
    "renderlab_account_profiles",
    "renderlab_account_preferences",
  ];
  for (const table of ownerTables) {
    const rows = await serviceRows(table + "?owner_id=eq." + owner + "&select=*&limit=1");
    assert(rows.length === 0, "QA-004 cleanup left " + table + " residue for " + account.id + ".");
  }
  for (const [table, column] of [
    ["renderlab_account_access", "user_id"],
    ["renderlab_account_lifecycle", "user_id"],
  ]) {
    const rows = await serviceRows(table + "?" + column + "=eq." + owner + "&select=*&limit=1");
    assert(rows.length === 0, "QA-004 cleanup left " + table + " residue for " + account.id + ".");
  }
  assert(!(await authUserExists(account.id)), "QA-004 cleanup left Auth user " + account.id + ".");
}

async function assertNoSessionRunUsers() {
  const users = await listAllUsers();
  const prefix = runId + "-";
  const residue = users.filter((user) => {
    const tag = user.app_metadata?.renderlab_fixture;
    const marker = String(user.app_metadata?.run || "");
    return ["session-controls", "session-controls-control"].includes(tag) && marker.startsWith(prefix);
  });
  assert(residue.length === 0, "QA-004 cleanup left session-control Auth fixtures for this run.");
}

async function independentCleanupVerification() {
  const accounts = configuredNamespaces.map((namespace) => configuredTestAccountIdentity(namespace));
  for (const account of accounts) await assertConfiguredOwnerAbsent(account);
  await assertNoSessionRunUsers();

  const objectKeys = [
    ...accounts.map((account) => "renderlab/account-profiles/" + account.id + "/avatar.webp"),
    "renderlab/account-preferences-ci/" + runId + "/continuation.png",
  ];
  for (const key of objectKeys) {
    assert(!(await objectExists(key)), "QA-004 cleanup left known R2 object " + key + ".");
  }
  console.log("QA-004 production fixture cleanup completed and exact known DB/Auth/R2 absence was verified.");
  return {
    verified: true,
    configuredAccountsChecked: accounts.length,
    knownR2ObjectsChecked: objectKeys.length,
    sessionRunUsersChecked: true,
  };
}

async function evidenceFiles(root) {
  const files = [];
  async function walk(dir) {
    let entries = [];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (error) {
      if (error?.code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else files.push(relative(root, path));
    }
  }
  await walk(root);
  return files.filter((path) => path !== "manifest.json").sort();
}

await mkdir(artifactDir, { recursive: true });

if (cleanupOnly) {
  await cleanupChildren();
  await independentCleanupVerification();
  process.exit(0);
}

let primaryError = null;
let cleanup = null;
const suites = [];
try {
  runNode("scripts/verify-account-profile-credential.mjs", [], "live profile/credential/MFA suite");
  suites.push("profile_credential_mfa");

  runNode("scripts/verify-account-preferences.mjs", [], "live preferences/export/delete suite");
  suites.push("preferences_export_delete");

  runNode("scripts/verify-session-controls.mjs", [], "live session-control suite");
  suites.push("session_controls");
} catch (error) {
  primaryError = error;
  console.error(error);
} finally {
  try {
    await cleanupChildren();
    cleanup = await independentCleanupVerification();
  } catch (cleanupError) {
    console.error(cleanupError);
    if (!primaryError) primaryError = cleanupError;
    cleanup = { verified: false, error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError) };
  }
}

const evidence = await evidenceFiles(artifactDir);
const manifest = {
  audit: "QA-004",
  runId,
  baseUrl,
  expectedProductionSource: expectedSource,
  sourceVerificationAcknowledged: process.env.RENDERLAB_CONFIRM_PRODUCTION_SHA_VERIFIED === "true",
  fixtureOnlyDestructiveWorkAcknowledged: process.env.RENDERLAB_CONFIRM_FIXTURE_ONLY_DESTRUCTIVE_WORK === "true",
  emailChange: "skipped_gate_not_met",
  providerBackedGenerationDispatched: false,
  suites,
  evidenceFiles: evidence,
  cleanup,
  passed: !primaryError && cleanup?.verified === true,
  completedAt: new Date().toISOString(),
};
await writeFile(join(artifactDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");

if (primaryError) throw primaryError;
console.log("QA-004 production account/security/data audit passed.");
