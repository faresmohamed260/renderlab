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

export type AdminHealthSnapshot = {
  windowHours: number;
  since: string;
  activeJobs: number;
  statusCounts: Record<string, number>;
  operationCounts: Record<string, number>;
  errorCodeCounts: Record<string, number>;
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
