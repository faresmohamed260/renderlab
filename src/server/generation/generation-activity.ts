import type { CreativeOperation, GenerationJobStatus, OutputKind } from "@/lib/capabilities/generation";
import {
  isActiveGenerationStatus,
  type PublicGenerationActivity,
} from "@/lib/api/generation-activity-contract";
import { supabaseRest } from "@/server/data/supabase-rest";
import { pollGenerationJob } from "@/server/generation/poll-generation";
import { reconstructAvailableGenerationRecipeRequest } from "@/server/generation/generation-recipe";
import { findWorker } from "@/server/generation/worker-fleet";

type GenerationActivityRow = {
  id: string;
  status: GenerationJobStatus;
  operation: CreativeOperation;
  output_kind: OutputKind;
  prompt: string | null;
  output_asset_ids: string[];
  inputs: unknown;
  parameters: unknown;
  worker_id: string | null;
  provider_job_id: string | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
};

const cancellableStatuses = new Set<GenerationJobStatus>(["queued", "preparing", "running"]);

function activityError(row: Pick<GenerationActivityRow, "status" | "error_code" | "error_message">) {
  if (row.status !== "failed" || !row.error_message) return null;
  const code = row.error_code || "generation_failed";
  return {
    code,
    message: code === "generation_submission_failed"
      ? "Generation could not be started. Retry when you’re ready."
      : "Generation did not complete. Retry when you’re ready.",
  };
}

function canCancelActivity(row: GenerationActivityRow) {
  if (!cancellableStatuses.has(row.status) || !row.worker_id || !row.provider_job_id) return false;
  if ((row.output_asset_ids ?? []).length > 0) return false;
  const worker = findWorker(row.worker_id);
  return Boolean(worker && (worker.ecosystem === "flux2-klein-9b" || worker.ecosystem === "ltx25-redgraft"));
}

function publicGenerationActivity(row: GenerationActivityRow): PublicGenerationActivity {
  return {
    id: row.id,
    status: row.status,
    operation: row.operation,
    outputKind: row.output_kind,
    prompt: row.prompt,
    outputAssetIds: row.output_asset_ids ?? [],
    canCancel: canCancelActivity(row),
    canRunAgain: false,
    error: activityError(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

async function activeOutputIds(ownerId: string, items: PublicGenerationActivity[]) {
  const ids = [...new Set(items.flatMap((item) => item.outputAssetIds))];
  if (!ids.length) return new Set<string>();
  const rows = await supabaseRest<Array<{ id: string }>>(
    `media_assets?owner_id=eq.${encodeURIComponent(ownerId)}&deleted_at=is.null&id=in.(${ids.join(",")})&select=id`,
    { method: "GET" },
  );
  return new Set(rows.map((row) => row.id));
}

export async function listGenerationActivity({
  ownerId,
  limit = 20,
  offset = 0,
  refreshActive = true,
}: {
  ownerId: string;
  limit?: number;
  offset?: number;
  refreshActive?: boolean;
}) {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 40);
  const safeOffset = Math.max(Math.trunc(offset), 0);
  const params = new URLSearchParams({
    select: "id,status,operation,output_kind,prompt,inputs,parameters,output_asset_ids,worker_id,provider_job_id,error_code,error_message,created_at,updated_at,started_at,completed_at",
    owner_id: `eq.${ownerId}`,
    order: "created_at.desc,id.desc",
    limit: String(safeLimit + 1),
    offset: String(safeOffset),
  });
  const rows = await supabaseRest<GenerationActivityRow[]>(`generation_jobs?${params.toString()}`, { method: "GET" });
  const pageRows = rows.slice(0, safeLimit);

  const refreshedItems = await Promise.all(pageRows.map(async (row) => {
    const fallback = publicGenerationActivity(row);
    if (!refreshActive || !isActiveGenerationStatus(row.status)) return fallback;
    try {
      const refreshed = await pollGenerationJob(ownerId, row.id);
      if (!refreshed) return fallback;
      return {
        ...fallback,
        status: refreshed.status,
        updatedAt: refreshed.updatedAt,
        outputAssetIds: refreshed.outputAssetIds,
        canCancel: fallback.canCancel && cancellableStatuses.has(refreshed.status) && refreshed.outputAssetIds.length === 0,
        error: refreshed.status === "failed"
          ? activityError({
              status: "failed",
              error_code: refreshed.error?.code ?? null,
              error_message: refreshed.error?.message ?? null,
            })
          : null,
      } satisfies PublicGenerationActivity;
    } catch {
      return fallback;
    }
  }));

  const reusableIds = new Set((await Promise.all(pageRows.map(async (row) => {
    if (row.status !== "succeeded") return null;
    try {
      return await reconstructAvailableGenerationRecipeRequest(ownerId, row) ? row.id : null;
    } catch {
      return null;
    }
  }))).filter((id): id is string => Boolean(id)));

  const availableIds = await activeOutputIds(ownerId, refreshedItems);
  const items = refreshedItems.map((item) => ({
    ...item,
    outputAssetIds: item.outputAssetIds.filter((id) => availableIds.has(id)),
    canRunAgain: item.status === "succeeded" && reusableIds.has(item.id),
  }));

  return {
    items,
    page: {
      offset: safeOffset,
      limit: safeLimit,
      hasMore: rows.length > safeLimit,
    },
    hasActive: items.some((item) => isActiveGenerationStatus(item.status)),
  };
}
