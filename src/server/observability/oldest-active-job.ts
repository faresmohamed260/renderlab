/**
 * Operator-only, aggregate active-job age. No job, owner, asset, prompt or provider identity
 * enters the snapshot. created_at is the durable, immutable UTC age origin, not updated_at.
 */
export const monitoredActiveStatuses = ["queued", "running", "cancelling", "persisting"] as const;
export type MonitoredActiveStatus = (typeof monitoredActiveStatuses)[number];

// One conservative warning band, not an SLA: 60 minutes precedes the old two-hour
// stale recovery and avoids inventing different per-phase timing budgets without evidence.
export const oldestActiveJobWarningSeconds = 60 * 60;

export type OldestActiveJobAge = {
  ageSeconds: number | null;
  status: MonitoredActiveStatus | null;
  byStatusSeconds: Record<MonitoredActiveStatus, number | null>;
  warningSeconds: number;
  warning: boolean;
};

export function oldestActiveJobHeadQuery(status: MonitoredActiveStatus, ownerId?: string) {
  const query = new URLSearchParams({
    status: "eq." + status,
    select: "created_at",
    order: "created_at.asc",
    limit: "1",
  });
  if (ownerId) query.set("owner_id", "eq." + ownerId);
  return "generation_jobs?" + query.toString();
}

export function summarizeOldestActiveJobHeads(
  heads: ReadonlyArray<{ status: MonitoredActiveStatus; created_at: string | null }>,
  nowMs: number = Date.now(),
): OldestActiveJobAge {
  const byStatusSeconds: OldestActiveJobAge["byStatusSeconds"] = {
    queued: null,
    running: null,
    cancelling: null,
    persisting: null,
  };
  let ageSeconds: number | null = null;
  let status: MonitoredActiveStatus | null = null;
  for (const head of heads) {
    const createdMs = head.created_at === null ? NaN : Date.parse(head.created_at);
    if (!Number.isFinite(createdMs)) continue;
    const seconds = Math.max(0, Math.floor((nowMs - createdMs) / 1000));
    byStatusSeconds[head.status] = seconds;
    if (ageSeconds === null || seconds > ageSeconds) {
      ageSeconds = seconds;
      status = head.status;
    }
  }
  return {
    ageSeconds,
    status,
    byStatusSeconds,
    warningSeconds: oldestActiveJobWarningSeconds,
    warning: ageSeconds !== null && ageSeconds >= oldestActiveJobWarningSeconds,
  };
}
