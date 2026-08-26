import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const r2Bucket = process.env.R2_BUCKET_NAME;
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

const referencePng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAATUlEQVR42u3PQQ0AAAgEIDX5RTeFDzdoQCepz6aeExAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQELi3oiwCAJt186UAAAAASUVORK5CYII=",
  "base64",
);

async function jsonRequest(url, init = {}) {
  const response = await fetch(url, init);
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
  return rows(`media_assets?generation_job_id=eq.${encodeURIComponent(jobId)}&select=id,storage_key,thumbnail_storage_key,mime_type`);
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

async function cleanupSource(sourceId) {
  if (!sourceId) return;
  const source = (await rows(`generation_sources?id=eq.${encodeURIComponent(sourceId)}&select=id,storage_key&limit=1`).catch(() => []))[0];
  if (source?.storage_key) {
    await r2Client.send(new DeleteObjectCommand({ Bucket: r2Bucket, Key: source.storage_key })).catch(() => {});
  }
  await supabase(`generation_sources?id=eq.${encodeURIComponent(sourceId)}`, { method: "DELETE" }).catch(() => {});
  console.log(`Cleaned reference fixture source=${sourceId}`);
}

async function uploadReferenceFixture() {
  const ticket = await jsonRequest(`${baseUrl}/api/assets/reference/upload-tickets`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      filename: "renderlab-native-edit-reference.png",
      mimeType: "image/png",
      sizeBytes: referencePng.length,
    }),
  });
  if (!ticket.response.ok || !ticket.payload?.ok || !ticket.payload?.ticket?.sourceId) {
    throw new Error(`Reference ticket failed (${ticket.response.status}): ${JSON.stringify(ticket.payload)}`);
  }

  const { sourceId, uploadUrl, method, headers } = ticket.payload.ticket;
  const upload = await fetch(uploadUrl, { method, headers, body: referencePng });
  if (!upload.ok) throw new Error(`Reference R2 upload failed (${upload.status}).`);

  const completion = await jsonRequest(`${baseUrl}/api/assets/reference/upload-completions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sourceId, width: 64, height: 64 }),
  });
  if (!completion.response.ok || !completion.payload?.ok || completion.payload.source?.status !== "ready") {
    throw new Error(`Reference completion failed (${completion.response.status}): ${JSON.stringify(completion.payload)}`);
  }
  console.log(`Reference fixture ready. source=${sourceId}`);
  return sourceId;
}

async function verifyMediaAsset(assetId, expectedKind) {
  const metadata = await jsonRequest(`${baseUrl}/api/media/assets/${encodeURIComponent(assetId)}`, {
    headers: { accept: "application/json" },
  });
  if (!metadata.response.ok || !metadata.payload?.ok || metadata.payload.asset?.id !== assetId) {
    throw new Error(`Media metadata failed (${metadata.response.status}): ${JSON.stringify(metadata.payload)}`);
  }
  if (metadata.payload.asset.kind !== expectedKind || !metadata.payload.asset.contentUrl) {
    throw new Error(`Media metadata has the wrong product shape: ${JSON.stringify(metadata.payload.asset)}`);
  }

  const content = await fetch(`${baseUrl}${metadata.payload.asset.contentUrl}`, { redirect: "follow" });
  if (!content.ok) throw new Error(`Media content failed (${content.status}).`);
  const contentType = String(content.headers.get("content-type") || "").toLowerCase();
  if (expectedKind === "image" && !contentType.startsWith("image/")) {
    throw new Error(`Media content is not an image: ${contentType}`);
  }
  if (expectedKind === "video" && !contentType.startsWith("video/")) {
    throw new Error(`Media content is not a video: ${contentType}`);
  }
}

async function verifyGeneration(request, expectedOperation, label) {
  console.log(`Submitting ${label} through ${baseUrl}`);
  const submission = await jsonRequest(`${baseUrl}/api/generation/jobs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });
  if (submission.response.status !== 202 || !submission.payload?.ok || !submission.payload?.job?.id) {
    throw new Error(`${label} submit failed (${submission.response.status}): ${JSON.stringify(submission.payload)}`);
  }

  const jobId = submission.payload.job.id;
  console.log(`${label} accepted. job=${jobId}`);
  const deadline = Date.now() + 12 * 60 * 1000;
  let lastStatus = "";

  while (Date.now() < deadline) {
    const poll = await jsonRequest(`${baseUrl}/api/generation/jobs/${encodeURIComponent(jobId)}`, {
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
      if (!job.outputAssetIds.includes(assets[0].id)) {
        throw new Error(`${label} output IDs do not match persisted media: ${JSON.stringify({ job, assets })}`);
      }
      await verifyMediaAsset(assets[0].id, request.output.kind);
      console.log(`${label} verified. job=${jobId} asset=${assets[0].id}`);
      return jobId;
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  throw new Error(`${label} timed out before persistence completed.`);
}

let createJobId = "";
let editJobId = "";
let sourceId = "";
try {
  createJobId = await verifyGeneration(
    {
      prompt: "RenderLab integration verification: a simple blue sphere centered on a neutral studio background",
      output: { kind: "image", aspectRatio: "1:1" },
      inputs: [],
    },
    "create-image",
    "Create Image",
  );

  sourceId = await uploadReferenceFixture();
  editJobId = await verifyGeneration(
    {
      prompt: "Change the sphere to red while keeping the simple studio composition",
      output: { kind: "image", aspectRatio: "1:1" },
      inputs: [
        {
          source: { type: "temporary-source", id: sourceId },
          role: "primary-image",
        },
      ],
    },
    "edit-image",
    "Edit Image",
  );

  console.log("Native Create Image + Edit Image integration verified successfully.");
} finally {
  await cleanupJob(editJobId);
  await cleanupJob(createJobId);
  await cleanupSource(sourceId);
}
