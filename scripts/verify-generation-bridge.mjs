import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";
import {
  configuredTestAccountIdentity,
  createConfiguredTestAccount,
  deleteConfiguredTestAccount,
  withAccountAuthorization,
} from "./lib/configured-test-account.mjs";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const r2Bucket = process.env.R2_BUCKET_NAME;
const fixtureAccount = configuredTestAccountIdentity("generation-bridge");
const fixtureJobIds = new Set();

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: supabaseKey,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: r2Bucket,
})) {
  if (!value) throw new Error(`${name} is required for configured generation verification.`);
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

async function jsonRequest(url, account, init = {}) {
  const response = await fetch(url, withAccountAuthorization(account, init));
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { response, payload };
}

async function supabase(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", supabaseKey);
  headers.set("authorization", `Bearer ${supabaseKey}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers });
}

async function rows(path) {
  const response = await supabase(path);
  if (!response.ok) throw new Error(`Supabase integration query failed (${response.status}).`);
  return response.json();
}

async function loadJob(jobId) {
  return (await rows(`generation_jobs?id=eq.${encodeURIComponent(jobId)}&select=*&limit=1`))[0] ?? null;
}

async function loadAssets(jobId) {
  return rows(`media_assets?generation_job_id=eq.${encodeURIComponent(jobId)}&select=id,storage_key,thumbnail_storage_key,mime_type,owner_id`);
}

async function cleanupJob(jobId) {
  if (!jobId) return;
  const assets = await loadAssets(jobId).catch(() => []);
  const keys = new Set();
  for (const asset of assets) {
    if (asset.storage_key) keys.add(asset.storage_key);
    if (asset.thumbnail_storage_key) keys.add(asset.thumbnail_storage_key);
  }
  for (const key of keys) {
    await r2Client.send(new DeleteObjectCommand({ Bucket: r2Bucket, Key: key })).catch(() => {});
  }
  await supabase(`media_assets?generation_job_id=eq.${encodeURIComponent(jobId)}`, { method: "DELETE" }).catch(() => {});
  await supabase(`generation_jobs?id=eq.${encodeURIComponent(jobId)}`, { method: "DELETE" }).catch(() => {});
  console.log(`Cleaned generation fixture job=${jobId} objects=${keys.size}`);
}

async function cleanupFixtureAccount() {
  const jobs = await rows(`generation_jobs?owner_id=eq.${encodeURIComponent(fixtureAccount.id)}&select=id`).catch(() => []);
  for (const row of jobs) fixtureJobIds.add(row.id);
  for (const jobId of fixtureJobIds) await cleanupJob(jobId);
  fixtureJobIds.clear();
  await deleteConfiguredTestAccount(fixtureAccount);
}

async function verifyMediaAsset(account, assetId, expectedKind) {
  const metadata = await jsonRequest(`${baseUrl}/api/media/assets/${encodeURIComponent(assetId)}`, account, {
    headers: { accept: "application/json" },
  });
  if (!metadata.response.ok || !metadata.payload?.ok || metadata.payload.asset?.id !== assetId) {
    throw new Error(`Media metadata failed (${metadata.response.status}): ${JSON.stringify(metadata.payload)}`);
  }
  if (metadata.payload.asset.kind !== expectedKind || !metadata.payload.asset.contentUrl) {
    throw new Error(`Media metadata has the wrong product shape: ${JSON.stringify(metadata.payload.asset)}`);
  }

  const content = await fetch(
    `${baseUrl}${metadata.payload.asset.contentUrl}`,
    withAccountAuthorization(account, { redirect: "follow" }),
  );
  if (!content.ok) throw new Error(`Media content failed (${content.status}).`);
  const contentType = String(content.headers.get("content-type") || "").toLowerCase();
  if (expectedKind === "image" && !contentType.startsWith("image/")) {
    throw new Error(`Media content is not an image: ${contentType}`);
  }
  if (expectedKind === "video" && !contentType.startsWith("video/")) {
    throw new Error(`Media content is not a video: ${contentType}`);
  }
  const bytes = Buffer.from(await content.arrayBuffer());
  if (expectedKind !== "image") return null;
  const imageMetadata = await sharp(bytes).metadata();
  if (!imageMetadata.width || !imageMetadata.height) throw new Error("Generated image dimensions could not be read.");
  return { width: imageMetadata.width, height: imageMetadata.height };
}

function assertAspectRatio(dimensions, expected, label) {
  const [expectedWidth, expectedHeight] = expected.split(":").map(Number);
  const actual = dimensions.width / dimensions.height;
  const target = expectedWidth / expectedHeight;
  if (Math.abs(actual - target) > 0.035) {
    throw new Error(`${label} geometry mismatch: got ${dimensions.width}x${dimensions.height}, expected ${expected}.`);
  }
}

async function verifyGeneration(account, request, expectedOperation, label, expectedAspect = null) {
  console.log(`Submitting ${label} through ${baseUrl}`);
  const submission = await jsonRequest(`${baseUrl}/api/generation/jobs`, account, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });
  if (submission.response.status !== 202 || !submission.payload?.ok || !submission.payload?.job?.id) {
    throw new Error(`${label} submit failed (${submission.response.status}): ${JSON.stringify(submission.payload)}`);
  }

  const jobId = submission.payload.job.id;
  fixtureJobIds.add(jobId);
  console.log(`${label} accepted. job=${jobId}`);
  const deadline = Date.now() + 12 * 60 * 1000;
  let lastStatus = "";

  while (Date.now() < deadline) {
    const poll = await jsonRequest(`${baseUrl}/api/generation/jobs/${encodeURIComponent(jobId)}`, account, {
      headers: { accept: "application/json" },
    });
    if (!poll.response.ok || !poll.payload?.ok || !poll.payload?.job) {
      throw new Error(`${label} poll failed (${poll.response.status}): ${JSON.stringify(poll.payload)}`);
    }
    const job = poll.payload.job;
    if (job.status !== lastStatus) {
      lastStatus = job.status;
      console.log(`${label} status: ${job.status}`);
    }
    if (job.operation !== expectedOperation) {
      throw new Error(`${label} resolved to ${job.operation}, expected ${expectedOperation}.`);
    }
    if (job.status === "failed") throw new Error(`${label} failed: ${job.error?.message || "unknown error"}`);
    if (job.status === "succeeded") {
      if (!Array.isArray(job.outputAssetIds) || job.outputAssetIds.length !== 1) {
        throw new Error(`${label} did not expose exactly one persisted output asset: ${JSON.stringify(job)}`);
      }
      const row = await loadJob(jobId);
      const assets = await loadAssets(jobId);
      if (!row || row.status !== "succeeded" || row.operation !== expectedOperation || assets.length !== 1 || !assets[0].storage_key) {
        throw new Error(`${label} persisted state is incomplete: ${JSON.stringify({ row, assets })}`);
      }
      if (row.owner_id !== account.id || assets[0].owner_id !== account.id) {
        throw new Error(`${label} persisted generation state did not inherit the authenticated account owner.`);
      }
      if (!job.outputAssetIds.includes(assets[0].id)) {
        throw new Error(`${label} output IDs do not match persisted media: ${JSON.stringify({ job, assets })}`);
      }
      const dimensions = await verifyMediaAsset(account, assets[0].id, request.output.kind);
      if (expectedAspect && dimensions) assertAspectRatio(dimensions, expectedAspect, label);
      console.log(`${label} verified. owner=${account.id} job=${jobId} asset=${assets[0].id}`);
      return { jobId, assetId: assets[0].id };
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  throw new Error(`${label} timed out before persistence completed.`);
}

let createResult = null;
let editResult = null;
let overrideResult = null;
try {
  await cleanupFixtureAccount();
  const account = await createConfiguredTestAccount("generation-bridge");
  createResult = await verifyGeneration(
    account,
    {
      prompt: "RenderLab integration verification: a simple blue sphere centered on a neutral studio background",
      output: { kind: "image", aspectRatio: "16:9" },
      inputs: [],
    },
    "create-image",
    "Create Image",
    "16:9",
  );

  editResult = await verifyGeneration(
    account,
    {
      prompt: "Change the sphere to red while keeping the simple studio composition",
      output: { kind: "image", aspectRatio: "original" },
      inputs: [
        {
          source: { type: "media-asset", id: createResult.assetId },
          role: "primary-image",
        },
      ],
    },
    "edit-image",
    "Edit Image Original from persisted media asset",
    "16:9",
  );

  overrideResult = await verifyGeneration(
    account,
    {
      prompt: "Reframe the red sphere as a portrait while preserving the subject",
      output: { kind: "image", aspectRatio: "4:5" },
      inputs: [
        {
          source: { type: "media-asset", id: createResult.assetId },
          role: "primary-image",
        },
      ],
    },
    "edit-image",
    "Edit Image explicit 4:5 override",
    "4:5",
  );

  console.log(`Native Create ratio -> Edit Original -> Edit override verified successfully for owner=${account.id}.`);
} finally {
  if (overrideResult?.jobId) fixtureJobIds.add(overrideResult.jobId);
  if (editResult?.jobId) fixtureJobIds.add(editResult.jobId);
  if (createResult?.jobId) fixtureJobIds.add(createResult.jobId);
  await cleanupFixtureAccount();
}
