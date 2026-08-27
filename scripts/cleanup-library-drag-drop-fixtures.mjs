import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const r2Bucket = process.env.R2_BUCKET_NAME;
const fixturePrefix = "renderlab-drop-";

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: supabaseKey,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: r2Bucket,
})) {
  if (!value) throw new Error(`${name} is required for Library drag/drop fixture cleanup.`);
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

async function supabase(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", supabaseKey);
  headers.set("authorization", `Bearer ${supabaseKey}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers });
}

async function rows(path) {
  const response = await supabase(path);
  if (!response.ok) throw new Error(`Supabase drag/drop cleanup query failed (${response.status}): ${await response.text()}`);
  return response.json();
}

async function removeRow(table, id) {
  const response = await supabase(`${table}?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!response.ok) throw new Error(`Could not remove ${table} row ${id} (${response.status}): ${await response.text()}`);
}

const pattern = encodeURIComponent(`like.${fixturePrefix}*`);
const sessions = await rows(
  `media_upload_sessions?filename=${pattern}&select=id,storage_key,media_asset_id`,
);
const assets = await rows(
  `media_assets?original_filename=${pattern}&select=id,storage_key`,
);

const storageKeys = new Set([
  ...sessions.map((session) => session.storage_key).filter(Boolean),
  ...assets.map((asset) => asset.storage_key).filter(Boolean),
]);
const assetIds = new Set([
  ...sessions.map((session) => session.media_asset_id).filter(Boolean),
  ...assets.map((asset) => asset.id).filter(Boolean),
]);

for (const storageKey of storageKeys) {
  await r2Client.send(new DeleteObjectCommand({ Bucket: r2Bucket, Key: storageKey })).catch(() => {});
}
for (const session of sessions) await removeRow("media_upload_sessions", session.id);
for (const assetId of assetIds) await removeRow("media_assets", assetId);

const remainingSessions = await rows(`media_upload_sessions?filename=${pattern}&select=id`);
const remainingAssets = await rows(`media_assets?original_filename=${pattern}&select=id`);
if (remainingSessions.length || remainingAssets.length) {
  throw new Error(
    `Drag/drop fixture namespace cleanup incomplete: sessions=${remainingSessions.length} assets=${remainingAssets.length}.`,
  );
}

console.log(
  `Library drag/drop fixture namespace clean. removed sessions=${sessions.length} assets=${assets.length} objects=${storageKeys.size}.`,
);
