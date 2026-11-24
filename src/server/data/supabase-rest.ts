import { randomUUID } from "node:crypto";
import { envString } from "../../lib/config/runtime-env.ts";
import "server-only";

import { injectAccountDataLifecycleTestFault } from "@/server/account/account-data-lifecycle-test-faults";

const supabaseUrl = envString("SUPABASE_URL")?.replace(/\/$/, "").trim();
const supabaseServiceRoleKey = envString("SUPABASE_SERVICE_ROLE_KEY")?.trim();

// Only these reviewed, literal Postgres procedure outcomes may cross the DB
// boundary as internal classifications. Raw upstream text, details, hints,
// credentials, account IDs, and arbitrary provider error codes never may.
const allowedDomainOutcomes = new Set([
  "renderlab_generation_access_denied",
  "renderlab_generation_disabled",
  "renderlab_generation_active_limit_reached",
  "renderlab_generation_rate_limit_reached",
  "renderlab_idempotency_invalid_request",
  "renderlab_idempotency_admission_unavailable",
  "renderlab_idempotency_admission_bind_failed",
  "renderlab_upload_active_limit_reached",
  "renderlab_upload_rate_limit_reached",
  "renderlab_beta_invitations_open_email_idx",
  "renderlab_last_active_admin",
  "renderlab_self_lockout",
  "renderlab_account_not_found",
  "renderlab_admin_required",
  "renderlab_admin_invalid_request",
]);

export type SupabaseBackendErrorCode = "supabase_backend_unavailable";

export class SupabaseRestError extends Error {
  readonly code: SupabaseBackendErrorCode = "supabase_backend_unavailable";
  readonly upstreamStatus: number;
  readonly correlationId: string;
  readonly domainCode: string | null;
  readonly sqlState: string | null;

  constructor(status: number, options: { domainCode?: string | null; sqlState?: string | null } = {}) {
    super("Privileged database request is temporarily unavailable.");
    this.name = "SupabaseRestError";
    this.upstreamStatus = Number.isInteger(status) && status >= 400 && status <= 599 ? status : 502;
    this.correlationId = randomUUID();
    this.domainCode = options.domainCode ?? null;
    this.sqlState = options.sqlState ?? null;
  }
}

// Only returns a vetted classification; callers must never parse Error.message
// to recover details from the privileged PostgREST response.
export function supabaseErrorClassification(error: unknown): string {
  return error instanceof SupabaseRestError ? error.domainCode ?? error.sqlState ?? "" : "";
}

function classifyUpstreamError(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return {};
  const response = body as Record<string, unknown>;
  const sqlState = typeof response.code === "string" && /^[A-Z0-9]{5}$/.test(response.code)
    ? response.code
    : null;
  const safeMessages = [response.message, response.details, response.hint]
    .filter((item): item is string => typeof item === "string")
    .join(" ");
  const domainCode = Array.from(allowedDomainOutcomes).find((code) => safeMessages.includes(code)) ?? null;
  return { sqlState, domainCode };
}

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

export async function supabaseRest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  if (path === "rpc/renderlab_finalize_account_product_deletion") {
    injectAccountDataLifecycleTestFault("database-finalize");
  }

  const headers = new Headers(init.headers);
  headers.set("apikey", supabaseServiceRoleKey!);
  headers.set("authorization", "Bearer " + supabaseServiceRoleKey);
  if (init.body != null && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(supabaseUrl + "/rest/v1/" + path, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    // A value is read only to whitelist domain classifications, never attached
    // to the exception, sent to a route, stored, logged, or forwarded.
    const body: unknown = await response.json().catch(() => null);
    const classified = classifyUpstreamError(body);
    // Only a literal PostgREST schema-cache "function not found" classification
    // can declare 0034 unavailable. Generic 404s are not safe fallback evidence.
    const missingRpc = path === "rpc/renderlab_accept_generation_dispatch_idempotent"
      && response.status === 404 && body && typeof body === "object"
      && !Array.isArray(body) && (body as Record<string, unknown>).code === "PGRST202";
    throw new SupabaseRestError(response.status, {
      ...classified, ...(missingRpc ? { sqlState: "PGRST202" } : {}),
    });
  }

  if (response.status === 204) return null as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}
