import { isSupabaseConfigured, supabaseRest } from "@/server/data/supabase-rest";

export type RenderLabAccessRole = "member" | "admin";
export type RenderLabAccessStatus = "active" | "suspended";

export type RenderLabAccountAccess = {
  userId: string;
  role: RenderLabAccessRole;
  status: RenderLabAccessStatus;
  generationEnabled: boolean | null;
  maxActiveJobs: number | null;
  maxJobsPerHour: number | null;
  createdAt: string;
  updatedAt: string;
};

type RenderLabAccountAccessRow = {
  user_id: string;
  role: RenderLabAccessRole;
  status: RenderLabAccessStatus;
  generation_enabled: boolean | null;
  max_active_jobs: number | null;
  max_jobs_per_hour: number | null;
  created_at: string;
  updated_at: string;
};

type RenderLabIdentityLike = {
  id: string;
  email: string | null;
};

function publicAccess(row: RenderLabAccountAccessRow): RenderLabAccountAccess {
  return {
    userId: row.user_id,
    role: row.role,
    status: row.status,
    generationEnabled: row.generation_enabled,
    maxActiveJobs: row.max_active_jobs,
    maxJobsPerHour: row.max_jobs_per_hour,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function isRenderLabAccessEnforcementEnabled() {
  const value = process.env.RENDERLAB_CLOSED_BETA_ACCESS_ENFORCEMENT_ENABLED?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

export async function getRenderLabAccountAccess(userId: string): Promise<RenderLabAccountAccess | null> {
  if (!isSupabaseConfigured()) return null;

  const rows = await supabaseRest<RenderLabAccountAccessRow[]>(
    `renderlab_account_access?user_id=eq.${encodeURIComponent(userId)}&select=user_id,role,status,generation_enabled,max_active_jobs,max_jobs_per_hour,created_at,updated_at&limit=1`,
  );
  return rows[0] ? publicAccess(rows[0]) : null;
}

export async function claimRenderLabBetaInvitation(
  identity: RenderLabIdentityLike,
): Promise<RenderLabAccountAccess | null> {
  const email = identity.email?.trim().toLowerCase();
  if (!email || !isSupabaseConfigured()) return null;

  const rows = await supabaseRest<RenderLabAccountAccessRow[]>("rpc/renderlab_claim_beta_invitation", {
    method: "POST",
    body: JSON.stringify({ p_user_id: identity.id, p_email: email }),
  });
  return rows[0] ? publicAccess(rows[0]) : null;
}

export async function resolveRenderLabAccountAccess(
  identity: RenderLabIdentityLike,
): Promise<RenderLabAccountAccess | null> {
  const existing = await getRenderLabAccountAccess(identity.id);
  return existing ?? claimRenderLabBetaInvitation(identity);
}
