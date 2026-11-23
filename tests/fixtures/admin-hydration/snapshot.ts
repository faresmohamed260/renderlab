import type { AdminDashboardSnapshot } from "@/lib/api/admin-contract";

// All identities are synthetic; no production access or raw diagnostic data.
const nearMidnightUtc = "2026-11-23T23:55:00.000Z";
const bounded = { count: 0, truncated: false };

export const snapshot: AdminDashboardSnapshot = {
  accounts: [
    {
      userId: "fixture-admin", email: "admin@example.invalid",
      role: "admin", status: "active", generationEnabled: null,
      maxActiveJobs: null, maxJobsPerHour: null,
      createdAt: nearMidnightUtc, updatedAt: nearMidnightUtc,
    },
    {
      userId: "fixture-member", email: "member@example.invalid",
      role: "member", status: "active", generationEnabled: null,
      maxActiveJobs: 2, maxJobsPerHour: 20,
      createdAt: nearMidnightUtc, updatedAt: nearMidnightUtc,
    },
  ],
  invitations: [
    {
      id: "fixture-invite", email: "invite@example.invalid", role: "member",
      expiresAt: nearMidnightUtc, createdAt: nearMidnightUtc,
    },
    {
      id: "fixture-invalid", email: "invalid@example.invalid", role: "member",
      expiresAt: "invalid-date", createdAt: nearMidnightUtc,
    },
  ],
  settings: {
    generationEnabled: true, maxActiveJobs: 2, maxJobsPerHour: 20,
    updatedAt: nearMidnightUtc,
  },
  health: {
    windowHours: 24,
    since: nearMidnightUtc,
    activeJobs: 3,
    statusCounts: { queued: 1, running: 1, persisting: 1, succeeded: 5, failed: 1 },
    operationCounts: { "edit-image": 2, "create-image": 7 },
    errorCodeCounts: { generation_failed: 1, fibo_process_exited: 1 },
    recentJobs: {
      sampleSize: 6, truncated: false,
      completionTiming: { sampleCount: 6, p50Ms: 24_000, p95Ms: 130_000 },
      failovers: { jobsWithFailover: 1, eventCount: 2 },
    },
    oldestActiveJob: {
      ageSeconds: 3605, status: "running", warningSeconds: 3600,
      warning: true,
      byStatusSeconds: {
        queued: 12, running: 3605, cancelling: null, persisting: 8,
      },
    },
    dispatchHealth: {
      oldestDueSeconds: 20, expiredClaims: 1, unresolved: 1,
      scheduledHeartbeatAgeSeconds: 36, scheduledHeartbeatMissing: false,
    },
    activeStateAge: {
      sampleSize: 3, truncated: false,
      under15Minutes: 1, minutes15To60: 1, hours1To2: 1,
      over2Hours: 0,
    },
    capacity: {
      activeReservations: { count: 3, truncated: false },
      generationEnabled: true,
      maxActiveJobsPerAccount: 2, maxJobsPerHourPerAccount: 20,
    },
    maintenanceBacklog: {
      staleSourceCandidates: bounded, cleaningSources: bounded,
      staleUploadCandidates: bounded, cleaningUploads: bounded,
      pendingMediaPurges: bounded,
    },
    recentDiagnostics: {
      lookbackHours: 24, limit: 20, eventFilter: null, levelFilter: null,
      codeFilter: null, truncated: false,
      events: [
        {
          timestamp: nearMidnightUtc, event: "generation.submission",
          level: "info", correlationId: "fixture-correlation-a",
          operation: "create-image", phase: null, status: "queued",
          code: null, durationMs: 45, count: 1, successCount: null,
          failureCount: null, attempt: 1,
        },
        {
          timestamp: nearMidnightUtc, event: "generation.reconciliation",
          level: "warn", correlationId: "fixture-correlation-b",
          operation: "edit-image", phase: "poll", status: "running",
          code: "fibo_process_exited", durationMs: 101,
          count: 1, successCount: null, failureCount: null, attempt: 1,
        },
      ],
    },
    operationalAlerts: [
      {
        label: "Synthetic dispatch warning", family: "dispatch",
        severity: "warning", state: "open",
        firstSeenAt: nearMidnightUtc, lastSeenAt: nearMidnightUtc,
        occurrenceCount: 2, lastEvent: "fixture-event",
        lastCode: "dispatch_delayed", lastNotifiedAt: null,
      },
    ],
  },
};
