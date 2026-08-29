import type { GenerationJob, GenerationRequest } from "@/lib/capabilities/generation";
import type { SubmitGenerationResponse } from "@/lib/api/generation-contract";
import { isNativeGenerationConfigured, submitNativeGeneration } from "@/server/generation/native-generation";
import { getMediaAsset } from "@/server/media/media-assets";
import { supabaseRest } from "@/server/data/supabase-rest";

const backendUrl = process.env.RENDERLAB_GENERATION_BACKEND_URL?.trim();
const backendToken = process.env.RENDERLAB_GENERATION_BACKEND_TOKEN?.trim();

function isExternalGenerationBackendConfigured() {
  return Boolean(backendUrl && backendToken);
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

  const statuses = new Set(["queued", "preparing", "running", "persisting", "succeeded", "failed", "cancelled"]);
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

    const rows = await supabaseRest<Array<{ mime_type: string; status: string }>>(
      `generation_sources?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(input.source.id)}&select=mime_type,status&limit=1`,
      { method: "GET" },
    );
    const source = rows?.[0];
    return source?.status === "ready" && source.mime_type.startsWith("image/");
  }));
  return available.every(Boolean);
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
  if (!(await generationImageInputsAvailable(ownerId, request))) {
    return {
      ok: false,
      error: {
        code: "generation_submission_failed",
        message: "One or more image inputs are unavailable, not ready, not images, or not owned by this account.",
      },
    };
  }

  if (isExternalGenerationBackendConfigured()) return submitToRenderLabBackend(ownerId, request);
  if (isNativeGenerationConfigured()) return submitNativeGeneration(ownerId, request);

  return {
    ok: false,
    error: { code: "generation_backend_unavailable", message: "Generation is not connected to an owner-aware backend yet." },
  };
}
