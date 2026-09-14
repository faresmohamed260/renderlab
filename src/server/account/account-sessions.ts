import { createClient } from "@supabase/supabase-js";
import { normalizeRenderLabSessionClient } from "@/lib/auth/session-client-label";
import { getSupabaseAuthConfig } from "@/lib/supabase/config";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RenderLabAuthSessionRow = {
  session_id?: unknown;
  created_at?: unknown;
  last_active_at?: unknown;
  user_agent?: unknown;
};

export type RenderLabSessionSummary = {
  id: string;
  isCurrent: boolean;
  createdAt: string;
  lastActiveAt: string;
  clientLabel: string;
};

function createSessionProjectionClient() {
  const config = getSupabaseAuthConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!config || !serviceRoleKey) return null;
  return createClient(config.url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function validUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function validTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

async function getRenderLabAuthSessionRows(userId: string) {
  if (!validUuid(userId)) return null;
  const service = createSessionProjectionClient();
  if (!service) return null;

  const { data, error } = await service.rpc("renderlab_auth_session_projection", {
    p_user_id: userId,
  });
  if (error || !Array.isArray(data)) return null;

  const rows: Array<{ id: string; createdAt: string; lastActiveAt: string; userAgent: string | null }> = [];
  for (const raw of data as RenderLabAuthSessionRow[]) {
    if (!validUuid(raw.session_id) || !validTimestamp(raw.created_at) || !validTimestamp(raw.last_active_at)) {
      return null;
    }
    if (raw.user_agent !== null && raw.user_agent !== undefined && typeof raw.user_agent !== "string") {
      return null;
    }
    rows.push({
      id: raw.session_id,
      createdAt: raw.created_at,
      lastActiveAt: raw.last_active_at,
      userAgent: typeof raw.user_agent === "string" ? raw.user_agent : null,
    });
  }
  return rows;
}

export async function isRenderLabAuthSessionLive(userId: string, sessionId: string) {
  if (!validUuid(sessionId)) return null;
  const rows = await getRenderLabAuthSessionRows(userId);
  if (!rows) return null;
  return rows.some((row) => row.id === sessionId);
}

export async function getRenderLabSessionSummaries(
  userId: string,
  currentSessionId: string,
): Promise<RenderLabSessionSummary[] | null> {
  if (!validUuid(currentSessionId)) return null;
  const rows = await getRenderLabAuthSessionRows(userId);
  if (!rows) return null;

  const summaries = rows.map((row) => ({
    id: row.id,
    isCurrent: row.id === currentSessionId,
    createdAt: row.createdAt,
    lastActiveAt: row.lastActiveAt,
    clientLabel: normalizeRenderLabSessionClient(row.userAgent),
  }));

  if (summaries.filter((session) => session.isCurrent).length !== 1) return null;

  return summaries.sort((left, right) => {
    if (left.isCurrent !== right.isCurrent) return left.isCurrent ? -1 : 1;
    return Date.parse(right.lastActiveAt) - Date.parse(left.lastActiveAt);
  });
}
