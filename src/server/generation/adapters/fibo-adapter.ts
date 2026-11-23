/** Transitional FIBO facade. Unwired: these legacy functions already own durable DB
 * dispatch, poll settlement and cancellation. Never chain this facade into live
 * dispatch until provider-only transport has been extracted and reviewed. */
import type { GenerationJob, GenerationRequest } from "../../../lib/capabilities/generation.ts";
import type { MediaOperation, OperationCapability, OperationValidation } from "./media-operation.ts";
import { validateOperationAgainstCapability } from "./media-operation.ts";
import type { ProviderAdapter, ProviderCallContext, ProviderHandle } from "./provider-adapter.ts";
import { normalizeAdapterError, outputProvenance, validationError } from "./provider-adapter.ts";

export type FiboLegacyBindings = {
  isAvailable: () => boolean;
  isMaskAvailable: () => boolean;
  submitNativeGeneration: (
    ownerId: string, request: GenerationRequest,
  ) => Promise<{ ok: true; job: GenerationJob } | { ok: false; error: { code: string; message: string } }>;
  pollNativeGeneration: (ownerId: string, jobId: string) => Promise<GenerationJob | null>;
  requestGenerationCancellation: (
    ownerId: string, jobId: string,
  ) => Promise<{ ok: true; job: GenerationJob } | { ok: false; error: { code: string; message: string } }>;
};

const fiboCapabilities: readonly OperationCapability[] = [
  {
    operation: "text-to-image", inputRequirements: [], maxInputs: 0,
    outputKinds: ["image"], mask: "forbidden", cancellation: true,
  },
  {
    operation: "image-edit",
    inputRequirements: [
      { role: "primary-image", mediaKind: "image", min: 1, max: 1 },
      { role: "reference", mediaKind: "image", min: 0, max: 1 },
    ],
    maxInputs: 2, outputKinds: ["image"], mask: "optional", cancellation: true,
  },
];

type FiboOperation = Extract<MediaOperation, { kind: "text-to-image" | "image-edit" }>;

function fiboRequest(operation: FiboOperation): GenerationRequest {
  const inputs: GenerationRequest["inputs"] = operation.inputs.map((input, index) => ({
    alias: `image${index + 1}` as `image${number}`,
    role: input.role === "reference" ? "reference" : "primary-image",
    source: input.source,
  }));
  return {
    model: "fibo2-edit-turbo",
    prompt: operation.parameters.prompt,
    output: { kind: "image", aspectRatio: operation.parameters.aspectRatio ?? "1:1" },
    inputs,
    ...(operation.parameters.seed !== undefined ? { advanced: { seed: operation.parameters.seed } } : {}),
    ...(operation.kind === "image-edit" && operation.mask
      ? { mask: { type: "temporary-source" as const, id: operation.mask.id } } : {}),
  };
}

export function createFiboAdapter(bindings: FiboLegacyBindings): ProviderAdapter {
  const validate = (operation: MediaOperation): OperationValidation => {
    const capability = fiboCapabilities.find((item) => item.operation === operation.kind);
    const basic = validateOperationAgainstCapability(operation, capability);
    if (!basic.ok) return basic;
    if (operation.kind === "image-edit") {
      if (operation.inputs[0]?.role !== "primary-image"
        || (operation.inputs[1] && operation.inputs[1].role !== "reference")) {
        return { ok: false, code: "invalid_request", message: "FIBO requires the primary image first." };
      }
      if (operation.mask && (operation.mask.type !== "temporary-source" || operation.inputs.length !== 1)) {
        return { ok: false, code: "invalid_request", message: "FIBO masks require one primary image and a temporary mask." };
      }
      if (operation.mask && !bindings.isMaskAvailable()) {
        return { ok: false, code: "generation_disabled", message: "FIBO masked editing is not enabled." };
      }
    }
    return { ok: true };
  };
  const id = "fibo";
  const handleValid = (handle: ProviderHandle) =>
    handle.providerId === id && typeof handle.callId === "string" && handle.callId.length > 0;

  return {
    id,
    capabilities: () => fiboCapabilities,
    availability: () => bindings.isAvailable()
      ? { enabled: true, reason: "enabled" } : { enabled: false, reason: "unconfigured" },
    validate,
    hints: () => ({ timeoutMs: 120_000 }), // Advisory only. Does not change legacy provider timeout policy.
    mapError: normalizeAdapterError,
    async submit(context: ProviderCallContext, operation: MediaOperation) {
      const result = validate(operation);
      if (!result.ok) return { kind: "rejected" as const, error: validationError(result) };
      if (!bindings.isAvailable()) {
        return { kind: "rejected" as const, error: normalizeAdapterError({ code: "generation_backend_unavailable" }) };
      }
      try {
        const response = await bindings.submitNativeGeneration(context.ownerId, fiboRequest(operation as FiboOperation));
        if (!response.ok) {
          return { kind: "rejected" as const, error: normalizeAdapterError({ code: response.error.code }) };
        }
        // callId is a *legacy RenderLab job ID*, NOT an independent Modal call ID.
        // This facade must not be plugged into the existing outbox.
        return { kind: "accepted" as const, handle: { providerId: id, callId: response.job.id } };
      } catch (error) {
        return { kind: "rejected" as const, error: normalizeAdapterError(error) };
      }
    },
    async poll(context: ProviderCallContext, handle: ProviderHandle, operation: MediaOperation) {
      if (!handleValid(handle)) {
        return { kind: "failed" as const, error: normalizeAdapterError({ code: "invalid_request" }) };
      }
      if (!validate(operation).ok) {
        return { kind: "failed" as const, error: normalizeAdapterError({ code: "invalid_request" }) };
      }
      try {
        const job = await bindings.pollNativeGeneration(context.ownerId, handle.callId);
        if (!job) return { kind: "failed" as const, error: normalizeAdapterError({ code: "job_not_found" }) };
        if (job.status === "cancelled") return { kind: "cancelled" as const };
        if (job.status === "failed") {
          return { kind: "failed" as const, error: normalizeAdapterError({ code: job.error?.code ?? "generation_failed" }) };
        }
        if (job.status !== "succeeded") return { kind: "pending" as const };
        if (job.outputAssetIds.length === 0) {
          return { kind: "failed" as const, error: normalizeAdapterError({ code: "generation_failed" }) };
        }
        return { kind: "ready" as const, outputs: job.outputAssetIds.map((assetId, index) => ({
          kind: "image" as const,
          mimeType: "image/png",
          outputIndex: index,
          assetId,
          provenance: outputProvenance(context, operation,
            { id, model: "bria-fibo-2.0-turbo", version: "2.0-turbo" },
            handle, { kind: "image", mimeType: "image/png", index }),
        })) };
      } catch (error) {
        return { kind: "failed" as const, error: normalizeAdapterError(error) };
      }
    },
    async cancel(context: ProviderCallContext, handle: ProviderHandle) {
      if (!handleValid(handle)) {
        return { kind: "retryable" as const, error: normalizeAdapterError({ code: "invalid_request" }) };
      }
      try {
        const result = await bindings.requestGenerationCancellation(context.ownerId, handle.callId);
        if (!result.ok) return {
          kind: result.error.code === "cancel_not_available" ? "not-running" as const : "retryable" as const,
          ...(result.error.code === "cancel_not_available"
            ? {} : { error: normalizeAdapterError({ code: result.error.code }) }),
        } as { kind: "not-running" } | { kind: "retryable"; error: ReturnType<typeof normalizeAdapterError> };
        return { kind: "confirmed" as const };
      } catch (error) {
        return { kind: "retryable" as const, error: normalizeAdapterError(error) };
      }
    },
  };
}

/** Optional explicit factory; not called by any existing production entry point. */
export async function createBoundFiboAdapter(): Promise<ProviderAdapter> {
  const [native, cancellation, submission] = await Promise.all([
    import("../native-generation.ts"),
    import("../cancel-generation.ts"),
    import("../submit-generation.ts"),
  ]);
  return createFiboAdapter({
    isAvailable: submission.isFiboGenerationAvailable,
    isMaskAvailable: submission.isFiboMaskGenerationAvailable,
    submitNativeGeneration: native.submitNativeGeneration,
    pollNativeGeneration: native.pollNativeGeneration,
    requestGenerationCancellation: cancellation.requestGenerationCancellation,
  });
}

/** Provider-only port; unlike the legacy facade above, these calls never own jobs. */
export { fiboProvider } from "./fibo-provider-port.ts";
