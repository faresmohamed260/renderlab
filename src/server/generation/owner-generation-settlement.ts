import "server-only";

import { after } from "next/server";
import { listActiveBoundGenerationJobIds } from "@/server/generation/generation-admission";
import { findOwnerSettlementCandidate, reconcileNativeGeneration } from "@/server/generation/reconcile-generation";

type SettlementSource = "create" | "library" | "activity" | "submit";

const deadlines = { lookupMs: 1_500, providerMs: 4_000 };
const responseWaitMs = 6_000;

function warn(source: SettlementSource, code: string) {
  console.warn(`[renderlab] ${JSON.stringify({
    event: "generation.owner-settlement",
    level: "warn",
    source,
    code,
  })}`);
}

async function settleOwnerGeneration(ownerId: string, source: SettlementSource): Promise<boolean> {
  try {
    const jobIds = source === "submit"
      ? await listActiveBoundGenerationJobIds(ownerId, AbortSignal.timeout(deadlines.lookupMs))
      : undefined;
    if (jobIds?.length === 0) return false;

    const jobId = await findOwnerSettlementCandidate(ownerId, {
      signal: AbortSignal.timeout(deadlines.lookupMs),
      jobIds,
      includeActivityRecovery: source === "activity",
    });
    if (!jobId) return false;

    const job = await reconcileNativeGeneration(ownerId, jobId, deadlines);
    return job?.status === "succeeded" || job?.status === "failed" || job?.status === "cancelled";
  } catch (error) {
    warn(source, error instanceof Error && error.name === "TimeoutError" ? "lookup_or_provider_timeout" : "settlement_failed");
    return false;
  }
}

function continueAfterResponse(source: SettlementSource, work: () => Promise<boolean>) {
  try {
    after(async () => { await work(); });
  } catch {
    warn(source, "after_registration_failed");
  }
}

export function scheduleOwnerGenerationSettlement(ownerId: string) {
  continueAfterResponse("create", () => settleOwnerGeneration(ownerId, "create"));
}

export async function settleOwnerGenerationWithinResponse(
  ownerId: string,
  source: Exclude<SettlementSource, "create">,
): Promise<boolean> {
  const settlement = settleOwnerGeneration(ownerId, source);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      settlement,
      new Promise<null>((resolve) => { timer = setTimeout(resolve, responseWaitMs, null); }),
    ]);
    if (result !== null) return result;

    warn(source, "response_wait_expired");
    // Keep the same work alive so a write in progress can complete under the claim.
    continueAfterResponse(source, () => settlement);
    return false;
  } finally {
    clearTimeout(timer);
  }
}
