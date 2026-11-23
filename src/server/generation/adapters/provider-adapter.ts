import { createHash } from "node:crypto";
import type { SubmitGenerationErrorCode } from "../../../lib/api/generation-contract.ts";
import type {
  MediaInput, MediaKind, MediaOperation, MediaOperationKind, OperationCapability, OperationValidation,
  MediaSource,
} from "./media-operation.ts";

export type AdapterErrorCode = SubmitGenerationErrorCode
  | "generation_failed" | "generation_provider_stalled" | "generation_orchestration_stalled"
  | "cancel_not_available" | "job_not_found";
export type AdapterError = { code: AdapterErrorCode; message: string; retryable: boolean };
export type ProviderAvailability = {
  enabled: boolean;
  reason: "enabled" | "disabled" | "unconfigured" | "unavailable";
};
export type ProviderCallContext = {
  /** Created after owner authorization; not accepted from the caller as authority. */
  ownerId: string;
  jobId: string;
  attemptId: string;
  deadlineAtMs: number;
  /** Injected clock; no wall-clock dependency in conformance tests. */
  now: () => number;
};
export type ProviderHandle = { providerId: string; callId: string };
export type OutputProvenance = {
  providerId: string;
  modelId: string;
  modelVersion: string;
  operation: MediaOperationKind;
  jobId: string;
  attemptId: string;
  callId: string;
  sources: readonly MediaInput[];
  mask?: MediaSource;
  parameterDigest: string;
  outputIndex: number;
  mediaKind: MediaKind;
  mimeType: string;
  completedAtMs: number;
};
export type MediaOutput = {
  kind: MediaKind;
  mimeType: string;
  outputIndex: number;
  /** Legacy FIBO facade points at an already indexed asset; future adapters return provider bytes. */
  assetId?: string;
  provenance: OutputProvenance;
};
export type SubmitOutcome =
  | { kind: "accepted"; handle: ProviderHandle }
  | { kind: "unconfirmed"; error: AdapterError }
  | { kind: "rejected"; error: AdapterError };
export type PollOutcome =
  | { kind: "pending" }
  | { kind: "ready"; outputs: readonly MediaOutput[] }
  | { kind: "failed"; error: AdapterError }
  | { kind: "cancelled" };
export type CancelOutcome =
  | { kind: "confirmed" }
  | { kind: "not-running" }
  | { kind: "retryable"; error: AdapterError };
export type OperationalHints = {
  timeoutMs: number;
  /** No fabricated USD quote: optional only after a separate cost model is approved. */
  costHint?: { unit: string; estimatedUnits: number };
};

export interface ProviderAdapter {
  readonly id: string;
  capabilities(): readonly OperationCapability[];
  availability(): ProviderAvailability;
  validate(operation: MediaOperation): OperationValidation;
  hints(operation: MediaOperation): OperationalHints;
  submit(context: ProviderCallContext, operation: MediaOperation): Promise<SubmitOutcome>;
  poll(context: ProviderCallContext, handle: ProviderHandle, operation: MediaOperation): Promise<PollOutcome>;
  cancel(context: ProviderCallContext, handle: ProviderHandle): Promise<CancelOutcome>;
  mapError(error: unknown): AdapterError;
}

const errorMessages: Record<AdapterErrorCode, { message: string; retryable: boolean }> = {
  invalid_request: { message: "The media operation is invalid.", retryable: false },
  generation_access_denied: { message: "Generation access is denied.", retryable: false },
  generation_disabled: { message: "This generation operation is disabled.", retryable: false },
  generation_active_limit_reached: { message: "The active generation limit has been reached.", retryable: false },
  generation_rate_limit_reached: { message: "The generation rate limit has been reached.", retryable: true },
  generation_backend_unavailable: { message: "The generation provider is unavailable.", retryable: true },
  generation_submission_failed: { message: "The provider rejected the generation.", retryable: false },
  generation_failed: { message: "The generation failed.", retryable: false },
  generation_provider_stalled: { message: "The generation provider did not confirm a result.", retryable: true },
  generation_orchestration_stalled: { message: "The generation dispatch did not complete.", retryable: true },
  cancel_not_available: { message: "The generation cannot be cancelled.", retryable: false },
  job_not_found: { message: "The generation job was not found.", retryable: false },
};
const safeProviderCodes: readonly AdapterErrorCode[] = [
  "invalid_request", "generation_disabled", "generation_backend_unavailable",
  "generation_submission_failed", "generation_failed", "generation_provider_stalled",
  "generation_orchestration_stalled", "cancel_not_available", "job_not_found",
];

/** Provider errors never grant/deny owner access or expose arbitrary gateway messages. */
export function normalizeAdapterError(error: unknown): AdapterError {
  const value = typeof error === "object" && error !== null
    ? error as { code?: unknown; name?: unknown; status?: unknown; detail?: unknown }
    : {};
  let code: AdapterErrorCode = "generation_submission_failed";
  if (value.detail === "FIBO_PROCESS_EXITED") code = "generation_failed";
  else if (typeof value.code === "string" && safeProviderCodes.includes(value.code as AdapterErrorCode)) {
    code = value.code as AdapterErrorCode;
  } else if (value.name === "AbortError" || value.name === "TimeoutError" || value.status === 503) {
    code = "generation_backend_unavailable";
  }
  return { code, ...errorMessages[code] };
}

export function validationError(validation: Exclude<OperationValidation, { ok: true }>): AdapterError {
  return normalizeAdapterError({ code: validation.code });
}

export function outputProvenance(
  context: ProviderCallContext,
  operation: MediaOperation,
  provider: { id: string; model: string; version: string },
  handle: ProviderHandle,
  output: { kind: MediaKind; mimeType: string; index: number },
): OutputProvenance {
  const parameterDigest = createHash("sha256").update(JSON.stringify(operation.parameters)).digest("hex");
  return {
    providerId: provider.id,
    modelId: provider.model,
    modelVersion: provider.version,
    operation: operation.kind,
    jobId: context.jobId,
    attemptId: context.attemptId,
    callId: handle.callId,
    sources: operation.inputs.map((input) => ({
      role: input.role, mediaKind: input.mediaKind, source: { ...input.source },
    })),
    ...(operation.kind === "image-edit" && operation.mask ? { mask: { ...operation.mask } } : {}),
    parameterDigest,
    outputIndex: output.index,
    mediaKind: output.kind,
    mimeType: output.mimeType,
    completedAtMs: context.now(),
  };
}

export type AdapterSelection =
  | { ok: true; adapter: ProviderAdapter }
  | { ok: false; reason: "unsupported" | "disabled" | "invalid_input"; error: AdapterError };

/** Unwired explicit policy allowlist: registration alone never enables an adapter. */
export function createAdapterRegistry(adapters: readonly ProviderAdapter[], enabledIds: readonly string[] = []) {
  const byId = new Map<string, ProviderAdapter>();
  for (const adapter of adapters) {
    if (!adapter.id || byId.has(adapter.id)) throw new Error("Provider IDs must be nonempty and unique.");
    byId.set(adapter.id, adapter);
  }
  const enabled = new Set(enabledIds);
  return {
    describe(): readonly { providerId: string; operation: MediaOperationKind; enabled: boolean }[] {
      return [...byId.values()].flatMap((adapter) => adapter.capabilities().map((capability) => ({
        providerId: adapter.id,
        operation: capability.operation,
        enabled: enabled.has(adapter.id) && adapter.availability().enabled,
      })));
    },
    select(providerId: string, operation: MediaOperation): AdapterSelection {
      const adapter = byId.get(providerId);
      if (!adapter || !adapter.capabilities().some((capability) => capability.operation === operation.kind)) {
        return { ok: false, reason: "unsupported", error: normalizeAdapterError({ code: "generation_disabled" }) };
      }
      if (!enabled.has(providerId) || !adapter.availability().enabled) {
        return { ok: false, reason: "disabled", error: normalizeAdapterError({ code: "generation_disabled" }) };
      }
      const validation = adapter.validate(operation);
      if (!validation.ok) {
        return { ok: false, reason: "invalid_input", error: validationError(validation) };
      }
      return { ok: true, adapter };
    },
  };
}
