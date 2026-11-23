import "server-only";

import { supabaseRest } from "@/server/data/supabase-rest";
import {
  generationOperatorSampleLimit,
  generationOperatorLookbackMinutes,
  summarizeGenerationDispatchLatency,
  summarizeGenerationTerminalHeld,
  type DispatchTimingSample,
  type TerminalHeldJob,
  type UnreleasedBoundReservation,
} from "@/server/observability/generation-operator-summary";

const boundUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Operator-only, bounded reads. Failure never turns a working Health page into 503. */
export async function readGenerationOperatorMetrics(nowMs: number, testOwnerId?: string) {
  try {
    const limit = String(generationOperatorSampleLimit + 1);
    const dispatchParams = new URLSearchParams({
      status: "eq.dispatched",
      dispatched_at: `gte.${new Date(nowMs - generationOperatorLookbackMinutes * 60000).toISOString()}`,
      select: "created_at,dispatched_at",
      order: "dispatched_at.desc",
      limit,
    });
    const reservationParams = new URLSearchParams({
      released_at: "is.null",
      job_id: "not.is.null",
      select: "job_id,expires_at",
      order: "expires_at.desc",
      limit,
    });
    if (testOwnerId) {
      dispatchParams.set("owner_id", `eq.${testOwnerId}`);
      reservationParams.set("owner_id", `eq.${testOwnerId}`);
    }
    const [dispatchRaw, reservationRaw] = await Promise.all([
      supabaseRest<DispatchTimingSample[]>(`generation_dispatch_outbox?${dispatchParams}`),
      supabaseRest<UnreleasedBoundReservation[]>(`generation_admission_reservations?${reservationParams}`),
    ]);
    const dispatchRows = dispatchRaw.slice(0, generationOperatorSampleLimit);
    const reservationRows = reservationRaw.slice(0, generationOperatorSampleLimit);
    // All IDs are internal to this one private aggregate query. Only counts
    // and durations reach Admin Health JSON; no identities become labels.
    const ids = reservationRows.map((r) => r.job_id).filter((id) => boundUuid.test(id));
    const jobs = ids.length ? await supabaseRest<TerminalHeldJob[]>(
      `generation_jobs?${new URLSearchParams({
        id: `in.(${ids.join(",")})`,
        status: "in.(succeeded,failed,cancelled)",
        select: "id,status,completed_at",
        limit: String(generationOperatorSampleLimit),
      })}`,
    ) : [];
    return {
      available: true as const,
      dispatchLatency: summarizeGenerationDispatchLatency(dispatchRows, dispatchRaw.length > generationOperatorSampleLimit, nowMs),
      terminalHeld: summarizeGenerationTerminalHeld(
        reservationRows, jobs, reservationRaw.length > generationOperatorSampleLimit, nowMs,
      ),
    };
  } catch {
    // This read is additional telemetry, never an authorization or health dependency.
    return { available: false as const, dispatchLatency: null, terminalHeld: null };
  }
}
