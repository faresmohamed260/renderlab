/** Pure bounded operator aggregates. Never return a job, owner or provider handle. */
export const generationOperatorSampleLimit = 200;
export const generationOperatorLookbackMinutes = 15;

export type DispatchTimingSample = { created_at: string; dispatched_at: string | null };
export type UnreleasedBoundReservation = { job_id: string; expires_at: string };
export type TerminalHeldJob = {
  id: string;
  status: string;
  completed_at: string | null;
};

export function summarizeGenerationDispatchLatency(
  rows: readonly DispatchTimingSample[],
  truncated: boolean,
  nowMs: number,
) {
  const since = nowMs - generationOperatorLookbackMinutes * 60 * 1000;
  const values = rows.flatMap((row) => {
    const accepted = Date.parse(row.created_at);
    const dispatched = row.dispatched_at ? Date.parse(row.dispatched_at) : NaN;
    return Number.isFinite(accepted) && Number.isFinite(dispatched)
      && dispatched >= accepted && dispatched >= since && dispatched <= nowMs
      ? [(dispatched - accepted) / 1000] : [];
  }).sort((a, b) => a - b);
  const percentile = (p: number) => values.length ? values[Math.ceil(values.length * p) - 1]! : null;
  return {
    windowMinutes: generationOperatorLookbackMinutes,
    sampleSize: values.length,
    truncated,
    p50Seconds: percentile(0.5),
    p95Seconds: percentile(0.95),
    // This is durable outbox acknowledgement, not the provider GPU start.
    source: "outbox-confirmed-dispatched" as const,
  };
}

const terminalStatuses = ["succeeded", "failed", "cancelled"] as const;
type Terminal = typeof terminalStatuses[number];
const emptyCounts = () => ({ succeeded: 0, failed: 0, cancelled: 0 });

export function summarizeGenerationTerminalHeld(
  reservations: readonly UnreleasedBoundReservation[],
  jobs: readonly TerminalHeldJob[],
  truncated: boolean,
  nowMs: number,
) {
  const statusByJob = new Map(jobs.filter((job): job is TerminalHeldJob & { status: Terminal } =>
    terminalStatuses.includes(job.status as Terminal)).map((job) => [job.id, job]));
  const unexpiredByStatus = emptyCounts();
  const expiredByStatus = emptyCounts();
  let oldestUnexpiredHeldSeconds: number | null = null;
  let unknownCompletionTime = 0;
  for (const reservation of reservations) {
    const job = statusByJob.get(reservation.job_id);
    if (!job) continue;
    const expiry = Date.parse(reservation.expires_at);
    if (!Number.isFinite(expiry)) continue;
    if (expiry > nowMs) {
      unexpiredByStatus[job.status] += 1;
      const completed = job.completed_at ? Date.parse(job.completed_at) : NaN;
      if (Number.isFinite(completed)) {
        const age = Math.max(0, (nowMs - completed) / 1000);
        oldestUnexpiredHeldSeconds = Math.max(oldestUnexpiredHeldSeconds ?? 0, age);
      } else unknownCompletionTime += 1;
    } else expiredByStatus[job.status] += 1;
  }
  return {
    unexpiredByStatus,
    expiredByStatus,
    oldestUnexpiredHeldSeconds,
    unknownCompletionTime,
    truncated,
    // Counts are lower bounds when truncated; never claim zero total.
    source: "unreleased-bound-reservation-join" as const,
  };
}
