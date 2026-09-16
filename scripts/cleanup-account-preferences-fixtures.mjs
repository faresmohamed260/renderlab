import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  configuredTestAccountIdentity,
  deleteConfiguredTestAccount,
} from "./lib/configured-test-account.mjs";

const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const namespaces = ["preferences-owner-a", "preferences-owner-b", "preferences-delete"];
const runToken = process.env.GITHUB_RUN_ID || "local";
const continuationKey = `renderlab/account-preferences-ci/${runToken}/continuation.png`;

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
})) {
  if (!value) throw new Error(`${name} is required for #220 fixture cleanup.`);
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

async function serviceRest(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceRoleKey);
  headers.set("authorization", `Bearer ${serviceRoleKey}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers });
}

async function serviceRows(path) {
  const response = await serviceRest(path);
  if (!response.ok) throw new Error(`#220 cleanup query failed (${response.status}): ${await response.text()}`);
  return response.json();
}

async function deleteObject(key) {
  if (!key) return;
  await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch(() => null);
}

await deleteObject(continuationKey);

for (const namespace of namespaces) {
  const account = configuredTestAccountIdentity(namespace);
  const owner = encodeURIComponent(account.id);
  const exports = await serviceRows(`renderlab_account_exports?owner_id=eq.${owner}&select=storage_key`).catch(() => []);
  for (const row of exports) await deleteObject(row.storage_key);

  for (const table of ["renderlab_account_preferences", "renderlab_account_exports"]) {
    const response = await serviceRest(`${table}?owner_id=eq.${owner}`, { method: "DELETE" });
    if (!response.ok && response.status !== 404) {
      throw new Error(`Could not clean ${table} (${response.status}): ${await response.text()}`);
    }
  }

  const lifecycle = await serviceRest(`renderlab_account_lifecycle?user_id=eq.${owner}`, { method: "DELETE" });
  if (!lifecycle.ok && lifecycle.status !== 404) {
    throw new Error(`Could not clean account lifecycle (${lifecycle.status}): ${await lifecycle.text()}`);
  }

  await deleteConfiguredTestAccount(account);
}

console.log("RENDERLAB_220_FIXTURE_CLEAN=true");
