export type AdminHealthJobSample = {
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
