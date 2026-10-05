import { createHash, randomUUID } from "node:crypto";
import type { CreativeOperation } from "@/lib/capabilities/generation";

export type DiagnosticLevel = "info" | "warn" | "error";
export type DiagnosticEventName =
  | "generation.submission"
  | "generation.reconciliation"
  | "generation.cancellation"
  | "maintenance.pass"
  | "account.data_lifecycle";

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
  | "media-purges"
  | "diagnostic-retention"
  | "deletion-retry"
  | "deletion-complete"
  | "notification-failed";

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
  | "not-running"
  | "account_auth_unavailable"
  | "account_auth_delete_failed"
  | "account_storage_residue"
  | "account_database_residue"
  | "account_invitation_residue"
  | "account_deletion_retryable"
  | "account_deletion_mail_send_failed"
  | "account_deletion_mail_recipient_unavailable";

export type DiagnosticEventInput = {
  event: DiagnosticEventName;
  level?: DiagnosticLevel;
  correlationId: string;
  jobId?: string;
  operation?: CreativeOperation;
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

const diagnosticEvents = new Set<DiagnosticEventName>([
  "generation.submission",
  "generation.reconciliation",
  "generation.cancellation",
  "maintenance.pass",
  "account.data_lifecycle",
]);
const diagnosticLevels = new Set<DiagnosticLevel>(["info", "warn", "error"]);
const diagnosticPhases = new Set<DiagnosticPhase>([
  "rejected", "accepted", "already-terminal", "claim-busy", "cancellation", "stalled", "polled", "failed",
  "provider-outcome", "intent-accepted", "failover-attempt", "failover-complete", "provider-ready",
  "finalization-recovered", "finalization-complete", "source-claims", "source-cleanup", "upload-claims",
  "upload-cleanup", "media-purges", "diagnostic-retention", "deletion-retry", "deletion-complete",
  "notification-failed",
]);
const diagnosticStatuses = new Set<DiagnosticStatus>([
  "queued", "preparing", "running", "cancelling", "persisting", "succeeded", "failed", "cancelled",
]);
const observabilityTestNamespaceMaxLength = 20;

function observabilityTestNamespace() {
  const raw = process.env.RENDERLAB_TEST_OBSERVABILITY_NAMESPACE?.trim().toLowerCase();
  if (!raw) return null;
  const normalized = raw.replace(/[^a-z0-9_.:-]/g, "_").slice(0, observabilityTestNamespaceMaxLength);
  return normalized || null;
}

function durableDiagnosticPersistenceEnabled() {
  if (process.env.GITHUB_ACTIONS !== "true") return true;
  return process.env.RENDERLAB_TEST_OBSERVABILITY_PERSIST === "true";
}

export function scopeObservabilityIdentifier(value: string, maxLength: number) {
  const namespace = observabilityTestNamespace();
  if (!namespace) return value.slice(0, maxLength);
  const prefix = `test.${namespace}.`;
  if (prefix.length >= maxLength) {
    return createHash("sha256").update(`${namespace}:${value}`).digest("hex").slice(0, maxLength);
  }
  if (prefix.length + value.length <= maxLength) return `${prefix}${value}`;
  const digest = createHash("sha256").update(value).digest("hex");
  return `${prefix}${digest.slice(0, maxLength - prefix.length)}`;
}

export function currentObservabilityTestPrefix() {
  const namespace = observabilityTestNamespace();
  return namespace ? `test.${namespace}.` : null;
}

const diagnosticCodes = new Set<DiagnosticCode>([
  "invalid_request", "generation_access_denied", "generation_disabled", "generation_active_limit_reached",
  "generation_rate_limit_reached", "generation_backend_unavailable", "generation_submission_failed",
  "generation_orchestration_stalled", "reconciliation_failed", "generation_worker_unavailable",
  "worker_credit_exhausted", "worker_unavailable", "generation_reassignment_failed", "generation_provider_stalled",
  "generation_failed", "WORKER_CREDIT_EXHAUSTED", "WORKER_UNAVAILABLE", "PROVIDER_FAILED", "missing-dispatch",
  "unsupported-worker", "provider-unconfirmed", "timeout", "provider-unreachable", "confirmed", "not-running",
  "account_auth_unavailable", "account_auth_delete_failed", "account_storage_residue", "account_database_residue",
  "account_invitation_residue", "account_deletion_retryable", "account_deletion_mail_send_failed",
  "account_deletion_mail_recipient_unavailable",
]);

export function isDiagnosticEventName(value: unknown): value is DiagnosticEventName {
  return typeof value === "string" && diagnosticEvents.has(value as DiagnosticEventName);
}

export function isDiagnosticLevel(value: unknown): value is DiagnosticLevel {
  return typeof value === "string" && diagnosticLevels.has(value as DiagnosticLevel);
}

export function isDiagnosticCode(value: unknown): value is DiagnosticCode {
  return typeof value === "string" && diagnosticCodes.has(value as DiagnosticCode);
}

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

export function correlationIdForAccountLifecycle(userId: string) {
  return createHash("sha256")
    .update(`renderlab:account-lifecycle:${userId}`)
    .digest("hex")
    .slice(0, 24);
}

export function normalizeDiagnosticEvent(input: DiagnosticEventInput, timestamp = new Date().toISOString()): DiagnosticEvent {
  const event = boundedEnum(input.event, diagnosticEvents);
  if (!event) throw new Error("A known diagnostic event is required.");
  const level = input.level === undefined ? "info" : boundedEnum(input.level, diagnosticLevels);
  if (!level) throw new Error("A known diagnostic level is required.");
  const rawCorrelationId = boundedToken(input.correlationId, 64);
  if (!rawCorrelationId) throw new Error("A diagnostic correlation ID is required.");
  const correlationId = scopeObservabilityIdentifier(rawCorrelationId, 64);

  const normalized: DiagnosticEvent = {
    event,
    level,
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

async function scheduleDurableDiagnosticPersistence(event: DiagnosticEvent) {
  if (!durableDiagnosticPersistenceEnabled()) return;
  try {
    const { after } = await import("next/server");
    after(async () => {
      try {
        const { persistDiagnosticEvent } = await import("@/server/observability/diagnostic-store");
        const alert = await persistDiagnosticEvent(event);
        if (alert?.should_notify) {
          const { sendOperationalAlertNotification } = await import("@/server/observability/operational-alert-notification");
          await sendOperationalAlertNotification(alert);
        }
      } catch {
        console.warn("[renderlab] {\"event\":\"diagnostic.persistence\",\"level\":\"warn\",\"code\":\"diagnostic_persistence_failed\"}");
      }
    });
  } catch {
    // Direct module/unit execution may not have a Next.js request lifetime. Console emission remains authoritative there.
  }
}

export async function emitDiagnosticEvent(input: DiagnosticEventInput, sink?: DiagnosticSink) {
  try {
    const event = normalizeDiagnosticEvent(input);
    await (sink ?? defaultDiagnosticSink)(event);
    if (!sink) await scheduleDurableDiagnosticPersistence(event);
  } catch {
    // Diagnostics are observational and must never become a product correctness dependency.
  }
}
