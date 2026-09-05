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
