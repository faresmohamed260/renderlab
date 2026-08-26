import type { CreativeOperation, GenerationJob } from "@/lib/capabilities/generation";
import { supabaseRest } from "@/server/data/supabase-rest";
import { isNativeGenerationConfigured, pollNativeGeneration } from "@/server/generation/native-generation";

const backendUrl = process.env.RENDERLAB_GENERATION_BACKEND_URL?.trim();
const studioCompatUrl = process.env.RENDERLAB_STUDIO_COMPAT_URL?.trim();

type StudioGenerationRow = {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  kind: "image" | "video";
  mode: string;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

function operationForStudioRow(row: StudioGenerationRow): CreativeOperation {
  if (row.kind === "image") return row.mode === "edit" ? "edit-image" : "create-image";
  const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  const referenceCount = Number(metadata.referenceCount ?? 0);
  return referenceCount > 0 ? "animate-image" : "create-video";
}

function jobFromStudioRow(row: StudioGenerationRow, outputAssetIds: string[] = []): GenerationJob {
  return {
    id: row.id,
    status: row.status === "completed" ? "succeeded" : row.status === "failed" ? "failed" : "running",
    operation: operationForStudioRow(row),
    createdAt: row.created_at,
    updatedAt: row.completed_at ?? row.started_at ?? row.created_at,
    outputAssetIds,
    ...(row.status === "failed"
      ? { error: { code: "generation_failed", message: row.error_message || "Generation failed." } }
      : {}),
  };
}

async function getStudioRow(jobId: string) {
  const rows = await supabaseRest<StudioGenerationRow[]>(
    `studio_generations?id=eq.${encodeURIComponent(jobId)}&select=id,status,kind,mode,error_message,metadata,created_at,started_at,completed_at&limit=1`,
    { method: "GET" },
  );
  return rows?.[0] ?? null;
}

async function pollStudio(jobId: string): Promise<GenerationJob | null> {
  const before = await getStudioRow(jobId);
  if (!before) return null;
  if (before.status === "failed") return jobFromStudioRow(before);
  if (before.status === "completed") return jobFromStudioRow(before, [before.id]);

  const response = await fetch(
    `${studioCompatUrl!.replace(/\/$/, "")}/api/generate/result?jobId=${encodeURIComponent(jobId)}`,
    { method: "GET", headers: { accept: "application/json" }, cache: "no-store" },
  );
  const payload = await response.json().catch(() => null) as { status?: string; generationId?: string; error?: string } | null;
  const after = await getStudioRow(jobId);
  if (!after) return null;

  if (response.status === 202) return jobFromStudioRow(after);
  if (response.ok && payload?.status === "completed" && payload.generationId) return jobFromStudioRow(after, [payload.generationId]);
  if (after.status === "failed" || response.status === 409) {
    return jobFromStudioRow({ ...after, status: "failed", error_message: after.error_message || payload?.error || "Generation failed." });
  }
  if (!response.ok) throw new Error(payload?.error || `Generation status failed (${response.status}).`);
  return jobFromStudioRow(after);
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

export async function pollGenerationJob(jobId: string): Promise<GenerationJob | null> {
  if (backendUrl) {
    const response = await fetch(`${backendUrl.replace(/\/$/, "")}/jobs/${encodeURIComponent(jobId)}`, {
      method: "GET",
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Generation status failed (${response.status}).`);
    const payload: unknown = await response.json().catch(() => null);
    return isRecord(payload) && "job" in payload ? parseBackendJob(payload.job) : null;
  }
  if (isNativeGenerationConfigured()) return pollNativeGeneration(jobId);
  if (studioCompatUrl) return pollStudio(jobId);
  throw new Error("Generation backend is not configured.");
}
