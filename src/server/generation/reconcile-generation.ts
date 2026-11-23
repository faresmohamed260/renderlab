import { randomUUID } from "node:crypto";
import type { GenerationJob } from "@/lib/capabilities/generation";
import { supabaseRest } from "@/server/data/supabase-rest";
import { reconcileClaimedGenerationCancellation } from "@/server/generation/cancel-generation";
import { releaseBoundGenerationAdmission } from "@/server/generation/generation-admission";
import {
  claimGenerationReconciliation,
  releaseGenerationReconciliation,
} from "@/server/generation/generation-reconciliation-claim";
import { pollNativeGeneration } from "@/server/generation/native-generation";
import { FIBO_DISPATCH_BACKEND } from "@/server/generation/worker-fleet";
import { pollNativeUpscaleGeneration } from "@/server/generation/upscale-lifecycle";
import { correlationIdForGenerationJob, emitDiagnosticEvent } from "@/server/observability/diagnostics";

type JobSnapshotRow = {
  id: string;
  owner_id: string;
  status: GenerationJob["status"];
  operation: GenerationJob["operation"];
  output_asset_ids: string[];
  error_code: string | null;
  error_message: string | null;
  worker_id: string | null;
  provider_job_id: string | null;
  created_at: string;
  updated_at: string;
};

export type GenerationReconciliationSummary = {
  scanned: number;
  claimed: number;
  terminalized: number;
  failed: number;
};

const terminalStatuses = new Set<GenerationJob["status"]>(["succeeded", "failed", "cancelled"]);
const candidateStatuses = "queued,preparing,running,cancelling,persisting";
const staleMissingDispatchGraceMs = 15 * 60 * 1000;

function toGenerationJob(row: JobSnapshotRow): GenerationJob {
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

async function getSnapshot(ownerId: string, jobId: string, signal?: AbortSignal) {
  const rows = await supabaseRest<JobSnapshotRow[]>(
    `generation_jobs?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(jobId)}&select=id,owner_id,status,operation,output_asset_ids,error_code,error_message,worker_id,provider_job_id,created_at,updated_at&limit=1`,
    { method: "GET", signal },
  );
  return rows?.[0] ?? null;
}

async function failStaleUndispatchedJob(row: JobSnapshotRow) {
  if (row.status === "cancelling") return null;
  if (row.worker_id === FIBO_DISPATCH_BACKEND || (row.worker_id && row.provider_job_id)) return null;
  if (Date.now() - Date.parse(row.updated_at) < staleMissingDispatchGraceMs) return null;

  const completedAt = new Date().toISOString();
  const rows = await supabaseRest<JobSnapshotRow[]>(
    `generation_jobs?owner_id=eq.${encodeURIComponent(row.owner_id)}&id=eq.${encodeURIComponent(row.id)}&status=in.(queued,preparing,running,persisting)&select=id,owner_id,status,operation,output_asset_ids,error_code,error_message,worker_id,provider_job_id,created_at,updated_at`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        status: "failed",
        error_code: "generation_orchestration_stalled",
        error_message: "Generation could not be resumed because its worker dispatch state is incomplete.",
        completed_at: completedAt,
        updated_at: completedAt,
      }),
    },
  );
  return rows?.[0] ?? null;
}

async function settleTerminalAdmission(job: GenerationJob, ownerId: string) {
  if (!terminalStatuses.has(job.status)) return;
  await releaseBoundGenerationAdmission(ownerId, job.id);
}

export async function findOwnerSettlementCandidate(
  ownerId: string,
  options: { signal: AbortSignal; jobIds?: string[]; includeActivityRecovery: boolean },
) {
  const statuses = options.includeActivityRecovery ? candidateStatuses : "queued,preparing,running,persisting";
  const eligible = ["status.eq.persisting", "and(worker_id.not.is.null,provider_job_id.not.is.null)"];
  if (options.includeActivityRecovery) {
    const stale = new Date(Date.now() - staleMissingDispatchGraceMs).toISOString();
    eligible.push("status.eq.cancelling", `and(updated_at.lt.${stale},or(worker_id.is.null,worker_id.neq.${FIBO_DISPATCH_BACKEND}))`);
  }

  const query = new URLSearchParams({
    owner_id: `eq.${ownerId}`,
    status: `in.(${statuses})`,
    or: `(${eligible.join(",")})`,
    select: "id",
    order: "updated_at.asc,id.asc",
    limit: "1",
  });
  if (options.jobIds) query.set("id", `in.(${options.jobIds.join(",")})`);
  const rows = await supabaseRest<Array<{ id: string }>>(`generation_jobs?${query}`, {
    method: "GET",
    signal: options.signal,
  });
  return rows?.[0]?.id ?? null;
}

export async function reconcileNativeGeneration(
  ownerId: string,
  jobId: string,
  deadlines?: { lookupMs: number; providerMs: number },
): Promise<GenerationJob | null> {
  const lookupSignal = () => deadlines && AbortSignal.timeout(deadlines.lookupMs);
  const startedAt = Date.now();
  const correlationId = correlationIdForGenerationJob(jobId);
  const diagnose = async (job: GenerationJob | null, phase: string, code?: string) => {
    await emitDiagnosticEvent({
      event: "generation.reconciliation",
      level: code ? "warn" : "info",
      correlationId,
      jobId,
      operation: job?.operation,
      phase,
      status: job?.status,
      code,
      durationMs: Date.now() - startedAt,
    });
    return job;
  };

  const initial = await getSnapshot(ownerId, jobId, lookupSignal());
  if (!initial) return null;

  if (terminalStatuses.has(initial.status)) {
    const terminal = toGenerationJob(initial);
    await settleTerminalAdmission(terminal, ownerId);
    return diagnose(terminal, "already-terminal");
  }

  const token = randomUUID();
  let releaseClaim = true;
  try {
    const claimed = await claimGenerationReconciliation(ownerId, jobId, token, lookupSignal()).catch((error) => {
      if (deadlines) throw error;
      return false;
    });
    if (!claimed) {
      releaseClaim = false;
      const current = await getSnapshot(ownerId, jobId, lookupSignal());
      return diagnose(current ? toGenerationJob(current) : null, "claim-busy");
    }

    const claimedSnapshot = await getSnapshot(ownerId, jobId, lookupSignal());
    if (!claimedSnapshot) return null;

    if (claimedSnapshot.status === "cancelling") {
      const job = await reconcileClaimedGenerationCancellation(ownerId, jobId, token, deadlines);
      if (job) await settleTerminalAdmission(job, ownerId);
      return diagnose(job, "cancellation");
    }

    const stalled = await failStaleUndispatchedJob(claimedSnapshot);
    if (stalled) {
      const failed = toGenerationJob(stalled);
      await settleTerminalAdmission(failed, ownerId);
      return diagnose(failed, "stalled", "generation_orchestration_stalled");
    }

    const job = claimedSnapshot.operation === "upscale-image"
      ? await pollNativeUpscaleGeneration(ownerId, jobId, deadlines?.providerMs, lookupSignal())
      : await pollNativeGeneration(ownerId, jobId, deadlines?.providerMs, lookupSignal());
    if (job) await settleTerminalAdmission(job, ownerId);
    return diagnose(job, "polled", job?.error?.code);
  } catch (error) {
    await diagnose(null, "failed", "reconciliation_failed");
    throw error;
  } finally {
    // A timed-out claim can have committed before its response was lost.
    if (releaseClaim) await releaseGenerationReconciliation(ownerId, jobId, token);
  }
}

async function listActiveNativeCandidates(limit: number) {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 8);
  const testOwnerId = process.env.RENDERLAB_TEST_RECONCILER_OWNER_SCOPE === "true"
    ? process.env.RENDERLAB_TEST_RECONCILER_OWNER_ID?.trim() || null
    : null;
  const ownerFilter = testOwnerId ? `&owner_id=eq.${encodeURIComponent(testOwnerId)}` : "";
  return supabaseRest<Array<{ id: string; owner_id: string }>>(
    `generation_jobs?status=in.(${candidateStatuses})${ownerFilter}&or=(worker_id.is.null,worker_id.neq.${FIBO_DISPATCH_BACKEND},provider_job_id.not.is.null)&select=id,owner_id&order=updated_at.asc,id.asc&limit=${safeLimit}`,
    { method: "GET" },
  );
}

export async function reconcileActiveNativeGenerations(limit = 2): Promise<GenerationReconciliationSummary> {
  const candidates = await listActiveNativeCandidates(limit);
  const summary: GenerationReconciliationSummary = {
    scanned: candidates.length,
    claimed: 0,
    terminalized: 0,
    failed: 0,
  };

  for (const candidate of candidates) {
    const before = await getSnapshot(candidate.owner_id, candidate.id).catch(() => null);
    if (!before || terminalStatuses.has(before.status)) continue;

    try {
      const result = await reconcileNativeGeneration(candidate.owner_id, candidate.id);
      const after = await getSnapshot(candidate.owner_id, candidate.id).catch(() => null);
      if (after && after.updated_at !== before.updated_at) summary.claimed += 1;
      if (result && terminalStatuses.has(result.status)) summary.terminalized += 1;
    } catch {
      summary.failed += 1;
    }
  }

  return summary;
}
