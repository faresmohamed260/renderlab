import "server-only";

import type { FiboBatchSlotStatus } from "@/lib/capabilities/fibo-batch";
import { fiboBatchSeeds } from "@/lib/capabilities/fibo-batch";
import { supabaseRest } from "@/server/data/supabase-rest";

export type FiboBatchOutputRow = {
  generation_job_id: string;
  owner_id: string;
  output_index: number;
  status: FiboBatchSlotStatus;
  seed: number;
  worker_id: string | null;
  provider_job_id: string | null;
  worker_state: string | null;
  output_asset_id: string | null;
  generated_vgl: string | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
};

const slotSelect = "generation_job_id,owner_id,output_index,status,seed,worker_id,provider_job_id,worker_state,output_asset_id,generated_vgl,error_code,error_message,created_at,updated_at,started_at,completed_at";

export async function createFiboBatchOutputSlots(
  ownerId: string,
  jobId: string,
  count: number,
  baseSeed: number,
) {
  const now = new Date().toISOString();
  const rows = fiboBatchSeeds(baseSeed, count).map((seed, outputIndex) => ({
    generation_job_id: jobId,
    owner_id: ownerId,
    output_index: outputIndex,
    status: "queued",
    seed,
    updated_at: now,
  }));
  const created = await supabaseRest<FiboBatchOutputRow[]>(
    `generation_job_outputs?select=${slotSelect}`,
    { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(rows) },
  );
  if (!created || created.length !== count) throw new Error("FIBO batch slots could not be created atomically.");
  return created.sort((a, b) => a.output_index - b.output_index);
}

export async function getFiboBatchOutputSlots(ownerId: string, jobId: string) {
  const rows = await supabaseRest<FiboBatchOutputRow[]>(
    `generation_job_outputs?owner_id=eq.${encodeURIComponent(ownerId)}&generation_job_id=eq.${encodeURIComponent(jobId)}&select=${slotSelect}&order=output_index.asc`,
    { method: "GET" },
  );
  return rows ?? [];
}

export async function patchFiboBatchOutputSlot(
  ownerId: string,
  jobId: string,
  outputIndex: number,
  patch: Partial<Omit<FiboBatchOutputRow, "generation_job_id" | "owner_id" | "output_index" | "created_at">>,
) {
  if (!Number.isInteger(outputIndex) || outputIndex < 0 || outputIndex >= 4) {
    throw new RangeError("Invalid FIBO output slot.");
  }
  const rows = await supabaseRest<FiboBatchOutputRow[]>(
    `generation_job_outputs?owner_id=eq.${encodeURIComponent(ownerId)}&generation_job_id=eq.${encodeURIComponent(jobId)}&output_index=eq.${outputIndex}&select=${slotSelect}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
    },
  );
  if (!rows?.[0]) throw new Error("FIBO batch slot could not be updated.");
  return rows[0];
}
