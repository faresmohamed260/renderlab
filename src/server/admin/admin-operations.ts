import { createClient, type User } from "@supabase/supabase-js";
import type {
  AdminAccessRole,
  AdminAccountRecord,
  AdminAccountUpdate,
  AdminDashboardSnapshot,
  AdminHealthSnapshot,
  AdminInvitationRecord,
} from "@/lib/api/admin-contract";
import type { RenderLabAccountAccess } from "@/server/account/account-access";
import { isSupabaseConfigured, supabaseRest } from "@/server/data/supabase-rest";

const pendingInvitationLimit = 100;
const accountListLimit = 100;
const invitationLifetimeMs = 60 * 60 * 1000;

type AdminAccountAccessRow = {
  user_id: string;
  role: "member" | "admin";
  status: "active" | "suspended";
  generation_enabled: boolean | null;
  max_active_jobs: number | null;
  max_jobs_per_hour: number | null;
  created_at: string;
  updated_at: string;
};

type AdminInvitationRow = {
  id: string;
  normalized_email: string;
  role: AdminAccessRole;
  expires_at: string;
  created_at: string;
};

type AdminAccountMutationRow = AdminAccountAccessRow;

export class AdminOperationError extends Error {
  constructor(
    public readonly code:
      | "invalid_request"
      | "admin_access_required"
      | "account_not_found"
      | "invitation_not_found"
      | "invitation_exists"
      | "self_lockout"
      | "last_active_admin"
      | "admin_backend_unavailable",
    message: string,
  ) {
    super(message);
    this.name = "AdminOperationError";
  }
}

function supabaseAuthAdminClient() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "").trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    throw new AdminOperationError("admin_backend_unavailable", "Admin operations are temporarily unavailable.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

async function knownAuthUser(userId: string): Promise<User | null> {
  const client = supabaseAuthAdminClient();
  const { data, error } = await client.auth.admin.getUserById(userId);
  if (error || !data.user || data.user.id !== userId) return null;
  return data.user;
}

function publicAccount(row: AdminAccountAccessRow, user: User | null): AdminAccountRecord {
  return {
    userId: row.user_id,
    email: typeof user?.email === "string" ? user.email : null,
    role: row.role,
    status: row.status,
    generationEnabled: row.generation_enabled,
    maxActiveJobs: row.max_active_jobs,
    maxJobsPerHour: row.max_jobs_per_hour,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function publicInvitation(row: AdminInvitationRow): AdminInvitationRecord {
  return {
    id: row.id,
    email: row.normalized_email,
    role: row.role,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

function publicAccess(row: AdminAccountMutationRow): RenderLabAccountAccess {
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

export function normalizeAdminInvitationEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (
    email.length < 3
    || email.length > 320
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new AdminOperationError("invalid_request", "Enter a valid invitation email.");
  }
  return email;
}

export async function listAdminAccounts(): Promise<AdminAccountRecord[]> {
  if (!isSupabaseConfigured()) {
    throw new AdminOperationError("admin_backend_unavailable", "Admin operations are temporarily unavailable.");
  }

  const params = new URLSearchParams({
    select: "user_id,role,status,generation_enabled,max_active_jobs,max_jobs_per_hour,created_at,updated_at",
    order: "created_at.asc,user_id.asc",
    limit: String(accountListLimit),
  });
  const rows = await supabaseRest<AdminAccountAccessRow[]>(`renderlab_account_access?${params.toString()}`);
  return Promise.all(rows.map(async (row) => publicAccount(row, await knownAuthUser(row.user_id))));
}

export async function listPendingAdminInvitations(): Promise<AdminInvitationRecord[]> {
  const params = new URLSearchParams({
    select: "id,normalized_email,role,expires_at,created_at",
    claimed_at: "is.null",
    revoked_at: "is.null",
    expires_at: `gt.${new Date().toISOString()}`,
    order: "created_at.desc,id.desc",
    limit: String(pendingInvitationLimit),
  });
  const rows = await supabaseRest<AdminInvitationRow[]>(`renderlab_beta_invitations?${params.toString()}`);
  return rows.map(publicInvitation);
}

export async function createAdminInvitation({
  email,
  role,
  redirectTo,
}: {
  email: string;
  role: AdminAccessRole;
  redirectTo: string;
}) {
  const normalizedEmail = normalizeAdminInvitationEmail(email);
  if (role !== "member" && role !== "admin") {
    throw new AdminOperationError("invalid_request", "Choose a valid RenderLab role.");
  }

  const existingParams = new URLSearchParams({
    normalized_email: `eq.${normalizedEmail}`,
    claimed_at: "is.null",
    revoked_at: "is.null",
    select: "id,expires_at",
    limit: "1",
  });
  const existing = await supabaseRest<Array<{ id: string; expires_at: string }>>(
    `renderlab_beta_invitations?${existingParams.toString()}`,
  );
  const existingOpen = existing[0];
  if (existingOpen && Date.parse(existingOpen.expires_at) > Date.now()) {
    throw new AdminOperationError("invitation_exists", "A pending RenderLab invitation already exists for that email.");
  }
  if (existingOpen) {
    await supabaseRest(
      `renderlab_beta_invitations?id=eq.${encodeURIComponent(existingOpen.id)}&claimed_at=is.null&revoked_at=is.null`,
      {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ revoked_at: new Date().toISOString() }),
      },
    );
  }

  const expiresAt = new Date(Date.now() + invitationLifetimeMs).toISOString();
  let rows: AdminInvitationRow[];
  try {
    rows = await supabaseRest<AdminInvitationRow[]>(
      "renderlab_beta_invitations?select=id,normalized_email,role,expires_at,created_at",
      {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          normalized_email: normalizedEmail,
          role,
          expires_at: expiresAt,
        }),
      },
    );
  } catch (error) {
    if (String(error).includes("renderlab_beta_invitations_open_email_idx")) {
      throw new AdminOperationError("invitation_exists", "A pending RenderLab invitation already exists for that email.");
    }
    throw new AdminOperationError("admin_backend_unavailable", "The invitation could not be recorded right now.");
  }

  const invitation = rows[0];
  if (!invitation) {
    throw new AdminOperationError("admin_backend_unavailable", "The invitation could not be recorded right now.");
  }

  try {
    const client = supabaseAuthAdminClient();
    await client.auth.admin.inviteUserByEmail(normalizedEmail, { redirectTo });
  } catch {
    // Deliberately generic: delivery failure or an already-existing shared Auth identity
    // must not become an account-enumeration oracle. The RenderLab invitation remains claimable.
  }

  return {
    invitation: publicInvitation(invitation),
    deliveryMessage: "Invitation recorded. If this address can receive a RenderLab invite, it will arrive shortly.",
  };
}

export async function revokeAdminInvitation(invitationId: string) {
  const params = new URLSearchParams({
    id: `eq.${invitationId}`,
    claimed_at: "is.null",
    revoked_at: "is.null",
    select: "id",
  });
  const rows = await supabaseRest<Array<{ id: string }>>(
    `renderlab_beta_invitations?${params.toString()}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ revoked_at: new Date().toISOString() }),
    },
  );
  if (!rows[0]) {
    throw new AdminOperationError("invitation_not_found", "That pending invitation is no longer available.");
  }
}

function classifyAccountMutationError(error: unknown): AdminOperationError {
  const message = String(error);
  if (message.includes("renderlab_last_active_admin")) {
    return new AdminOperationError("last_active_admin", "The last active admin cannot be demoted or suspended.");
  }
  if (message.includes("renderlab_self_lockout")) {
    return new AdminOperationError("self_lockout", "You cannot remove your own active admin access.");
  }
  if (message.includes("renderlab_account_not_found")) {
    return new AdminOperationError("account_not_found", "That RenderLab account is no longer available.");
  }
  if (message.includes("renderlab_admin_required")) {
    return new AdminOperationError("admin_access_required", "Active RenderLab admin access is required.");
  }
  if (message.includes("renderlab_admin_invalid_request")) {
    return new AdminOperationError("invalid_request", "The requested account access values are invalid.");
  }
  return new AdminOperationError("admin_backend_unavailable", "The account could not be updated right now.");
}

export async function updateAdminAccount(
  actorUserId: string,
  targetUserId: string,
  patch: AdminAccountUpdate,
): Promise<RenderLabAccountAccess> {
  const setGenerationEnabled = Object.hasOwn(patch, "generationEnabled");
  const setMaxActiveJobs = Object.hasOwn(patch, "maxActiveJobs");
  const setMaxJobsPerHour = Object.hasOwn(patch, "maxJobsPerHour");

  try {
    const rows = await supabaseRest<AdminAccountMutationRow[]>("rpc/renderlab_admin_set_account_access", {
      method: "POST",
      body: JSON.stringify({
        p_actor_user_id: actorUserId,
        p_target_user_id: targetUserId,
        p_role: patch.role ?? null,
        p_status: patch.status ?? null,
        p_set_generation_enabled: setGenerationEnabled,
        p_generation_enabled: setGenerationEnabled ? patch.generationEnabled ?? null : null,
        p_set_max_active_jobs: setMaxActiveJobs,
        p_max_active_jobs: setMaxActiveJobs ? patch.maxActiveJobs ?? null : null,
        p_set_max_jobs_per_hour: setMaxJobsPerHour,
        p_max_jobs_per_hour: setMaxJobsPerHour ? patch.maxJobsPerHour ?? null : null,
      }),
    });
    if (!rows[0]) {
      throw new AdminOperationError("admin_backend_unavailable", "The account could not be updated right now.");
    }
    return publicAccess(rows[0]);
  } catch (error) {
    if (error instanceof AdminOperationError) throw error;
    throw classifyAccountMutationError(error);
  }
}

export async function getAdminHealth(actorUserId: string): Promise<AdminHealthSnapshot> {
  try {
    return await supabaseRest<AdminHealthSnapshot>("rpc/renderlab_admin_health", {
      method: "POST",
      body: JSON.stringify({ p_actor_user_id: actorUserId, p_window_hours: 24 }),
    });
  } catch (error) {
    const classified = classifyAccountMutationError(error);
    if (classified.code === "admin_access_required") throw classified;
    throw new AdminOperationError("admin_backend_unavailable", "Product health is temporarily unavailable.");
  }
}

export async function getAdminDashboard(actorUserId: string): Promise<AdminDashboardSnapshot> {
  const [accounts, invitations, health] = await Promise.all([
    listAdminAccounts(),
    listPendingAdminInvitations(),
    getAdminHealth(actorUserId),
  ]);
  return { accounts, invitations, health };
}
