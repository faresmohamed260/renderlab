import type { CreativeOperation, GenerationJobStatus, OutputKind } from "@/lib/capabilities/generation";
import {
  isActiveGenerationStatus,
  type PublicGenerationActivity,
} from "@/lib/api/generation-activity-contract";
import { supabaseRest } from "@/server/data/supabase-rest";
import { pollGenerationJob } from "@/server/generation/poll-generation";

type GenerationActivityRow = {
  id: string;
  status: GenerationJobStatus;
  operation: CreativeOperation;
  output_kind: OutputKind;
  prompt: string;
  output_asset_ids: string[];
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
};

function publicGenerationActivity(row: GenerationActivityRow): PublicGenerationActivity {
  return {
    id: row.id,
    status: row.status,
    operation: row.operation,
    outputKind: row.output_kind,
    prompt: row.prompt,
    outputAssetIds: row.output_asset_ids ?? [],
    error: row.error_message
      ? { code: row.error_code || "generation_failed", message: row.error_message }
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
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
    select: "id,status,operation,output_kind,prompt,output_asset_ids,error_code,error_message,created_at,updated_at,started_at,completed_at",
    owner_id: `eq.${ownerId}`,
    order: "created_at.desc,id.desc",
    limit: String(safeLimit + 1),
    offset: String(safeOffset),
  });
  const rows = await supabaseRest<GenerationActivityRow[]>(`generation_jobs?${params.toString()}`, { method: "GET" });
  const pageRows = rows.slice(0, safeLimit);

  const items = await Promise.all(pageRows.map(async (row) => {
    if (!refreshActive || !isActiveGenerationStatus(row.status)) return publicGenerationActivity(row);
    try {
      const refreshed = await pollGenerationJob(ownerId, row.id);
      if (!refreshed) return publicGenerationActivity(row);
      return {
        ...publicGenerationActivity(row),
        status: refreshed.status,
        updatedAt: refreshed.updatedAt,
        outputAssetIds: refreshed.outputAssetIds,
        error: refreshed.error ?? null,
      } satisfies PublicGenerationActivity;
    } catch {
      return publicGenerationActivity(row);
    }
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
