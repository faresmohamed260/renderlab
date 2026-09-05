from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text()


def write(path: str, content: str) -> None:
    Path(path).write_text(content)


def replace_once(path: str, old: str, new: str, label: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    write(path, text.replace(old, new, 1))


def replace_block(path: str, start: str, end: str, replacement: str, label: str) -> None:
    text = read(path)
    if text.count(start) != 1 or text.count(end) != 1:
        raise SystemExit(f"{label}: block markers are not unique")
    start_index = text.index(start)
    end_index = text.index(end, start_index)
    write(path, text[:start_index] + replacement + text[end_index:])


def add_after_all(path: str, anchor: str, addition: str, expected: int, label: str) -> None:
    text = read(path)
    count = text.count(anchor)
    if count != expected:
        raise SystemExit(f"{label}: expected {expected} anchors, found {count}")
    write(path, text.replace(anchor, anchor + addition))


write("src/server/observability/diagnostics.ts", r'''import { createHash, randomUUID } from "node:crypto";

export type DiagnosticLevel = "info" | "warn" | "error";
export type DiagnosticEventName =
  | "generation.submission"
  | "generation.reconciliation"
  | "generation.cancellation"
  | "maintenance.pass";

export type DiagnosticPhase =
  | "rejected"
  | "accepted"
  | "already-terminal"
  | "claim-busy"
  | "cancellation"
  | "stalled"
  | "polled"
  | "failed"
  | "provider-outcome"
  | "intent-accepted"
  | "failover-attempt"
  | "failover-complete"
  | "provider-ready"
  | "finalization-recovered"
  | "finalization-complete"
  | "source-claims"
  | "source-cleanup"
  | "upload-claims"
  | "upload-cleanup"
  | "media-purges";

export type DiagnosticStatus =
  | "queued"
  | "preparing"
  | "running"
  | "cancelling"
  | "persisting"
  | "succeeded"
  | "failed"
  | "cancelled";

export type DiagnosticCode =
  | "invalid_request"
  | "generation_access_denied"
  | "generation_disabled"
  | "generation_active_limit_reached"
  | "generation_rate_limit_reached"
  | "generation_backend_unavailable"
  | "generation_submission_failed"
  | "generation_orchestration_stalled"
  | "reconciliation_failed"
  | "generation_worker_unavailable"
  | "worker_credit_exhausted"
  | "worker_unavailable"
  | "generation_reassignment_failed"
  | "generation_provider_stalled"
  | "generation_failed"
  | "WORKER_CREDIT_EXHAUSTED"
  | "WORKER_UNAVAILABLE"
  | "PROVIDER_FAILED"
  | "missing-dispatch"
  | "unsupported-worker"
  | "provider-unconfirmed"
  | "timeout"
  | "provider-unreachable"
  | "confirmed"
  | "not-running";

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
  phase?: DiagnosticPhase;
  status?: DiagnosticStatus;
  code?: DiagnosticCode;
  durationMs?: number;
  count?: number;
  successCount?: number;
  failureCount?: number;
  attempt?: number;
};

type DiagnosticSink = (event: DiagnosticEvent) => void | Promise<void>;

const diagnosticPhases = new Set<DiagnosticPhase>([
  "rejected", "accepted", "already-terminal", "claim-busy", "cancellation", "stalled", "polled", "failed",
  "provider-outcome", "intent-accepted", "failover-attempt", "failover-complete", "provider-ready",
  "finalization-recovered", "finalization-complete", "source-claims", "source-cleanup", "upload-claims",
  "upload-cleanup", "media-purges",
]);
const diagnosticStatuses = new Set<DiagnosticStatus>([
  "queued", "preparing", "running", "cancelling", "persisting", "succeeded", "failed", "cancelled",
]);
const diagnosticCodes = new Set<DiagnosticCode>([
  "invalid_request", "generation_access_denied", "generation_disabled", "generation_active_limit_reached",
  "generation_rate_limit_reached", "generation_backend_unavailable", "generation_submission_failed",
  "generation_orchestration_stalled", "reconciliation_failed", "generation_worker_unavailable",
  "worker_credit_exhausted", "worker_unavailable", "generation_reassignment_failed", "generation_provider_stalled",
  "generation_failed", "WORKER_CREDIT_EXHAUSTED", "WORKER_UNAVAILABLE", "PROVIDER_FAILED", "missing-dispatch",
  "unsupported-worker", "provider-unconfirmed", "timeout", "provider-unreachable", "confirmed", "not-running",
]);

function boundedToken(value: unknown, maxLength: number) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().replace(/[^a-zA-Z0-9_.:-]/g, "_").slice(0, maxLength);
  return normalized || undefined;
}

function boundedEnum<T extends string>(value: unknown, values: Set<T>) {
  return typeof value === "string" && values.has(value as T) ? value as T : undefined;
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
  const phase = boundedEnum(input.phase, diagnosticPhases);
  const status = boundedEnum(input.status, diagnosticStatuses);
  const code = boundedEnum(input.code, diagnosticCodes);
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

write("src/server/admin/admin-health-summary.ts", r'''export type AdminHealthJobSample = {
  status: string;
  operation: string;
  error_code: string | null;
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

function increment(counts: Record<string, number>, key: string) {
  counts[key] = (counts[key] ?? 0) + 1;
}

function safeAdminErrorCode(code: string | null) {
  if (code === "generation_submission_failed" || code === "generation_backend_unavailable") return code;
  return "generation_failed";
}

export function summarizeScopedAdminHealthBase(
  recentRows: Pick<AdminHealthJobSample, "status" | "operation" | "error_code">[],
  activeRows: Pick<AdminHealthJobSample, "status">[],
) {
  const statusCounts: Record<string, number> = {};
  const operationCounts: Record<string, number> = {};
  const errorCodeCounts: Record<string, number> = {};
  for (const row of recentRows) {
    increment(statusCounts, row.status);
    increment(operationCounts, row.operation);
    if (row.status === "failed") increment(errorCodeCounts, safeAdminErrorCode(row.error_code));
  }
  const activeJobs = activeRows.filter((row) => ["queued", "preparing", "running", "persisting"].includes(row.status)).length;
  return { activeJobs, statusCounts, operationCounts, errorCodeCounts };
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

replace_once(
    "src/server/admin/admin-operations.ts",
    'import { summarizeActiveAdminJobAge, summarizeRecentAdminJobs, type AdminHealthJobSample } from "@/server/admin/admin-health-summary";',
    'import { summarizeActiveAdminJobAge, summarizeRecentAdminJobs, summarizeScopedAdminHealthBase, type AdminHealthJobSample } from "@/server/admin/admin-health-summary";',
    "admin summary import",
)
replace_once(
    "src/server/admin/admin-operations.ts",
    "const healthSampleLimit = 200;\n",
    '''const healthSampleLimit = 200;\n\nfunction adminHealthTestOwnerId() {\n  if (process.env.RENDERLAB_TEST_ADMIN_HEALTH_OWNER_SCOPE !== "true") return null;\n  const ownerId = process.env.RENDERLAB_TEST_ADMIN_HEALTH_OWNER_ID?.trim();\n  if (!ownerId) throw new Error("Admin Health test owner scope is enabled without an owner ID.");\n  return ownerId;\n}\n''',
    "admin test owner helper",
)
replace_block(
    "src/server/admin/admin-operations.ts",
    "export async function getAdminHealth(actorUserId: string): Promise<AdminHealthSnapshot> {",
    "export async function getAdminDashboard(actorUserId: string): Promise<AdminDashboardSnapshot> {",
    r'''export async function getAdminHealth(actorUserId: string): Promise<AdminHealthSnapshot> {
  try {
    const base = await supabaseRest<Pick<AdminHealthSnapshot, "windowHours" | "since" | "activeJobs" | "statusCounts" | "operationCounts" | "errorCodeCounts">>("rpc/renderlab_admin_health", {
      method: "POST",
      body: JSON.stringify({ p_actor_user_id: actorUserId, p_window_hours: 24 }),
    });

    // The privileged RPC above authorizes first. Every query below is server-only, bounded, and
    // selects only fields needed to produce aggregate operator visibility.
    const now = new Date();
    const testOwnerId = adminHealthTestOwnerId();
    const recentParams = new URLSearchParams({
      created_at: `gte.${base.since}`,
      select: "status,operation,error_code,failover_history,created_at,updated_at,completed_at",
      order: "created_at.desc",
      limit: String(healthSampleLimit + 1),
    });
    const activeParams = new URLSearchParams({
      status: "in.(queued,preparing,running,cancelling,persisting)",
      select: "status,operation,error_code,failover_history,created_at,updated_at,completed_at",
      order: "updated_at.asc",
      limit: String(healthSampleLimit + 1),
    });
    const reservationParams = new URLSearchParams({
      released_at: "is.null",
      expires_at: `gt.${now.toISOString()}`,
      select: "id",
      order: "expires_at.asc",
      limit: String(healthSampleLimit + 1),
    });
    if (testOwnerId) {
      recentParams.set("owner_id", `eq.${testOwnerId}`);
      activeParams.set("owner_id", `eq.${testOwnerId}`);
      reservationParams.set("owner_id", `eq.${testOwnerId}`);
    }

    const [recentRowsRaw, activeRowsRaw, reservationRows, settings, maintenanceBacklog] = await Promise.all([
      supabaseRest<AdminHealthJobSample[]>(`generation_jobs?${recentParams.toString()}`),
      supabaseRest<AdminHealthJobSample[]>(`generation_jobs?${activeParams.toString()}`),
      supabaseRest<Array<{ id: string }>>(`generation_admission_reservations?${reservationParams.toString()}`),
      getAdminGenerationSettings(),
      getRenderLabMaintenanceBacklog(),
    ]);

    const recentTruncated = recentRowsRaw.length > healthSampleLimit;
    const activeTruncated = activeRowsRaw.length > healthSampleLimit;
    const reservationTruncated = reservationRows.length > healthSampleLimit;
    if (testOwnerId && (recentTruncated || activeTruncated || reservationTruncated)) {
      throw new Error("Admin Health configured owner scope exceeded its exact bounded fixture window.");
    }
    const recentRows = recentRowsRaw.slice(0, healthSampleLimit);
    const activeRows = activeRowsRaw.slice(0, healthSampleLimit);
    const scopedBase = testOwnerId ? summarizeScopedAdminHealthBase(recentRows, activeRows) : base;
    return {
      ...base,
      ...scopedBase,
      recentJobs: summarizeRecentAdminJobs(recentRows, recentTruncated),
      activeStateAge: summarizeActiveAdminJobAge(activeRows, activeTruncated, now.valueOf()),
      capacity: {
        activeReservations: {
          count: Math.min(reservationRows.length, healthSampleLimit),
          truncated: reservationTruncated,
        },
        generationEnabled: settings.generationEnabled,
        maxActiveJobsPerAccount: settings.maxActiveJobs,
        maxJobsPerHourPerAccount: settings.maxJobsPerHour,
      },
      maintenanceBacklog,
    };
  } catch (error) {
    const classified = classifyAccountMutationError(error);
    if (classified.code === "admin_access_required") throw classified;
    throw new AdminOperationError("admin_backend_unavailable", "Product health is temporarily unavailable.");
  }
}

''',
    "admin health function",
)

replace_once(
    "src/server/generation/native-generation.ts",
    'import { failureKind } from "@/server/generation/worker-failure";',
    'import { classifyWorkerFailure, failureKind, type WorkerFailureClassification } from "@/server/generation/worker-failure";\nimport { correlationIdForGenerationJob, emitDiagnosticEvent } from "@/server/observability/diagnostics";',
    "native classifier imports",
)
replace_once(
    "src/server/generation/native-generation.ts",
    '''  const attempted = await patchJob(row.owner_id, row.id, {\n    failover_history: [...(row.failover_history || []), attemptEntry],\n  });\n\n  let response: Response;''',
    '''  const attempted = await patchJob(row.owner_id, row.id, {\n    failover_history: [...(row.failover_history || []), attemptEntry],\n  });\n  await emitDiagnosticEvent({\n    event: "generation.reconciliation",\n    level: "warn",\n    correlationId: correlationIdForGenerationJob(row.id),\n    jobId: row.id,\n    operation: row.operation,\n    phase: "failover-attempt",\n    status: attempted.status,\n    code: failure.code,\n    attempt: pollReassignmentAttemptCount(attempted),\n  });\n\n  let response: Response;''',
    "native failover attempt diagnostic",
)
replace_once(
    "src/server/generation/native-generation.ts",
    '''  return patchJob(row.owner_id, row.id, {\n    status: "running",\n    worker_id: candidate.id,\n    provider_job_id: payload.call_id,\n    worker_state: payload.worker_state || payload.workerState || "queued",\n    failover_history: [\n      ...(attempted.failover_history || []),\n      {\n        phase: "poll-reassign",\n        fromWorkerId: row.worker_id,\n        toWorkerId: candidate.id,\n        reason: failure.kind,\n        code: failure.code,\n        at: new Date().toISOString(),\n      },\n    ],\n  });''',
    '''  const reassigned = await patchJob(row.owner_id, row.id, {\n    status: "running",\n    worker_id: candidate.id,\n    provider_job_id: payload.call_id,\n    worker_state: payload.worker_state || payload.workerState || "queued",\n    failover_history: [\n      ...(attempted.failover_history || []),\n      {\n        phase: "poll-reassign",\n        fromWorkerId: row.worker_id,\n        toWorkerId: candidate.id,\n        reason: failure.kind,\n        code: failure.code,\n        at: new Date().toISOString(),\n      },\n    ],\n  });\n  await emitDiagnosticEvent({\n    event: "generation.reconciliation",\n    correlationId: correlationIdForGenerationJob(row.id),\n    jobId: row.id,\n    operation: row.operation,\n    phase: "failover-complete",\n    status: reassigned.status,\n    code: failure.code,\n    attempt: pollReassignmentAttemptCount(reassigned),\n  });\n  return reassigned;''',
    "native failover complete diagnostic",
)
replace_once(
    "src/server/generation/native-generation.ts",
    '''  const recovered = await recoverPersistingResult(row);\n  if (recovered) return toGenerationJob(recovered);''',
    '''  const recovered = await recoverPersistingResult(row);\n  if (recovered) {\n    await emitDiagnosticEvent({\n      event: "generation.reconciliation",\n      correlationId: correlationIdForGenerationJob(row.id),\n      jobId: row.id,\n      operation: row.operation,\n      phase: "finalization-recovered",\n      status: recovered.status,\n    });\n    return toGenerationJob(recovered);\n  }''',
    "native recovered diagnostic",
)
replace_once(
    "src/server/generation/native-generation.ts",
    '''  const persisting = await patchJob(row.owner_id, row.id, { status: "persisting", worker_state: "finalizing" });\n  const bytes = Buffer.from(await response.arrayBuffer());\n  const poster = row.output_kind === "video" ? await fetchPoster(worker, row.provider_job_id) : null;\n  const completed = await persistResult(persisting, bytes, contentType, poster);\n  return toGenerationJob(completed);''',
    '''  const persisting = await patchJob(row.owner_id, row.id, { status: "persisting", worker_state: "finalizing" });\n  await emitDiagnosticEvent({\n    event: "generation.reconciliation",\n    correlationId: correlationIdForGenerationJob(row.id),\n    jobId: row.id,\n    operation: row.operation,\n    phase: "provider-ready",\n    status: persisting.status,\n  });\n  const bytes = Buffer.from(await response.arrayBuffer());\n  const poster = row.output_kind === "video" ? await fetchPoster(worker, row.provider_job_id) : null;\n  const completed = await persistResult(persisting, bytes, contentType, poster);\n  await emitDiagnosticEvent({\n    event: "generation.reconciliation",\n    correlationId: correlationIdForGenerationJob(row.id),\n    jobId: row.id,\n    operation: row.operation,\n    phase: "finalization-complete",\n    status: completed.status,\n  });\n  return toGenerationJob(completed);''',
    "native finalization diagnostics",
)

write("tests/unit/admin-health-summary.test.mjs", r'''import assert from "node:assert/strict";
import test from "node:test";

import {
  summarizeActiveAdminJobAge,
  summarizeRecentAdminJobs,
  summarizeScopedAdminHealthBase,
} from "../../src/server/admin/admin-health-summary.ts";

const base = Date.parse("2026-09-05T12:00:00.000Z");

const succeededRow = {
  status: "succeeded",
  operation: "create-image",
  error_code: null,
  created_at: "2026-09-05T11:59:50.000Z",
  updated_at: "2026-09-05T12:00:00.000Z",
  completed_at: "2026-09-05T12:00:00.000Z",
  failover_history: [{ kind: "unavailable", workerId: "private-worker" }, { phase: "cancel-provider-confirmed" }],
};
const failedRow = {
  status: "failed",
  operation: "create-video",
  error_code: "RAW_PROVIDER_CODE",
  created_at: "2026-09-05T11:59:30.000Z",
  updated_at: "2026-09-05T12:00:00.000Z",
  completed_at: "2026-09-05T12:00:00.000Z",
  failover_history: [],
};

test("recent admin health summarizes terminal timing and failover without raw history", () => {
  const summary = summarizeRecentAdminJobs([succeededRow, failedRow], false);
  assert.deepEqual(summary.completionTiming, { sampleCount: 2, p50Ms: 10_000, p95Ms: 30_000 });
  assert.deepEqual(summary.failovers, { jobsWithFailover: 1, eventCount: 1 });
  assert(!JSON.stringify(summary).includes("private-worker"));
});

test("test-scoped core health keeps exact product counts and sanitizes raw errors", () => {
  const summary = summarizeScopedAdminHealthBase(
    [succeededRow, failedRow, { ...failedRow, error_code: "generation_submission_failed" }],
    [{ status: "queued" }, { status: "cancelling" }, { status: "persisting" }],
  );
  assert.deepEqual(summary, {
    activeJobs: 2,
    statusCounts: { succeeded: 1, failed: 2 },
    operationCounts: { "create-image": 1, "create-video": 2 },
    errorCodeCounts: { generation_failed: 1, generation_submission_failed: 1 },
  });
  assert(!JSON.stringify(summary).includes("RAW_PROVIDER_CODE"));
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

test("diagnostic normalization only emits explicit typed bounded fields", () => {
  const event = normalizeDiagnosticEvent({
    event: "generation.submission",
    correlationId: "safe-correlation",
    jobId: "job-123",
    phase: "RAW_PHASE_SECRET",
    status: "RAW_STATUS_SECRET",
    code: "RAW_PROVIDER_SECRET",
    durationMs: -5,
    count: 2.8,
    ...({
      prompt: "SECRET_PROMPT",
      email: "secret@example.com",
      signedUrl: "https://signed.example/SECRET_QUERY",
      storageKey: "SECRET_R2_KEY",
      token: "SECRET_SESSION_TOKEN",
      rawProviderBody: "SECRET_PROVIDER_BODY",
    }),
  });
  const serialized = JSON.stringify(event);
  for (const forbidden of [
    "SECRET_PROMPT", "secret@example.com", "SECRET_QUERY", "SECRET_R2_KEY", "SECRET_SESSION_TOKEN",
    "SECRET_PROVIDER_BODY", "RAW_PHASE_SECRET", "RAW_STATUS_SECRET", "RAW_PROVIDER_SECRET",
  ]) {
    assert(!serialized.includes(forbidden));
  }
  assert.equal(event.phase, undefined);
  assert.equal(event.status, undefined);
  assert.equal(event.code, undefined);
  assert.equal(event.durationMs, 0);
  assert.equal(event.count, 2);
});

test("known diagnostic machine fields survive normalization", () => {
  const event = normalizeDiagnosticEvent({
    event: "generation.reconciliation",
    correlationId: "job-correlation",
    phase: "provider-ready",
    status: "persisting",
    code: "WORKER_UNAVAILABLE",
  });
  assert.equal(event.phase, "provider-ready");
  assert.equal(event.status, "persisting");
  assert.equal(event.code, "WORKER_UNAVAILABLE");
});

test("diagnostic sink failure is non-fatal", async () => {
  await emitDiagnosticEvent(
    { event: "maintenance.pass", correlationId: "maintenance-test", phase: "source-claims", count: 1 },
    async () => { throw new Error("sink unavailable"); },
  );
});
''')

replace_once(
    "scripts/verify-admin-operations.mjs",
    'import { createHash } from "node:crypto";',
    'import { createHash, randomUUID } from "node:crypto";',
    "admin verifier crypto import",
)
replace_block(
    "scripts/verify-admin-operations.mjs",
    "async function seedHealthJobs(ownerId) {",
    "if (cleanupOnly) {",
    r'''async function seedHealthJobs(ownerId) {
  const now = Date.now();
  const failedCreatedAt = new Date(now - 30_000).toISOString();
  const failedCompletedAt = new Date(now - 10_000).toISOString();
  const activeAt = new Date(now - 20 * 60_000).toISOString();
  const staleAt = new Date(now - 30 * 60 * 60_000).toISOString();
  const cleaningAt = new Date(now - 20 * 60_000).toISOString();
  const secretMarker = `raw-provider-marker-${runToken}`;
  const storageMarker = `private-storage-marker-${runToken}`;
  const contentMarker = `private-content-marker-${runToken}`;

  await expectOk(
    await serviceRest("generation_jobs", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([
        {
          owner_id: ownerId,
          status: "failed",
          operation: "create-image",
          output_kind: "image",
          prompt: `private prompt ${secretMarker}`,
          workflow_id: `private-workflow-${runToken}`,
          model: `private-model-${runToken}`,
          ecosystem: "private-ecosystem",
          inputs: [],
          parameters: {},
          worker_id: `private-worker-${runToken}`,
          provider_job_id: `private-provider-job-${runToken}`,
          error_code: "WORKER_CREDIT_EXHAUSTED",
          error_message: `raw backend error ${secretMarker}`,
          failover_history: [{
            kind: "unavailable",
            workerId: `private-worker-${runToken}`,
            at: failedCompletedAt,
          }],
          created_at: failedCreatedAt,
          updated_at: failedCompletedAt,
          completed_at: failedCompletedAt,
        },
        {
          owner_id: ownerId,
          status: "queued",
          operation: "create-video",
          output_kind: "video",
          prompt: `active private prompt ${secretMarker}`,
          workflow_id: `active-private-workflow-${runToken}`,
          model: `active-private-model-${runToken}`,
          ecosystem: "private-ecosystem",
          inputs: [],
          parameters: {},
          worker_id: null,
          provider_job_id: null,
          error_code: null,
          error_message: null,
          created_at: activeAt,
          updated_at: activeAt,
          completed_at: null,
        },
      ]),
    }),
    "Could not seed Admin health fixture jobs",
  );

  await expectOk(
    await serviceRest("generation_admission_reservations", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        owner_id: ownerId,
        expires_at: new Date(now + 30 * 60_000).toISOString(),
      }),
    }),
    "Could not seed Admin health admission fixture",
  );

  const staleSourceId = randomUUID();
  const cleaningSourceId = randomUUID();
  await expectOk(
    await serviceRest("generation_sources", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([
        {
          id: staleSourceId,
          owner_id: ownerId,
          storage_key: `renderlab/admin-health/${storageMarker}/stale-source-${staleSourceId}.png`,
          filename: `${contentMarker}-stale.png`,
          mime_type: "image/png",
          size_bytes: 1,
          purpose: "reference",
          status: "ready",
          metadata: { private: contentMarker },
          created_at: staleAt,
          updated_at: staleAt,
        },
        {
          id: cleaningSourceId,
          owner_id: ownerId,
          storage_key: `renderlab/admin-health/${storageMarker}/cleaning-source-${cleaningSourceId}.png`,
          filename: `${contentMarker}-cleaning.png`,
          mime_type: "image/png",
          size_bytes: 1,
          purpose: "reference",
          status: "cleaning",
          metadata: { private: contentMarker },
          created_at: staleAt,
          updated_at: cleaningAt,
        },
      ]),
    }),
    "Could not seed Admin health source backlog fixtures",
  );

  const staleUploadId = randomUUID();
  const cleaningUploadId = randomUUID();
  await expectOk(
    await serviceRest("media_upload_sessions", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([
        {
          id: staleUploadId,
          owner_id: ownerId,
          storage_key: `renderlab/admin-health/${storageMarker}/stale-upload-${staleUploadId}.png`,
          filename: `${contentMarker}-upload-stale.png`,
          display_name: `${contentMarker} upload stale`,
          mime_type: "image/png",
          size_bytes: 1,
          status: "pending",
          metadata: { private: contentMarker },
          created_at: staleAt,
          updated_at: staleAt,
        },
        {
          id: cleaningUploadId,
          owner_id: ownerId,
          storage_key: `renderlab/admin-health/${storageMarker}/cleaning-upload-${cleaningUploadId}.png`,
          filename: `${contentMarker}-upload-cleaning.png`,
          display_name: `${contentMarker} upload cleaning`,
          mime_type: "image/png",
          size_bytes: 1,
          status: "cleaning",
          metadata: { private: contentMarker },
          created_at: staleAt,
          updated_at: cleaningAt,
        },
      ]),
    }),
    "Could not seed Admin health upload backlog fixtures",
  );

  const purgeAssetId = randomUUID();
  await expectOk(
    await serviceRest("media_assets", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        id: purgeAssetId,
        owner_id: ownerId,
        generation_job_id: null,
        origin: "uploaded",
        kind: "image",
        mime_type: "image/png",
        storage_key: `renderlab/admin-health/${storageMarker}/purge-${purgeAssetId}.png`,
        thumbnail_storage_key: null,
        original_filename: `${contentMarker}-purge.png`,
        display_name: `${contentMarker} purge`,
        size_bytes: 1,
        provenance: { private: contentMarker },
        metadata: { private: contentMarker },
        created_at: staleAt,
        updated_at: staleAt,
        deleted_at: staleAt,
        purged_at: null,
      }),
    }),
    "Could not seed Admin health purge backlog fixture",
  );

  return { secretMarker, storageMarker, contentMarker, completionMs: 20_000 };
}

''',
    "admin health fixture seeding",
)
replace_once(
    "scripts/verify-admin-operations.mjs",
    '''  const secretMarker = await seedHealthJobs(memberAccount.id);\n  settingsBaseline = await captureGenerationSettingsBaseline();''',
    '''  const healthFixture = await seedHealthJobs(memberAccount.id);\n  settingsBaseline = await captureGenerationSettingsBaseline();\n  const healthExpectedSettings = { ...settingsBaseline };''',
    "admin fixture call",
)
replace_block(
    "scripts/verify-admin-operations.mjs",
    '  assert(Number(healthPayload?.health?.activeJobs) >= 1, "Admin health did not count the active run-owned job.");',
    "  const healthJson = JSON.stringify(healthPayload);",
    r'''  const health = healthPayload?.health;
  assert(health?.activeJobs === 1, `Admin health active-job count was not exact: ${JSON.stringify(health?.activeJobs)}.`);
  assert(JSON.stringify(health?.statusCounts) === JSON.stringify({ failed: 1, queued: 1 }), `Admin health status counts were not exact: ${JSON.stringify(health?.statusCounts)}.`);
  assert(JSON.stringify(health?.operationCounts) === JSON.stringify({ "create-image": 1, "create-video": 1 }), `Admin health operation counts were not exact: ${JSON.stringify(health?.operationCounts)}.`);
  assert(JSON.stringify(health?.errorCodeCounts) === JSON.stringify({ generation_failed: 1 }), `Admin health safe error counts were not exact: ${JSON.stringify(health?.errorCodeCounts)}.`);
  assert(health?.recentJobs?.sampleSize === 2 && health?.recentJobs?.truncated === false, `Admin health recent-job bound was not exact: ${JSON.stringify(health?.recentJobs)}.`);
  assert(health?.recentJobs?.completionTiming?.sampleCount === 1, "Admin health completion sample count was not exact.");
  assert(health?.recentJobs?.completionTiming?.p50Ms === healthFixture.completionMs, `Admin health p50 timing was not exact: ${JSON.stringify(health?.recentJobs?.completionTiming)}.`);
  assert(health?.recentJobs?.completionTiming?.p95Ms === healthFixture.completionMs, `Admin health p95 timing was not exact: ${JSON.stringify(health?.recentJobs?.completionTiming)}.`);
  assert(health?.recentJobs?.failovers?.jobsWithFailover === 1 && health?.recentJobs?.failovers?.eventCount === 1, `Admin health failover incidence was not exact: ${JSON.stringify(health?.recentJobs?.failovers)}.`);
  assert(JSON.stringify(health?.activeStateAge) === JSON.stringify({ sampleSize: 1, truncated: false, under15Minutes: 0, minutes15To60: 1, hours1To2: 0, over2Hours: 0 }), `Admin health active-age buckets were not exact: ${JSON.stringify(health?.activeStateAge)}.`);
  assert(JSON.stringify(health?.capacity?.activeReservations) === JSON.stringify({ count: 1, truncated: false }), `Admin health active reservations were not exact: ${JSON.stringify(health?.capacity?.activeReservations)}.`);
  assert(health?.capacity?.generationEnabled === healthExpectedSettings.generation_enabled, "Admin health generation capacity state did not match the restored singleton.");
  assert(health?.capacity?.maxActiveJobsPerAccount === healthExpectedSettings.max_active_jobs, "Admin health active limit did not match the restored singleton.");
  assert(health?.capacity?.maxJobsPerHourPerAccount === healthExpectedSettings.max_jobs_per_hour, "Admin health hourly limit did not match the restored singleton.");
  for (const [label, value] of Object.entries(health?.maintenanceBacklog ?? {})) {
    assert(JSON.stringify(value) === JSON.stringify({ count: 1, truncated: false }), `Admin health maintenance backlog ${label} was not exact: ${JSON.stringify(value)}.`);
  }
  assert(Object.keys(health?.maintenanceBacklog ?? {}).length === 5, "Admin health maintenance backlog did not expose exactly five bounded categories.");
''',
    "admin exact health assertions",
)
replace_once(
    "scripts/verify-admin-operations.mjs",
    '''  for (const forbidden of [\n    secretMarker,\n    `private-workflow-${runToken}`,''',
    '''  for (const forbidden of [\n    healthFixture.secretMarker,\n    healthFixture.storageMarker,\n    healthFixture.contentMarker,\n    `private-workflow-${runToken}`,''',
    "admin privacy sentinels",
)

replace_once(
    ".github/workflows/admin-operations.yml",
    '      - "src/server/admin/**"\n',
    '      - "src/server/admin/**"\n      - "src/server/maintenance/**"\n      - "src/server/observability/**"\n',
    "admin dependency filters",
)
replace_once(
    ".github/workflows/admin-operations.yml",
    '      RENDERLAB_CLOSED_BETA_ACCESS_ENFORCEMENT_ENABLED: "true"\n',
    '      RENDERLAB_CLOSED_BETA_ACCESS_ENFORCEMENT_ENABLED: "true"\n      RENDERLAB_TEST_ADMIN_HEALTH_OWNER_SCOPE: "true"\n      RENDERLAB_TEST_MAINTENANCE_OWNER_SCOPE: "true"\n',
    "admin test-scope env",
)
replace_once(
    ".github/workflows/admin-operations.yml",
    '''      - name: Install dependencies\n        run: npm install --no-audit --no-fund\n\n      - name: Audit exact changed files and whitespace''',
    '''      - name: Install dependencies\n        run: npm install --no-audit --no-fund\n\n      - name: Resolve isolated Admin Health owner\n        shell: bash\n        run: |\n          node --input-type=module <<'NODE' >> "$GITHUB_ENV"\n          import { configuredTestAccountIdentity } from "./scripts/lib/configured-test-account.mjs";\n          const ownerId = configuredTestAccountIdentity("admin-operations-member").id;\n          console.log(`RENDERLAB_TEST_ADMIN_HEALTH_OWNER_ID=${ownerId}`);\n          console.log(`RENDERLAB_TEST_MAINTENANCE_OWNER_ID=${ownerId}`);\n          NODE\n\n      - name: Audit exact changed files and whitespace''',
    "admin scope resolution",
)

for path, anchor, expected in [
    (".github/workflows/generation-bridge-integration.yml", '      - "src/server/generation/**"\n', 2),
    (".github/workflows/video-generation-integration.yml", '      - "src/server/generation/**"\n', 2),
    (".github/workflows/generation-reconciliation.yml", '      - "src/server/generation/**"\n', 2),
    (".github/workflows/generation-cancellation.yml", '      - "src/server/generation/**"\n', 2),
    (".github/workflows/generation-admission.yml", '      - "src/server/generation/**"\n', 1),
    (".github/workflows/activity-visual.yml", '      - "src/server/generation/native-generation.ts"\n', 1),
    (".github/workflows/activity-cancel-visual.yml", '      - "src/server/generation/**"\n', 2),
]:
    add_after_all(path, anchor, '      - "src/server/observability/**"\n', expected, f"observability filter {path}")
add_after_all(
    ".github/workflows/maintenance-integration.yml",
    '      - "src/server/maintenance/**"\n',
    '      - "src/server/observability/**"\n',
    2,
    "maintenance observability filter",
)

# Sanity guards for the previously damaged and now high-risk files.
native = read("src/server/generation/native-generation.ts")
for required in [
    "classifyWorkerFailure(response.status, body)",
    "type WorkerFailureClassification",
    'phase: "provider-ready"',
    'phase: "finalization-complete"',
    'phase: "failover-complete"',
]:
    if required not in native:
        raise SystemExit(f"native-generation sanity guard missing: {required}")
if len(native.splitlines()) < 700:
    raise SystemExit("native-generation unexpectedly shrank below the guarded size floor")

admin_verifier = read("scripts/verify-admin-operations.mjs")
for required in [
    "Admin health status counts were not exact",
    "private-storage-marker",
    "staleSourceCandidates",
]:
    if required not in admin_verifier:
        raise SystemExit(f"Admin verifier sanity guard missing: {required}")

print("Phase 17 contract fix patch applied with all guards satisfied.")
