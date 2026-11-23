/**
 * P0-04: pure, observational policy model of the generation_job lifecycle.
 *
 * This transition table remains a pure policy model; it is not globally
 * enforced by SQL. P0-06 status-conditional job updates now use the shared
 * terminal-status predicate and a database status compare-and-swap.
 * See docs/architecture/P0_04_GENERATION_STATE_MACHINE_SPEC.md.
 */
import type { GenerationJobStatus } from "./generation";

export const generationJobStatuses = [
  "queued", "preparing", "running", "cancelling",
  "persisting", "succeeded", "failed", "cancelled",
] as const satisfies readonly GenerationJobStatus[];

export const generationTerminalStatuses = [
  "succeeded", "failed", "cancelled",
] as const satisfies readonly GenerationJobStatus[];

export const generationActiveStatuses = [
  "queued", "preparing", "running", "cancelling", "persisting",
] as const satisfies readonly GenerationJobStatus[];

/**
 * Admissible distinct-state edges. A transition with the same status is an
 * idempotent observation, not an additional write or a second finalization.
 *
 * 'queued -> persisting' covers an accepted provider result whose outbox
 * 'dispatched' update left the job queued while dispatch was unconfirmed.
 * 'preparing' is retained legacy-compatible state, not a new FIBO entry path.
 */
export const generationJobTransitions = {
  queued: ["running", "cancelling", "cancelled", "persisting", "failed"],
  preparing: ["running", "cancelling", "persisting", "failed"],
  running: ["cancelling", "persisting", "failed"],
  cancelling: ["cancelled"],
  persisting: ["succeeded", "failed"],
  succeeded: [],
  failed: [],
  cancelled: [],
} as const satisfies Record<GenerationJobStatus, readonly GenerationJobStatus[]>;

export type JobTransitionDecision = "allowed" | "idempotent" | "forbidden";

export function isGenerationTerminalStatus(status: GenerationJobStatus): boolean {
  return (generationTerminalStatuses as readonly string[]).includes(status);
}

export function evaluateJobTransition(
  from: GenerationJobStatus,
  to: GenerationJobStatus,
): JobTransitionDecision {
  if (from === to) return "idempotent";
  return (generationJobTransitions[from] as readonly string[]).includes(to)
    ? "allowed"
    : "forbidden";
}

/**
 * Pure test snapshot: separate physical status transition, output persistence
 * and admission release. The production flow does not always commit these in
 * a single transaction; the model exposes (rather than hides) that window.
 */
export type JobLifecycleSnapshot = Readonly<{
  status: GenerationJobStatus;
  reservation: "held" | "released" | "none";
  reservationReleaseCount: number;
  persistedAssetId: string | null;
  persistedOutputWrites: number;
  errorCode: string | null;
}>;

export type JobLifecycleResult = Readonly<{
  decision: "accepted" | "idempotent" | "forbidden";
  next: JobLifecycleSnapshot;
  reason: string;
}>;

export function initialGenerationLifecycle(
  reservation: "held" | "released" | "none" = "held",
): JobLifecycleSnapshot {
  return {
    status: "queued",
    reservation,
    reservationReleaseCount: reservation === "released" ? 1 : 0,
    persistedAssetId: null,
    persistedOutputWrites: 0,
    errorCode: null,
  };
}

export function changeJobStatus(
  snapshot: JobLifecycleSnapshot,
  nextStatus: GenerationJobStatus,
  errorCode: string | null = null,
): JobLifecycleResult {
  const decision = evaluateJobTransition(snapshot.status, nextStatus);
  if (decision === "forbidden") {
    return { decision, next: snapshot, reason: "illegal-status-edge" };
  }
  if (decision === "idempotent") {
    return { decision, next: snapshot, reason: "status-already-observed" };
  }
  if (nextStatus === "succeeded" && !snapshot.persistedAssetId) {
    return { decision: "forbidden", next: snapshot, reason: "success-requires-durable-asset" };
  }
  return {
    decision: "accepted",
    next: { ...snapshot, status: nextStatus, errorCode: nextStatus === "failed" ? errorCode : null },
    reason: "state-transition-accepted",
  };
}

export function recordPersistedOutput(
  snapshot: JobLifecycleSnapshot,
  assetId: string,
): JobLifecycleResult {
  if (snapshot.status !== "persisting" || !assetId.trim()) {
    return { decision: "forbidden", next: snapshot, reason: "output-requires-persisting" };
  }
  if (snapshot.persistedAssetId !== null) {
    return snapshot.persistedAssetId === assetId
      ? { decision: "idempotent", next: snapshot, reason: "existing-generation-output-index" }
      : { decision: "forbidden", next: snapshot, reason: "conflicting-output-index" };
  }
  return {
    decision: "accepted",
    next: { ...snapshot, persistedAssetId: assetId, persistedOutputWrites: 1 },
    reason: "durable-output-created",
  };
}

/** SQL release RPC uses owner+reservation with released_at IS NULL. */
export function releaseGenerationReservation(snapshot: JobLifecycleSnapshot): JobLifecycleResult {
  if (snapshot.reservation !== "held") {
    return { decision: "idempotent", next: snapshot, reason: "reservation-already-settled" };
  }
  return {
    decision: "accepted",
    next: { ...snapshot, reservation: "released", reservationReleaseCount: snapshot.reservationReleaseCount + 1 },
    reason: "reservation-release-accepted",
  };
}

/**
 * Read/reconcile-on-owner-return is allowed to settle an existing terminal job
 * more than once; only the first successful release changes the projection.
 */
export function settleTerminalOnOwnerReturn(snapshot: JobLifecycleSnapshot): JobLifecycleResult {
  if (!isGenerationTerminalStatus(snapshot.status)) {
    return { decision: "idempotent", next: snapshot, reason: "owner-return-active-job" };
  }
  return releaseGenerationReservation(snapshot);
}

export type GenerationProviderObservation =
  | { kind: "pending" }
  | { kind: "ready" }
  | { kind: "terminal-failure"; code: string }
  | { kind: "process-exited" }
  | { kind: "ambiguous"; ageMs: number }
  | { kind: "stale-undispatched"; ageMs: number };

/** Mirrors the observed process-exit, ambiguous-stale and missing-dispatch policies. */
export function projectProviderObservation(
  snapshot: JobLifecycleSnapshot,
  observation: GenerationProviderObservation,
): JobLifecycleResult {
  if (isGenerationTerminalStatus(snapshot.status)) {
    return { decision: "idempotent", next: snapshot, reason: "terminal-replay-ignored" };
  }
  switch (observation.kind) {
    case "pending":
      return { decision: "idempotent", next: snapshot, reason: "provider-pending" };
    case "ready":
      return changeJobStatus(snapshot, "persisting");
    case "terminal-failure":
      return changeJobStatus(snapshot, "failed", observation.code);
    case "process-exited":
      return changeJobStatus(snapshot, "failed", "generation_failed");
    case "ambiguous":
      return observation.ageMs >= 2 * 60 * 60 * 1000
        ? changeJobStatus(snapshot, "failed", "generation_provider_stalled")
        : { decision: "idempotent", next: snapshot, reason: "provider-outcome-unconfirmed" };
    case "stale-undispatched":
      return observation.ageMs >= 15 * 60 * 1000 && snapshot.status !== "cancelling"
        ? changeJobStatus(snapshot, "failed", "generation_orchestration_stalled")
        : { decision: "idempotent", next: snapshot, reason: "missing-dispatch-grace" };
  }
}

/** Owner-facing retry creates a *new* job; the terminal original is immutable. */
export function requestRetryOfExistingJob(snapshot: JobLifecycleSnapshot): JobLifecycleResult {
  return {
    decision: "forbidden",
    next: snapshot,
    reason: isGenerationTerminalStatus(snapshot.status)
      ? "terminal-retry-requires-new-job"
      : "retry-not-a-status-transition",
  };
}

export type JobInvariant = "terminal-reservation-held" | "output-without-persisting-or-success"
  | "multiple-output-writes" | "multiple-reservation-releases" | "success-without-output"
  | "cancelled-with-output";

export function inspectJobLifecycle(snapshot: JobLifecycleSnapshot): JobInvariant[] {
  const issues: JobInvariant[] = [];
  // This *can* arise transiently in production, until idempotent settlement;
  // it is intentionally a visible invariant violation for tests/operations.
  if (isGenerationTerminalStatus(snapshot.status) && snapshot.reservation === "held")
    issues.push("terminal-reservation-held");
  if (snapshot.persistedOutputWrites > 1) issues.push("multiple-output-writes");
  if (snapshot.reservationReleaseCount > 1) issues.push("multiple-reservation-releases");
  if (snapshot.status === "succeeded" && !snapshot.persistedAssetId) issues.push("success-without-output");
  if (snapshot.status === "cancelled" && snapshot.persistedAssetId) issues.push("cancelled-with-output");
  if (snapshot.persistedAssetId && !["persisting", "succeeded"].includes(snapshot.status))
    issues.push("output-without-persisting-or-success");
  return issues;
}
