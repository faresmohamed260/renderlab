import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";

const execFileAsync = promisify(execFile);
import {
  configuredTestAccountIdentity,
  createConfiguredTestAccount,
  deleteConfiguredTestAccount,
  withAccountAuthorization,
} from "./lib/configured-test-account.mjs";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.R2_BUCKET_NAME;
const cleanupOnly = process.argv.includes("--cleanup-only");
const fixtureAccount = configuredTestAccountIdentity("video-generation");
const fixtureJobIds = new Set();
const fixtureSourceIds = new Set();
const referenceFilename = "renderlab-video-reference.png";
const reference = await sharp({
  create: { width: 128, height: 64, channels: 3, background: { r: 128, g: 128, b: 128 } },
}).png().toBuffer();

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: supabaseKey,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: bucket,
})) {
  if (!value) throw new Error(`${name} is required for configured video generation verification.`);
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

async function req(url, account, init = {}) {
  const response = await fetch(url, withAccountAuthorization(account, init));
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  return { response, payload };
}

async function sb(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", supabaseKey);
  headers.set("authorization", `Bearer ${supabaseKey}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers });
}

async function rows(path) {
  const response = await sb(path);
  if (!response.ok) throw new Error(`Supabase video integration query failed (${response.status}): ${await response.text()}`);
  return response.json();
}

async function assets(jobId) {
  return rows(
    `media_assets?generation_job_id=eq.${encodeURIComponent(jobId)}&select=id,storage_key,thumbnail_storage_key,mime_type,owner_id`,
  );
}

async function cleanupJob(jobId) {
  if (!jobId) return;
  const list = await assets(jobId).catch(() => []);
  for (const asset of list) {
    for (const key of [asset.storage_key, asset.thumbnail_storage_key]) {
      if (key) await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch(() => {});
    }
  }
  await sb(`media_assets?generation_job_id=eq.${encodeURIComponent(jobId)}`, { method: "DELETE" }).catch(() => {});
  await sb(`generation_jobs?id=eq.${encodeURIComponent(jobId)}`, { method: "DELETE" }).catch(() => {});
  console.log(`Cleaned video generation job=${jobId}`);
}

async function cleanupSource(id) {
  if (!id) return;
  const row = (await rows(
    `generation_sources?id=eq.${encodeURIComponent(id)}&select=storage_key&limit=1`,
  ).catch(() => []))[0];
  if (row?.storage_key) {
    await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: row.storage_key })).catch(() => {});
  }
  await sb(`generation_sources?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  console.log(`Cleaned video reference=${id}`);
}

async function cleanupFixtureAccount() {
  const jobs = await rows(
    `generation_jobs?owner_id=eq.${encodeURIComponent(fixtureAccount.id)}&select=id`,
  ).catch(() => []);
  for (const row of jobs) fixtureJobIds.add(row.id);

  const sources = await rows(
    `generation_sources?owner_id=eq.${encodeURIComponent(fixtureAccount.id)}&select=id`,
  ).catch(() => []);
  for (const row of sources) fixtureSourceIds.add(row.id);

  for (const jobId of fixtureJobIds) await cleanupJob(jobId);
  for (const sourceId of fixtureSourceIds) await cleanupSource(sourceId);
  fixtureJobIds.clear();
  fixtureSourceIds.clear();
  await deleteConfiguredTestAccount(fixtureAccount);
}

async function uploadReference(account) {
  const ticket = await req(`${baseUrl}/api/assets/reference/upload-tickets`, account, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ filename: referenceFilename, mimeType: "image/png", sizeBytes: reference.length }),
  });
  if (!ticket.response.ok || !ticket.payload?.ok) {
    throw new Error(`Reference ticket failed (${ticket.response.status}): ${JSON.stringify(ticket.payload)}`);
  }

  const uploadTicket = ticket.payload.ticket;
  fixtureSourceIds.add(uploadTicket.sourceId);
  const put = await fetch(uploadTicket.uploadUrl, {
    method: uploadTicket.method,
    headers: uploadTicket.headers,
    body: reference,
  });
  if (!put.ok) throw new Error(`Reference upload failed (${put.status}): ${await put.text()}`);

  const done = await req(`${baseUrl}/api/assets/reference/upload-completions`, account, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sourceId: uploadTicket.sourceId, width: 128, height: 64 }),
  });
  if (!done.response.ok || !done.payload?.ok) {
    throw new Error(`Reference completion failed (${done.response.status}): ${JSON.stringify(done.payload)}`);
  }

  const sourceRows = await rows(
    `generation_sources?id=eq.${encodeURIComponent(uploadTicket.sourceId)}&select=id,status,filename,owner_id&limit=1`,
  );
  const source = sourceRows[0];
  if (
    source?.owner_id !== account.id
    || source.status !== "ready"
    || source.filename !== referenceFilename
  ) {
    throw new Error(`Temporary video reference did not persist the authenticated owner: ${JSON.stringify(source)}`);
  }

  return uploadTicket.sourceId;
}

async function verifyAsset(account, assetId, expectedAspect) {
  const meta = await req(`${baseUrl}/api/media/assets/${encodeURIComponent(assetId)}`, account, {
    headers: { accept: "application/json" },
  });
  if (!meta.response.ok || !meta.payload?.ok || meta.payload.asset?.kind !== "video") {
    throw new Error(`Video metadata invalid (${meta.response.status}): ${JSON.stringify(meta.payload)}`);
  }
  const content = await fetch(
    `${baseUrl}${meta.payload.asset.contentUrl}`,
    withAccountAuthorization(account, { redirect: "follow" }),
  );
  if (!content.ok || !String(content.headers.get("content-type") || "").startsWith("video/")) {
    throw new Error(`Video content invalid (${content.status}, ${content.headers.get("content-type")})`);
  }
  const directory = await mkdtemp(join(tmpdir(), "renderlab-video-"));
  const filename = join(directory, "output.mp4");
  try {
    await writeFile(filename, Buffer.from(await content.arrayBuffer()));
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height",
      "-of", "csv=p=0:s=x",
      filename,
    ]);
    const [width, height] = stdout.trim().split("x").map(Number);
    const [expectedWidth, expectedHeight] = expectedAspect.split(":").map(Number);
    if (!(width > 0) || !(height > 0) || Math.abs(width / height - expectedWidth / expectedHeight) > 0.04) {
      throw new Error(`Video geometry mismatch: got ${width}x${height}, expected ${expectedAspect}.`);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function generate(account, request, operation, label, expectedAspect) {
  const submit = await req(`${baseUrl}/api/generation/jobs`, account, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });
  if (submit.response.status !== 202 || !submit.payload?.ok || !submit.payload?.job?.id) {
    throw new Error(`${label} submit failed (${submit.response.status}): ${JSON.stringify(submit.payload)}`);
  }

  const id = submit.payload.job.id;
  fixtureJobIds.add(id);
  console.log(`${label} accepted job=${id}`);
  const deadline = Date.now() + 25 * 60 * 1000;
  let last = "";

  while (Date.now() < deadline) {
    const poll = await req(`${baseUrl}/api/generation/jobs/${encodeURIComponent(id)}`, account, {
      headers: { accept: "application/json" },
    });
    if (!poll.response.ok || !poll.payload?.ok || !poll.payload?.job) {
      throw new Error(`${label} poll failed (${poll.response.status}): ${JSON.stringify(poll.payload)}`);
    }
    const job = poll.payload.job;
    if (job.status !== last) {
      last = job.status;
      console.log(`${label} status=${last}`);
    }
    if (job.operation !== operation) throw new Error(`${label} resolved ${job.operation}, expected ${operation}`);
    if (job.status === "failed") throw new Error(`${label} failed: ${job.error?.message || "unknown error"}`);

    if (job.status === "succeeded") {
      if (job.outputAssetIds?.length !== 1) throw new Error(`${label} missing persisted output`);
      const jobRows = await rows(
        `generation_jobs?id=eq.${encodeURIComponent(id)}&select=id,status,operation,owner_id,parameters&limit=1`,
      );
      const persistedJob = jobRows[0];
      const list = await assets(id);
      if (
        persistedJob?.owner_id !== account.id
        || persistedJob.status !== "succeeded"
        || persistedJob.operation !== operation
        || persistedJob.parameters?.output?.audioEnabled !== request.output.audioEnabled
        || persistedJob.parameters?.output?.aspectRatio !== request.output.aspectRatio
        || list.length !== 1
        || list[0].owner_id !== account.id
        || !list[0].mime_type.startsWith("video/")
      ) {
        throw new Error(`${label} persisted owner/media state is invalid: ${JSON.stringify({ persistedJob, assets: list })}`);
      }
      if (!job.outputAssetIds.includes(list[0].id)) {
        throw new Error(`${label} output IDs do not match persisted media.`);
      }
      await verifyAsset(account, list[0].id, expectedAspect);
      console.log(`${label} verified owner=${account.id} asset=${list[0].id}`);
      return { jobId: id, assetId: list[0].id };
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error(`${label} timed out`);
}

if (cleanupOnly) {
  await cleanupFixtureAccount();
  process.exit(0);
}

let videoResult = null;
let animateResult = null;
let sourceId = "";
try {
  await cleanupFixtureAccount();
  const account = await createConfiguredTestAccount("video-generation");

  videoResult = await generate(
    account,
    {
      prompt: "RenderLab video integration verification: a blue sphere slowly rotating on a neutral studio background",
      output: { kind: "video", aspectRatio: "16:9", durationSeconds: 5, audioEnabled: false },
      inputs: [],
    },
    "create-video",
    "Create Video",
    "16:9",
  );

  sourceId = await uploadReference(account);
  animateResult = await generate(
    account,
    {
      prompt: "Slowly rotate the sphere with a subtle camera push-in",
      output: { kind: "video", aspectRatio: "original", durationSeconds: 5, audioEnabled: true },
      inputs: [{ source: { type: "temporary-source", id: sourceId }, role: "first-frame" }],
    },
    "animate-image",
    "Animate Image Original",
    "2:1",
  );

  console.log(`Native Create Video + Animate Image integration verified successfully for owner=${account.id}.`);
} finally {
  if (videoResult?.jobId) fixtureJobIds.add(videoResult.jobId);
  if (animateResult?.jobId) fixtureJobIds.add(animateResult.jobId);
  if (sourceId) fixtureSourceIds.add(sourceId);
  await cleanupFixtureAccount();
}
