import "server-only";
import { SupabaseRestError, supabaseRest } from "@/server/data/supabase-rest";

/** The additive RPC is deployed separately; older hosted schemas lack it. */
export type AtomicTerminalStatus = "succeeded" | "failed" | "cancelled";
export type AtomicTerminalizeResult = {
  outcome: "applied" | "already_terminal" | "conflict" | "not_found";
  job_status: string | null;
  output_asset_ids: string[] | null;
  reservation_released: boolean;
};

export type AtomicTerminalizeInput = {
  ownerId: string;
  jobId: string;
  expectedStatus: string;
  terminalStatus: AtomicTerminalStatus;
  assetId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  reconcileToken?: string | null;
  failoverHistory?: Array<Record<string, unknown>> | null;
};

const knownOutcomes = new Set(["applied", "already_terminal", "conflict", "not_found"]);

/**
 * null means the endpoint has not been installed on the hosted project yet.
 * Fail closed on everything else. Missing PostgREST RPC yields HTTP 404 with
 * PGRST202, intentionally sanitized by the shared privileged REST boundary.
 * The fallback is restricted to this literal known RPC and is never used for
 * a transaction error, timeout, unauthorized response, or unknown SQL failure.
 */
export async function tryAtomicTerminalizeGeneration(
  input: AtomicTerminalizeInput,
): Promise<AtomicTerminalizeResult | null> {
  let rows: AtomicTerminalizeResult[];
  try {
    rows = await supabaseRest<AtomicTerminalizeResult[]>("rpc/renderlab_terminalize_generation_and_release", {
      method: "POST",
      body: JSON.stringify({
        p_owner_id: input.ownerId,
        p_job_id: input.jobId,
        p_expected_status: input.expectedStatus,
        p_terminal_status: input.terminalStatus,
        p_asset_id: input.assetId ?? null,
        p_error_code: input.errorCode ?? null,
        p_error_message: input.errorMessage ?? null,
        p_reconcile_token: input.reconcileToken ?? null,
        p_failover_history: input.failoverHistory ?? null,
      }),
    });
  } catch (error) {
    if (error instanceof SupabaseRestError && (
      error.sqlState === "42883"
      || (error.upstreamStatus === 404 && error.sqlState === null && error.domainCode === null)
    )) {
      return null;
    }
    throw error;
  }

  const value = rows?.[0];
  if (!value || !knownOutcomes.has(value.outcome)
    || typeof value.reservation_released !== "boolean"
    || (value.job_status !== null && typeof value.job_status !== "string")
    || (value.output_asset_ids !== null && !Array.isArray(value.output_asset_ids))) {
    throw new Error("Atomic terminalization response has an invalid schema.");
  }
  return value;
}
