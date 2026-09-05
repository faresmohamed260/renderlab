from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


def write(path: str, content: str) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content)


write("src/server/observability/diagnostics.ts", r'''import { createHash, randomUUID } from "node:crypto";

export type DiagnosticLevel = "info" | "warn" | "error";
export type DiagnosticEventName =
  | "generation.submission"
  | "generation.reconciliation"
  | "generation.cancellation"
  | "maintenance.pass";

export type DiagnosticEventInput = {
  event: DiagnosticEventName;
  level?: DiagnosticLevel;
  correlationId: string;
  jobId?: string;
  operation?: "create-image" | "edit-image" | "create-video" | "animate-image";
  phase?: string;
  status?: string;
  code?: string;
  durationMs?: number;
  count?: number;
  successCount?: number;
  failureCount?: number;
  attempt?: number;
};

export type DiagnosticEvent = {
  event: DiagnosticEventName;
  level: DiagnosticLevel;
  timestamp: string;
  correlationId: string;
  jobId?: string;
  operation?: DiagnosticEventInput["operation"];
  phase?: string;
  status?: string;
  code?: string;
  durationMs?: number;
  count?: number;
  successCount?: number;
  failureCount?: number;
  attempt?: number;
};

type DiagnosticSink = (event: DiagnosticEvent) => void | Promise<void>;

function boundedToken(value: unknown, maxLength: number) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().replace(/[^a-zA-Z0-9_.:-]/g, "_").slice(0, maxLength);
  return normalized || undefined;
}

function boundedCount(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.min(Math.max(Math.trunc(value), 0), Number.MAX_SAFE_INTEGER);
}

export function createDiagnosticCorrelationId() {
  return randomUUID();
}

export function correlationIdForGenerationJob(jobId: string) {
  return createHash("sha256")
    .update(`renderlab:generation-job:${jobId}`)
    .digest("hex")
    .slice(0, 24);
}

export function normalizeDiagnosticEvent(input: DiagnosticEventInput, timestamp = new Date().toISOString()): DiagnosticEvent {
  const correlationId = boundedToken(input.correlationId, 64);
  if (!correlationId) throw new Error("A diagnostic correlation ID is required.");

  const normalized: DiagnosticEvent = {
    event: input.event,
    level: input.level ?? "info",
    timestamp,
    correlationId,
  };

  const jobId = boundedToken(input.jobId, 80);
  const phase = boundedToken(input.phase, 64);
  const status = boundedToken(input.status, 64);
  const code = boundedToken(input.code, 96);
  const durationMs = boundedCount(input.durationMs);
  const count = boundedCount(input.count);
  const successCount = boundedCount(input.successCount);
  const failureCount = boundedCount(input.failureCount);
  const attempt = boundedCount(input.attempt);

  if (jobId) normalized.jobId = jobId;
  if (input.operation) normalized.operation = input.operation;
  if (phase) normalized.phase = phase;
  if (status) normalized.status = status;
  if (code) normalized.code = code;
  if (durationMs !== undefined) normalized.durationMs = durationMs;
  if (count !== undefined) normalized.count = count;
  if (successCount !== undefined) normalized.successCount = successCount;
  if (failureCount !== undefined) normalized.failureCount = failureCount;
  if (attempt !== undefined) normalized.attempt = attempt;
  return normalized;
}

function defaultDiagnosticSink(event: DiagnosticEvent) {
  const line = `[renderlab] ${JSON.stringify(event)}`;
  if (event.level === "error") console.error(line);
  else if (event.level === "warn") console.warn(line);
  else console.info(line);
}

export async function emitDiagnosticEvent(input: DiagnosticEventInput, sink: DiagnosticSink = defaultDiagnosticSink) {
  try {
    await sink(normalizeDiagnosticEvent(input));
  } catch {
    // Diagnostics are observational and must never become a product correctness dependency.
  }
}
''')

write("src/server/generation/worker-failure.ts", r'''export type WorkerFailureClassification = {
  retryable: boolean;
  safeToReassign: boolean;
  kind: "credit_exhausted" | "unavailable" | "failed";
  code: "WORKER_CREDIT_EXHAUSTED" | "WORKER_UNAVAILABLE" | "PROVIDER_FAILED";
};

const creditPatterns = [
  "credit",
  "credits",
  "quota",
  "budget",
  "billing",
  "payment",
  "insufficient",
  "spending limit",
  "spend limit",
  "workspace budget",
  "out of funds",
  "balance",
];
const explicitUnavailablePatterns = [
  "workspace is disabled",
  "workspace disabled",
  "disabled workspace",
  "temporarily unavailable",
  "app is stopped",
  "app stopped",
];

function workerFailureText(body: Record<string, unknown>) {
  return [body.error, body.detail]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function classifyWorkerFailure(status: number, body: Record<string, unknown>): WorkerFailureClassification {
  const explicitState = String(body.workerState || body.worker_state || "").trim().toLowerCase();
  const explicitCode = String(body.errorCode || body.code || "").trim().toUpperCase();

  if (status === 402 || explicitState === "credit_exhausted" || explicitCode === "WORKER_CREDIT_EXHAUSTED") {
    return { retryable: true, safeToReassign: true, kind: "credit_exhausted", code: "WORKER_CREDIT_EXHAUSTED" };
  }
  if (explicitState === "unavailable" || explicitCode === "WORKER_UNAVAILABLE") {
    return { retryable: true, safeToReassign: true, kind: "unavailable", code: "WORKER_UNAVAILABLE" };
  }

  const text = workerFailureText(body);
  if (creditPatterns.some((pattern) => text.includes(pattern))) {
    return { retryable: true, safeToReassign: true, kind: "credit_exhausted", code: "WORKER_CREDIT_EXHAUSTED" };
  }
  if (explicitUnavailablePatterns.some((pattern) => text.includes(pattern))) {
    return { retryable: true, safeToReassign: true, kind: "unavailable", code: "WORKER_UNAVAILABLE" };
  }
  if (status === 429 || status >= 500) {
    return { retryable: true, safeToReassign: false, kind: "unavailable", code: "WORKER_UNAVAILABLE" };
  }
  return { retryable: false, safeToReassign: false, kind: "failed", code: "PROVIDER_FAILED" };
}

export function failureKind(status: number, body: Record<string, unknown>) {
  return classifyWorkerFailure(status, body).kind;
}
''')

write("src/server/admin/admin-health-summary.ts", r'''export type AdminHealthJobSample = {
  status: string;
  failover_history: Array<Record<string, unknown>> | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

function percentile(sortedValues: number[], percentileValue: number) {
  if (!sortedValues.length) return null;
  const index = Math.max(0, Math.ceil(percentileValue * sortedValues.length) - 1);
  return sortedValues[Math.min(index, sortedValues.length - 1)];
}

function isFailoverEvent(entry: Record<string, unknown>) {
  const phase = typeof entry.phase === "string" ? entry.phase.toLowerCase() : "";
  if (phase.startsWith("cancel-")) return false;
  return phase.includes("failover") || typeof entry.kind === "string" || typeof entry.workerId === "string";
}

export function summarizeRecentAdminJobs(rows: AdminHealthJobSample[], truncated: boolean) {
  const durations = rows
    .map((row) => {
      if (!row.completed_at) return null;
      const createdAt = Date.parse(row.created_at);
      const completedAt = Date.parse(row.completed_at);
      if (!Number.isFinite(createdAt) || !Number.isFinite(completedAt) || completedAt < createdAt) return null;
      return completedAt - createdAt;
    })
    .filter((value): value is number => value !== null)
    .sort((left, right) => left - right);

  let jobsWithFailover = 0;
  let failoverEvents = 0;
  for (const row of rows) {
    const events = (row.failover_history ?? []).filter(isFailoverEvent).length;
    if (events > 0) jobsWithFailover += 1;
    failoverEvents += events;
  }

  return {
    sampleSize: rows.length,
    truncated,
    completionTiming: {
      sampleCount: durations.length,
      p50Ms: percentile(durations, 0.5),
      p95Ms: percentile(durations, 0.95),
    },
    failovers: { jobsWithFailover, eventCount: failoverEvents },
  };
}

export function summarizeActiveAdminJobAge(rows: Pick<AdminHealthJobSample, "updated_at">[], truncated: boolean, nowMs = Date.now()) {
  const buckets = {
    under15Minutes: 0,
    minutes15To60: 0,
    hours1To2: 0,
    over2Hours: 0,
  };
  let sampleSize = 0;
  for (const row of rows) {
    const updatedAt = Date.parse(row.updated_at);
    if (!Number.isFinite(updatedAt)) continue;
    const age = Math.max(0, nowMs - updatedAt);
    sampleSize += 1;
    if (age < 15 * 60 * 1000) buckets.under15Minutes += 1;
    else if (age < 60 * 60 * 1000) buckets.minutes15To60 += 1;
    else if (age < 2 * 60 * 60 * 1000) buckets.hours1To2 += 1;
    else buckets.over2Hours += 1;
  }
  return { sampleSize, truncated, ...buckets };
}
''')

write("tests/unit/diagnostics.test.mjs", r'''import assert from "node:assert/strict";
import test from "node:test";

import {
  correlationIdForGenerationJob,
  createDiagnosticCorrelationId,
  emitDiagnosticEvent,
  normalizeDiagnosticEvent,
} from "../../src/server/observability/diagnostics.ts";

test("diagnostic correlation is stable per job and distinct per operation", () => {
  assert.equal(correlationIdForGenerationJob("job-a"), correlationIdForGenerationJob("job-a"));
  assert.notEqual(correlationIdForGenerationJob("job-a"), correlationIdForGenerationJob("job-b"));
  assert.notEqual(createDiagnosticCorrelationId(), createDiagnosticCorrelationId());
});

test("diagnostic normalization only emits explicit bounded fields", () => {
  const event = normalizeDiagnosticEvent({
    event: "generation.submission",
    correlationId: "safe-correlation",
    jobId: "job-123",
    phase: "accepted",
    code: "generation_ok",
    durationMs: -5,
    count: 2.8,
    ...({ prompt: "SECRET_PROMPT", email: "secret@example.com", storageKey: "SECRET_R2" }),
  });
  const serialized = JSON.stringify(event);
  assert(!serialized.includes("SECRET_PROMPT"));
  assert(!serialized.includes("secret@example.com"));
  assert(!serialized.includes("SECRET_R2"));
  assert.equal(event.durationMs, 0);
  assert.equal(event.count, 2);
});

test("diagnostic sink failure is non-fatal", async () => {
  await emitDiagnosticEvent(
    { event: "maintenance.pass", correlationId: "maintenance-test", phase: "sources", count: 1 },
    async () => { throw new Error("sink unavailable"); },
  );
});
''')

write("tests/unit/worker-failure.test.mjs", r'''import assert from "node:assert/strict";
import test from "node:test";

import { classifyWorkerFailure } from "../../src/server/generation/worker-failure.ts";

test("stable worker codes take precedence over misleading text", () => {
  assert.deepEqual(
    classifyWorkerFailure(409, { code: "WORKER_UNAVAILABLE", detail: "credit balance wording should not override the code" }),
    { retryable: true, safeToReassign: true, kind: "unavailable", code: "WORKER_UNAVAILABLE" },
  );
  assert.deepEqual(
    classifyWorkerFailure(409, { errorCode: "WORKER_CREDIT_EXHAUSTED", detail: "workspace disabled" }),
    { retryable: true, safeToReassign: true, kind: "credit_exhausted", code: "WORKER_CREDIT_EXHAUSTED" },
  );
});

test("text compatibility fallback remains bounded", () => {
  assert.equal(classifyWorkerFailure(409, { detail: "workspace budget exhausted" }).code, "WORKER_CREDIT_EXHAUSTED");
  assert.equal(classifyWorkerFailure(409, { error: "workspace is disabled" }).code, "WORKER_UNAVAILABLE");
  assert.deepEqual(
    classifyWorkerFailure(503, { detail: "generic gateway failure" }),
    { retryable: true, safeToReassign: false, kind: "unavailable", code: "WORKER_UNAVAILABLE" },
  );
});
''')

write("tests/unit/admin-health-summary.test.mjs", r'''import assert from "node:assert/strict";
import test from "node:test";

import { summarizeActiveAdminJobAge, summarizeRecentAdminJobs } from "../../src/server/admin/admin-health-summary.ts";

const base = Date.parse("2026-09-05T12:00:00.000Z");

test("recent admin health summarizes terminal timing and failover without raw history", () => {
  const summary = summarizeRecentAdminJobs([
    {
      status: "succeeded",
      created_at: "2026-09-05T11:59:50.000Z",
      updated_at: "2026-09-05T12:00:00.000Z",
      completed_at: "2026-09-05T12:00:00.000Z",
      failover_history: [{ kind: "unavailable", workerId: "private-worker" }, { phase: "cancel-provider-confirmed" }],
    },
    {
      status: "failed",
      created_at: "2026-09-05T11:59:30.000Z",
      updated_at: "2026-09-05T12:00:00.000Z",
      completed_at: "2026-09-05T12:00:00.000Z",
      failover_history: [],
    },
  ], false);

  assert.deepEqual(summary.completionTiming, { sampleCount: 2, p50Ms: 10_000, p95Ms: 30_000 });
  assert.deepEqual(summary.failovers, { jobsWithFailover: 1, eventCount: 1 });
  assert(!JSON.stringify(summary).includes("private-worker"));
});

test("active state age uses lifecycle-aligned buckets", () => {
  const summary = summarizeActiveAdminJobAge([
    { updated_at: new Date(base - 5 * 60 * 1000).toISOString() },
    { updated_at: new Date(base - 30 * 60 * 1000).toISOString() },
    { updated_at: new Date(base - 90 * 60 * 1000).toISOString() },
    { updated_at: new Date(base - 3 * 60 * 60 * 1000).toISOString() },
  ], true, base);
  assert.deepEqual(summary, {
    sampleSize: 4,
    truncated: true,
    under15Minutes: 1,
    minutes15To60: 1,
    hours1To2: 1,
    over2Hours: 1,
  });
});
''')

# Extract typed worker failure classification from native generation.
native_path = Path("src/server/generation/native-generation.ts")
native = native_path.read_text()
native = replace_once(
    native,
    'import { injectGenerationFinalizationFault } from "@/server/generation/finalization-faults";\n',
    'import { injectGenerationFinalizationFault } from "@/server/generation/finalization-faults";\nimport { failureKind } from "@/server/generation/worker-failure";\n',
    "native worker failure import",
)
native = replace_once(
    native,
    '''type WorkerFailureClassification = {\n  retryable: boolean;\n  safeToReassign: boolean;\n  kind: "credit_exhausted" | "unavailable" | "failed";\n  code: "WORKER_CREDIT_EXHAUSTED" | "WORKER_UNAVAILABLE" | "PROVIDER_FAILED";\n};\n\n''',
    "",
    "native worker failure type",
)
start = native.index('const creditPatterns = [')
end = native.index('async function submitWorker', start)
# Preserve all code between retryable constants and error classification by removing only the classification block.
classification_start = native.index('const creditPatterns = [', start)
classification_end = native.index('async function submitWorker', classification_start)
prefix = native[:classification_start]
segment = native[classification_start:classification_end]
keep_start = segment.index('async function errorBody')
error_body = segment[keep_start:segment.index('function workerFailureText')]
native = prefix + error_body + native[classification_end:]
native_path.write_text(native)

# Instrument generation submission.
submit_path = Path("src/server/generation/submit-generation.ts")
submit = submit_path.read_text()
submit = replace_once(
    submit,
    'import type { GenerationJob, GenerationRequest } from "@/lib/capabilities/generation";\n',
    'import { resolveCreativeOperation, type GenerationJob, type GenerationRequest } from "@/lib/capabilities/generation";\n',
    "submit operation import",
)
submit = replace_once(
    submit,
    'import { supabaseRest } from "@/server/data/supabase-rest";\n',
    'import { supabaseRest } from "@/server/data/supabase-rest";\nimport { correlationIdForGenerationJob, createDiagnosticCorrelationId, emitDiagnosticEvent } from "@/server/observability/diagnostics";\n',
    "submit diagnostics import",
)
old_submit = '''export async function submitGeneration(ownerId: string, request: GenerationRequest): Promise<SubmitGenerationResponse> {\n  if (!isGenerationBackendConfigured()) {\n    return {\n      ok: false,\n      error: { code: "generation_backend_unavailable", message: "Generation is not connected to an owner-aware backend yet." },\n    };\n  }\n\n  if (!(await generationImageInputsAvailable(ownerId, request))) {\n    return {\n      ok: false,\n      error: {\n        code: "generation_submission_failed",\n        message: "One or more image inputs are unavailable, not ready, not images, or not owned by this account.",\n      },\n    };\n  }\n\n  const admission = await reserveGenerationAdmission(ownerId);\n  if (!admission.ok) return admission;\n\n  const reservationId = admission.reservation.id;\n  const submitted = isExternalGenerationBackendConfigured()\n    ? await submitToRenderLabBackend(ownerId, request)\n    : await submitNativeGeneration(ownerId, request);\n\n  if (!submitted.ok) {\n    await releaseGenerationAdmission(ownerId, reservationId);\n    return submitted;\n  }\n\n  // A successful backend dispatch must never be repeated merely because binding could not\n  // be confirmed. The original unbound reservation remains conservative until its lease expires.\n  await bindGenerationAdmission(ownerId, reservationId, submitted.job.id);\n  return submitted;\n}\n'''
new_submit = '''export async function submitGeneration(ownerId: string, request: GenerationRequest): Promise<SubmitGenerationResponse> {\n  const startedAt = Date.now();\n  const operation = resolveCreativeOperation(request);\n  const requestCorrelationId = createDiagnosticCorrelationId();\n  const reject = async (response: SubmitGenerationResponse) => {\n    if (!response.ok) {\n      await emitDiagnosticEvent({\n        event: "generation.submission",\n        level: "warn",\n        correlationId: requestCorrelationId,\n        operation,\n        phase: "rejected",\n        code: response.error.code,\n        durationMs: Date.now() - startedAt,\n      });\n    }\n    return response;\n  };\n\n  if (!isGenerationBackendConfigured()) {\n    return reject({\n      ok: false,\n      error: { code: "generation_backend_unavailable", message: "Generation is not connected to an owner-aware backend yet." },\n    });\n  }\n\n  if (!(await generationImageInputsAvailable(ownerId, request))) {\n    return reject({\n      ok: false,\n      error: {\n        code: "generation_submission_failed",\n        message: "One or more image inputs are unavailable, not ready, not images, or not owned by this account.",\n      },\n    });\n  }\n\n  const admission = await reserveGenerationAdmission(ownerId);\n  if (!admission.ok) return reject(admission);\n\n  const reservationId = admission.reservation.id;\n  const submitted = isExternalGenerationBackendConfigured()\n    ? await submitToRenderLabBackend(ownerId, request)\n    : await submitNativeGeneration(ownerId, request);\n\n  if (!submitted.ok) {\n    await releaseGenerationAdmission(ownerId, reservationId);\n    return reject(submitted);\n  }\n\n  // A successful backend dispatch must never be repeated merely because binding could not\n  // be confirmed. The original unbound reservation remains conservative until its lease expires.\n  await bindGenerationAdmission(ownerId, reservationId, submitted.job.id);\n  await emitDiagnosticEvent({\n    event: "generation.submission",\n    correlationId: correlationIdForGenerationJob(submitted.job.id),\n    jobId: submitted.job.id,\n    operation: submitted.job.operation,\n    phase: "accepted",\n    status: submitted.job.status,\n    durationMs: Date.now() - startedAt,\n  });\n  return submitted;\n}\n'''
submit = replace_once(submit, old_submit, new_submit, "submit generation instrumentation")
submit_path.write_text(submit)

# Instrument reconciliation outcomes.
reconcile_path = Path("src/server/generation/reconcile-generation.ts")
reconcile = reconcile_path.read_text()
reconcile = replace_once(
    reconcile,
    'import { pollNativeGeneration } from "@/server/generation/native-generation";\n',
    'import { pollNativeGeneration } from "@/server/generation/native-generation";\nimport { correlationIdForGenerationJob, emitDiagnosticEvent } from "@/server/observability/diagnostics";\n',
    "reconciliation diagnostics import",
)
reconcile = replace_once(
    reconcile,
    '''export async function reconcileNativeGeneration(ownerId: string, jobId: string): Promise<GenerationJob | null> {\n  const initial = await getSnapshot(ownerId, jobId);\n''',
    '''export async function reconcileNativeGeneration(ownerId: string, jobId: string): Promise<GenerationJob | null> {\n  const startedAt = Date.now();\n  const correlationId = correlationIdForGenerationJob(jobId);\n  const diagnose = async (job: GenerationJob | null, phase: string, code?: string) => {\n    await emitDiagnosticEvent({\n      event: "generation.reconciliation",\n      level: code ? "warn" : "info",\n      correlationId,\n      jobId,\n      operation: job?.operation,\n      phase,\n      status: job?.status,\n      code,\n      durationMs: Date.now() - startedAt,\n    });\n    return job;\n  };\n\n  const initial = await getSnapshot(ownerId, jobId);\n''',
    "reconciliation diagnose helper",
)
reconcile = reconcile.replace('    return terminal;\n', '    return diagnose(terminal, "already-terminal");\n', 1)
reconcile = reconcile.replace('    return current ? toGenerationJob(current) : null;\n', '    return diagnose(current ? toGenerationJob(current) : null, "claim-busy");\n', 1)
reconcile = reconcile.replace('      return job;\n', '      return diagnose(job, "cancellation");\n', 1)
reconcile = reconcile.replace('      return failed;\n', '      return diagnose(failed, "stalled", "generation_orchestration_stalled");\n', 1)
reconcile = reconcile.replace('    return job;\n  } finally {\n', '    return diagnose(job, "polled", job?.error?.code);\n  } catch (error) {\n    await diagnose(null, "failed", "reconciliation_failed");\n    throw error;\n  } finally {\n', 1)
reconcile_path.write_text(reconcile)

# Instrument cancellation state/provider outcomes without changing cancellation semantics.
cancel_path = Path("src/server/generation/cancel-generation.ts")
cancel = cancel_path.read_text()
cancel = replace_once(
    cancel,
    'import { findWorker } from "@/server/generation/worker-fleet";\n',
    'import { findWorker } from "@/server/generation/worker-fleet";\nimport { correlationIdForGenerationJob, emitDiagnosticEvent } from "@/server/observability/diagnostics";\n',
    "cancellation diagnostics import",
)
cancel = replace_once(
    cancel,
    '''  const outcome = await cancelProviderCall(row);\n  const elapsed = Date.now() - cancellationRequestedAt(row);\n''',
    '''  const outcome = await cancelProviderCall(row);\n  await emitDiagnosticEvent({\n    event: "generation.cancellation",\n    level: outcome.kind === "retryable" ? "warn" : "info",\n    correlationId: correlationIdForGenerationJob(jobId),\n    jobId,\n    operation: row.operation,\n    phase: "provider-outcome",\n    status: row.status,\n    code: outcome.kind === "retryable" ? outcome.reason : outcome.kind,\n  });\n  const elapsed = Date.now() - cancellationRequestedAt(row);\n''',
    "cancellation provider outcome",
)
cancel = replace_once(
    cancel,
    '''      current = await transitionToCancelling(current, token);\n      if (!current) {\n''',
    '''      current = await transitionToCancelling(current, token);\n      if (current) {\n        await emitDiagnosticEvent({\n          event: "generation.cancellation",\n          correlationId: correlationIdForGenerationJob(jobId),\n          jobId,\n          operation: current.operation,\n          phase: "intent-accepted",\n          status: current.status,\n        });\n      }\n      if (!current) {\n''',
    "cancellation intent accepted",
)
cancel_path.write_text(cancel)

# Add read-only bounded maintenance backlog using the exact Phase 15 predicates.
maintenance_path = Path("src/server/maintenance/renderlab-maintenance.ts")
maintenance = maintenance_path.read_text()
maintenance = replace_once(
    maintenance,
    '''export type RenderLabMaintenanceSummary = {\n  sourceClaims: { scanned: number; claimed: number; skippedReferenced: number; failed: number };\n  sourceCleanup: { scanned: number; deleted: number; restoredReferenced: number; failed: number };\n  uploadClaims: { scanned: number; claimed: number; failed: number };\n  uploadCleanup: { scanned: number; deleted: number; adopted: number; failed: number };\n  mediaPurges: { scanned: number; purged: number; pending: number; failed: number };\n};\n''',
    '''export type RenderLabMaintenanceSummary = {\n  sourceClaims: { scanned: number; claimed: number; skippedReferenced: number; failed: number };\n  sourceCleanup: { scanned: number; deleted: number; restoredReferenced: number; failed: number };\n  uploadClaims: { scanned: number; claimed: number; failed: number };\n  uploadCleanup: { scanned: number; deleted: number; adopted: number; failed: number };\n  mediaPurges: { scanned: number; purged: number; pending: number; failed: number };\n};\n\nexport type RenderLabMaintenanceBacklog = {\n  staleSourceCandidates: { count: number; truncated: boolean };\n  cleaningSources: { count: number; truncated: boolean };\n  staleUploadCandidates: { count: number; truncated: boolean };\n  cleaningUploads: { count: number; truncated: boolean };\n  pendingMediaPurges: { count: number; truncated: boolean };\n};\n''',
    "maintenance backlog type",
)
maintenance = replace_once(
    maintenance,
    'import { deleteR2Object } from "@/server/storage/r2";\n',
    'import { deleteR2Object } from "@/server/storage/r2";\nimport { createDiagnosticCorrelationId, emitDiagnosticEvent } from "@/server/observability/diagnostics";\n',
    "maintenance diagnostics import",
)
insert_marker = 'export async function runRenderLabMaintenance(limit = defaultBatchLimit): Promise<RenderLabMaintenanceSummary> {'
backlog_code = r'''export async function getRenderLabMaintenanceBacklog(limit = 32): Promise<RenderLabMaintenanceBacklog> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 64);
  const scanLimit = safeLimit + 1;
  const now = Date.now();
  const staleCutoff = new Date(now - staleAgeMs).toISOString();
  const nowIso = new Date(now).toISOString();

  const [sourceRows, cleaningSourceRows, uploadRows, cleaningUploadRows, purgeRows] = await Promise.all([
    listSourceClaims(scanLimit, staleCutoff),
    listSourceCleanup(scanLimit, nowIso),
    listUploadClaims(scanLimit, staleCutoff),
    listUploadCleanup(scanLimit, nowIso),
    supabaseRest<PurgeRow[]>(
      `media_assets?deleted_at=not.is.null&purged_at=is.null${testOwnerFilter()}&select=id,owner_id&order=deleted_at.asc,id.asc&limit=${scanLimit}`,
      { method: "GET" },
    ),
  ]);

  const sourceSample = sourceRows.slice(0, safeLimit);
  const sourceReferences = await Promise.all(sourceSample.map((source) => sourceIsReferenced(source.id).catch(() => true)));
  const staleSourceCount = sourceReferences.filter((referenced) => !referenced).length;
  const bounded = (rows: unknown[]) => ({ count: Math.min(rows.length, safeLimit), truncated: rows.length > safeLimit });

  return {
    staleSourceCandidates: { count: staleSourceCount, truncated: sourceRows.length > safeLimit },
    cleaningSources: bounded(cleaningSourceRows),
    staleUploadCandidates: bounded(uploadRows),
    cleaningUploads: bounded(cleaningUploadRows),
    pendingMediaPurges: bounded(purgeRows),
  };
}

'''
maintenance = replace_once(maintenance, insert_marker, backlog_code + insert_marker, "maintenance backlog function")
maintenance = replace_once(
    maintenance,
    '''  return { sourceClaims, sourceCleanup, uploadClaims, uploadCleanup, mediaPurges };\n}\n''',
    '''  const summary = { sourceClaims, sourceCleanup, uploadClaims, uploadCleanup, mediaPurges };\n  const correlationId = createDiagnosticCorrelationId();\n  await Promise.all([\n    emitDiagnosticEvent({ event: "maintenance.pass", correlationId, phase: "source-claims", count: sourceClaims.scanned, successCount: sourceClaims.claimed, failureCount: sourceClaims.failed }),\n    emitDiagnosticEvent({ event: "maintenance.pass", correlationId, phase: "source-cleanup", count: sourceCleanup.scanned, successCount: sourceCleanup.deleted + sourceCleanup.restoredReferenced, failureCount: sourceCleanup.failed }),\n    emitDiagnosticEvent({ event: "maintenance.pass", correlationId, phase: "upload-claims", count: uploadClaims.scanned, successCount: uploadClaims.claimed, failureCount: uploadClaims.failed }),\n    emitDiagnosticEvent({ event: "maintenance.pass", correlationId, phase: "upload-cleanup", count: uploadCleanup.scanned, successCount: uploadCleanup.deleted + uploadCleanup.adopted, failureCount: uploadCleanup.failed }),\n    emitDiagnosticEvent({ event: "maintenance.pass", correlationId, phase: "media-purges", count: mediaPurges.scanned, successCount: mediaPurges.purged, failureCount: mediaPurges.failed }),\n  ]);\n  return summary;\n}\n''',
    "maintenance diagnostics",
)
maintenance_path.write_text(maintenance)

# Expand the public Admin Health contract with bounded aggregate-only fields.
contract_path = Path("src/lib/api/admin-contract.ts")
contract = contract_path.read_text()
contract = replace_once(
    contract,
    '''export type AdminHealthSnapshot = {\n  windowHours: number;\n  since: string;\n  activeJobs: number;\n  statusCounts: Record<string, number>;\n  operationCounts: Record<string, number>;\n  errorCodeCounts: Record<string, number>;\n};\n''',
    '''export type AdminBoundedCount = { count: number; truncated: boolean };\n\nexport type AdminHealthSnapshot = {\n  windowHours: number;\n  since: string;\n  activeJobs: number;\n  statusCounts: Record<string, number>;\n  operationCounts: Record<string, number>;\n  errorCodeCounts: Record<string, number>;\n  recentJobs: {\n    sampleSize: number;\n    truncated: boolean;\n    completionTiming: { sampleCount: number; p50Ms: number | null; p95Ms: number | null };\n    failovers: { jobsWithFailover: number; eventCount: number };\n  };\n  activeStateAge: {\n    sampleSize: number;\n    truncated: boolean;\n    under15Minutes: number;\n    minutes15To60: number;\n    hours1To2: number;\n    over2Hours: number;\n  };\n  capacity: {\n    activeReservations: AdminBoundedCount;\n    generationEnabled: boolean;\n    maxActiveJobsPerAccount: number;\n    maxJobsPerHourPerAccount: number;\n  };\n  maintenanceBacklog: {\n    staleSourceCandidates: AdminBoundedCount;\n    cleaningSources: AdminBoundedCount;\n    staleUploadCandidates: AdminBoundedCount;\n    cleaningUploads: AdminBoundedCount;\n    pendingMediaPurges: AdminBoundedCount;\n  };\n};\n''',
    "admin health contract",
)
contract_path.write_text(contract)

# Build bounded Admin Health details only after the existing privileged RPC authorizes the actor.
admin_path = Path("src/server/admin/admin-operations.ts")
admin = admin_path.read_text()
admin = replace_once(
    admin,
    'import { getAdminGenerationSettings } from "@/server/admin/admin-settings";\n',
    'import { getAdminGenerationSettings } from "@/server/admin/admin-settings";\nimport { summarizeActiveAdminJobAge, summarizeRecentAdminJobs, type AdminHealthJobSample } from "@/server/admin/admin-health-summary";\nimport { getRenderLabMaintenanceBacklog } from "@/server/maintenance/renderlab-maintenance";\n',
    "admin health imports",
)
admin = replace_once(
    admin,
    'const invitationLifetimeMs = 60 * 60 * 1000;\n',
    'const invitationLifetimeMs = 60 * 60 * 1000;\nconst healthSampleLimit = 200;\n',
    "admin health sample limit",
)
old_get_health = '''export async function getAdminHealth(actorUserId: string): Promise<AdminHealthSnapshot> {\n  try {\n    return await supabaseRest<AdminHealthSnapshot>("rpc/renderlab_admin_health", {\n      method: "POST",\n      body: JSON.stringify({ p_actor_user_id: actorUserId, p_window_hours: 24 }),\n    });\n  } catch (error) {\n    const classified = classifyAccountMutationError(error);\n    if (classified.code === "admin_access_required") throw classified;\n    throw new AdminOperationError("admin_backend_unavailable", "Product health is temporarily unavailable.");\n  }\n}\n'''
new_get_health = '''export async function getAdminHealth(actorUserId: string): Promise<AdminHealthSnapshot> {\n  try {\n    const base = await supabaseRest<Pick<AdminHealthSnapshot, "windowHours" | "since" | "activeJobs" | "statusCounts" | "operationCounts" | "errorCodeCounts">>("rpc/renderlab_admin_health", {\n      method: "POST",\n      body: JSON.stringify({ p_actor_user_id: actorUserId, p_window_hours: 24 }),\n    });\n\n    // The privileged RPC above authorizes first. Every query below is server-only, bounded, and\n    // selects only fields needed to produce aggregate operator visibility.\n    const now = new Date();\n    const recentParams = new URLSearchParams({\n      created_at: `gte.${base.since}`,\n      select: "status,failover_history,created_at,updated_at,completed_at",\n      order: "created_at.desc",\n      limit: String(healthSampleLimit + 1),\n    });\n    const activeParams = new URLSearchParams({\n      status: "in.(queued,preparing,running,cancelling,persisting)",\n      select: "status,failover_history,created_at,updated_at,completed_at",\n      order: "updated_at.asc",\n      limit: String(healthSampleLimit + 1),\n    });\n    const reservationParams = new URLSearchParams({\n      released_at: "is.null",\n      expires_at: `gt.${now.toISOString()}`,\n      select: "id",\n      order: "expires_at.asc",\n      limit: String(healthSampleLimit + 1),\n    });\n\n    const [recentRowsRaw, activeRowsRaw, reservationRows, settings, maintenanceBacklog] = await Promise.all([\n      supabaseRest<AdminHealthJobSample[]>(`generation_jobs?${recentParams.toString()}`),\n      supabaseRest<AdminHealthJobSample[]>(`generation_jobs?${activeParams.toString()}`),\n      supabaseRest<Array<{ id: string }>>(`generation_admission_reservations?${reservationParams.toString()}`),\n      getAdminGenerationSettings(),\n      getRenderLabMaintenanceBacklog(),\n    ]);\n\n    const recentRows = recentRowsRaw.slice(0, healthSampleLimit);\n    const activeRows = activeRowsRaw.slice(0, healthSampleLimit);\n    return {\n      ...base,\n      recentJobs: summarizeRecentAdminJobs(recentRows, recentRowsRaw.length > healthSampleLimit),\n      activeStateAge: summarizeActiveAdminJobAge(activeRows, activeRowsRaw.length > healthSampleLimit, now.valueOf()),\n      capacity: {\n        activeReservations: {\n          count: Math.min(reservationRows.length, healthSampleLimit),\n          truncated: reservationRows.length > healthSampleLimit,\n        },\n        generationEnabled: settings.generationEnabled,\n        maxActiveJobsPerAccount: settings.maxActiveJobs,\n        maxJobsPerHourPerAccount: settings.maxJobsPerHour,\n      },\n      maintenanceBacklog,\n    };\n  } catch (error) {\n    const classified = classifyAccountMutationError(error);\n    if (classified.code === "admin_access_required") throw classified;\n    throw new AdminOperationError("admin_backend_unavailable", "Product health is temporarily unavailable.");\n  }\n}\n'''
admin = replace_once(admin, old_get_health, new_get_health, "admin health expansion")
admin_path.write_text(admin)

# Extend the existing dense Admin Health composition; no new route or dashboard framework.
ui_path = Path("src/features/admin/admin-operations.tsx")
ui = ui_path.read_text()
ui = replace_once(
    ui,
    '''function titleCase(value: string) {\n  return value\n    .replace(/[-_]/g, " ")\n    .replace(/\\b\\w/g, (letter) => letter.toUpperCase());\n}\n''',
    '''function titleCase(value: string) {\n  return value\n    .replace(/[-_]/g, " ")\n    .replace(/\\b\\w/g, (letter) => letter.toUpperCase());\n}\n\nfunction displayDuration(milliseconds: number | null) {\n  if (milliseconds === null) return "—";\n  const seconds = Math.max(0, Math.round(milliseconds / 1000));\n  if (seconds < 60) return `${seconds}s`;\n  const minutes = Math.round(seconds / 60);\n  if (minutes < 60) return `${minutes}m`;\n  return `${(minutes / 60).toFixed(1)}h`;\n}\n\nfunction displayBoundedCount(value: { count: number; truncated: boolean }) {\n  return `${value.count}${value.truncated ? "+" : ""}`;\n}\n''',
    "admin health display helpers",
)
old_health_ui = '''        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">\n          <HealthCard label="Active jobs" value={String(snapshot.health.activeJobs)} />\n          <HealthCard label="Window" value={`${snapshot.health.windowHours} hours`} />\n          <HealthCard label="Since" value={displayDate(snapshot.health.since)} />\n        </div>\n\n        <div className="mt-5 grid gap-4 lg:grid-cols-3">\n          <HealthCounts title="Status counts" counts={snapshot.health.statusCounts} />\n          <HealthCounts title="Operation counts" counts={snapshot.health.operationCounts} />\n          <HealthCounts title="Sanitized error codes" counts={snapshot.health.errorCodeCounts} />\n        </div>\n'''
new_health_ui = '''        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">\n          <HealthCard label="Active jobs" value={String(snapshot.health.activeJobs)} />\n          <HealthCard label="Active reservations" value={displayBoundedCount(snapshot.health.capacity.activeReservations)} />\n          <HealthCard label="Completion p50" value={displayDuration(snapshot.health.recentJobs.completionTiming.p50Ms)} />\n          <HealthCard label="Completion p95" value={displayDuration(snapshot.health.recentJobs.completionTiming.p95Ms)} />\n        </div>\n        <p className="mt-2 text-xs leading-5 text-text-muted">\n          Completion timing is accepted-to-terminal duration for {snapshot.health.recentJobs.completionTiming.sampleCount} recent jobs; it is not an SLA or ETA.\n        </p>\n\n        <div className="mt-5 grid gap-4 lg:grid-cols-3">\n          <HealthCounts title="Status counts" counts={snapshot.health.statusCounts} />\n          <HealthCounts title="Operation counts" counts={snapshot.health.operationCounts} />\n          <HealthCounts title="Sanitized error codes" counts={snapshot.health.errorCodeCounts} />\n          <HealthCounts\n            title="Active state age"\n            counts={{\n              "Under 15 minutes": snapshot.health.activeStateAge.under15Minutes,\n              "15–60 minutes": snapshot.health.activeStateAge.minutes15To60,\n              "1–2 hours": snapshot.health.activeStateAge.hours1To2,\n              "Over 2 hours": snapshot.health.activeStateAge.over2Hours,\n            }}\n          />\n          <HealthCounts\n            title="Failover incidence"\n            counts={{\n              "Jobs with failover": snapshot.health.recentJobs.failovers.jobsWithFailover,\n              "Failover events": snapshot.health.recentJobs.failovers.eventCount,\n            }}\n          />\n          <HealthCounts\n            title="Maintenance backlog"\n            counts={{\n              "Stale source candidates": snapshot.health.maintenanceBacklog.staleSourceCandidates.count,\n              "Cleaning sources": snapshot.health.maintenanceBacklog.cleaningSources.count,\n              "Stale upload candidates": snapshot.health.maintenanceBacklog.staleUploadCandidates.count,\n              "Cleaning uploads": snapshot.health.maintenanceBacklog.cleaningUploads.count,\n              "Pending media purges": snapshot.health.maintenanceBacklog.pendingMediaPurges.count,\n            }}\n          />\n        </div>\n\n        <div className="mt-4 rounded-xl border border-border bg-surface-1 p-4 text-xs leading-5 text-text-muted">\n          <p>Window: {snapshot.health.windowHours} hours since {displayDate(snapshot.health.since)}.</p>\n          <p className="mt-1">Capacity: generation {snapshot.health.capacity.generationEnabled ? "enabled" : "paused"}; per-account defaults are {snapshot.health.capacity.maxActiveJobsPerAccount} active and {snapshot.health.capacity.maxJobsPerHourPerAccount} per hour.</p>\n          <p className="mt-1">A “+” count means the bounded operator scan was truncated; raw job, account, provider and storage identities remain server-only.</p>\n        </div>\n'''
ui = replace_once(ui, old_health_ui, new_health_ui, "admin health UI")
ui_path.write_text(ui)

# Strengthen configured Admin assertions for the new aggregate-only response and visible labels.
verifier_path = Path("scripts/verify-admin-operations.mjs")
verifier = verifier_path.read_text()
verifier = replace_once(
    verifier,
    '''  assert(Number(healthPayload?.health?.errorCodeCounts?.generation_failed) >= 1, "Admin health did not sanitize the raw worker error code.");\n  const healthJson = JSON.stringify(healthPayload);\n''',
    '''  assert(Number(healthPayload?.health?.errorCodeCounts?.generation_failed) >= 1, "Admin health did not sanitize the raw worker error code.");\n  assert(Number.isInteger(healthPayload?.health?.recentJobs?.sampleSize), "Admin health is missing the bounded recent-job sample.");\n  assert(Number.isInteger(healthPayload?.health?.activeStateAge?.sampleSize), "Admin health is missing active-state age aggregation.");\n  assert(Number.isInteger(healthPayload?.health?.capacity?.activeReservations?.count), "Admin health is missing bounded admission capacity.");\n  assert(typeof healthPayload?.health?.capacity?.generationEnabled === "boolean", "Admin health is missing generation capacity configuration.");\n  assert(Number.isInteger(healthPayload?.health?.maintenanceBacklog?.staleSourceCandidates?.count), "Admin health is missing source maintenance backlog.");\n  assert(Number.isInteger(healthPayload?.health?.maintenanceBacklog?.pendingMediaPurges?.count), "Admin health is missing pending media purge backlog.");\n  const healthJson = JSON.stringify(healthPayload);\n''',
    "admin verifier aggregate assertions",
)
verifier = replace_once(
    verifier,
    '''  await page.getByRole("heading", { name: "Health", exact: true }).waitFor({ state: "visible" });\n  assert(\n''',
    '''  await page.getByRole("heading", { name: "Health", exact: true }).waitFor({ state: "visible" });\n  await page.getByText("Completion p50", { exact: true }).waitFor({ state: "visible" });\n  await page.getByText("Active state age", { exact: true }).waitFor({ state: "visible" });\n  await page.getByText("Maintenance backlog", { exact: true }).waitFor({ state: "visible" });\n  assert(\n''',
    "admin verifier visible health assertions",
)
verifier_path.write_text(verifier)

# Documentation: implementation reality, explicitly not completion.
project_path = Path("PROJECT.md")
project = project_path.read_text()
project = replace_once(
    project,
    '**Status: `CONTRACT ACCEPTED / IMPLEMENTATION NOT STARTED`.**\n**UI decision:** UI-057.\n',
    '**Status: `IMPLEMENTATION IN PROGRESS / VERIFICATION PENDING`.**\n**UI decision:** UI-057.\n',
    "PROJECT Phase 17 status",
)
project += '''\n\n## Phase 17 Implementation Progress — verification pending\nThe work branch now implements the accepted 17A–17D direction without a schema migration or telemetry vendor: conventional lint/typecheck/unit scripts and a cheap Engineering Quality workflow; a server-only allowlisted non-fatal diagnostic/correlation boundary; lifecycle instrumentation for submission, reconciliation, cancellation and maintenance; typed worker failure classification with machine-code precedence and compatibility text fallback; and bounded aggregate-only Admin Health detail derived from existing job/admission/staging/purge state.\n\nThis is **not** Phase 17 completion evidence. Exact-head configured workflows, the strengthened fresh-admin privacy/aggregate verifier, desktop+narrow Admin render review, cleanup, final path-filter audit and final documentation closure remain required before `COMPLETE / VERIFIED`. Production deployment and scheduler activation remain separate and unauthorized.\n'''
project_path.write_text(project)

migration_path = Path("docs/ui/UI_MIGRATION.md")
migration = migration_path.read_text()
migration = replace_once(
    migration,
    '**Current phase:** Phase 17 — Observability & Engineering Quality is `CONTRACT ACCEPTED / IMPLEMENTATION NOT STARTED` under UI-057.',
    '**Current phase:** Phase 17 — Observability & Engineering Quality is `IMPLEMENTATION IN PROGRESS / VERIFICATION PENDING` under UI-057.',
    "UI_MIGRATION current Phase 17 status",
)
migration = replace_once(
    migration,
    '**Status: `CONTRACT ACCEPTED / IMPLEMENTATION NOT STARTED`.**\n**Decision:** UI-057.\n',
    '**Status: `IMPLEMENTATION IN PROGRESS / VERIFICATION PENDING`.**\n**Decision:** UI-057.\n',
    "UI_MIGRATION Phase 17 tracker status",
)
for item in [
    'Add conventional `npm run lint`, `npm run typecheck` and deterministic `npm run test:unit` using the lightest maintained tools compatible with current Next/TypeScript/ESM reality.',
    'Add a cheap Engineering Quality GitHub gate that requires no Chromium, live provider or shared cloud fixture.',
    'Add one server-owned typed structured-diagnostic/correlation boundary with explicit redaction and non-fatal emission.',
    'Instrument high-value admission/submission/reconciliation/finalization/cancellation/maintenance lifecycle boundaries without logging prompt/media/account-secret/raw-provider payloads.',
    'Extend fresh-admin Health with bounded truthful timing/failure/failover/stale/capacity/maintenance-backlog aggregates derived from current durable state first.',
    'Prefer typed gateway/provider error codes where stable machine-readable contracts exist; retain safe textual compatibility fallback where they do not.',
]:
    migration = migration.replace(f'- [ ] {item}', f'- [x] {item}', 1)
migration = migration.replace(
    '- [ ] Verify redaction with sentinel secrets/content, fresh-admin authorization, exact aggregates, desktop+narrow Admin Health if visible composition changes, and exact run-owned cleanup.',
    '- [ ] Verify redaction with sentinel secrets/content, fresh-admin authorization, bounded aggregates, desktop+narrow Admin Health, and exact run-owned cleanup. Configured evidence pending.',
    1,
)
migration_path.write_text(migration)

ui_decisions_path = Path("docs/ui/UI_DECISIONS.md")
ui_decisions = ui_decisions_path.read_text()
ui_decisions = replace_once(
    ui_decisions,
    '### UI-057 — Operator observability extends privileged Admin Health\n**Status:** Accepted\n',
    '### UI-057 — Operator observability extends privileged Admin Health\n**Status:** Accepted / Implementation in progress\n',
    "UI-057 implementation status",
)
ui_decisions_path.write_text(ui_decisions)

frontend_path = Path("docs/architecture/FRONTEND_ARCHITECTURE.md")
frontend = frontend_path.read_text().rstrip() + '''\n\n## Phase 17 observability boundary — implementation in progress\n- Structured diagnostics are server-only, allowlisted and non-fatal. Generation-job correlation is deterministic opaque identity; pre-job operations use a fresh server-generated correlation ID. Diagnostic payloads do not accept arbitrary detail bags.\n- `/admin` remains the only operator UI. Fresh-admin Health keeps the existing privileged RPC as the authorization/core-count boundary, then performs bounded service-role reads of lifecycle/admission/staging/purge fields to build aggregate timing/failover/stale/capacity/backlog summaries. Raw rows and identities do not cross the server contract.\n- The visible Health composition reuses existing Admin cards/count lists; no new route, shell item, client-global store or dashboard framework is introduced.\n'''
frontend_path.write_text(frontend)

infra_path = Path("docs/architecture/INFRASTRUCTURE.md")
infra = infra_path.read_text().rstrip() + '''\n\n## Phase 17 engineering quality / diagnostics — implementation in progress\n- `Engineering Quality` is the cheap local-only CI gate: Oxlint, TypeScript no-emit, Node unit tests, negative gate fixtures and UI-purity verification. It installs no Chromium and requires no Supabase, R2 or generation-provider secret. Existing configured/live workflows remain authoritative when their paths are affected.\n- Structured lifecycle diagnostics currently use ordinary server/platform logs only. Emission is best-effort/non-fatal and fields are allowlisted; no telemetry vendor, client RUM/session replay or durable event-store schema has been added.\n- Admin Health v0.1 detail is derived from existing `generation_jobs`, `generation_admission_reservations`, Phase 15 staging predicates and tombstoned media state through bounded service-role reads after fresh-admin authorization. No production scheduler or database extension is activated by this work.\n'''
infra_path.write_text(infra)

screen_path = Path("docs/ui/SCREEN_REGISTRY.md")
screen = screen_path.read_text().rstrip() + '''\n\n### Phase 17 Admin Health expansion — implementation in progress\nThe existing fresh-active-admin `/admin` Health section now has an implementation for bounded accepted-to-terminal timing samples, failover incidence, active-state age bands, active admission reservations/current global guardrails, and Phase 15 maintenance backlog. Counts remain aggregate and bounded; raw prompt/media/account/provider/storage identity is not part of the browser contract. The surface reuses the existing dense Admin cards/lists and still requires configured desktop+narrow verification and human review before Phase 17 completion.\n'''
screen_path.write_text(screen)
