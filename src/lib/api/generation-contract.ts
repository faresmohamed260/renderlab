import type {
  AspectRatio,
  GenerationAdvancedParameters,
  GenerationFrameRate,
  GenerationInput,
  GenerationJob,
  GenerationRequest,
  OutputKind,
} from "@/lib/capabilities/generation";
import {
  defaultVideoAudioEnabled,
  generationAdvancedCapabilities,
  imageAspectRatios,
  videoAspectRatios,
} from "@/lib/capabilities/generation";

export type SubmitGenerationSuccess = {
  ok: true;
  job: GenerationJob;
};

export type SubmitGenerationError = {
  ok: false;
  error: {
    code:
      | "invalid_request"
      | "generation_backend_unavailable"
      | "generation_submission_failed";
    message: string;
    details?: Record<string, string>;
  };
};

export type SubmitGenerationResponse = SubmitGenerationSuccess | SubmitGenerationError;

const imageAspectRatioSet = new Set<AspectRatio>(imageAspectRatios);
const videoAspectRatioSet = new Set<AspectRatio>(videoAspectRatios);
const outputKinds = new Set<OutputKind>(["image", "video"]);
const inputRoles = new Set<GenerationInput["role"]>(["reference", "primary-image", "first-frame"]);
const inputSourceTypes = new Set<GenerationInput["source"]["type"]>(["temporary-source", "media-asset"]);
const frameRates = new Set<number>(generationAdvancedCapabilities.video.frameRates);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseInputs(value: unknown): GenerationInput[] | null {
  if (!Array.isArray(value)) return null;

  const inputs: GenerationInput[] = [];
  for (const item of value) {
    if (!isRecord(item) || !isRecord(item.source)) return null;
    if (typeof item.role !== "string" || !inputRoles.has(item.role as GenerationInput["role"])) return null;

    const sourceType = item.source.type;
    const sourceId = item.source.id;
    if (typeof sourceType !== "string" || !inputSourceTypes.has(sourceType as GenerationInput["source"]["type"])) return null;
    if (typeof sourceId !== "string" || !sourceId.trim()) return null;

    inputs.push({
      role: item.role as GenerationInput["role"],
      source: {
        type: sourceType as GenerationInput["source"]["type"],
        id: sourceId.trim(),
      },
    });
  }
  return inputs;
}

function parseAdvanced(value: unknown): GenerationAdvancedParameters | null | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) return null;

  const advanced: GenerationAdvancedParameters = {};

  if (value.negativePrompt !== undefined) {
    if (typeof value.negativePrompt !== "string") return null;
    advanced.negativePrompt = value.negativePrompt;
  }
  if (value.seed !== undefined) {
    if (!Number.isSafeInteger(value.seed)) return null;
    advanced.seed = value.seed as number;
  }
  if (value.steps !== undefined) {
    if (
      !Number.isInteger(value.steps)
      || (value.steps as number) < generationAdvancedCapabilities.steps.min
      || (value.steps as number) > generationAdvancedCapabilities.steps.max
    ) return null;
    advanced.steps = value.steps as number;
  }
  if (value.guidance !== undefined) {
    if (
      typeof value.guidance !== "number"
      || !Number.isFinite(value.guidance)
      || value.guidance < generationAdvancedCapabilities.guidance.min
      || value.guidance > generationAdvancedCapabilities.guidance.max
    ) return null;
    advanced.guidance = value.guidance;
  }
  if (value.frameRate !== undefined) {
    if (typeof value.frameRate !== "number" || !frameRates.has(value.frameRate)) return null;
    advanced.frameRate = value.frameRate as GenerationFrameRate;
  }

  return advanced;
}

export function parseGenerationRequest(value: unknown):
  | { ok: true; request: GenerationRequest }
  | { ok: false; error: SubmitGenerationError["error"] } {
  if (!isRecord(value)) {
    return { ok: false, error: { code: "invalid_request", message: "Generation request must be an object." } };
  }

  if (typeof value.prompt !== "string" || !value.prompt.trim()) {
    return { ok: false, error: { code: "invalid_request", message: "A prompt is required." } };
  }

  if (!isRecord(value.output)) {
    return { ok: false, error: { code: "invalid_request", message: "Output settings are required." } };
  }

  const kind = value.output.kind;
  const aspectRatio = value.output.aspectRatio;
  const durationSeconds = value.output.durationSeconds;
  const audioEnabled = value.output.audioEnabled;

  if (typeof kind !== "string" || !outputKinds.has(kind as OutputKind)) {
    return { ok: false, error: { code: "invalid_request", message: "Output kind must be image or video." } };
  }

  const inputs = parseInputs(value.inputs);
  if (!inputs) {
    return { ok: false, error: { code: "invalid_request", message: "Generation inputs are invalid." } };
  }

  const supportedAspectRatios = kind === "video" ? videoAspectRatioSet : imageAspectRatioSet;
  if (
    typeof aspectRatio !== "string"
    || (aspectRatio !== "original" && !supportedAspectRatios.has(aspectRatio as AspectRatio))
  ) {
    return { ok: false, error: { code: "invalid_request", message: "Unsupported aspect ratio." } };
  }
  if (aspectRatio === "original" && inputs.length === 0) {
    return {
      ok: false,
      error: { code: "invalid_request", message: "Original geometry requires a source image." },
    };
  }

  if (kind === "video") {
    if (!Number.isInteger(durationSeconds) || (durationSeconds as number) < 5 || (durationSeconds as number) > 30) {
      return { ok: false, error: { code: "invalid_request", message: "Video duration must be between 5 and 30 seconds." } };
    }
    if (audioEnabled !== undefined && typeof audioEnabled !== "boolean") {
      return { ok: false, error: { code: "invalid_request", message: "Video audio setting must be on or off." } };
    }
  } else if (durationSeconds !== undefined || audioEnabled !== undefined) {
    return { ok: false, error: { code: "invalid_request", message: "Image requests cannot include video-only settings." } };
  }

  const advanced = parseAdvanced(value.advanced);
  if (advanced === null) {
    return { ok: false, error: { code: "invalid_request", message: "Advanced generation parameters are invalid." } };
  }

  return {
    ok: true,
    request: {
      prompt: value.prompt.trim(),
      output: {
        kind: kind as OutputKind,
        aspectRatio: aspectRatio as AspectRatio,
        ...(kind === "video"
          ? { durationSeconds: durationSeconds as number, audioEnabled: audioEnabled === undefined ? defaultVideoAudioEnabled : audioEnabled }
          : {}),
      },
      inputs,
      ...(advanced ? { advanced } : {}),
    },
  };
}
