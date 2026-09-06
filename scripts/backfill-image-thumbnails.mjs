import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";

const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET_NAME;
const apply = process.argv.includes("--apply");

function option(name) {
  const prefix = `${name}=`;
  const direct = process.argv.find((value) => value.startsWith(prefix));
  if (direct) return direct.slice(prefix.length);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

const ownerId = option("--owner-id");
const max = Number(option("--max") || 500);
if (!Number.isInteger(max) || max < 1 || max > 5000) {
  throw new Error("--max must be an integer between 1 and 5000.");
}
for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  R2_ACCOUNT_ID: accountId,
  R2_ACCESS_KEY_ID: accessKeyId,
  R2_SECRET_ACCESS_KEY: secretAccessKey,
  R2_BUCKET_NAME: bucket,
})) {
  if (!value) throw new Error(`${name} is required for image thumbnail backfill.`);
}

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

async function supabase(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceRoleKey);
  headers.set("authorization", `Bearer ${serviceRoleKey}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers });
}

async function rows(path) {
  const response = await supabase(path);
  if (!response.ok) throw new Error(`Thumbnail backfill query failed (${response.status}): ${await response.text()}`);
  return response.json();
}

function thumbnailKey(asset) {
  const storageMatch = asset.storage_key.match(/^renderlab\/(?:generations|uploads)\/(\d{4})\/(\d{2})\//);
  if (storageMatch) return `renderlab/thumbnails/${storageMatch[1]}/${storageMatch[2]}/${asset.id}.webp`;
  const created = new Date(asset.created_at);
  if (Number.isNaN(created.getTime())) throw new Error(`Asset ${asset.id} has an invalid created_at.`);
  return `renderlab/thumbnails/${created.getUTCFullYear()}/${String(created.getUTCMonth() + 1).padStart(2, "0")}/${asset.id}.webp`;
}

const params = new URLSearchParams({
  kind: "eq.image",
  deleted_at: "is.null",
  thumbnail_storage_key: "is.null",
  order: "created_at.asc,id.asc",
  limit: String(max),
  select: "id,owner_id,storage_key,created_at",
});
if (ownerId) params.set("owner_id", `eq.${ownerId}`);
const assets = await rows(`media_assets?${params.toString()}`);
console.log(`Image thumbnail backfill eligible=${assets.length} apply=${apply} owner=${ownerId || "all"} max=${max}.`);
if (!apply) process.exit(0);

let completed = 0;
let failed = 0;
for (const asset of assets) {
  const key = thumbnailKey(asset);
  try {
    const source = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: asset.storage_key }));
    const sourceBytes = Buffer.from(await source.Body.transformToByteArray());
    const thumbnailBytes = await sharp(sourceBytes)
      .rotate()
      .resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toBuffer();
    await r2.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: thumbnailBytes,
      ContentType: "image/webp",
    }));
    const response = await supabase(
      `media_assets?owner_id=eq.${encodeURIComponent(asset.owner_id)}&id=eq.${encodeURIComponent(asset.id)}&deleted_at=is.null&thumbnail_storage_key=is.null&select=id,thumbnail_storage_key`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ thumbnail_storage_key: key, updated_at: new Date().toISOString() }),
      },
    );
    if (!response.ok) throw new Error(`row update failed (${response.status}): ${await response.text()}`);
    const updated = await response.json();
    if (!updated?.[0]?.thumbnail_storage_key) {
      const current = await rows(
        `media_assets?owner_id=eq.${encodeURIComponent(asset.owner_id)}&id=eq.${encodeURIComponent(asset.id)}&select=thumbnail_storage_key&limit=1`,
      );
      const currentKey = current?.[0]?.thumbnail_storage_key;
      if (!currentKey) throw new Error("row no longer accepts thumbnail update");
      if (currentKey !== key) {
        await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch(() => {});
      }
    }
    completed += 1;
    console.log(`Backfilled image thumbnail asset=${asset.id} key=${key}.`);
  } catch (error) {
    failed += 1;
    console.error(`Thumbnail backfill failed asset=${asset.id}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
console.log(`Image thumbnail backfill complete=${completed} failed=${failed}.`);
if (failed) process.exitCode = 1;
