import type { GenerationJob } from "@/lib/capabilities/generation";
import { isNativeGenerationConfigured, pollNativeGeneration } from "@/server/generation/native-generation";

const backendUrl = process.env.RENDERLAB_GENERATION_BACKEND_URL?.trim();
const backendToken = process.env.RENDERLAB_GENERATION_BACKEND_TOKEN?.trim();

function isExternalGenerationBackendConfigured() {
  return Boolean(backendUrl && backendToken);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseBackendJob(value: unknown): GenerationJob | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || typeof value.status !== "string" || typeof value.operation !== "string") return null;
  if (typeof value.createdAt !== "string" || typeof value.updatedAt !== "string" || !Array.isArray(value.outputAssetIds)) return null;
  return value as unknown as GenerationJob;
}

export async function pollGenerationJob(ownerId: string, jobId: string): Promise<GenerationJob | null> {
  if (isExternalGenerationBackendConfigured()) {
    const response = await fetch(`${backendUrl!.replace(/\/$/, "")}/jobs/${encodeURIComponent(jobId)}`, {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${backendToken!}`,
        "x-renderlab-owner-id": ownerId,
      },
      cache: "no-store",
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Generation status failed (${response.status}).`);
    const payload: unknown = await response.json().catch(() => null);
    return isRecord(payload) && "job" in payload ? parseBackendJob(payload.job) : null;
  }
  if (isNativeGenerationConfigured()) return pollNativeGeneration(ownerId, jobId);
  throw new Error("Generation backend is not configured.");
}
