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

async function loadStudioRow(jobId) {
  const response = await supabase(
    `studio_generations?id=eq.${encodeURIComponent(jobId)}&select=id,status,r2_key,thumbnail_r2_key,metadata,media_url&limit=1`,
  );
  if (!response.ok) throw new Error(`Could not read Studio integration row (${response.status}).`);
  return (await response.json())[0] ?? null;
}

async function cleanup(jobId) {
  if (!jobId) return;
  const row = await loadStudioRow(jobId).catch(() => null);
  const keys = new Set();
  if (row?.r2_key) keys.add(row.r2_key);
  if (row?.thumbnail_r2_key) keys.add(row.thumbnail_r2_key);
  const metadata = row?.metadata && typeof row.metadata === "object" ? row.metadata : {};
  for (const key of Array.isArray(metadata.sourceR2Keys) ? metadata.sourceR2Keys : []) if (key) keys.add(key);
  if (metadata.sourceR2Key) keys.add(metadata.sourceR2Key);

  for (const key of keys) {
    await r2Client.send(new DeleteObjectCommand({ Bucket: r2Bucket, Key: key })).catch(() => {});
  }
  await supabase(`studio_generations?id=eq.${encodeURIComponent(jobId)}`, { method: "DELETE" }).catch(() => {});
  console.log(`Cleaned generation integration fixture job=${jobId} objects=${keys.size}`);
}

let jobId = "";
try {
  console.log(`Submitting RenderLab integration generation through ${baseUrl}`);
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
      if (!Array.isArray(job.outputAssetIds) || !job.outputAssetIds.includes(jobId)) {
        throw new Error(`Succeeded job did not expose its persisted output asset: ${JSON.stringify(job)}`);
      }
      const row = await loadStudioRow(jobId);
      if (!row || row.status !== "completed" || !row.media_url || !row.r2_key) {
        throw new Error(`Persisted Studio row is incomplete: ${JSON.stringify(row)}`);
      }
      console.log(`Generation bridge verified successfully. job=${jobId}`);
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  if (lastStatus !== "succeeded") throw new Error("Generation integration timed out before persistence completed.");
} finally {
  await cleanup(jobId);
}
