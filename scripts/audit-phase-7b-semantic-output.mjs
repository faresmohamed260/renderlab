import { mkdir, writeFile } from "node:fs/promises";
import {
  configuredTestAccountIdentity,
  createConfiguredTestAccount,
  deleteConfiguredTestAccount,
  withAccountAuthorization,
} from "./lib/configured-test-account.mjs";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const artifactDir = process.env.RENDERLAB_SEMANTIC_ARTIFACT_DIR || "artifacts/phase-7b-semantic";
const fixtureAccount = configuredTestAccountIdentity("phase-7b-semantic-output");

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: supabaseKey,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
})) {
  if (!value) throw new Error(`${name} is required for the Phase 7B semantic output audit.`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

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
  if (!response.ok) throw new Error(`Supabase semantic-audit query failed (${response.status}): ${await response.text()}`);
  return response.json();
}

async function loadJob(ownerId, jobId) {
  return (await rows(
    `generation_jobs?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(jobId)}&select=id,prompt,inputs,parameters,workflow_id,model,ecosystem,status,output_asset_ids&limit=1`,
  ))[0] ?? null;
}

async function saveMediaArtifact(account, assetId, filename) {
  const metadata = await jsonRequest(`${baseUrl}/api/media/assets/${encodeURIComponent(assetId)}`, account, {
    headers: { accept: "application/json" },
  });
  assert(metadata.response.ok && metadata.payload?.ok, `Could not load media metadata for ${assetId}.`);
  assert(metadata.payload.asset?.kind === "image", `Semantic audit asset ${assetId} is not an image.`);
  assert(typeof metadata.payload.asset?.contentUrl === "string", `Semantic audit asset ${assetId} has no content URL.`);

  const content = await fetch(
    `${baseUrl}${metadata.payload.asset.contentUrl}`,
    withAccountAuthorization(account, { redirect: "follow" }),
  );
  assert(content.ok, `Could not fetch semantic audit image ${assetId} (${content.status}).`);
  const contentType = String(content.headers.get("content-type") || "").toLowerCase();
  assert(contentType.startsWith("image/"), `Semantic audit content ${assetId} is not an image (${contentType}).`);
  const bytes = Buffer.from(await content.arrayBuffer());
  assert(bytes.length > 1000, `Semantic audit image ${assetId} is unexpectedly small.`);
  await writeFile(`${artifactDir}/${filename}`, bytes);
  return {
    id: assetId,
    filename,
    contentType,
    displayName: metadata.payload.asset.displayName ?? null,
    width: metadata.payload.asset.width ?? null,
    height: metadata.payload.asset.height ?? null,
  };
}

async function generate(account, label, request, artifactFilename) {
  console.log(`Submitting ${label}.`);
  const submission = await jsonRequest(`${baseUrl}/api/generation/jobs`, account, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });
  assert(
    submission.response.status === 202 && submission.payload?.ok && submission.payload.job?.id,
    `${label} submission failed (${submission.response.status}): ${JSON.stringify(submission.payload)}`,
  );

  const jobId = submission.payload.job.id;
  const deadline = Date.now() + 12 * 60 * 1000;
  let lastStatus = "";

  while (Date.now() < deadline) {
    const poll = await jsonRequest(`${baseUrl}/api/generation/jobs/${encodeURIComponent(jobId)}`, account, {
      headers: { accept: "application/json" },
    });
    assert(poll.response.ok && poll.payload?.ok && poll.payload.job, `${label} poll failed (${poll.response.status}).`);
    const job = poll.payload.job;
    if (job.status !== lastStatus) {
      lastStatus = job.status;
      console.log(`${label}: ${job.status}`);
    }
    if (job.status === "failed" || job.status === "cancelled") {
      throw new Error(`${label} ended as ${job.status}: ${job.error?.message || "unknown error"}`);
    }
    if (job.status === "succeeded") {
      assert(Array.isArray(job.outputAssetIds) && job.outputAssetIds.length === 1, `${label} did not return one output.`);
      const stored = await loadJob(account.id, jobId);
      assert(stored?.status === "succeeded", `${label} did not persist a succeeded generation job.`);
      assert(stored.prompt === request.prompt, `${label} did not persist the original product prompt.`);
      const artifact = await saveMediaArtifact(account, job.outputAssetIds[0], artifactFilename);
      console.log(`${label} saved as ${artifactFilename}.`);
      return { jobId, assetId: job.outputAssetIds[0], stored, artifact };
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  throw new Error(`${label} timed out.`);
}

async function verifyCleanup(ownerId) {
  for (const table of ["generation_jobs", "media_assets", "generation_sources", "media_upload_sessions"]) {
    const remaining = await rows(`${table}?owner_id=eq.${encodeURIComponent(ownerId)}&select=id&limit=1`);
    assert(remaining.length === 0, `Semantic audit cleanup left ${table} rows for owner ${ownerId}.`);
  }
}

const sourceAPrompt = [
  "Create a photorealistic waist-up studio portrait of one fictional adult person.",
  "They have a short straight black bob haircut, round black eyeglasses, and a small beauty mark on the right cheek.",
  "They wear a mustard-yellow zip jacket over a charcoal shirt.",
  "Neutral warm-gray backdrop, soft even light, front-facing realistic photography, one person only, no text.",
].join(" ");

const sourceBPrompt = [
  "Create a photorealistic waist-up studio portrait of a different fictional adult person.",
  "They have shoulder-length curly copper hair, no glasses, and pronounced freckles across both cheeks.",
  "They wear a cobalt-blue crewneck sweater.",
  "Cool light-gray backdrop, soft even light, front-facing realistic photography, one person only, no text.",
].join(" ");

const outfitPrompt = [
  "Using @image1 as the same fictional person, preserve their recognizable facial appearance, facial features, short black bob haircut, round black eyeglasses, beauty mark, age, pose, and camera framing.",
  "Change only the clothing to a tailored emerald-green suit jacket over a crisp white shirt.",
  "Keep a photorealistic studio portrait and do not add another person.",
].join(" ");

const twoPersonPrompt = [
  "Create one photorealistic studio photograph containing both source people.",
  "Put the person from @image1 on the LEFT, preserving their short black bob, round black eyeglasses, recognizable facial appearance, and mustard-yellow jacket.",
  "Put the person from @image2 on the RIGHT, preserving their curly copper hair, freckles, recognizable facial appearance, and cobalt-blue sweater.",
  "Both people must be visible waist-up as two distinct people standing side by side on a neutral gray studio background. No extra people and no text.",
].join(" ");

await mkdir(artifactDir, { recursive: true });
let account = null;
let primaryError = null;
let manifest = null;

try {
  await deleteConfiguredTestAccount(fixtureAccount);
  account = await createConfiguredTestAccount("phase-7b-semantic-output");

  const sourceA = await generate(
    account,
    "Synthetic source A",
    { prompt: sourceAPrompt, output: { kind: "image", aspectRatio: "4:5" }, inputs: [] },
    "01-source-a.png",
  );

  const sourceB = await generate(
    account,
    "Synthetic source B",
    { prompt: sourceBPrompt, output: { kind: "image", aspectRatio: "4:5" }, inputs: [] },
    "02-source-b.png",
  );

  const outfitEdit = await generate(
    account,
    "Identity-sensitive outfit edit",
    {
      prompt: outfitPrompt,
      output: { kind: "image", aspectRatio: "original" },
      inputs: [
        {
          alias: "image1",
          source: { type: "media-asset", id: sourceA.assetId },
          role: "primary-image",
        },
      ],
    },
    "03-outfit-edit.png",
  );
  assert(outfitEdit.stored.inputs?.[0]?.alias === "image1", "Outfit edit did not persist image1 alias mapping.");
  assert(outfitEdit.stored.inputs?.[0]?.source?.id === sourceA.assetId, "Outfit edit image1 mapped to the wrong source asset.");

  // Deliberately reverse the request array relative to the human alias numbering.
  // The worker adapter must translate @image1/@image2 through structured mapping,
  // not assume alias number equals multipart position.
  const twoPerson = await generate(
    account,
    "Two-person reordered-alias composition",
    {
      prompt: twoPersonPrompt,
      output: { kind: "image", aspectRatio: "original" },
      inputs: [
        {
          alias: "image2",
          source: { type: "media-asset", id: sourceB.assetId },
          role: "primary-image",
        },
        {
          alias: "image1",
          source: { type: "media-asset", id: sourceA.assetId },
          role: "reference",
        },
      ],
    },
    "04-two-person-reordered-aliases.png",
  );

  assert(
    JSON.stringify(twoPerson.stored.inputs?.map((input) => input.alias)) === JSON.stringify(["image2", "image1"]),
    `Two-person request order/aliases were not persisted deterministically: ${JSON.stringify(twoPerson.stored.inputs)}`,
  );
  assert(twoPerson.stored.inputs?.[0]?.source?.id === sourceB.assetId, "image2 did not remain bound to source B in persisted intent.");
  assert(twoPerson.stored.inputs?.[1]?.source?.id === sourceA.assetId, "image1 did not remain bound to source A in persisted intent.");

  manifest = {
    purpose: "Phase 7B bounded semantic output review; human visual acceptance required",
    productMainSha: process.env.GITHUB_SHA || null,
    notes: [
      "All people are synthetic generation fixtures; no real-person identity is used.",
      "Technical success does not establish semantic quality. Review the four PNGs together.",
      "The two-person request intentionally sends image2 first and image1 second to exercise alias-to-position translation.",
    ],
    cases: {
      sourceA: { prompt: sourceAPrompt, artifact: sourceA.artifact, jobId: sourceA.jobId },
      sourceB: { prompt: sourceBPrompt, artifact: sourceB.artifact, jobId: sourceB.jobId },
      outfitEdit: {
        prompt: outfitPrompt,
        artifact: outfitEdit.artifact,
        jobId: outfitEdit.jobId,
        persistedInputs: outfitEdit.stored.inputs,
        reviewQuestion: "Does the output remain recognizably the same synthetic person as source A while primarily changing the outfit?",
      },
      twoPersonComposition: {
        prompt: twoPersonPrompt,
        artifact: twoPerson.artifact,
        jobId: twoPerson.jobId,
        persistedInputs: twoPerson.stored.inputs,
        reviewQuestion: "Are both distinct source people visibly represented, with image1/source A on the left and image2/source B on the right?",
      },
    },
  };
  await writeFile(`${artifactDir}/manifest.json`, JSON.stringify(manifest, null, 2), "utf8");
  console.log("Phase 7B semantic outputs captured; awaiting human artifact review.");
} catch (error) {
  primaryError = error;
  await writeFile(
    `${artifactDir}/audit-error.txt`,
    error instanceof Error ? `${error.stack || error.message}\n` : `${String(error)}\n`,
    "utf8",
  ).catch(() => {});
} finally {
  try {
    await deleteConfiguredTestAccount(account || fixtureAccount);
    await verifyCleanup((account || fixtureAccount).id);
    console.log(`Semantic audit fixtures cleaned for owner=${(account || fixtureAccount).id}.`);
  } catch (cleanupError) {
    console.error(cleanupError);
    if (!primaryError) primaryError = cleanupError;
  }
}

if (primaryError) throw primaryError;
