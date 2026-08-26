import { randomUUID } from "node:crypto";
import type {
  CreativeOperation,
  GenerationJob,
  GenerationRequest,
} from "@/lib/capabilities/generation";
import { resolveCreativeOperation } from "@/lib/capabilities/generation";
import type { SubmitGenerationResponse } from "@/lib/api/generation-contract";
import { isSupabaseConfigured, supabaseRest } from "@/server/data/supabase-rest";
import { isR2Configured, readR2Object, writeR2Object } from "@/server/storage/r2";
import { findWorker, workersForEcosystem, type GenerationWorker } from "@/server/generation/worker-fleet";

type WorkflowConfig = {
  id: string;
  model: string;
  ecosystem: GenerationWorker["ecosystem"];
  kind: "image" | "video";
  submitPath: "/jobs/edit" | "/jobs/video";
  outputMimeType: string;
  defaults: {
    seed: number;
    steps: number;
    guidance: number;
    megapixels: number;
    resolution?: string;
    durationSeconds?: number;
    audioEnabled?: boolean;
    frameRate?: number;
  };
};

type JobRow = {
  id: string;
  status: GenerationJob["status"];
  operation: CreativeOperation;
  output_kind: "image" | "video";
  prompt: string;
  workflow_id: string;
  model: string;
  ecosystem: GenerationWorker["ecosystem"];
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

type InputBytes = { bytes: Buffer; contentType: string; filename: string };

const grayPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAATUlEQVR42u3PQQ0AAAgEIDX5RTeFDzdoQCepz6aeExAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQELi3oiwCAJt186UAAAAASUVORK5CYII=",
  "base64",
);

function workflowFor(request: GenerationRequest): WorkflowConfig {
  const operation = resolveCreativeOperation(request);
  if (operation === "create-image" || operation === "edit-image") {
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
  return {
    id: "ltx25-redgraft-video",
    model: "REDGraft LTX 2.5 · Sulphur2 INT8 ConvRot",
    ecosystem: "ltx25-redgraft",
    kind: "video",
    submitPath: "/jobs/video",
    outputMimeType: "video/mp4",
    defaults: {
      seed: 42,
      steps: 11,
      guidance: 1,
      megapixels: 1,
      resolution: "480p",
      durationSeconds: 5,
      audioEnabled: true,
      frameRate: 24,
    },
  };
}

export function isNativeGenerationConfigured() {
  return isSupabaseConfigured() && isR2Configured();
}

function toGenerationJob(row: JobRow): GenerationJob {
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

async function insertJob(request: GenerationRequest, workflow: WorkflowConfig) {
  const operation = resolveCreativeOperation(request);
  const rows = await supabaseRest<JobRow[]>("generation_jobs?select=*", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      status: "queued",
      operation,
      output_kind: request.output.kind,
      prompt: request.prompt,
      workflow_id: workflow.id,
      model: workflow.model,
      ecosystem: workflow.ecosystem,
      inputs: request.inputs,
      parameters: { output: request.output, advanced: request.advanced ?? {} },
    }),
  });
  if (!rows?.[0]) throw new Error("Generation job could not be created.");
  return rows[0];
}

async function getJobRow(jobId: string) {
  const rows = await supabaseRest<JobRow[]>(`generation_jobs?id=eq.${encodeURIComponent(jobId)}&select=*&limit=1`, {
    method: "GET",
  });
  return rows?.[0] ?? null;
}

async function patchJob(jobId: string, patch: Record<string, unknown>) {
  const rows = await supabaseRest<JobRow[]>(`generation_jobs?id=eq.${encodeURIComponent(jobId)}&select=*`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
  if (!rows?.[0]) throw new Error("Generation job could not be updated.");
  return rows[0];
}

async function resolveInputs(request: GenerationRequest): Promise<InputBytes[]> {
  const resolved: InputBytes[] = [];
  for (const input of request.inputs) {
    if (input.source.type === "temporary-source") {
      const rows = await supabaseRest<Array<{ storage_key: string; filename: string; mime_type: string; status: string }>>(
        `generation_sources?id=eq.${encodeURIComponent(input.source.id)}&select=storage_key,filename,mime_type,status&limit=1`,
        { method: "GET" },
      );
      const source = rows?.[0];
      if (!source || source.status !== "ready") throw new Error("Reference source is not ready.");
      const object = await readR2Object(source.storage_key);
      resolved.push({ bytes: object.bytes, contentType: source.mime_type, filename: source.filename });
      continue;
    }

    const assets = await supabaseRest<Array<{ storage_key: string; mime_type: string }>>(
      `media_assets?id=eq.${encodeURIComponent(input.source.id)}&select=storage_key,mime_type&limit=1`,
      { method: "GET" },
    );
    const asset = assets?.[0];
    if (!asset) throw new Error("Media asset input was not found.");
    const object = await readR2Object(asset.storage_key);
    resolved.push({ bytes: object.bytes, contentType: asset.mime_type, filename: `asset-${input.source.id}` });
  }
  return resolved;
}

function buildForm(request: GenerationRequest, workflow: WorkflowConfig, sources: InputBytes[]) {
  const form = new FormData();
  if (workflow.kind === "image") {
    const imageSources = sources.length ? sources : [{ bytes: grayPng, contentType: "image/png", filename: "canvas.png" }];
    for (const source of imageSources) {
      form.append("image_files", new Blob([source.bytes], { type: source.contentType }), source.filename);
    }
    form.append("prompt", request.prompt);
    form.append("negative_prompt", request.advanced?.negativePrompt ?? "");
    form.append("seed", String(request.advanced?.seed ?? workflow.defaults.seed));
    form.append("steps", String(request.advanced?.steps ?? workflow.defaults.steps));
    form.append("cfg", String(request.advanced?.guidance ?? workflow.defaults.guidance));
    form.append("megapixels", String(workflow.defaults.megapixels));
    return form;
  }

  const source = sources[0];
  if (source) form.append("image_file", new Blob([source.bytes], { type: source.contentType }), source.filename);
  form.append("prompt", request.prompt);
  form.append("negative_prompt", request.advanced?.negativePrompt ?? "");
  form.append("seed", String(request.advanced?.seed ?? workflow.defaults.seed));
  form.append("steps", String(request.advanced?.steps ?? workflow.defaults.steps));
  form.append("cfg", String(request.advanced?.guidance ?? workflow.defaults.guidance));
  form.append("resolution", workflow.defaults.resolution!);
  form.append("duration_seconds", String(request.output.durationSeconds ?? workflow.defaults.durationSeconds));
  form.append("audio_enabled", String(workflow.defaults.audioEnabled));
  form.append("aspect_ratio", request.output.aspectRatio);
  form.append("frame_rate", String(request.advanced?.frameRate ?? workflow.defaults.frameRate));
  return form;
}

async function errorBody(response: Response) {
  try { return await response.json() as Record<string, unknown>; } catch { return {}; }
}

function failureKind(status: number, body: Record<string, unknown>) {
  const text = [body.error, body.detail, body.errorCode, body.code, body.workerState, body.worker_state]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (status === 402 || /credit|quota|budget|billing|payment|insufficient|balance/.test(text)) return "credit_exhausted";
  if (status === 429 || status >= 500 || /unavailable|disabled|stopped/.test(text)) return "unavailable";
  return "failed";
}

async function submitWorker(workflow: WorkflowConfig, request: GenerationRequest, sources: InputBytes[]) {
  const failures: Array<Record<string, unknown>> = [];
  for (const worker of workersForEcosystem(workflow.ecosystem)) {
    try {
      const response = await fetch(`${worker.gatewayUrl}${workflow.submitPath}`, {
        method: "POST",
        body: buildForm(request, workflow, sources),
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

export async function submitNativeGeneration(request: GenerationRequest): Promise<SubmitGenerationResponse> {
  if (!isNativeGenerationConfigured()) {
    return { ok: false, error: { code: "generation_backend_unavailable", message: "Native generation infrastructure is not configured." } };
  }

  const workflow = workflowFor(request);
  let job: JobRow | null = null;
  try {
    job = await insertJob(request, workflow);
    const sources = await resolveInputs(request);
    const submitted = await submitWorker(workflow, request, sources);
    job = await patchJob(job.id, {
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
        job = await patchJob(job.id, {
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

async function persistResult(row: JobRow, bytes: Buffer, contentType: string, poster?: { bytes: Buffer; contentType: string } | null) {
  const assetId = randomUUID();
  const created = new Date(row.created_at);
  const year = created.getUTCFullYear();
  const month = String(created.getUTCMonth() + 1).padStart(2, "0");
  const storageKey = `renderlab/generations/${year}/${month}/${assetId}.${extensionFor(contentType)}`;
  await writeR2Object({ key: storageKey, contentType, body: bytes });

  let thumbnailStorageKey: string | null = null;
  if (poster?.bytes?.length && poster.contentType.startsWith("image/")) {
    thumbnailStorageKey = `renderlab/thumbnails/${year}/${month}/${assetId}.${extensionFor(poster.contentType)}`;
    await writeR2Object({ key: thumbnailStorageKey, contentType: poster.contentType, body: poster.bytes });
  }

  await supabaseRest("media_assets", {
    method: "POST",
    body: JSON.stringify({
      id: assetId,
      generation_job_id: row.id,
      kind: row.output_kind,
      mime_type: contentType,
      storage_key: storageKey,
      thumbnail_storage_key: thumbnailStorageKey,
      provenance: {
        operation: row.operation,
        workflowId: row.workflow_id,
        model: row.model,
        prompt: row.prompt,
      },
      metadata: { ecosystem: row.ecosystem, workerId: row.worker_id },
    }),
  });

  return patchJob(row.id, {
    status: "succeeded",
    worker_state: "ready",
    output_asset_ids: [assetId],
    completed_at: new Date().toISOString(),
    error_code: null,
    error_message: null,
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

export async function pollNativeGeneration(jobId: string): Promise<GenerationJob | null> {
  const row = await getJobRow(jobId);
  if (!row) return null;
  if (["succeeded", "failed", "cancelled"].includes(row.status)) return toGenerationJob(row);
  if (!row.worker_id || !row.provider_job_id) return toGenerationJob(row);

  const worker = findWorker(row.worker_id);
  if (!worker) throw new Error("Assigned generation worker is no longer registered.");

  const response = await fetch(`${worker.gatewayUrl}/jobs/${encodeURIComponent(row.provider_job_id)}`, {
    method: "GET",
    headers: { accept: row.output_kind === "video" ? "video/*, application/json" : "image/*, application/json" },
    cache: "no-store",
  });

  if (response.status === 202) {
    const payload = await response.json().catch(() => ({})) as { worker_state?: string; workerState?: string };
    const next = await patchJob(row.id, {
      status: "running",
      worker_state: payload.worker_state || payload.workerState || "generating",
    });
    return toGenerationJob(next);
  }

  if (!response.ok) {
    const body = await errorBody(response);
    const kind = failureKind(response.status, body);
    if (kind !== "failed") throw new Error(String(body.error || body.detail || `Worker status unavailable (${response.status}).`));
    const failed = await patchJob(row.id, {
      status: "failed",
      error_code: "generation_failed",
      error_message: String(body.error || body.detail || "Generation failed."),
      completed_at: new Date().toISOString(),
    });
    return toGenerationJob(failed);
  }

  const contentType = String(response.headers.get("content-type") || (row.output_kind === "video" ? "video/mp4" : "image/png"))
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (row.output_kind === "image" && !contentType.startsWith("image/")) throw new Error("Worker returned a non-image result.");
  if (row.output_kind === "video" && !contentType.startsWith("video/")) throw new Error("Worker returned a non-video result.");

  const persisting = await patchJob(row.id, { status: "persisting", worker_state: "finalizing" });
  const bytes = Buffer.from(await response.arrayBuffer());
  const poster = row.output_kind === "video" ? await fetchPoster(worker, row.provider_job_id) : null;
  const completed = await persistResult(persisting, bytes, contentType, poster);
  return toGenerationJob(completed);
}
