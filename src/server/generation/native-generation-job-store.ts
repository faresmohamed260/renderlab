import { isGenerationTerminalStatus } from "@/lib/capabilities/generation-job-state-machine";
import { tryAtomicTerminalizeGeneration } from "@/server/generation/atomic-terminalization";
import { supabaseRest } from "@/server/data/supabase-rest";
import type { NativeGenerationJobRow } from "@/server/generation/native-generation-job-projection";

type JobRow = NativeGenerationJobRow;

export async function getJobRow(ownerId: string, jobId: string, signal?: AbortSignal) {
  const rows = await supabaseRest<JobRow[]>(
    `generation_jobs?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(jobId)}&select=*&limit=1`,
    { method: "GET", signal },
  );
  return rows?.[0] ?? null;
}

export type ConditionalJobUpdateResult =
  | { ok: true; row: NativeGenerationJobRow }
  | { ok: false; reason: "already_terminal_or_changed"; current: NativeGenerationJobRow | null };

/** A physical status CAS prevents stale snapshots from rewriting changed jobs. */
export async function patchJob(
  ownerId: string,
  jobId: string,
  patch: Record<string, unknown>,
  expectedStatus: JobRow["status"],
  reconcileToken?: string | null,
): Promise<ConditionalJobUpdateResult> {
  if (isGenerationTerminalStatus(expectedStatus)) {
    return { ok: false, reason: "already_terminal_or_changed", current: await getJobRow(ownerId, jobId) };
  }
  // Atomic terminalization is available only after the separately applied 0031
  // migration. A missing RPC alone falls back to the old status-CAS PATCH.
  if (patch.status === "succeeded" || patch.status === "failed" || patch.status === "cancelled") {
    const atomic = await tryAtomicTerminalizeGeneration({
      ownerId,
      jobId,
      expectedStatus,
      terminalStatus: patch.status,
      assetId: Array.isArray(patch.output_asset_ids) && typeof patch.output_asset_ids[0] === "string"
        ? patch.output_asset_ids[0] : null,
      errorCode: typeof patch.error_code === "string" ? patch.error_code : null,
      errorMessage: typeof patch.error_message === "string" ? patch.error_message : null,
      reconcileToken: reconcileToken ?? null,
      failoverHistory: Array.isArray(patch.failover_history)
        ? patch.failover_history as Array<Record<string, unknown>> : null,
    });
    if (atomic !== null) {
      const current = await getJobRow(ownerId, jobId);
      if (atomic.outcome === "applied" && current) return { ok: true, row: current };
      return { ok: false, reason: "already_terminal_or_changed", current };
    }
  }
  const rows = await supabaseRest<JobRow[]>(
    `generation_jobs?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(jobId)}&status=eq.${encodeURIComponent(expectedStatus)}&select=*`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
    },
  );
  if (rows?.[0]) return { ok: true, row: rows[0] };
  return { ok: false, reason: "already_terminal_or_changed", current: await getJobRow(ownerId, jobId) };
}

/** Callers receive both the latest row and whether this PATCH actually committed. */
export async function patchJobRow(row: JobRow, patch: Record<string, unknown>) {
  const outcome = await patchJob(row.owner_id, row.id, patch, row.status, row.reconcile_token);
  if (outcome.ok) return { applied: true as const, row: outcome.row };
  if (!outcome.current) throw new Error("Generation job disappeared during status-conditional update.");
  return { applied: false as const, row: outcome.current };
}
