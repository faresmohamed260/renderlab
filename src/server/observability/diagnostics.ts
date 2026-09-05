import { createHash, randomUUID } from "node:crypto";

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
