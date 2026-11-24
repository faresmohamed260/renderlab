import "server-only";
import { fiboAdmissionDeadlineMs } from "@/server/generation/fibo-admission-deadline";

import { createHash, randomUUID } from "node:crypto";
import type { GenerationRequest } from "@/lib/capabilities/generation";
import { generationModelForRequest, resolveCreativeOperation } from "@/lib/capabilities/generation";
import { persistFiboMaskInputs } from "@/lib/capabilities/fibo-mask";
import { SupabaseRestError, supabaseErrorClassification, supabaseRest } from "@/server/data/supabase-rest";
import { getJobRow } from "@/server/generation/native-generation-job-store";
import { toGenerationJob } from "@/server/generation/native-generation-job-projection";
import type { GenerationJob } from "@/lib/capabilities/generation";
import type { WorkflowConfig } from "@/server/generation/native-generation-legacy-workflows";

type Outcome = "accepted" | "replayed" | "conflict" | "in_flight" | "not_found";
type IdentityRow = {
  outcome: Outcome;
  job_id: string | null;
  attempt_id: string | null;
  reservation_id: string | null;
  admission_deadline: string | null;
};
export type IdempotentGenerationResult =
  | { ok: true; job: GenerationJob; newAcceptance: boolean }
  | { ok: false; error: { code:
      "generation_idempotency_conflict" | "generation_idempotency_unavailable" |
      "generation_acceptance_unconfirmed" | "generation_access_denied" |
      "generation_disabled" | "generation_active_limit_reached" |
      "generation_rate_limit_reached" | "invalid_request";
    message: string } };

const outcomes = new Set<Outcome>(["accepted", "replayed", "conflict", "in_flight", "not_found"]);
const invalid = () => ({ ok: false as const, error: {
  code: "generation_acceptance_unconfirmed" as const,
  message: "Generation acceptance could not be confirmed. Retry this request using the same Idempotency-Key.",
} });
const invalidRequest = () => ({ ok: false as const, error: {
  code: "invalid_request" as const,
  message: "The generation request was not valid for atomic acceptance.",
} });

function isInvalidAcceptanceRequest(error: unknown) {
  // Only positively identified deterministic input errors, never arbitrary
  // 4xx responses or internal admission/binding invariants.
  return error instanceof SupabaseRestError && error.upstreamStatus === 400
    && (supabaseErrorClassification(error) === "renderlab_idempotency_invalid_request"
      || error.sqlState === "22023" || error.sqlState === "22P02");
}

function isMissingIdentityRpc(error: unknown) {
  return error instanceof SupabaseRestError && error.upstreamStatus === 404
    && error.sqlState === "PGRST202";
}

const unavailable = () => ({ ok: false as const, error: {
  code: "generation_idempotency_unavailable" as const,
  message: "Idempotent generation is not available until its database migration is installed.",
} });
const conflict = () => ({ ok: false as const, error: {
  code: "generation_idempotency_conflict" as const,
  message: "This Idempotency-Key was already used with a different generation request.",
} });

export function generationRequestDigest(request: GenerationRequest) {
  // The runtime parser has normalized all supported fields, trimmed source
  // identities, canonicalized the model and assigned stable alias order.
  // Hash exactly that complete object. Never persist/log source text or keys.
  return createHash("sha256").update(JSON.stringify(request)).digest("hex");
}

function parseIdentity(rows: unknown, allowed: readonly Outcome[]): IdentityRow | null {
  if (!Array.isArray(rows) || rows.length !== 1) return null;
  const item: unknown = rows[0];
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  const row = item as Record<string, unknown>;
  if (!outcomes.has(row.outcome as Outcome) || !allowed.includes(row.outcome as Outcome)) return null;
  const outcome = row.outcome as Outcome;
  const populated = ["accepted", "replayed"].includes(outcome);
  const idKeys = ["job_id", "attempt_id", "reservation_id"] as const;
  if (populated && (!idKeys.every((key) => typeof row[key] === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row[key] as string))
      || typeof row.admission_deadline !== "string" || !Number.isFinite(Date.parse(row.admission_deadline)))) {
    return null;
  }
  if (!populated && (!idKeys.every((key) => row[key] === null) || row.admission_deadline !== null)) {
    return null;
  }
  return row as IdentityRow;
}

async function lookupIdentity(ownerId: string, key: string, digest: string) {
  const rows: unknown = await supabaseRest(
    "rpc/renderlab_lookup_generation_request_acceptance", {
      method: "POST",
      body: JSON.stringify({
        p_owner_id: ownerId, p_request_key: key, p_request_digest: digest,
      }),
    },
  );
  return parseIdentity(rows, ["accepted", "conflict", "in_flight", "not_found"]);
}

async function safeLookup(ownerId: string, key: string, digest: string) {
  try {
    return await lookupIdentity(ownerId, key, digest);
  } catch {
    return null;
  }
}

async function confirmedJob(ownerId: string, identity: IdentityRow, newAcceptance: boolean):
  Promise<IdempotentGenerationResult> {
  if (!identity.job_id) return invalid();
  try {
    const job = await getJobRow(ownerId, identity.job_id);
    if (!job) return invalid();
    return { ok: true, job: toGenerationJob(job), newAcceptance };
  } catch {
    return invalid();
  }
}

/**
 * Check an explicitly supplied key before reading mutable source objects or
 * checking generation availability. Only authoritative not_found permits a
 * fresh acceptance; SQL still serializes concurrent first accepts.
 */
export async function lookupExistingFiboAcceptance(
  ownerId: string, key: string, request: GenerationRequest,
): Promise<IdempotentGenerationResult | null> {
  try {
    const identity = await lookupIdentity(ownerId, key, generationRequestDigest(request));
    if (!identity || identity.outcome === "in_flight") return invalid();
    if (identity.outcome === "not_found") return null;
    if (identity.outcome === "conflict") return conflict();
    return confirmedJob(ownerId, identity, false);
  } catch (error) {
    if (isMissingIdentityRpc(error)) return unavailable();
    if (isInvalidAcceptanceRequest(error)) return invalidRequest();
    return invalid();
  }
}

/** Atomic acceptance for both caller-supplied and per-request server keys. */
export async function acceptIdempotentFiboGeneration(input: {
  ownerId: string;
  key: string;
  request: GenerationRequest;
  workflow: WorkflowConfig;
  payload: Record<string, unknown>;
}): Promise<IdempotentGenerationResult> {
  const { ownerId, key, request, workflow, payload } = input;
  const digest = generationRequestDigest(request);
  const attempt = randomUUID();
  const body = {
    p_request_key: key,
    p_request_digest: digest,
    p_attempt_id: attempt,
    p_owner_id: ownerId,
    p_operation: resolveCreativeOperation(request),
    p_output_kind: request.output.kind,
    p_prompt: request.prompt,
    p_workflow_id: workflow.id,
    p_model: workflow.model,
    p_ecosystem: workflow.ecosystem,
    p_inputs: persistFiboMaskInputs(request.inputs, request.mask),
    p_parameters: {
      model: generationModelForRequest(request), output: request.output, advanced: request.advanced ?? {},
      ...(request.vgl ? { vgl: request.vgl } : {}),
      ...(request.autoVgl ? { autoVgl: true } : {}),
    },
    p_backend_key: "fibo",
    p_model_key: "fibo-2.0-turbo",
    p_model_version: "bria-fibo-2.0-turbo",
    p_payload: payload,
    p_admission_deadline: new Date(Date.now() + fiboAdmissionDeadlineMs).toISOString(),
  };
  let primary: IdentityRow | null;
  try {
    const rows: unknown = await supabaseRest("rpc/renderlab_accept_generation_dispatch_idempotent", {
      method: "POST", body: JSON.stringify(body),
    });
    primary = parseIdentity(rows, ["accepted", "replayed", "conflict"]);
    if (!primary) return invalid();
  } catch (error) {
    // PostgREST's exact PGRST202 is evidence the new function is not deployed.
    // Do NOT use old non-idempotent admission as an implicit fallback.
    if (isMissingIdentityRpc(error)) return unavailable();
    if (isInvalidAcceptanceRequest(error)) return invalidRequest();
    const classification = supabaseErrorClassification(error);
    const named = new Set(["renderlab_generation_access_denied", "renderlab_generation_disabled",
      "renderlab_generation_active_limit_reached", "renderlab_generation_rate_limit_reached"]);
    if (named.has(classification)) {
      const code = classification.replace(/^renderlab_/, "") as
        "generation_access_denied" | "generation_disabled" |
        "generation_active_limit_reached" | "generation_rate_limit_reached";
      return { ok: false, error: { code, message: "Generation admission was not approved." } };
    }

    const recovered = await safeLookup(ownerId, key, digest);
    if (!recovered) return invalid();
    if (recovered.outcome === "conflict") return conflict();
    if (recovered.outcome === "accepted") return confirmedJob(ownerId, recovered, false);
    // in_flight/not_found are never authorization to release a reservation or
    // allocate another attempt in the same request. Client retries same key.
    return invalid();
  }

  if (primary.outcome === "conflict") return conflict();
  return confirmedJob(ownerId, primary, primary.outcome === "accepted");
}
