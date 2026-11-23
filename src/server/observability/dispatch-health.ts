export type DispatchHealth = {
  oldestDueSeconds: number;
  expiredClaims: number;
  unresolved: number;
  scheduledHeartbeatAgeSeconds: number | null;
  scheduledHeartbeatMissing: boolean;
};

// Dispatch-health remains independent of active-job age: a healthy schedule can
// coexist with a stalled owner's job, and a missing heartbeat with no active jobs.
export function dispatchHealthIsHealthy(health: DispatchHealth) {
  return !health.scheduledHeartbeatMissing
    && health.oldestDueSeconds <= 180
    && health.expiredClaims === 0
    && health.unresolved === 0;
}
