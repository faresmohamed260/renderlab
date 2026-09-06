import { createHash } from "node:crypto";
import type {
  CreativeOperation,
  GenerationJob,
  GenerationRequest,
} from "@/lib/capabilities/generation";
import {
  defaultVideoAudioEnabled,
  defaultVideoResolution,
  generationInputAlias,
  generationModelForRequest,
  qwenImageFixedGuidance,
  qwenImageFixedSteps,
  resolveCreativeOperation,
  type VideoResolution,
} from "@/lib/capabilities/generation";
import type { SubmitGenerationResponse } from "@/lib/api/generation-contract";
import { isSupabaseConfigured, supabaseRest } from "@/server/data/supabase-rest";
import { headR2Object, isR2Configured, readR2Object, writeR2Object } from "@/server/storage/r2";
import { findWorker, workersForEcosystem, type GenerationWorker } from "@/server/generation/worker-fleet";
import { createImageGenerationCanvas, prepareImageAspectOverride, sourceVideoAspectRatio } from "@/server/generation/geometry";
import { injectGenerationFinalizationFault } from "@/server/generation/finalization-faults";
import { classifyWorkerFailure, failureKind, type WorkerFailureClassification } from "@/server/generation/worker-failure";
import { inspectUpscaleOutputMetadata, type UpscaleOutputMetadata } from "@/server/generation/upscale-output-metadata";
import {
  IMAGE_THUMBNAIL_CONTENT_TYPE,
  createImageThumbnailBytes,
  imageThumbnailStorageKey,
} from "@/server/media/image-thumbnail";
import { correlationIdForGenerationJob, emitDiagnosticEvent } from "@/server/observability/diagnostics";

type WorkflowConfig = {
  id: string;
  model: string;
  ecosystem: GenerationWorker["ecosystem"];
  kind: "image" | "video";
  submitPath: "/jobs/edit" | "/jobs/video";
  outputMimeType: string;
  defaults: {
    seed: number;
    steps?: number;
    guidance?: number;
    megapixels: number;
    resolution?: VideoResolution;
    durationSeconds?: number;
    audioEnabled?: boolean;
    frameRate?: number;
  };
};

export type NativeGenerationJobRow = {
  id: string;
  owner_id: string;
  status: GenerationJob["status"];
  operation: CreativeOperation;
  output_kind: "image" | "video";
  prompt: string | null;
  workflow_id: string;
  model: string;
  ecosystem: string;
  inputs: GenerationRequest["inputs"];
  parameters: Record<string, unknown>;
  worker_id: string | null;
  provider_job_id: string | null;
  worker_state: string | null;
  failover_history: Array<Record<string, unknown>>;
  output_asset_ids: string[];
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
};

type JobRow = NativeGenerationJobRow;

type InputBytes = { bytes: Buffer; contentType: string; filename: string };

type GeneratedMediaRow = {
  id: string;
  storage_key: string;
  thumbnail_storage_key: string | null;
  mime_type: string;
};

type DurableOutputObject = {
  storageKey: string;
  contentType: string;
};

const maxPollReassignmentAttempts = 3;
const invalidWorkerGraceMs = 15 * 60 * 1000;
const retryableProviderStaleMs = 2 * 60 * 60 * 1000;
function workflowFor(request: GenerationRequest): WorkflowConfig {
  const operation = resolveCreativeOperation(request);
  const requestedModel = generationModelForRequest(request);

  if (operation === "create-image" || operation === "edit-image") {
    if (requestedModel === "qwen-image-edit-2511") {
      return {
        id: operation === "edit-image" ? "qwen-image-edit-2511-edit" : "qwen-image-edit-2511-generate",
        model: "Qwen Image Edit 2511 · Lightning 4-step",
        ecosystem: "qwen-image-edit-2511",
        kind: "image",
        submitPath: "/jobs/edit",
        outputMimeType: "image/png",
        defaults: {
          seed: 42,
          steps: qwenImageFixedSteps,
          guidance: qwenImageFixedGuidance,
          megapixels: 1,
        },
      };
    }
    if (requestedModel !== "flux2-klein-9b") {
      throw new Error("The selected model does not support image generation.");
    }
    return {
      id: operation === "edit-image" ? "flux2-klein-image-edit" : "flux2-klein-image-generate",
      model: "FLUX.2 Klein 9B · DarkBeast V2 BFS",
      ecosystem: "flux2-klein-9b",
      kind: "image",
      submitPath: "/jobs/edit",
      outputMimeType: "image/png",
      defaults: { seed: 42, steps: 4, guidance: 1, megapixels: 1 },
    };
  }

  if (requestedModel !== "ltx25-redgraft") {
    throw new Error("The selected model does not support video generation.");
  }
  return {
    id: "ltx25-redgraft-video",
    model: "REDGraft LTX 2.5 · Sulphur2 INT8 ConvRot",
    ecosystem: "ltx25-redgraft",
    kind: "video",
    submitPath: "/jobs/video",
    outputMimeType: "video/mp4",
    defaults: {
      seed: 42,
      megapixels: 1,
      resolution: defaultVideoResolution,
      durationSeconds: 5,
      audioEnabled: defaultVideoAudioEnabled,
      frameRate: 24,
    },
  };
}

export function isNativeGenerationConfigured() {
  return isSupabaseConfigured() && isR2Configured();
}

export function toGenerationJob(row: JobRow): GenerationJob {
  return {
    id: row.id,
    status: row.status,
    operation: row.operation,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    outputAssetIds: row.output_asset_ids ?? [],
    ...(row.error_message
      ? { error: { code: row.error_code || "generation_failed", message: row.error_message } }
      : {}),
  };
}

async function insertJob(ownerId: string, request: GenerationRequest, workflow: WorkflowConfig) {
  const operation = resolveCreativeOperation(request);
  const rows = await supabaseRest<JobRow[]>("generation_jobs?select=*", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      owner_id: ownerId,
      status: "queued",
      operation,
      output_kind: request.output.kind,
      prompt: request.prompt,
      workflow_id: workflow.id,
      model: workflow.model,
      ecosystem: workflow.ecosystem,
      inputs: request.inputs,
      parameters: { model: generationModelForRequest(request), output: request.output, advanced: request.advanced ?? {} },
    }),
  });
  if (!rows?.[0]) throw new Error("Generation job could not be created.");
  return rows[0];
}

export async function getJobRow(ownerId: string, jobId: string) {
  const rows = await supabaseRest<JobRow[]>(
    `generation_jobs?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(jobId)}&select=*&limit=1`,
    { method: "GET" },
  );
  return rows?.[0] ?? null;
}

export async function patchJob(ownerId: string, jobId: string, patch: Record<string, unknown>) {
  const rows = await supabaseRest<JobRow[]>(
    `generation_jobs?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(jobId)}&select=*`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
    },
  );
  if (!rows?.[0]) throw new Error("Generation job could not be updated.");
  return rows[0];
}

async function resolveInputs(ownerId: string, request: GenerationRequest): Promise<InputBytes[]> {
  const resolved: InputBytes[] = [];
  for (const input of request.inputs) {
    if (input.source.type === "temporary-source") {
      const rows = await supabaseRest<Array<{ storage_key: string; filename: string; mime_type: string; status: string }>>(
        `generation_sources?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(input.source.id)}&select=storage_key,filename,mime_type,status&limit=1`,
        { method: "GET" },
      );
      const source = rows?.[0];
      if (!source || source.status !== "ready") throw new Error("Reference source is not ready.");
      const object = await readR2Object(source.storage_key);
      resolved.push({ bytes: object.bytes, contentType: source.mime_type, filename: source.filename });
      continue;
    }

    const assets = await supabaseRest<Array<{ storage_key: string; mime_type: string }>>(
      `media_assets?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(input.source.id)}&select=storage_key,mime_type&limit=1`,
      { method: "GET" },
    );
    const asset = assets?.[0];
    if (!asset) throw new Error("Media asset input was not found.");
    const object = await readR2Object(asset.storage_key);
    resolved.push({ bytes: object.bytes, contentType: asset.mime_type, filename: `asset-${input.source.id}` });
  }
  return resolved;
}

type PreparedWorkerPayload = {
  sources: InputBytes[];
  aspectRatio: string;
};

async function prepareWorkerPayload(
  request: GenerationRequest,
  workflow: WorkflowConfig,
  sources: InputBytes[],
): Promise<PreparedWorkerPayload> {
  const operation = resolveCreativeOperation(request);

  if (workflow.kind === "image") {
    if (operation === "create-image") {
      if (request.output.aspectRatio === "original") {
        throw new Error("Original geometry requires a source image.");
      }
      return {
        sources: [await createImageGenerationCanvas(request.output.aspectRatio)],
        aspectRatio: request.output.aspectRatio,
      };
    }

    if (!sources.length) throw new Error("Image editing requires a source image.");
    if (request.output.aspectRatio === "original") {
      return { sources, aspectRatio: "original" };
    }

    const [primary, ...rest] = sources;
    const preparedPrimary = await prepareImageAspectOverride(primary.bytes, request.output.aspectRatio);
    return {
      sources: [
        {
          bytes: preparedPrimary,
          contentType: "image/png",
          filename: `${primary.filename.replace(/\.[^.]+$/, "")}-renderlab-${request.output.aspectRatio.replace(":", "x")}.png`,
        },
        ...rest,
      ],
      aspectRatio: request.output.aspectRatio,
    };
  }

  if (request.output.aspectRatio !== "original") {
    return { sources, aspectRatio: request.output.aspectRatio };
  }
  const primary = sources[0];
  if (!primary) throw new Error("Original geometry requires a source image.");
  return { sources, aspectRatio: await sourceVideoAspectRatio(primary.bytes) };
}

function executionPromptForRequest(request: GenerationRequest) {
  const workerPositions = new Map<string, number>(
    request.inputs.map((input, index) => [input.alias, index + 1]),
  );
  return request.prompt.replace(/@image\d+\b/g, (mention) => {
    const position = workerPositions.get(mention.slice(1));
    return position ? `image ${position}` : mention;
  });
}

function buildForm(request: GenerationRequest, workflow: WorkflowConfig, prepared: PreparedWorkerPayload) {
  const form = new FormData();
  const executionPrompt = executionPromptForRequest(request);
  if (workflow.kind === "image") {
    for (const source of prepared.sources) {
      form.append("image_files", new Blob([Uint8Array.from(source.bytes).buffer], { type: source.contentType }), source.filename);
    }
    form.append("prompt", executionPrompt);
    form.append("negative_prompt", request.advanced?.negativePrompt ?? "");
    form.append("seed", String(request.advanced?.seed ?? workflow.defaults.seed));
    const fixedQwenTuning = workflow.ecosystem === "qwen-image-edit-2511";
    form.append("steps", String(fixedQwenTuning ? workflow.defaults.steps! : request.advanced?.steps ?? workflow.defaults.steps!));
    form.append("cfg", String(fixedQwenTuning ? workflow.defaults.guidance! : request.advanced?.guidance ?? workflow.defaults.guidance!));
    form.append("megapixels", String(workflow.defaults.megapixels));
    return form;
  }

  const source = prepared.sources[0];
  if (source) form.append("image_file", new Blob([Uint8Array.from(source.bytes).buffer], { type: source.contentType }), source.filename);
  form.append("prompt", executionPrompt);
  form.append("negative_prompt", request.advanced?.negativePrompt ?? "");
  form.append("seed", String(request.advanced?.seed ?? workflow.defaults.seed));
  form.append("resolution", request.output.resolution ?? workflow.defaults.resolution ?? defaultVideoResolution);
  form.append("duration_seconds", String(request.output.durationSeconds ?? workflow.defaults.durationSeconds));
  form.append("audio_enabled", String(request.output.audioEnabled ?? workflow.defaults.audioEnabled));
  form.append("aspect_ratio", prepared.aspectRatio);
  form.append("frame_rate", String(request.advanced?.frameRate ?? workflow.defaults.frameRate));
  return form;
}

async function errorBody(response: Response) {
  try { return await response.json() as Record<string, unknown>; } catch { return {}; }
}

async function submitWorker(workflow: WorkflowConfig, request: GenerationRequest, sources: InputBytes[]) {
  const prepared = await prepareWorkerPayload(request, workflow, sources);
  const failures: Array<Record<string, unknown>> = [];
  for (const worker of workersForEcosystem(workflow.ecosystem)) {
    try {
      const response = await fetch(`${worker.gatewayUrl}${workflow.submitPath}`, {
        method: "POST",
        body: buildForm(request, workflow, prepared),
        cache: "no-store",
      });
      if (!response.ok) {
        const body = await errorBody(response);
        const kind = failureKind(response.status, body);
        failures.push({ workerId: worker.id, kind, status: response.status, at: new Date().toISOString() });
        if (kind === "failed") throw new Error(String(body.error || body.detail || `Worker rejected generation (${response.status}).`));
        continue;
      }
      const payload = await response.json() as { call_id?: string; worker_state?: string; workerState?: string };
      if (!payload.call_id) throw new Error("Generation worker did not return a call ID.");
      return {
        worker,
        callId: payload.call_id,
        workerState: payload.worker_state || payload.workerState || "queued",
        failures,
      };
    } catch (error) {
      failures.push({ workerId: worker.id, kind: "unavailable", message: error instanceof Error ? error.message : String(error), at: new Date().toISOString() });
    }
  }
  throw new Error("No configured generation worker is currently available.");
}

export async function submitNativeGeneration(ownerId: string, request: GenerationRequest): Promise<SubmitGenerationResponse> {
  if (!isNativeGenerationConfigured()) {
    return { ok: false, error: { code: "generation_backend_unavailable", message: "Native generation infrastructure is not configured." } };
  }

  const workflow = workflowFor(request);
  let job: JobRow | null = null;
  try {
    job = await insertJob(ownerId, request, workflow);
    const sources = await resolveInputs(ownerId, request);
    const submitted = await submitWorker(workflow, request, sources);
    job = await patchJob(ownerId, job.id, {
      status: "running",
      worker_id: submitted.worker.id,
      provider_job_id: submitted.callId,
      worker_state: submitted.workerState,
      failover_history: submitted.failures,
      started_at: new Date().toISOString(),
    });
    return { ok: true, job: toGenerationJob(job) };
  } catch (error) {
    if (job) {
      try {
        job = await patchJob(ownerId, job.id, {
          status: "failed",
          error_code: "generation_submission_failed",
          error_message: error instanceof Error ? error.message : "Generation submission failed.",
          completed_at: new Date().toISOString(),
        });
      } catch {}
    }
    return {
      ok: false,
      error: {
        code: "generation_submission_failed",
        message: error instanceof Error ? error.message : "Generation submission failed.",
      },
    };
  }
}

function extensionFor(contentType: string) {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/webp") return "webp";
  if (contentType === "video/webm") return "webm";
  if (contentType === "video/quicktime") return "mov";
  if (contentType.startsWith("video/")) return "mp4";
  return "png";
}

function deterministicGenerationAssetId(jobId: string, outputIndex: number) {
  const bytes = Buffer.from(
    createHash("sha256")
      .update(`renderlab:generation-output:${jobId}:${outputIndex}`)
      .digest()
      .subarray(0, 16),
  );
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function outputStoragePrefix(row: JobRow, assetId: string) {
  const created = new Date(row.created_at);
  const year = created.getUTCFullYear();
  const month = String(created.getUTCMonth() + 1).padStart(2, "0");
  return `renderlab/generations/${year}/${month}/${assetId}`;
}

function thumbnailStoragePrefix(row: JobRow, assetId: string) {
  const created = new Date(row.created_at);
  const year = created.getUTCFullYear();
  const month = String(created.getUTCMonth() + 1).padStart(2, "0");
  return `renderlab/thumbnails/${year}/${month}/${assetId}`;
}

function possibleOutputExtensions(row: JobRow) {
  return row.output_kind === "image" ? ["png", "jpg", "webp"] : ["mp4", "webm", "mov"];
}

function possibleThumbnailExtensions() {
  return ["png", "jpg", "webp"];
}

function contentTypeMatchesKind(kind: JobRow["output_kind"], contentType: string) {
  return kind === "image" ? contentType.startsWith("image/") : contentType.startsWith("video/");
}

async function findDurableObject(prefix: string, extensions: string[], expectedKind: "image" | "video"): Promise<DurableOutputObject | null> {
  for (const extension of extensions) {
    const storageKey = `${prefix}.${extension}`;
    try {
      const object = await headR2Object(storageKey);
      if (contentTypeMatchesKind(expectedKind, object.contentType)) {
        return { storageKey, contentType: object.contentType };
      }
    } catch {
      // A deterministic candidate that does not exist is expected during ordinary polling.
    }
  }
  return null;
}

async function getGeneratedOutput(row: JobRow, outputIndex: number) {
  const rows = await supabaseRest<GeneratedMediaRow[]>(
    `media_assets?owner_id=eq.${encodeURIComponent(row.owner_id)}&generation_job_id=eq.${encodeURIComponent(row.id)}&generation_output_index=eq.${outputIndex}&select=id,storage_key,thumbnail_storage_key,mime_type&limit=1`,
    { method: "GET" },
  );
  return rows?.[0] ?? null;
}

async function completeJobWithAsset(row: JobRow, assetId: string) {
  return patchJob(row.owner_id, row.id, {
    status: "succeeded",
    worker_state: "ready",
    output_asset_ids: [assetId],
    completed_at: new Date().toISOString(),
    error_code: null,
    error_message: null,
  });
}

async function persistGeneratedMedia({
  row,
  outputIndex,
  assetId,
  contentType,
  storageKey,
  thumbnailStorageKey,
  upscaleMetadata,
}: {
  row: JobRow;
  outputIndex: number;
  assetId: string;
  contentType: string;
  storageKey: string;
  thumbnailStorageKey: string | null;
  upscaleMetadata?: UpscaleOutputMetadata | null;
}) {
  try {
    await supabaseRest("media_assets", {
      method: "POST",
      body: JSON.stringify({
        id: assetId,
        owner_id: row.owner_id,
        generation_job_id: row.id,
        generation_output_index: outputIndex,
        kind: row.output_kind,
        mime_type: contentType,
        storage_key: storageKey,
        thumbnail_storage_key: thumbnailStorageKey,
        ...(upscaleMetadata
          ? {
              size_bytes: upscaleMetadata.sizeBytes,
              width: upscaleMetadata.width,
              height: upscaleMetadata.height,
            }
          : {}),
        provenance: {
          operation: row.operation,
          workflowId: row.workflow_id,
          model: row.model,
          prompt: row.prompt,
        },
        metadata: { ecosystem: row.ecosystem, workerId: row.worker_id },
      }),
    });
  } catch (error) {
    const raced = await getGeneratedOutput(row, outputIndex).catch(() => null);
    if (!raced) throw error;
    return completeJobWithAsset(row, raced.id);
  }

  injectGenerationFinalizationFault("after-media-insert");
  return completeJobWithAsset(row, assetId);
}

export async function recoverPersistingResult(row: JobRow) {
  if (row.status !== "persisting") return null;

  const outputIndex = 0;
  const existing = await getGeneratedOutput(row, outputIndex);
  if (existing) return completeJobWithAsset(row, existing.id);

  const assetId = deterministicGenerationAssetId(row.id, outputIndex);
  const primary = await findDurableObject(
    outputStoragePrefix(row, assetId),
    possibleOutputExtensions(row),
    row.output_kind,
  );
  if (!primary) return null;
  if (row.operation === "upscale-image" && primary.contentType !== "image/png") return null;

  let upscaleMetadata: UpscaleOutputMetadata | null = null;
  if (row.operation === "upscale-image") {
    const object = await readR2Object(primary.storageKey);
    upscaleMetadata = await inspectUpscaleOutputMetadata(object.bytes, primary.contentType);
  }

  let thumbnailStorageKey: string | null = null;
  if (row.output_kind === "image") {
    try {
      const object = await readR2Object(primary.storageKey);
      const thumbnailBytes = await createImageThumbnailBytes(object.bytes);
      const thumbnailKey = imageThumbnailStorageKey(assetId, primary.storageKey, row.created_at);
      await writeR2Object({
        key: thumbnailKey,
        contentType: IMAGE_THUMBNAIL_CONTENT_TYPE,
        body: thumbnailBytes,
      });
      thumbnailStorageKey = thumbnailKey;
    } catch {
      thumbnailStorageKey = null;
    }
  } else {
    const thumbnail = await findDurableObject(
      thumbnailStoragePrefix(row, assetId),
      possibleThumbnailExtensions(),
      "image",
    );
    thumbnailStorageKey = thumbnail?.storageKey ?? null;
  }

  return persistGeneratedMedia({
    row,
    outputIndex,
    assetId,
    contentType: primary.contentType,
    storageKey: primary.storageKey,
    thumbnailStorageKey,
    upscaleMetadata,
  });
}

export async function persistResult(row: JobRow, bytes: Buffer, contentType: string, poster?: { bytes: Buffer; contentType: string } | null) {
  const outputIndex = 0;
  const existing = await getGeneratedOutput(row, outputIndex);
  if (existing) return completeJobWithAsset(row, existing.id);

  const upscaleMetadata = row.operation === "upscale-image"
    ? await inspectUpscaleOutputMetadata(bytes, contentType)
    : null;
  const assetId = deterministicGenerationAssetId(row.id, outputIndex);
  const storageKey = `${outputStoragePrefix(row, assetId)}.${extensionFor(contentType)}`;
  injectGenerationFinalizationFault("before-primary-write");
  await writeR2Object({ key: storageKey, contentType, body: bytes });
  injectGenerationFinalizationFault("after-primary-write");

  let thumbnailStorageKey: string | null = null;
  if (row.output_kind === "image" && contentType.startsWith("image/")) {
    const thumbnailKey = imageThumbnailStorageKey(assetId, storageKey, row.created_at);
    try {
      const thumbnailBytes = await createImageThumbnailBytes(bytes);
      await writeR2Object({
        key: thumbnailKey,
        contentType: IMAGE_THUMBNAIL_CONTENT_TYPE,
        body: thumbnailBytes,
      });
      thumbnailStorageKey = thumbnailKey;
    } catch {
      thumbnailStorageKey = null;
    }
  } else if (poster?.bytes?.length && poster.contentType.startsWith("image/")) {
    const posterKey = `${thumbnailStoragePrefix(row, assetId)}.${extensionFor(poster.contentType)}`;
    try {
      injectGenerationFinalizationFault("thumbnail-write");
      await writeR2Object({ key: posterKey, contentType: poster.contentType, body: poster.bytes });
      thumbnailStorageKey = posterKey;
    } catch {
      thumbnailStorageKey = null;
    }
  }

  return persistGeneratedMedia({
    row,
    outputIndex,
    assetId,
    contentType,
    storageKey,
    thumbnailStorageKey,
    upscaleMetadata,
  });
}

async function fetchPoster(worker: GenerationWorker, callId: string) {
  try {
    const response = await fetch(`${worker.gatewayUrl}/jobs/${encodeURIComponent(callId)}/poster`, {
      headers: { accept: "image/*, application/json" },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const contentType = String(response.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
    if (!contentType.startsWith("image/")) return null;
    return { bytes: Buffer.from(await response.arrayBuffer()), contentType };
  } catch {
    return null;
  }
}

function requestFromJobRow(row: JobRow): GenerationRequest {
  if (typeof row.prompt !== "string" || !row.prompt.trim()) {
    throw new Error("Stored prompt generation request is missing its prompt.");
  }
  const output = row.parameters.output as GenerationRequest["output"] | undefined;
  const advanced = row.parameters.advanced as GenerationRequest["advanced"] | undefined;
  if (!output?.aspectRatio) throw new Error("Stored generation request is missing its output settings.");
  return {
    prompt: row.prompt,
    output: { ...output, kind: row.output_kind },
    inputs: Array.isArray(row.inputs)
      ? row.inputs.map((input, index) => ({
          ...input,
          alias: input.alias || generationInputAlias(index + 1),
        }))
      : [],
    ...(advanced ? { advanced } : {}),
  };
}

function pollReassignmentAttemptCount(row: JobRow) {
  return (row.failover_history || []).filter((entry) => entry.phase === "poll-reassign-attempt").length;
}

function attemptedWorkerIds(row: JobRow) {
  const ids = new Set<string>();
  if (row.worker_id) ids.add(row.worker_id);
  for (const entry of row.failover_history || []) {
    for (const key of ["workerId", "fromWorkerId", "toWorkerId"] as const) {
      const value = entry[key];
      if (typeof value === "string" && value) ids.add(value);
    }
  }
  return ids;
}

async function reassignPollJob(row: JobRow, failure: WorkerFailureClassification) {
  if (!failure.safeToReassign || pollReassignmentAttemptCount(row) >= maxPollReassignmentAttempts) return null;

  const request = requestFromJobRow(row);
  const workflow = workflowFor(request);
  if (workflow.id !== row.workflow_id || workflow.ecosystem !== row.ecosystem) {
    throw new Error("Stored generation workflow no longer matches the job routing contract.");
  }

  const sources = await resolveInputs(row.owner_id, request);
  const prepared = await prepareWorkerPayload(request, workflow, sources);
  const excluded = attemptedWorkerIds(row);
  const candidate = workersForEcosystem(workflow.ecosystem).find((worker) => !excluded.has(worker.id));
  if (!candidate) return null;

  const at = new Date().toISOString();
  const attemptEntry = {
    phase: "poll-reassign-attempt",
    fromWorkerId: row.worker_id,
    workerId: candidate.id,
    reason: failure.kind,
    code: failure.code,
    at,
  };
  const attempted = await patchJob(row.owner_id, row.id, {
    failover_history: [...(row.failover_history || []), attemptEntry],
  });
  await emitDiagnosticEvent({
    event: "generation.reconciliation",
    level: "warn",
    correlationId: correlationIdForGenerationJob(row.id),
    jobId: row.id,
    operation: row.operation,
    phase: "failover-attempt",
    status: attempted.status,
    code: failure.code,
    attempt: pollReassignmentAttemptCount(attempted),
  });

  let response: Response;
  try {
    response = await fetch(`${candidate.gatewayUrl}${workflow.submitPath}`, {
      method: "POST",
      body: buildForm(request, workflow, prepared),
      cache: "no-store",
    });
  } catch {
    throw new Error("Standby reassignment could not be confirmed, so RenderLab will not retry that worker automatically.");
  }

  if (!response.ok) {
    const body = await errorBody(response);
    throw new Error(String(body.error || body.detail || `Standby worker rejected reassignment (${response.status}).`));
  }

  const payload = await response.json().catch(() => ({})) as { call_id?: string; worker_state?: string; workerState?: string };
  if (!payload.call_id) {
    throw new Error("Standby worker did not return a call ID; RenderLab will not retry the ambiguous reassignment automatically.");
  }

  const reassigned = await patchJob(row.owner_id, row.id, {
    status: "running",
    worker_id: candidate.id,
    provider_job_id: payload.call_id,
    worker_state: payload.worker_state || payload.workerState || "queued",
    failover_history: [
      ...(attempted.failover_history || []),
      {
        phase: "poll-reassign",
        fromWorkerId: row.worker_id,
        toWorkerId: candidate.id,
        reason: failure.kind,
        code: failure.code,
        at: new Date().toISOString(),
      },
    ],
  });
  await emitDiagnosticEvent({
    event: "generation.reconciliation",
    correlationId: correlationIdForGenerationJob(row.id),
    jobId: row.id,
    operation: row.operation,
    phase: "failover-complete",
    status: reassigned.status,
    code: failure.code,
    attempt: pollReassignmentAttemptCount(reassigned),
  });
  return reassigned;
}

async function failJob(row: JobRow, code: string, message: string, diagnostic?: Record<string, unknown>) {
  return patchJob(row.owner_id, row.id, {
    status: "failed",
    error_code: code,
    error_message: message,
    completed_at: new Date().toISOString(),
    ...(diagnostic ? { failover_history: [...(row.failover_history || []), diagnostic] } : {}),
  });
}

function providerFailureDiagnostic(
  row: JobRow,
  responseStatus: number,
  failure: WorkerFailureClassification,
  providerMessage: string,
) {
  return {
    phase: "poll-provider-failure",
    workerId: row.worker_id,
    status: responseStatus,
    kind: failure.kind,
    code: failure.code,
    message: providerMessage.slice(0, 500),
    at: new Date().toISOString(),
  };
}

export async function pollNativeGeneration(ownerId: string, jobId: string): Promise<GenerationJob | null> {
  const row = await getJobRow(ownerId, jobId);
  if (!row) return null;
  if (["succeeded", "failed", "cancelled"].includes(row.status)) return toGenerationJob(row);

  const recovered = await recoverPersistingResult(row);
  if (recovered) {
    await emitDiagnosticEvent({
      event: "generation.reconciliation",
      correlationId: correlationIdForGenerationJob(row.id),
      jobId: row.id,
      operation: row.operation,
      phase: "finalization-recovered",
      status: recovered.status,
    });
    return toGenerationJob(recovered);
  }

  if (!row.worker_id || !row.provider_job_id) return toGenerationJob(row);

  const worker = findWorker(row.worker_id);
  if (!worker) {
    if (Date.now() - Date.parse(row.updated_at) < invalidWorkerGraceMs) {
      throw new Error("Assigned generation worker is temporarily unavailable.");
    }
    const failed = await failJob(
      row,
      "generation_worker_unavailable",
      "Generation could not resume because its assigned worker is no longer available.",
      {
        phase: "poll-worker-missing",
        workerId: row.worker_id,
        at: new Date().toISOString(),
      },
    );
    return toGenerationJob(failed);
  }

  const response = await fetch(`${worker.gatewayUrl}/jobs/${encodeURIComponent(row.provider_job_id)}`, {
    method: "GET",
    headers: { accept: row.output_kind === "video" ? "video/*, application/json" : "image/*, application/json" },
    cache: "no-store",
  });

  if (response.status === 202) {
    const payload = await response.json().catch(() => ({})) as { worker_state?: string; workerState?: string };
    const next = await patchJob(row.owner_id, row.id, {
      status: "running",
      worker_state: payload.worker_state || payload.workerState || "generating",
    });
    return toGenerationJob(next);
  }

  if (!response.ok) {
    const body = await errorBody(response);
    const failure = classifyWorkerFailure(response.status, body);
    const providerMessage = String(body.error || body.detail || `Worker status unavailable (${response.status}).`);
    const diagnostic = providerFailureDiagnostic(row, response.status, failure, providerMessage);

    if (failure.safeToReassign) {
      try {
        const reassigned = await reassignPollJob(row, failure);
        if (reassigned) return toGenerationJob(reassigned);
        const failed = await failJob(
          row,
          failure.code.toLowerCase(),
          "Generation could not continue because no safe standby worker remained.",
          diagnostic,
        );
        return toGenerationJob(failed);
      } catch (error) {
        const failed = await failJob(
          row,
          "generation_reassignment_failed",
          "Generation could not be reassigned safely.",
          {
            ...diagnostic,
            phase: "poll-reassignment-failed",
            reassignmentMessage: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
          },
        );
        return toGenerationJob(failed);
      }
    }

    if (failure.retryable) {
      if (Date.now() - Date.parse(row.updated_at) >= retryableProviderStaleMs) {
        const failed = await failJob(
          row,
          "generation_provider_stalled",
          "Generation could not be confirmed after prolonged provider unavailability.",
          diagnostic,
        );
        return toGenerationJob(failed);
      }
      throw new Error("Generation provider status is temporarily unavailable.");
    }

    const failed = await failJob(
      row,
      "generation_failed",
      "Generation failed while processing on the assigned worker.",
      diagnostic,
    );
    return toGenerationJob(failed);
  }

  const contentType = String(response.headers.get("content-type") || (row.output_kind === "video" ? "video/mp4" : "image/png"))
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (row.output_kind === "image" && !contentType.startsWith("image/")) throw new Error("Worker returned a non-image result.");
  if (row.output_kind === "video" && !contentType.startsWith("video/")) throw new Error("Worker returned a non-video result.");

  const persisting = await patchJob(row.owner_id, row.id, { status: "persisting", worker_state: "finalizing" });
  await emitDiagnosticEvent({
    event: "generation.reconciliation",
    correlationId: correlationIdForGenerationJob(row.id),
    jobId: row.id,
    operation: row.operation,
    phase: "provider-ready",
    status: persisting.status,
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  const poster = row.output_kind === "video" ? await fetchPoster(worker, row.provider_job_id) : null;
  const completed = await persistResult(persisting, bytes, contentType, poster);
  await emitDiagnosticEvent({
    event: "generation.reconciliation",
    correlationId: correlationIdForGenerationJob(row.id),
    jobId: row.id,
    operation: row.operation,
    phase: "finalization-complete",
    status: completed.status,
  });
  return toGenerationJob(completed);
}
