import { AdminOperations } from "@/features/admin/admin-operations";
import { AdminIntro } from "@/features/admin/admin-intro";
import styles from "@/features/admin/admin-operations.module.css";
import type { AdminDashboardSnapshot, AdminHealthSnapshot } from "@/lib/api/admin-contract";

type Observability = AdminHealthSnapshot["generationObservability"];
type DispatchLatency = NonNullable<Observability["dispatchLatency"]>;
type TerminalHeld = NonNullable<Observability["terminalHeld"]>;

const date = "2026-11-25T00:00:00.000Z";
const dispatchLatency: DispatchLatency = {
  windowMinutes: 15,
  sampleSize: 12,
  truncated: false,
  p50Seconds: 0,
  p95Seconds: 2.75,
  source: "outbox-confirmed-dispatched",
};
const terminalHeld: TerminalHeld = {
  unexpiredByStatus: { succeeded: 3, failed: 1, cancelled: 0 },
  expiredByStatus: { succeeded: 1, failed: 0, cancelled: 2 },
  oldestUnexpiredHeldSeconds: 62.5,
  unknownCompletionTime: 1,
  truncated: false,
  source: "unreleased-bound-reservation-join",
};
const emptyDispatch = { ...dispatchLatency, sampleSize: 0, p50Seconds: null, p95Seconds: null };
const emptyHeld = {
  ...terminalHeld,
  unexpiredByStatus: { succeeded: 0, failed: 0, cancelled: 0 },
  expiredByStatus: { succeeded: 0, failed: 0, cancelled: 0 },
  oldestUnexpiredHeldSeconds: null,
  unknownCompletionTime: 0,
};

function observability(state: string | undefined): Observability {
  switch (state) {
    case "unavailable":
      return { available: false, dispatchLatency: null, terminalHeld: null };
    case "dispatch-unavailable":
      return { available: true, dispatchLatency: null, terminalHeld };
    case "reservations-unavailable":
      return { available: true, dispatchLatency, terminalHeld: null };
    case "empty":
      return { available: true, dispatchLatency: emptyDispatch, terminalHeld: emptyHeld };
    case "truncated":
      return {
        available: true,
        dispatchLatency: { ...dispatchLatency, sampleSize: 200, truncated: true },
        terminalHeld: { ...terminalHeld, truncated: true },
      };
    case "truncated-empty":
      return {
        available: true,
        dispatchLatency: { ...emptyDispatch, truncated: true },
        terminalHeld: { ...emptyHeld, truncated: true },
      };
    case "small":
      return {
        available: true,
        dispatchLatency: { ...dispatchLatency, sampleSize: 1, p50Seconds: 2.75 },
        terminalHeld: {
          ...emptyHeld,
          unexpiredByStatus: { ...emptyHeld.unexpiredByStatus, failed: 1 },
          unknownCompletionTime: 1,
        },
      };
    case "missing-percentile":
      return { available: true, dispatchLatency: { ...dispatchLatency, p95Seconds: null }, terminalHeld };
    default:
      return { available: true, dispatchLatency, terminalHeld };
  }
}

function snapshot(state: string | undefined): AdminDashboardSnapshot {
  const none = { count: 0, truncated: false };
  return {
    accounts: [],
    invitations: [],
    settings: { generationEnabled: true, maxActiveJobs: 2, maxJobsPerHour: 10, updatedAt: date },
    health: {
      windowHours: 24,
      since: date,
      activeJobs: 1,
      statusCounts: { queued: 1, succeeded: 2 },
      operationCounts: { "create-image": 3 },
      errorCodeCounts: {},
      recentJobs: {
        sampleSize: 3,
        truncated: false,
        completionTiming: { sampleCount: 2, p50Ms: 33000, p95Ms: 55000 },
        failovers: { jobsWithFailover: 0, eventCount: 0 },
      },
      oldestActiveJob: {
        ageSeconds: 30,
        status: "queued",
        byStatusSeconds: { queued: 30, running: null, cancelling: null, persisting: null },
        warningSeconds: 3600,
        warning: false,
      },
      generationObservability: observability(state),
      dispatchHealth: {
        oldestDueSeconds: 7,
        expiredClaims: 0,
        unresolved: 0,
        scheduledHeartbeatAgeSeconds: 35,
        scheduledHeartbeatMissing: false,
      },
      activeStateAge: { sampleSize: 1, truncated: false, under15Minutes: 1, minutes15To60: 0, hours1To2: 0, over2Hours: 0 },
      capacity: { activeReservations: { count: 1, truncated: false }, generationEnabled: true, maxActiveJobsPerAccount: 2, maxJobsPerHourPerAccount: 10 },
      maintenanceBacklog: {
        staleSourceCandidates: none,
        cleaningSources: none,
        staleUploadCandidates: none,
        cleaningUploads: none,
        pendingMediaPurges: none,
      },
      recentDiagnostics: { lookbackHours: 24, limit: 20, eventFilter: null, levelFilter: null, codeFilter: null, truncated: false, events: [] },
      operationalAlerts: [],
    },
  };
}

export default async function AdminFixturePage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  return (
    <section className={styles.workspace}>
      <AdminIntro />
      <AdminOperations snapshot={snapshot((await searchParams).state)} actorUserId="synthetic-admin-fixture" />
    </section>
  );
}
