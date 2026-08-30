import type {
  AdminGenerationSettings,
  AdminGenerationSettingsUpdate,
} from "@/lib/api/admin-contract";
import { supabaseRest } from "@/server/data/supabase-rest";

type SettingsRow = {
  generation_enabled: boolean;
  max_active_jobs: number;
  max_jobs_per_hour: number;
  updated_at: string;
};

export class AdminSettingsError extends Error {
  constructor(
    public readonly code: "invalid_request" | "admin_access_required" | "admin_backend_unavailable",
    message: string,
  ) {
    super(message);
    this.name = "AdminSettingsError";
  }
}

function publicSettings(row: SettingsRow): AdminGenerationSettings {
  return {
    generationEnabled: row.generation_enabled,
    maxActiveJobs: row.max_active_jobs,
    maxJobsPerHour: row.max_jobs_per_hour,
    updatedAt: row.updated_at,
  };
}

export function validateAdminGenerationSettings(value: unknown): AdminGenerationSettingsUpdate {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AdminSettingsError("invalid_request", "Generation defaults are invalid.");
  }
  const record = value as Record<string, unknown>;
  if (
    Object.keys(record).some((key) => !["generationEnabled", "maxActiveJobs", "maxJobsPerHour"].includes(key))
    || typeof record.generationEnabled !== "boolean"
    || !Number.isInteger(record.maxActiveJobs)
    || Number(record.maxActiveJobs) < 1
    || Number(record.maxActiveJobs) > 4
    || !Number.isInteger(record.maxJobsPerHour)
    || Number(record.maxJobsPerHour) < 1
    || Number(record.maxJobsPerHour) > 120
  ) {
    throw new AdminSettingsError(
      "invalid_request",
      "Use a generation state, an active-job limit from 1–4, and an hourly limit from 1–120.",
    );
  }
  return {
    generationEnabled: record.generationEnabled,
    maxActiveJobs: Number(record.maxActiveJobs),
    maxJobsPerHour: Number(record.maxJobsPerHour),
  };
}

export async function getAdminGenerationSettings(): Promise<AdminGenerationSettings> {
  try {
    const rows = await supabaseRest<SettingsRow[]>(
      "renderlab_beta_settings?singleton_id=eq.1&select=generation_enabled,max_active_jobs,max_jobs_per_hour,updated_at&limit=1",
    );
    if (!rows?.[0]) throw new Error("settings missing");
    return publicSettings(rows[0]);
  } catch {
    throw new AdminSettingsError("admin_backend_unavailable", "Generation defaults are temporarily unavailable.");
  }
}

export async function updateAdminGenerationSettings(
  actorUserId: string,
  update: AdminGenerationSettingsUpdate,
): Promise<AdminGenerationSettings> {
  try {
    const rows = await supabaseRest<SettingsRow[]>("rpc/renderlab_admin_set_beta_settings", {
      method: "POST",
      body: JSON.stringify({
        p_actor_user_id: actorUserId,
        p_generation_enabled: update.generationEnabled,
        p_max_active_jobs: update.maxActiveJobs,
        p_max_jobs_per_hour: update.maxJobsPerHour,
      }),
    });
    if (!rows?.[0]) throw new Error("settings update missing");
    return publicSettings(rows[0]);
  } catch (error) {
    const message = String(error);
    if (message.includes("renderlab_admin_required")) {
      throw new AdminSettingsError("admin_access_required", "Active RenderLab admin access is required.");
    }
    if (message.includes("renderlab_admin_invalid_request")) {
      throw new AdminSettingsError("invalid_request", "Generation defaults are invalid.");
    }
    throw new AdminSettingsError("admin_backend_unavailable", "Generation defaults could not be updated right now.");
  }
}
