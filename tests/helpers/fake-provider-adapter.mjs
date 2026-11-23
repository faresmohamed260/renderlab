/** Offline-only second provider used exclusively by conformance tests. */
import { validateOperationAgainstCapability } from "../../src/server/generation/adapters/media-operation.ts";
import { normalizeAdapterError, outputProvenance } from "../../src/server/generation/adapters/provider-adapter.ts";

const capabilities = [{
  operation: "image-to-image-upscale",
  inputRequirements: [{ role: "primary-image", mediaKind: "image", min: 1, max: 1 }],
  outputKinds: ["image"], maxInputs: 1, mask: "forbidden", cancellation: true,
}];

export function createFakeUpscaleAdapter(options = {}) {
  const jobs = new Map();
  const id = "fixture-upscale";
  const enabled = () => options.enabled !== false;
  return {
    id,
    capabilities: () => capabilities,
    availability: () => ({ enabled: enabled(), reason: enabled() ? "enabled" : "disabled" }),
    validate: (operation) => validateOperationAgainstCapability(operation, capabilities.find((x) => x.operation === operation.kind)),
    hints: () => ({ timeoutMs: 10_000 }),
    mapError: normalizeAdapterError,
    async submit(ctx, operation) {
      const validation = this.validate(operation);
      if (!validation.ok) return { kind: "rejected", error: normalizeAdapterError({ code: validation.code }) };
      if (!enabled()) return { kind: "rejected", error: normalizeAdapterError({ code: "generation_disabled" }) };
      const callId = "fixture-" + ctx.attemptId;
      if (!jobs.has(callId)) jobs.set(callId, { startedAt: ctx.now(), state: "running" });
      return { kind: "accepted", handle: { providerId: id, callId } };
    },
    async poll(ctx, handle, operation) {
      if (handle.providerId !== id) return { kind: "failed", error: this.mapError({ code: "invalid_request" }) };
      const job = jobs.get(handle.callId);
      if (!job) return { kind: "failed", error: this.mapError({ code: "job_not_found" }) };
      if (job.state === "cancelled") return { kind: "cancelled" };
      if (ctx.now() - job.startedAt < 1_000) return { kind: "pending" };
      const mimeType = "image/png";
      return { kind: "ready", outputs: [{
        kind: "image", mimeType, outputIndex: 0,
        assetId: "fixture-output-" + ctx.attemptId,
        provenance: outputProvenance(ctx, operation,
          { id, model: "fake-upscale", version: "test-v1" }, handle,
          { kind: "image", mimeType, index: 0 }),
      }] };
    },
    async cancel(_ctx, handle) {
      const job = jobs.get(handle.callId);
      if (handle.providerId !== id || !job) return { kind: "not-running" };
      job.state = "cancelled";
      return { kind: "confirmed" };
    },
  };
}
