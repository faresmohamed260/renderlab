import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";
import {
  configuredTestAccountIdentity,
  createConfiguredTestAccount,
  deleteConfiguredTestAccount,
  withAccountAuthorization,
} from "./lib/configured-test-account.mjs";

const execFileAsync = promisify(execFile);
const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.R2_BUCKET_NAME;
const artifactDir = process.env.RENDERLAB_PHASE7D_ARTIFACT_DIR || "artifacts";
const cleanupOnly = process.argv.includes("--cleanup-only");
const fixtureAccount = configuredTestAccountIdentity("video-generation");
const fixtureJobIds = new Set();
const fixtureSourceIds = new Set();
const referenceFilename = "renderlab-video-reference.png";
const reference = await sharp({
  create: { width: 256, height: 128, channels: 3, background: { r: 78, g: 104, b: 146 } },
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function req(url, account, init = {}) {
  const response = await fetch(url, withAccountAuthorization(account, init));
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
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
  return rows(`media_assets?generation_job_id=eq.${encodeURIComponent(jobId)}&select=id,storage_key,thumbnail_storage_key,mime_type,owner_id`);
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
  const row = (await rows(`generation_sources?id=eq.${encodeURIComponent(id)}&select=storage_key&limit=1`).catch(() => []))[0];
  if (row?.storage_key) await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: row.storage_key })).catch(() => {});
  await sb(`generation_sources?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  console.log(`Cleaned video reference=${id}`);
}

async function cleanupFixtureAccount() {
  const jobs = await rows(`generation_jobs?owner_id=eq.${encodeURIComponent(fixtureAccount.id)}&select=id`).catch(() => []);
  for (const row of jobs) fixtureJobIds.add(row.id);
  const sources = await rows(`generation_sources?owner_id=eq.${encodeURIComponent(fixtureAccount.id)}&select=id`).catch(() => []);
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
  if (!ticket.response.ok || !ticket.payload?.ok) throw new Error(`Reference ticket failed (${ticket.response.status}): ${JSON.stringify(ticket.payload)}`);
  const uploadTicket = ticket.payload.ticket;
  fixtureSourceIds.add(uploadTicket.sourceId);
  const put = await fetch(uploadTicket.uploadUrl, { method: uploadTicket.method, headers: uploadTicket.headers, body: reference });
  if (!put.ok) throw new Error(`Reference upload failed (${put.status}): ${await put.text()}`);
  const done = await req(`${baseUrl}/api/assets/reference/upload-completions`, account, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sourceId: uploadTicket.sourceId, width: 256, height: 128 }),
  });
  if (!done.response.ok || !done.payload?.ok) throw new Error(`Reference completion failed (${done.response.status}): ${JSON.stringify(done.payload)}`);
  const source = (await rows(`generation_sources?id=eq.${encodeURIComponent(uploadTicket.sourceId)}&select=id,status,filename,owner_id&limit=1`))[0];
  assert(source?.owner_id === account.id && source.status === "ready" && source.filename === referenceFilename, `Temporary video reference did not persist authenticated ownership: ${JSON.stringify(source)}`);
  return uploadTicket.sourceId;
}

function parseRate(value) {
  const [num, den = "1"] = String(value || "0").split("/").map(Number);
  return den ? num / den : 0;
}

const resolutionMinLongEdge = { "480p": 800, "720p": 1200, "1080p": 1800, "2K": 2000 };

async function verifyAsset(account, assetId, expectation) {
  const meta = await req(`${baseUrl}/api/media/assets/${encodeURIComponent(assetId)}`, account, { headers: { accept: "application/json" } });
  assert(meta.response.ok && meta.payload?.ok && meta.payload.asset?.kind === "video", `Video metadata invalid (${meta.response.status}): ${JSON.stringify(meta.payload)}`);
  const content = await fetch(`${baseUrl}${meta.payload.asset.contentUrl}`, withAccountAuthorization(account, { redirect: "follow" }));
  assert(content.ok && String(content.headers.get("content-type") || "").startsWith("video/"), `Video content invalid (${content.status}, ${content.headers.get("content-type")})`);
  const bytes = Buffer.from(await content.arrayBuffer());
  const directory = await mkdtemp(join(tmpdir(), "renderlab-video-"));
  const filename = join(directory, "output.mp4");
  await mkdir(artifactDir, { recursive: true });
  const artifactVideo = join(artifactDir, `phase7d-video-${expectation.slug}.mp4`);
  const artifactSheet = join(artifactDir, `phase7d-video-${expectation.slug}-contact.png`);
  try {
    await writeFile(filename, bytes);
    await writeFile(artifactVideo, bytes);
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error",
      "-show_entries", "stream=codec_type,width,height,avg_frame_rate:format=duration",
      "-of", "json",
      filename,
    ]);
    const probe = JSON.parse(stdout);
    const video = probe.streams?.find((stream) => stream.codec_type === "video");
    const hasAudio = Boolean(probe.streams?.some((stream) => stream.codec_type === "audio"));
    const width = Number(video?.width || 0);
    const height = Number(video?.height || 0);
    const duration = Number(probe.format?.duration || 0);
    const frameRate = parseRate(video?.avg_frame_rate);
    const [expectedWidth, expectedHeight] = expectation.aspect.split(":").map(Number);
    assert(width > 0 && height > 0, `${expectation.label} has invalid encoded dimensions ${width}x${height}.`);
    assert(Math.abs(width / height - expectedWidth / expectedHeight) <= 0.05, `${expectation.label} geometry mismatch: got ${width}x${height}, expected ${expectation.aspect}.`);
    assert(Math.max(width, height) >= resolutionMinLongEdge[expectation.resolution], `${expectation.label} did not reach the requested ${expectation.resolution} class: ${width}x${height}.`);
    assert(Math.abs(duration - expectation.durationSeconds) <= 1.5, `${expectation.label} duration mismatch: got ${duration}s, expected ${expectation.durationSeconds}s.`);
    assert(Math.abs(frameRate - expectation.frameRate) <= 0.6, `${expectation.label} frame-rate mismatch: got ${frameRate}, expected ${expectation.frameRate}.`);
    assert(hasAudio === expectation.audioEnabled, `${expectation.label} audio-stream mismatch: got ${hasAudio}, expected ${expectation.audioEnabled}.`);
    await execFileAsync("ffmpeg", [
      "-y", "-i", filename,
      "-vf", `fps=4/${expectation.durationSeconds},scale=480:-2,tile=2x2`,
      "-frames:v", "1",
      artifactSheet,
    ]);
    console.log(`${expectation.label} media ${width}x${height} duration=${duration.toFixed(2)}s fps=${frameRate.toFixed(2)} audio=${hasAudio} artifact=${artifactSheet}`);
    return { width, height, duration, frameRate, hasAudio };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function generate(account, request, expectation) {
  const startedAt = Date.now();
  const submit = await req(`${baseUrl}/api/generation/jobs`, account, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });
  assert(submit.response.status === 202 && submit.payload?.ok && submit.payload?.job?.id, `${expectation.label} submit failed (${submit.response.status}): ${JSON.stringify(submit.payload)}`);
  const id = submit.payload.job.id;
  fixtureJobIds.add(id);
  console.log(`${expectation.label} accepted job=${id}`);
  const deadline = Date.now() + 25 * 60 * 1000;
  let last = "";
  while (Date.now() < deadline) {
    const poll = await req(`${baseUrl}/api/generation/jobs/${encodeURIComponent(id)}`, account, { headers: { accept: "application/json" } });
    assert(poll.response.ok && poll.payload?.ok && poll.payload?.job, `${expectation.label} poll failed (${poll.response.status}): ${JSON.stringify(poll.payload)}`);
    const job = poll.payload.job;
    if (job.status !== last) { last = job.status; console.log(`${expectation.label} status=${last}`); }
    assert(job.operation === expectation.operation, `${expectation.label} resolved ${job.operation}, expected ${expectation.operation}`);
    if (job.status === "failed") throw new Error(`${expectation.label} failed: ${job.error?.message || "unknown error"}`);
    if (job.status === "succeeded") {
      assert(job.outputAssetIds?.length === 1, `${expectation.label} missing persisted output`);
      const persistedJob = (await rows(`generation_jobs?id=eq.${encodeURIComponent(id)}&select=id,status,operation,owner_id,parameters&limit=1`))[0];
      const list = await assets(id);
      assert(
        persistedJob?.owner_id === account.id
&& persistedJob.status === "succeeded"
&& persistedJob.operation === expectation.operation
&& persistedJob.parameters?.output?.resolution === expectation.resolution
&& persistedJob.parameters?.output?.audioEnabled === expectation.audioEnabled
&& persistedJob.parameters?.output?.aspectRatio === request.output.aspectRatio
&& persistedJob.parameters?.output?.durationSeconds === expectation.durationSeconds
&& persistedJob.parameters?.advanced?.frameRate === expectation.frameRate
&& !("steps" in (persistedJob.parameters?.advanced || {}))
&& !("guidance" in (persistedJob.parameters?.advanced || {}))
&& list.length === 1
&& list[0].owner_id === account.id
&& list[0].mime_type.startsWith("video/"),
        `${expectation.label} persisted owner/product state is invalid: ${JSON.stringify({ persistedJob, assets: list })}`,
      );
      assert(job.outputAssetIds.includes(list[0].id), `${expectation.label} output IDs do not match persisted media.`);
      const media = await verifyAsset(account, list[0].id, expectation);
      console.log(`${expectation.label} verified owner=${account.id} asset=${list[0].id} elapsed=${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
      return { jobId: id, assetId: list[0].id, media };
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error(`${expectation.label} timed out`);
}

if (cleanupOnly) {
  await cleanupFixtureAccount();
  process.exit(0);
}

const completed = [];
let sourceId = "";
try {
  await cleanupFixtureAccount();
  const account = await createConfiguredTestAccount("video-generation");
  const matchedPrompt = "A cobalt-blue glass sphere rotates slowly on a neutral studio background, steady camera, soft even light, no text";

  completed.push(await generate(account, {
    prompt: matchedPrompt,
    output: { kind: "video", aspectRatio: "16:9", resolution: "480p", durationSeconds: 5, audioEnabled: false },
    inputs: [],
    advanced: { seed: 31415, frameRate: 24 },
  }, { slug: "a-480p", label: "Case A 480p Create Video", operation: "create-video", resolution: "480p", aspect: "16:9", durationSeconds: 5, frameRate: 24, audioEnabled: false }));

  completed.push(await generate(account, {
    prompt: matchedPrompt,
    output: { kind: "video", aspectRatio: "16:9", resolution: "1080p", durationSeconds: 5, audioEnabled: false },
    inputs: [],
    advanced: { seed: 31415, frameRate: 24 },
  }, { slug: "b-1080p", label: "Case B 1080p Create Video", operation: "create-video", resolution: "1080p", aspect: "16:9", durationSeconds: 5, frameRate: 24, audioEnabled: false }));

  assert(
    completed[1].media.width * completed[1].media.height > completed[0].media.width * completed[0].media.height * 2,
    `Matched 1080p output did not materially exceed 480p encoded area: 480p=${completed[0].media.width}x${completed[0].media.height}, 1080p=${completed[1].media.width}x${completed[1].media.height}`,
  );

  completed.push(await generate(account, {
    prompt: "A vertical night city scene with rain reflections and gentle ambient street sound, slow forward camera move",
    output: { kind: "video", aspectRatio: "9:16", resolution: "720p", durationSeconds: 10, audioEnabled: true },
    inputs: [],
    advanced: { seed: 27182, frameRate: 25 },
  }, { slug: "c-720p-portrait-audio", label: "Case C 720p portrait audio Create Video", operation: "create-video", resolution: "720p", aspect: "9:16", durationSeconds: 10, frameRate: 25, audioEnabled: true }));

  sourceId = await uploadReference(account);
  completed.push(await generate(account, {
    prompt: "Preserve the first-frame composition while adding a slow parallax drift and subtle light movement",
    output: { kind: "video", aspectRatio: "original", resolution: "2K", durationSeconds: 5, audioEnabled: false },
    inputs: [{ alias: "image1", source: { type: "temporary-source", id: sourceId }, role: "first-frame" }],
    advanced: { seed: 16180, frameRate: 30 },
  }, { slug: "d-2k-animate-original", label: "Case D 2K Animate Original", operation: "animate-image", resolution: "2K", aspect: "2:1", durationSeconds: 5, frameRate: 30, audioEnabled: false }));

  console.log(`Phase 7D configured live matrix verified successfully for owner=${account.id}. Review artifacts are in ${artifactDir}.`);
} finally {
  for (const result of completed) if (result?.jobId) fixtureJobIds.add(result.jobId);
  if (sourceId) fixtureSourceIds.add(sourceId);
  await cleanupFixtureAccount();
}
