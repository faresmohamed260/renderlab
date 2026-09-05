import { randomUUID } from "node:crypto";
import type { GenerationJob, GenerationJobStatus } from "@/lib/capabilities/generation";
import type { CancelGenerationResponse } from "@/lib/api/generation-cancel-contract";
import { supabaseRest } from "@/server/data/supabase-rest";
import { releaseBoundGenerationAdmission } from "@/server/generation/generation-admission";
import {
  claimGenerationReconciliation,
  releaseGenerationReconciliation,
} from "@/server/generation/generation-reconciliation-claim";
import { findWorker } from "@/server/generation/worker-fleet";
import { correlationIdForGenerationJob, emitDiagnosticEvent } from "@/server/observability/diagnostics";

type CancellationRow = {
  id: string;
  owner_id: string;
  status: GenerationJobStatus;
  operation: GenerationJob["operation"];
  worker_id: string | null;
  provider_job_id: string | null;
  worker_state: string | null;
  failover_history: Array<Record<string, unknown>>;
  output_asset_ids: string[];
  error_code: string | null;
  error_message: string | null;
  reconcile_token: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

type ProviderCancellationOutcome =
  | { kind: "confirmed"; status: number }
  | { kind: "not-running"; status: number }
  | { kind: "retryable"; status: number | null; reason: string };

const cancellableStatuses = new Set<GenerationJobStatus>(["queued", "preparing", "running"]);
const terminalStatuses = new Set<GenerationJobStatus>(["succeeded", "failed", "cancelled"]);
const cancellationGraceMs = 10 * 60 * 1000;
const providerCancellationTimeoutMs = 10_000;
const cancellationClaimRetryDelaysMs = [75, 150] as const;

function toGenerationJob(row: CancellationRow): GenerationJob {
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

function cancellationError(message: string): CancelGenerationResponse {
  return { ok: false, error: { code: "cancel_not_available", message } };
}

async function getCancellationRow(ownerId: string, jobId: string) {
  const rows = await supabaseRest<CancellationRow[]>(
    `generation_jobs?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(jobId)}&select=id,owner_id,status,operation,worker_id,provider_job_id,worker_state,failover_history,output_asset_ids,error_code,error_message,reconcile_token,created_at,updated_at,completed_at&limit=1`,
    { method: "GET" },
  );
  return rows?.[0] ?? null;
}

async function hasIndexedDurableOutput(ownerId: string, jobId: string) {
  const rows = await supabaseRest<Array<{ id: string }>>(
    `media_assets?owner_id=eq.${encodeURIComponent(ownerId)}&generation_job_id=eq.${encodeURIComponent(jobId)}&generation_output_index=not.is.null&select=id&limit=1`,
    { method: "GET" },
  );
  return Boolean(rows?.[0]);
}

function isSupportedNativeCancellation(row: CancellationRow) {
  if (!row.worker_id || !row.provider_job_id) return false;
  const worker = findWorker(row.worker_id);
  return Boolean(worker && (worker.ecosystem === "flux2-klein-9b" || worker.ecosystem === "ltx25-redgraft"));
}

function cancellationRequestedAt(row: CancellationRow) {
  for (const entry of row.failover_history || []) {
    if (entry.phase === "cancel-requested" && typeof entry.at === "string") {
      const timestamp = Date.parse(entry.at);
      if (Number.isFinite(timestamp)) return timestamp;
    }
  }
  return Date.parse(row.updated_at);
}

function cancellationDiagnostic(row: CancellationRow, entry: Record<string, unknown>) {
  return [...(row.failover_history || []), entry];
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function cancelProviderCall(row: CancellationRow): Promise<ProviderCancellationOutcome> {
  if (!row.worker_id || !row.provider_job_id) {
    return { kind: "retryable", status: null, reason: "missing-dispatch" };
  }
  const worker = findWorker(row.worker_id);
  if (!worker || (worker.ecosystem !== "flux2-klein-9b" && worker.ecosystem !== "ltx25-redgraft")) {
    return { kind: "retryable", status: null, reason: "unsupported-worker" };
  }

  try {
    const response = await fetch(`${worker.gatewayUrl}/jobs/${encodeURIComponent(row.provider_job_id)}`, {
      method: "DELETE",
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(providerCancellationTimeoutMs),
    });
    if (response.ok) return { kind: "confirmed", status: response.status };
    if (response.status === 404 || response.status === 410) {
      return { kind: "not-running", status: response.status };
    }
    return { kind: "retryable", status: response.status, reason: "provider-unconfirmed" };
  } catch (error) {
    return {
      kind: "retryable",
      status: null,
      reason: error instanceof Error && error.name === "TimeoutError" ? "timeout" : "provider-unreachable",
    };
  }
}

async function transitionToCancelling(row: CancellationRow, token: string) {
  const at = new Date().toISOString();
  const rows = await supabaseRest<CancellationRow[]>(
    `generation_jobs?owner_id=eq.${encodeURIComponent(row.owner_id)}&id=eq.${encodeURIComponent(row.id)}&status=in.(queued,preparing,running)&reconcile_token=eq.${encodeURIComponent(token)}&select=id,owner_id,status,operation,worker_id,provider_job_id,worker_state,failover_history,output_asset_ids,error_code,error_message,reconcile_token,created_at,updated_at,completed_at`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        status: "cancelling",
        worker_state: "cancelling",
        failover_history: cancellationDiagnostic(row, {
          phase: "cancel-requested",
          workerId: row.worker_id,
          at,
        }),
        updated_at: at,
      }),
    },
  );
  return rows?.[0] ?? null;
}

async function terminalizeCancelled(row: CancellationRow, token: string, diagnostic: Record<string, unknown>) {
  const at = new Date().toISOString();
  const rows = await supabaseRest<CancellationRow[]>(
    `generation_jobs?owner_id=eq.${encodeURIComponent(row.owner_id)}&id=eq.${encodeURIComponent(row.id)}&status=eq.cancelling&reconcile_token=eq.${encodeURIComponent(token)}&select=id,owner_id,status,operation,worker_id,provider_job_id,worker_state,failover_history,output_asset_ids,error_code,error_message,reconcile_token,created_at,updated_at,completed_at`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        status: "cancelled",
        worker_state: "cancelled",
        error_code: null,
        error_message: null,
        completed_at: at,
        updated_at: at,
        failover_history: cancellationDiagnostic(row, diagnostic),
      }),
    },
  );
  const cancelled = rows?.[0] ?? null;
  if (cancelled) await releaseBoundGenerationAdmission(cancelled.owner_id, cancelled.id);
  return cancelled;
}

async function recordCancellationRetry(row: CancellationRow, token: string, outcome: Extract<ProviderCancellationOutcome, { kind: "retryable" }>) {
  const at = new Date().toISOString();
  const rows = await supabaseRest<CancellationRow[]>(
    `generation_jobs?owner_id=eq.${encodeURIComponent(row.owner_id)}&id=eq.${encodeURIComponent(row.id)}&status=eq.cancelling&reconcile_token=eq.${encodeURIComponent(token)}&select=id,owner_id,status,operation,worker_id,provider_job_id,worker_state,failover_history,output_asset_ids,error_code,error_message,reconcile_token,created_at,updated_at,completed_at`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        worker_state: "cancelling",
        updated_at: at,
        failover_history: cancellationDiagnostic(row, {
          phase: "cancel-provider-unconfirmed",
          workerId: row.worker_id,
          status: outcome.status,
          reason: outcome.reason,
          at,
        }),
      }),
    },
  );
  return rows?.[0] ?? row;
}

async function reconcileClaimedCancellationRow(ownerId: string, jobId: string, token: string) {
  const row = await getCancellationRow(ownerId, jobId);
  if (!row || row.status !== "cancelling" || row.reconcile_token !== token) return row;

  if (await hasIndexedDurableOutput(ownerId, jobId)) {
    throw new Error("Cancellation invariant violated: durable output already exists for a cancelling job.");
  }

  const outcome = await cancelProviderCall(row);
  await emitDiagnosticEvent({
    event: "generation.cancellation",
    level: outcome.kind === "retryable" ? "warn" : "info",
    correlationId: correlationIdForGenerationJob(jobId),
    jobId,
    operation: row.operation,
    phase: "provider-outcome",
    status: row.status,
    code: outcome.kind === "retryable" ? outcome.reason : outcome.kind,
  });
  const elapsed = Date.now() - cancellationRequestedAt(row);
  if (outcome.kind === "confirmed" || outcome.kind === "not-running" || elapsed >= cancellationGraceMs) {
    const phase = outcome.kind === "retryable" ? "cancel-local-grace-expired" : "cancel-provider-confirmed";
    return terminalizeCancelled(row, token, {
      phase,
      workerId: row.worker_id,
      status: outcome.status,
      ...(outcome.kind === "retryable" ? { reason: outcome.reason } : {}),
      at: new Date().toISOString(),
    });
  }

  return recordCancellationRetry(row, token, outcome);
}

export async function reconcileClaimedGenerationCancellation(
  ownerId: string,
  jobId: string,
  token: string,
): Promise<GenerationJob | null> {
  const row = await reconcileClaimedCancellationRow(ownerId, jobId, token);
  return row ? toGenerationJob(row) : null;
}

async function acquireCancellationClaim(ownerId: string, jobId: string, token: string) {
  for (let attempt = 0; attempt <= cancellationClaimRetryDelaysMs.length; attempt += 1) {
    const claimed = await claimGenerationReconciliation(ownerId, jobId, token).catch(() => false);
    if (claimed) return { claimed: true as const, current: null };

    const current = await getCancellationRow(ownerId, jobId);
    if (!current || current.status === "cancelling" || current.status === "cancelled"
      || current.status === "persisting" || terminalStatuses.has(current.status)) {
      return { claimed: false as const, current };
    }

    const waitMs = cancellationClaimRetryDelaysMs[attempt];
    if (waitMs === undefined) return { claimed: false as const, current };
    await delay(waitMs);
  }

  return { claimed: false as const, current: await getCancellationRow(ownerId, jobId) };
}

export async function requestGenerationCancellation(ownerId: string, jobId: string): Promise<CancelGenerationResponse> {
  const initial = await getCancellationRow(ownerId, jobId);
  if (!initial) {
    return { ok: false, error: { code: "job_not_found", message: "Generation job was not found." } };
  }
  if (initial.status === "cancelled") {
    await releaseBoundGenerationAdmission(ownerId, jobId);
    return { ok: true, job: toGenerationJob(initial) };
  }
  if (terminalStatuses.has(initial.status) || initial.status === "persisting") {
    return cancellationError("This generation can no longer be cancelled.");
  }
  if (initial.status !== "cancelling" && !cancellableStatuses.has(initial.status)) {
    return cancellationError("This generation is not in a cancellable state.");
  }

  const token = randomUUID();
  const acquisition = await acquireCancellationClaim(ownerId, jobId, token);
  if (!acquisition.claimed) {
    const current = acquisition.current;
    if (!current) {
      return { ok: false, error: { code: "job_not_found", message: "Generation job was not found." } };
    }
    if (current.status === "cancelling" || current.status === "cancelled") {
      return { ok: true, job: toGenerationJob(current) };
    }
    if (current.status === "persisting" || terminalStatuses.has(current.status)) {
      return cancellationError("This generation can no longer be cancelled.");
    }
    return cancellationError("Generation state is busy. Refresh Activity and try again.");
  }

  try {
    let current = await getCancellationRow(ownerId, jobId);
    if (!current) {
      return { ok: false, error: { code: "job_not_found", message: "Generation job was not found." } };
    }
    if (current.status === "cancelled") {
      await releaseBoundGenerationAdmission(ownerId, jobId);
      return { ok: true, job: toGenerationJob(current) };
    }
    if (current.status === "persisting" || terminalStatuses.has(current.status)) {
      return cancellationError("This generation can no longer be cancelled.");
    }

    if (current.status !== "cancelling") {
      if (!cancellableStatuses.has(current.status) || !isSupportedNativeCancellation(current)) {
        return cancellationError("Cancellation is not available for this generation.");
      }
      if (current.output_asset_ids.length > 0 || await hasIndexedDurableOutput(ownerId, jobId)) {
        return cancellationError("This generation already has a durable result and cannot be cancelled.");
      }
      current = await transitionToCancelling(current, token);
      if (current) {
        await emitDiagnosticEvent({
          event: "generation.cancellation",
          correlationId: correlationIdForGenerationJob(jobId),
          jobId,
          operation: current.operation,
          phase: "intent-accepted",
          status: current.status,
        });
      }
      if (!current) {
        const raced = await getCancellationRow(ownerId, jobId);
        if (raced?.status === "cancelling" || raced?.status === "cancelled") {
          return { ok: true, job: toGenerationJob(raced) };
        }
        return cancellationError("Generation state changed before cancellation could be accepted. Refresh and try again.");
      }
    }

    const reconciled = await reconcileClaimedCancellationRow(ownerId, jobId, token);
    if (!reconciled) {
      return { ok: false, error: { code: "job_not_found", message: "Generation job was not found." } };
    }
    return { ok: true, job: toGenerationJob(reconciled) };
  } catch {
    const current = await getCancellationRow(ownerId, jobId).catch(() => null);
    if (current?.status === "cancelling" || current?.status === "cancelled") {
      return { ok: true, job: toGenerationJob(current) };
    }
    return {
      ok: false,
      error: {
        code: "generation_backend_unavailable",
        message: "Cancellation could not be processed right now. Refresh Activity and try again.",
      },
    };
  } finally {
    await releaseGenerationReconciliation(ownerId, jobId, token);
  }
}
