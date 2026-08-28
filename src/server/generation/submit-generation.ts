import type { GenerationJob, GenerationRequest } from "@/lib/capabilities/generation";
import type { SubmitGenerationResponse } from "@/lib/api/generation-contract";
import { isNativeGenerationConfigured, submitNativeGeneration } from "@/server/generation/native-generation";
import { getMediaAsset } from "@/server/media/media-assets";

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

async function durableMediaInputsAvailable(ownerId: string, request: GenerationRequest) {
  const assetIds = [...new Set(
    request.inputs
      .filter((input) => input.source.type === "media-asset")
      .map((input) => input.source.id),
  )];
  if (!assetIds.length) return true;

  const assets = await Promise.all(assetIds.map((assetId) => getMediaAsset(ownerId, assetId)));
  return assets.every(Boolean);
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
  if (!(await durableMediaInputsAvailable(ownerId, request))) {
    return {
      ok: false,
      error: {
        code: "generation_submission_failed",
        message: "One or more media inputs are no longer available.",
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
