import { supabaseRest } from "@/server/data/supabase-rest";
import { currentObservabilityTestPrefix, scopeObservabilityIdentifier, type DiagnosticEvent } from "@/server/observability/diagnostics";
import {
  generationProviderAlertCodes,
  isGenerationProviderAlertEvent,
  operationalAlertCandidateForEvent,
  type OperationalAlertFamily,
  type OperationalAlertSeverity,
} from "@/server/observability/operational-alerts";

const diagnosticRetentionDays = 30;
const diagnosticAdminMaxLimit = 100;
const generationAlertWindowMs = 15 * 60 * 1000;

export type StoredDiagnosticEventRow = {
  id: number | string;
  occurred_at: string;
  event: DiagnosticEvent["event"];
  level: DiagnosticEvent["level"];
  correlation_id: string;
  job_id: string | null;
  operation: DiagnosticEvent["operation"] | null;
  phase: DiagnosticEvent["phase"] | null;
  status: DiagnosticEvent["status"] | null;
  code: DiagnosticEvent["code"] | null;
  duration_ms: number | string | null;
  count: number | string | null;
  success_count: number | string | null;
  failure_count: number | string | null;
  attempt: number | string | null;
};

export type OperationalAlertRow = {
  alert_key: string;
  family: OperationalAlertFamily;
  severity: OperationalAlertSeverity;
  state: "open" | "resolved";
  first_seen_at: string;
  last_seen_at: string;
  occurrence_count: number | string;
  last_event: string;
  last_code: string | null;
  last_notified_at: string | null;
};

type AlertRpcRow = OperationalAlertRow & { should_notify: boolean };

function diagnosticInsert(event: DiagnosticEvent) {
  return {
    occurred_at: event.timestamp,
    event: event.event,
    level: event.level,
    correlation_id: event.correlationId,
    job_id: event.jobId ?? null,
    operation: event.operation ?? null,
    phase: event.phase ?? null,
    status: event.status ?? null,
    code: event.code ?? null,
    duration_ms: event.durationMs ?? null,
    count: event.count ?? null,
    success_count: event.successCount ?? null,
    failure_count: event.failureCount ?? null,
    attempt: event.attempt ?? null,
  };
}

function inFilter(values: Iterable<string>) {
  return `in.(${Array.from(values).join(",")})`;
}

async function recentGenerationProviderFailureCount(nowIso: string) {
  const since = new Date(Date.parse(nowIso) - generationAlertWindowMs).toISOString();
  const params = new URLSearchParams({
    occurred_at: `gte.${since}`,
    event: "in.(generation.submission,generation.reconciliation)",
    code: inFilter(generationProviderAlertCodes),
    select: "id",
    order: "occurred_at.desc,id.desc",
    limit: "3",
  });
  const testPrefix = currentObservabilityTestPrefix();
  if (testPrefix) params.set("correlation_id", `like.${testPrefix}*`);
  const rows = await supabaseRest<Array<{ id: number | string }>>(
    `renderlab_diagnostic_events?${params.toString()}`,
  );
  return rows.length;
}

async function recordOperationalAlert(
  candidate: {
    alertKey: string;
    family: OperationalAlertFamily;
    severity: OperationalAlertSeverity;
  },
  event: DiagnosticEvent,
) {
  const rows = await supabaseRest<AlertRpcRow[]>("rpc/renderlab_record_operational_alert", {
    method: "POST",
    body: JSON.stringify({
      p_alert_key: scopeObservabilityIdentifier(candidate.alertKey, 80),
      p_family: candidate.family,
      p_severity: candidate.severity,
      p_event: event.event,
      p_code: event.code ?? null,
      p_seen_at: event.timestamp,
    }),
  });
  return rows[0] ?? null;
}

export async function persistDiagnosticEvent(event: DiagnosticEvent) {
  await supabaseRest("renderlab_diagnostic_events", {
    method: "POST",
    body: JSON.stringify(diagnosticInsert(event)),
  });

  const recentCount = isGenerationProviderAlertEvent(event)
    ? await recentGenerationProviderFailureCount(event.timestamp)
    : 0;
  const candidate = operationalAlertCandidateForEvent(event, recentCount);
  if (!candidate) return null;
  return recordOperationalAlert(candidate, event);
}

export async function pruneDiagnosticEvents(limit = 500) {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 2000);
  return supabaseRest<number>("rpc/renderlab_prune_diagnostic_events", {
    method: "POST",
    body: JSON.stringify({ p_limit: safeLimit }),
  });
}

export function diagnosticRetentionCutoff(nowMs = Date.now()) {
  return new Date(nowMs - diagnosticRetentionDays * 24 * 60 * 60 * 1000).toISOString();
}

export type AdminDiagnosticQuery = {
  event?: DiagnosticEvent["event"];
  level?: DiagnosticEvent["level"];
  code?: DiagnosticEvent["code"];
  lookbackHours?: number;
  limit?: number;
};

function boundedAdminDiagnosticQuery(query: AdminDiagnosticQuery = {}) {
  const lookbackHours = Math.min(Math.max(Math.trunc(query.lookbackHours ?? 24), 1), 30 * 24);
  const limit = Math.min(Math.max(Math.trunc(query.limit ?? 20), 1), diagnosticAdminMaxLimit);
  return { ...query, lookbackHours, limit };
}

export async function listRecentDiagnosticEvents(query: AdminDiagnosticQuery = {}, nowMs = Date.now()) {
  const bounded = boundedAdminDiagnosticQuery(query);
  const params = new URLSearchParams({
    occurred_at: `gte.${new Date(nowMs - bounded.lookbackHours * 60 * 60 * 1000).toISOString()}`,
    select: "id,occurred_at,event,level,correlation_id,job_id,operation,phase,status,code,duration_ms,count,success_count,failure_count,attempt",
    order: "occurred_at.desc,id.desc",
    limit: String(bounded.limit + 1),
  });
  if (bounded.event) params.set("event", `eq.${bounded.event}`);
  if (bounded.level) params.set("level", `eq.${bounded.level}`);
  if (bounded.code) params.set("code", `eq.${bounded.code}`);
  const testPrefix = currentObservabilityTestPrefix();
  if (testPrefix) params.set("correlation_id", `like.${testPrefix}*`);

  const rows = await supabaseRest<StoredDiagnosticEventRow[]>(
    `renderlab_diagnostic_events?${params.toString()}`,
  );
  return {
    lookbackHours: bounded.lookbackHours,
    limit: bounded.limit,
    eventFilter: bounded.event ?? null,
    levelFilter: bounded.level ?? null,
    codeFilter: bounded.code ?? null,
    truncated: rows.length > bounded.limit,
    rows: rows.slice(0, bounded.limit),
  };
}

export async function listOperationalAlerts(limit = 20) {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 50);
  const params = new URLSearchParams({
    select: "alert_key,family,severity,state,first_seen_at,last_seen_at,occurrence_count,last_event,last_code,last_notified_at",
    order: "state.asc,severity.desc,last_seen_at.desc,alert_key.asc",
    limit: String(safeLimit),
  });
  const testPrefix = currentObservabilityTestPrefix();
  if (testPrefix) params.set("alert_key", `like.${testPrefix}*`);
  return supabaseRest<OperationalAlertRow[]>(`renderlab_operational_alerts?${params.toString()}`);
}

export function adminDiagnosticProjection(row: StoredDiagnosticEventRow) {
  return {
    timestamp: row.occurred_at,
    event: row.event,
    level: row.level,
    correlationId: row.correlation_id,
    operation: row.operation ?? null,
    phase: row.phase ?? null,
    status: row.status ?? null,
    code: row.code ?? null,
    durationMs: row.duration_ms === null ? null : Number(row.duration_ms),
    count: row.count === null ? null : Number(row.count),
    successCount: row.success_count === null ? null : Number(row.success_count),
    failureCount: row.failure_count === null ? null : Number(row.failure_count),
    attempt: row.attempt === null ? null : Number(row.attempt),
  };
}

export function adminOperationalAlertProjection(row: OperationalAlertRow) {
  return {
    family: row.family,
    severity: row.severity,
    state: row.state,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    occurrenceCount: Number(row.occurrence_count),
    lastEvent: row.last_event,
    lastCode: row.last_code,
    lastNotifiedAt: row.last_notified_at,
  };
}
