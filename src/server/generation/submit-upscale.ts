import type { GenerationJob } from "@/lib/capabilities/generation";
import type { SubmitGenerationResponse } from "@/lib/api/generation-contract";
import { createUpscaleImageCommand, imageUpscaleScale } from "@/lib/capabilities/upscale";
import { isSupabaseConfigured, supabaseRest } from "@/server/data/supabase-rest";
import {
  bindGenerationAdmission,
  releaseGenerationAdmission,
  reserveGenerationAdmission,
} from "@/server/generation/generation-admission";
import type { PreparedUpscaleImageSource } from "@/server/generation/upscale-source";
import {
  getImageUpscaleWorker,
  imageUpscaleEcosystem,
  imageUpscaleModel,
  imageUpscaleWorkflowId,
} from "@/server/generation/upscale-worker";
import { isR2Configured } from "@/server/storage/r2";
import {
  correlationIdForGenerationJob,
  createDiagnosticCorrelationId,
  emitDiagnosticEvent,
} from "@/server/observability/diagnostics";

type UpscaleJobRow = {
  id: string;
  status: GenerationJob["status"];
  operation: "upscale-image";
  created_at: string;
  updated_at: string;
  output_asset_ids: string[];
  error_code: string | null;
  error_message: string | null;
};

function toGenerationJob(row: UpscaleJobRow): GenerationJob {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function extensionForMimeType(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  return "png";
}

export function isImageUpscaleGenerationConfigured() {
  return isSupabaseConfigured() && isR2Configured() && Boolean(getImageUpscaleWorker());
}

async function insertUpscaleJob(ownerId: string, source: PreparedUpscaleImageSource) {
  const command = createUpscaleImageCommand(source.asset.id);
  const rows = await supabaseRest<UpscaleJobRow[]>("generation_jobs?select=*", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      owner_id: ownerId,
      status: "queued",
      operation: command.operation,
      output_kind: command.outputKind,
      prompt: command.prompt,
      workflow_id: imageUpscaleWorkflowId,
      model: imageUpscaleModel,
      ecosystem: imageUpscaleEcosystem,
      inputs: command.inputs,
      parameters: command.parameters,
    }),
  });
  if (!rows?.[0]) throw new Error("Upscale job could not be created.");
  return rows[0];
}

async function patchUpscaleJob(ownerId: string, jobId: string, patch: Record<string, unknown>) {
  const rows = await supabaseRest<UpscaleJobRow[]>(
    `generation_jobs?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(jobId)}&select=*`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
    },
  );
  if (!rows?.[0]) throw new Error("Upscale job could not be updated.");
  return rows[0];
}

async function dispatchUpscaleWorker(source: PreparedUpscaleImageSource) {
  const worker = getImageUpscaleWorker();
  if (!worker) throw new Error("Upscale worker is not configured.");

  const form = new FormData();
  form.append(
    "image_file",
    new Blob([Uint8Array.from(source.bytes).buffer], { type: source.mimeType }),
    `asset-${source.asset.id}.${extensionForMimeType(source.mimeType)}`,
  );
  form.append("scale", String(imageUpscaleScale));

  const response = await fetch(`${worker.gatewayUrl}/jobs/upscale`, {
    method: "POST",
    body: form,
    cache: "no-store",
    signal: AbortSignal.timeout(120_000),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok || !isRecord(payload)) throw new Error("Upscale worker rejected submission.");

  const callId = typeof payload.call_id === "string" ? payload.call_id.trim() : "";
  const workerId = typeof payload.worker_id === "string" ? payload.worker_id.trim() : "";
  const ecosystem = typeof payload.ecosystem === "string" ? payload.ecosystem.trim() : "";
  if (!callId || workerId !== worker.id || ecosystem !== worker.ecosystem) {
    throw new Error("Upscale worker returned an invalid submission response.");
  }

  return {
    worker,
    callId,
    workerState: typeof payload.worker_state === "string" && payload.worker_state.trim()
      ? payload.worker_state.trim()
      : "queued",
  };
}

async function submitNativeUpscale(ownerId: string, source: PreparedUpscaleImageSource): Promise<SubmitGenerationResponse> {
  let job: UpscaleJobRow | null = null;
  try {
    job = await insertUpscaleJob(ownerId, source);
    const submitted = await dispatchUpscaleWorker(source);
    job = await patchUpscaleJob(ownerId, job.id, {
      status: "running",
      worker_id: submitted.worker.id,
      provider_job_id: submitted.callId,
      worker_state: submitted.workerState,
      failover_history: [],
      started_at: new Date().toISOString(),
    });
    return { ok: true, job: toGenerationJob(job) };
  } catch {
    if (job) {
      try {
        job = await patchUpscaleJob(ownerId, job.id, {
          status: "failed",
          error_code: "generation_submission_failed",
          error_message: "Upscale could not be started.",
          completed_at: new Date().toISOString(),
        });
      } catch {}
    }
    return {
      ok: false,
      error: { code: "generation_submission_failed", message: "Upscale could not be started." },
    };
  }
}

export async function submitUpscaleImage(
  ownerId: string,
  source: PreparedUpscaleImageSource,
): Promise<SubmitGenerationResponse> {
  const startedAt = Date.now();
  const requestCorrelationId = createDiagnosticCorrelationId();
  const reject = async (response: SubmitGenerationResponse) => {
    if (!response.ok) {
      await emitDiagnosticEvent({
        event: "generation.submission",
        level: "warn",
        correlationId: requestCorrelationId,
        operation: "upscale-image",
        phase: "rejected",
        code: response.error.code,
        durationMs: Date.now() - startedAt,
      });
    }
    return response;
  };

  if (!isImageUpscaleGenerationConfigured()) {
    return reject({
      ok: false,
      error: { code: "generation_backend_unavailable", message: "Image Upscale is not connected to its native worker yet." },
    });
  }

  const admission = await reserveGenerationAdmission(ownerId);
  if (!admission.ok) return reject(admission);
  const reservationId = admission.reservation.id;

  const submitted = await submitNativeUpscale(ownerId, source);
  if (!submitted.ok) {
    await releaseGenerationAdmission(ownerId, reservationId);
    return reject(submitted);
  }

  await bindGenerationAdmission(ownerId, reservationId, submitted.job.id);
  await emitDiagnosticEvent({
    event: "generation.submission",
    correlationId: correlationIdForGenerationJob(submitted.job.id),
    jobId: submitted.job.id,
    operation: "upscale-image",
    phase: "accepted",
    status: submitted.job.status,
    durationMs: Date.now() - startedAt,
  });
  return submitted;
}
