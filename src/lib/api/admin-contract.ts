export type AdminAccessRole = "member" | "admin";
export type AdminAccessStatus = "active" | "suspended";

export type AdminAccountRecord = {
  userId: string;
  email: string | null;
  role: AdminAccessRole;
  status: AdminAccessStatus;
  generationEnabled: boolean | null;
  maxActiveJobs: number | null;
  maxJobsPerHour: number | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminInvitationRecord = {
  id: string;
  email: string;
  role: AdminAccessRole;
  expiresAt: string;
  createdAt: string;
};

export type AdminGenerationSettings = {
  generationEnabled: boolean;
  maxActiveJobs: number;
  maxJobsPerHour: number;
  updatedAt: string;
};

export type AdminBoundedCount = { count: number; truncated: boolean };

export type AdminDiagnosticEvent = {
  timestamp: string;
  event: string;
  level: "info" | "warn" | "error";
  correlationId: string;
  operation: string | null;
  phase: string | null;
  status: string | null;
  code: string | null;
  durationMs: number | null;
  count: number | null;
  successCount: number | null;
  failureCount: number | null;
  attempt: number | null;
};

export type AdminOperationalAlert = {
  label: string;
  family: string;
  severity: "warning" | "critical";
  state: "open" | "resolved";
  firstSeenAt: string;
  lastSeenAt: string;
  occurrenceCount: number;
  lastEvent: string;
  lastCode: string | null;
  lastNotifiedAt: string | null;
};

export type AdminHealthSnapshot = {
  windowHours: number;
  since: string;
  activeJobs: number;
  statusCounts: Record<string, number>;
  operationCounts: Record<string, number>;
  errorCodeCounts: Record<string, number>;
  recentJobs: {
    sampleSize: number;
    truncated: boolean;
    completionTiming: { sampleCount: number; p50Ms: number | null; p95Ms: number | null };
    failovers: { jobsWithFailover: number; eventCount: number };
  };
  oldestActiveJob: {
    ageSeconds: number | null;
    status: "queued" | "running" | "cancelling" | "persisting" | null;
    byStatusSeconds: Record<"queued" | "running" | "cancelling" | "persisting", number | null>;
    warningSeconds: number;
    warning: boolean;
  };
  /** Operator-only, observe-only aggregates; null when optional reads fail. */
  generationObservability: {
    available: boolean;
    dispatchLatency: {
      windowMinutes: number;
      sampleSize: number;
      truncated: boolean;
      p50Seconds: number | null;
      p95Seconds: number | null;
      source: "outbox-confirmed-dispatched";
    } | null;
    terminalHeld: {
      unexpiredByStatus: Record<"succeeded" | "failed" | "cancelled", number>;
      expiredByStatus: Record<"succeeded" | "failed" | "cancelled", number>;
      oldestUnexpiredHeldSeconds: number | null;
      unknownCompletionTime: number;
      truncated: boolean;
      source: "unreleased-bound-reservation-join";
    } | null;
  };
  dispatchHealth: {
    oldestDueSeconds: number;
    expiredClaims: number;
    unresolved: number;
    scheduledHeartbeatAgeSeconds: number | null;
    scheduledHeartbeatMissing: boolean;
  };
  activeStateAge: {
    sampleSize: number;
    truncated: boolean;
    under15Minutes: number;
    minutes15To60: number;
    hours1To2: number;
    over2Hours: number;
  };
  capacity: {
    activeReservations: AdminBoundedCount;
    generationEnabled: boolean;
    maxActiveJobsPerAccount: number;
    maxJobsPerHourPerAccount: number;
  };
  maintenanceBacklog: {
    staleSourceCandidates: AdminBoundedCount;
    cleaningSources: AdminBoundedCount;
    staleUploadCandidates: AdminBoundedCount;
    cleaningUploads: AdminBoundedCount;
    pendingMediaPurges: AdminBoundedCount;
  };
  recentDiagnostics: {
    lookbackHours: number;
    limit: number;
    eventFilter: string | null;
    levelFilter: string | null;
    codeFilter: string | null;
    truncated: boolean;
    events: AdminDiagnosticEvent[];
  };
  operationalAlerts: AdminOperationalAlert[];
};

export type AdminDashboardSnapshot = {
  accounts: AdminAccountRecord[];
  invitations: AdminInvitationRecord[];
  settings: AdminGenerationSettings;
  health: AdminHealthSnapshot;
};

export type AdminAccountUpdate = Partial<Pick<
  AdminAccountRecord,
  "role" | "status" | "generationEnabled" | "maxActiveJobs" | "maxJobsPerHour"
>>;

export type AdminGenerationSettingsUpdate = Pick<
  AdminGenerationSettings,
  "generationEnabled" | "maxActiveJobs" | "maxJobsPerHour"
>;
