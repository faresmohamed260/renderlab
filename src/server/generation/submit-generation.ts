import "server-only";

import { fiboGenerationModel, resolveCreativeOperation, type GenerationJob, type GenerationRequest } from "@/lib/capabilities/generation";
import type { SubmitGenerationResponse } from "@/lib/api/generation-contract";
import { isNativeGenerationConfigured, submitNativeGeneration } from "@/server/generation/native-generation";
import { workersForEcosystem } from "@/server/generation/worker-fleet";
import { getMediaAsset } from "@/server/media/media-assets";
import { supabaseRest } from "@/server/data/supabase-rest";
import { fiboMaskUsage } from "@/lib/capabilities/fibo-mask";
import { getReadyFiboMaskSource } from "@/server/media/reference-uploads";
import { correlationIdForGenerationJob, createDiagnosticCorrelationId, emitDiagnosticEvent } from "@/server/observability/diagnostics";
import {
  bindGenerationAdmission,
  releaseGenerationAdmission,
  reserveGenerationAdmission,
} from "@/server/generation/generation-admission";

const backendUrl = process.env.RENDERLAB_GENERATION_BACKEND_URL?.trim();
const backendToken = process.env.RENDERLAB_GENERATION_BACKEND_TOKEN?.trim();

function isExternalGenerationBackendConfigured() {
  return Boolean(backendUrl && backendToken);
}

export function isFiboGenerationAvailable() {
  return workersForEcosystem(fiboGenerationModel).length > 0 && isNativeGenerationConfigured();
}

/** The approved worker has not been redeployed with mask support. Do not
 * accept masked jobs until the owner separately authorizes qualification and
 * a backend operator explicitly enables this server-only gate.
 */
export function isFiboMaskGenerationAvailable() {
  return process.env.RENDERLAB_FIBO_MASK_ENABLED === "true" && isFiboGenerationAvailable();
}

/** Do not route source-free generated-VGL requests to the older deployed
 * PNG-only gateway until the signed result sidecar has been qualified.
 */
export function isFiboAutoVglAvailable() {
  return process.env.RENDERLAB_FIBO_AUTOVGL_ENABLED === "true" && isFiboGenerationAvailable();
}

export function isGenerationBackendConfigured() {
  return isExternalGenerationBackendConfigured() || isNativeGenerationConfigured();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseGenerationJob(value: unknown): GenerationJob | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || !value.id) return null;
  if (typeof value.operation !== "string") return null;
  if (typeof value.status !== "string") return null;
  if (typeof value.createdAt !== "string" || typeof value.updatedAt !== "string") return null;
  if (!Array.isArray(value.outputAssetIds) || !value.outputAssetIds.every((item) => typeof item === "string")) return null;

  const statuses = new Set(["queued", "preparing", "running", "cancelling", "persisting", "succeeded", "failed", "cancelled"]);
  const operations = new Set(["create-image", "edit-image", "create-video", "animate-image"]);
  if (!statuses.has(value.status) || !operations.has(value.operation)) return null;

  const error = isRecord(value.error) && typeof value.error.code === "string" && typeof value.error.message === "string"
    ? { code: value.error.code, message: value.error.message }
    : undefined;

  return {
    id: value.id,
    status: value.status as GenerationJob["status"],
    operation: value.operation as GenerationJob["operation"],
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    outputAssetIds: value.outputAssetIds as string[],
    ...(error ? { error } : {}),
  };
}

export async function generationImageInputsAvailable(ownerId: string, request: GenerationRequest) {
  const available = await Promise.all(request.inputs.map(async (input) => {
    if (input.source.type === "media-asset") {
      const asset = await getMediaAsset(ownerId, input.source.id);
      return asset?.kind === "image";
    }

    const rows = await supabaseRest<Array<{ mime_type: string; status: string; metadata: { usage?: string } | null }>>(
      `generation_sources?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(input.source.id)}&select=mime_type,status,metadata&limit=1`,
      { method: "GET" },
    );
    const source = rows?.[0];
    return source?.status === "ready" && source.mime_type.startsWith("image/") && source.metadata?.usage !== fiboMaskUsage;
  }));
  if (!available.every(Boolean)) return false;
  return !request.mask || Boolean(await getReadyFiboMaskSource(ownerId, request.mask.id));
}

async function submitToRenderLabBackend(ownerId: string, request: GenerationRequest): Promise<SubmitGenerationResponse> {
  try {
    const response = await fetch(`${backendUrl!.replace(/\/$/, "")}/jobs`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${backendToken!}`,
        "x-renderlab-owner-id": ownerId,
      },
      body: JSON.stringify(request),
      cache: "no-store",
    });

    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const message = isRecord(payload) && typeof payload.message === "string"
        ? payload.message
        : "The generation backend rejected the request.";
      return { ok: false, error: { code: "generation_submission_failed", message } };
    }

    const job = isRecord(payload) && "job" in payload ? parseGenerationJob(payload.job) : null;
    if (!job) {
      return {
        ok: false,
        error: { code: "generation_submission_failed", message: "The generation backend returned an invalid job response." },
      };
    }
    return { ok: true, job };
  } catch {
    return {
      ok: false,
      error: { code: "generation_backend_unavailable", message: "The generation backend could not be reached." },
    };
  }
}

export async function submitGeneration(ownerId: string, request: GenerationRequest): Promise<SubmitGenerationResponse> {
  const startedAt = Date.now();
  const operation = resolveCreativeOperation(request);
  const requestCorrelationId = createDiagnosticCorrelationId();
  const reject = async (response: SubmitGenerationResponse) => {
    if (!response.ok) {
      await emitDiagnosticEvent({
        event: "generation.submission",
        level: "warn",
        correlationId: requestCorrelationId,
        operation,
        phase: "rejected",
        code: response.error.code,
        durationMs: Date.now() - startedAt,
      });
    }
    return response;
  };

  const isFibo = request.model === fiboGenerationModel;
  if (request.autoVgl && !isFiboAutoVglAvailable()) {
    return reject({ ok: false, error: { code: "generation_disabled", message: "Generated FIBO VGL has not been qualified for this environment." } });
  }
  if (request.mask && !isFiboMaskGenerationAvailable()) {
    return reject({ ok: false, error: { code: "generation_disabled", message: "FIBO masked editing has not been qualified for this environment." } });
  }
  if (isFibo && !isFiboGenerationAvailable()) {
    return reject({ ok: false, error: { code: "generation_backend_unavailable", message: "FIBO generation is not enabled." } });
  }

  if (!isGenerationBackendConfigured()) {
    return reject({
      ok: false,
      error: { code: "generation_backend_unavailable", message: "Generation is not connected to an owner-aware backend yet." },
    });
  }

  if (!(await generationImageInputsAvailable(ownerId, request))) {
    return reject({
      ok: false,
      error: {
        code: "generation_submission_failed",
        message: "One or more image inputs are unavailable, not ready, not images, or not owned by this account.",
      },
    });
  }

  const admission = await reserveGenerationAdmission(ownerId);
  if (!admission.ok) return reject(admission);

  const reservationId = admission.reservation.id;
  const submitted = !isFibo && isExternalGenerationBackendConfigured()
    ? await submitToRenderLabBackend(ownerId, request)
    : await submitNativeGeneration(ownerId, request);

  if (!submitted.ok) {
    await releaseGenerationAdmission(ownerId, reservationId);
    return reject(submitted);
  }

  // A successful backend dispatch must never be repeated merely because binding could not
  // be confirmed. The original unbound reservation remains conservative until its lease expires.
  await bindGenerationAdmission(ownerId, reservationId, submitted.job.id);
  await emitDiagnosticEvent({
    event: "generation.submission",
    correlationId: correlationIdForGenerationJob(submitted.job.id),
    jobId: submitted.job.id,
    operation: submitted.job.operation,
    phase: "accepted",
    status: submitted.job.status,
    durationMs: Date.now() - startedAt,
  });
  return submitted;
}
