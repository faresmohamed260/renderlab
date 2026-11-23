import type { CreativeOperation, GenerationJob } from "@/lib/capabilities/generation";

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
  inputs: unknown[];
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
  reconcile_token?: string | null;
};

type JobRow = NativeGenerationJobRow;

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

