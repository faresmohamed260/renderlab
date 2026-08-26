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

async function cleanup(jobId) {
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
  console.log(`Cleaned native generation integration fixture job=${jobId} objects=${keys.size}`);
}

let jobId = "";
try {
  console.log(`Submitting RenderLab native integration generation through ${baseUrl}`);
  const submission = await jsonRequest(`${baseUrl}/api/generation/jobs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      prompt: "RenderLab integration verification: a simple blue sphere centered on a neutral studio background",
      output: { kind: "image", aspectRatio: "1:1" },
      inputs: [],
    }),
  });

  if (submission.response.status !== 202 || !submission.payload?.ok || !submission.payload?.job?.id) {
    throw new Error(`Generation submit failed (${submission.response.status}): ${JSON.stringify(submission.payload)}`);
  }
  jobId = submission.payload.job.id;
  console.log(`Generation accepted. job=${jobId}`);

  const deadline = Date.now() + 12 * 60 * 1000;
  let lastStatus = "";
  while (Date.now() < deadline) {
    const poll = await jsonRequest(`${baseUrl}/api/generation/jobs/${encodeURIComponent(jobId)}`, {
      headers: { accept: "application/json" },
    });
    if (!poll.response.ok || !poll.payload?.ok || !poll.payload?.job) {
      throw new Error(`Generation poll failed (${poll.response.status}): ${JSON.stringify(poll.payload)}`);
    }
    const job = poll.payload.job;
    if (job.status !== lastStatus) {
      lastStatus = job.status;
      console.log(`RenderLab job status: ${job.status}`);
    }
    if (job.status === "failed") throw new Error(`Generation failed: ${job.error?.message || "unknown error"}`);
    if (job.status === "succeeded") {
      if (!Array.isArray(job.outputAssetIds) || job.outputAssetIds.length < 1) {
        throw new Error(`Succeeded job did not expose a persisted output asset: ${JSON.stringify(job)}`);
      }
      const row = await loadJob(jobId);
      const assets = await loadAssets(jobId);
      if (!row || row.status !== "succeeded" || assets.length !== 1 || !assets[0].storage_key || !assets[0].mime_type.startsWith("image/")) {
        throw new Error(`Native persisted state is incomplete: ${JSON.stringify({ row, assets })}`);
      }
      if (!job.outputAssetIds.includes(assets[0].id)) {
        throw new Error(`Job output IDs do not match the persisted media asset: ${JSON.stringify({ job, assets })}`);
      }
      console.log(`Native generation verified successfully. job=${jobId} asset=${assets[0].id}`);
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  if (lastStatus !== "succeeded") throw new Error("Generation integration timed out before persistence completed.");
} finally {
  await cleanup(jobId);
}
