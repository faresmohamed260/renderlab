import { createHash, randomUUID } from "node:crypto";

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
