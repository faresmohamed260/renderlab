/** Unwired P1 server-only contract. Do not import from production routes. */
export type MediaKind = "image" | "video" | "audio";
export type MediaOperationKind =
  | "text-to-image" | "image-edit"
  | "image-to-image-upscale" | "image-to-image-background-remove"
  | "face-swap" | "text-to-video" | "image-to-video" | "text-to-audio";
export type MediaInputRole = "primary-image" | "reference" | "target-image" | "source-face" | "first-frame";
export type MediaSource = { type: "temporary-source" | "media-asset"; id: string };
export type MediaInput = { role: MediaInputRole; mediaKind: MediaKind; source: MediaSource };
type ImagePrompt = { prompt: string; aspectRatio?: "1:1" | "4:3" | "3:4" | "16:9" | "9:16"; seed?: number };
type BaseOperation<K extends MediaOperationKind, P, O extends MediaKind> = {
  kind: K;
  /** App-issued idempotency identity, never a caller-owned authorization claim. */
  requestId: string;
  inputs: readonly MediaInput[];
  parameters: P;
  output: { kind: O };
};
export type MediaOperation =
  | BaseOperation<"text-to-image", ImagePrompt, "image">
  | (BaseOperation<"image-edit", ImagePrompt, "image"> & { mask?: MediaSource })
  | BaseOperation<"image-to-image-upscale", { scale: 2 | 3 | 4 }, "image">
  | BaseOperation<"image-to-image-background-remove", { format: "png" }, "image">
  | BaseOperation<"face-swap", { mode: "single-face" }, "image">
  | BaseOperation<"text-to-video", { prompt: string; durationSeconds: number; fps: number; audioEnabled?: boolean }, "video">
  | BaseOperation<"image-to-video", { prompt: string; durationSeconds: number; fps: number; audioEnabled?: boolean }, "video">
  | BaseOperation<"text-to-audio", { text: string; durationSeconds?: number }, "audio">;

export type InputRequirement = {
  role: MediaInputRole;
  mediaKind: MediaKind;
  min: number;
  max: number;
};
export type OperationCapability = {
  operation: MediaOperationKind;
  inputRequirements: readonly InputRequirement[];
  outputKinds: readonly MediaKind[];
  maxInputs: number;
  mask: "forbidden" | "optional";
  cancellation: boolean;
};
export type OperationValidation = { ok: true } | {
  ok: false;
  code: "invalid_request" | "generation_disabled";
  message: string;
};
const invalid = (message: string): OperationValidation => ({ ok: false, code: "invalid_request", message });

function validSource(source: MediaSource | undefined): boolean {
  return Boolean(source && (source.type === "temporary-source" || source.type === "media-asset")
    && typeof source.id === "string" && source.id.trim().length > 0);
}

/** Pure operation/capability conformance; does not make a capability available. */
export function validateOperationAgainstCapability(
  operation: MediaOperation,
  capability: OperationCapability | undefined,
): OperationValidation {
  if (!capability || operation.kind !== capability.operation) {
    return { ok: false, code: "generation_disabled", message: "This operation is not supported by this provider." };
  }
  if (typeof operation.requestId !== "string" || !operation.requestId.trim()) {
    return invalid("An application request identity is required.");
  }
  if (!capability.outputKinds.includes(operation.output?.kind)) {
    return invalid("The requested output media kind is not supported.");
  }
  if (!Array.isArray(operation.inputs) || operation.inputs.length > capability.maxInputs) {
    return invalid("The number of input assets is invalid.");
  }
  const counts = new Map<MediaInputRole, number>();
  const identity = new Set<string>();
  for (const input of operation.inputs) {
    if (!input || !validSource(input.source)) return invalid("An input asset reference is invalid.");
    const rule = capability.inputRequirements.find((entry) => entry.role === input.role);
    if (!rule || rule.mediaKind !== input.mediaKind) return invalid("An input role or media kind is invalid.");
    counts.set(input.role, (counts.get(input.role) ?? 0) + 1);
    const key = input.source.type + ":" + input.source.id;
    if (identity.has(key)) return invalid("The same asset cannot occupy multiple input slots.");
    identity.add(key);
  }
  for (const requirement of capability.inputRequirements) {
    const count = counts.get(requirement.role) ?? 0;
    if (count < requirement.min || count > requirement.max) {
      return invalid("The input role requirements are not satisfied.");
    }
  }
  if (operation.kind !== "image-edit" && "mask" in operation && operation.mask) {
    return invalid("A mask is not supported for this operation.");
  }
  const mask = operation.kind === "image-edit" ? operation.mask : undefined;
  if (mask && (capability.mask !== "optional" || !validSource(mask))) {
    return invalid("A mask is not supported or its source is invalid.");
  }
  if (mask && identity.has(mask.type + ":" + mask.id)) {
    return invalid("A mask must be a separate source.");
  }

  switch (operation.kind) {
    case "text-to-image":
    case "image-edit": {
      const { prompt, seed, aspectRatio } = operation.parameters;
      if (typeof prompt !== "string" || !prompt.trim()) return invalid("An image prompt is required.");
      if (seed !== undefined && (!Number.isSafeInteger(seed) || seed < 0 || seed > 2147483647)) {
        return invalid("The seed is outside the supported range.");
      }
      if (aspectRatio !== undefined && !["1:1", "4:3", "3:4", "16:9", "9:16"].includes(aspectRatio)) {
        return invalid("The aspect ratio is not supported.");
      }
      break;
    }
    case "image-to-image-upscale":
      if (![2, 3, 4].includes(operation.parameters.scale)) return invalid("The upscale factor is invalid.");
      break;
    case "image-to-image-background-remove":
      if (operation.parameters.format !== "png") return invalid("Background removal requires PNG output.");
      break;
    case "face-swap":
      if (operation.parameters.mode !== "single-face") return invalid("An unsupported face-swap mode was supplied.");
      break;
    case "text-to-video":
    case "image-to-video":
      if (typeof operation.parameters.prompt !== "string" || !operation.parameters.prompt.trim()
        || !Number.isFinite(operation.parameters.durationSeconds)
        || operation.parameters.durationSeconds <= 0 || !Number.isFinite(operation.parameters.fps)
        || operation.parameters.fps <= 0) return invalid("Video parameters are invalid.");
      break;
    case "text-to-audio":
      if (typeof operation.parameters.text !== "string" || !operation.parameters.text.trim()
        || (operation.parameters.durationSeconds !== undefined
          && (!Number.isFinite(operation.parameters.durationSeconds)
            || operation.parameters.durationSeconds <= 0))) return invalid("Audio parameters are invalid.");
      break;
  }
  return { ok: true };
}
