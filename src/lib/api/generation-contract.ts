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
  defaultVideoResolution,
  generationAdvancedCapabilities,
  generationInputAlias,
  generationInputAliasPattern,
  generationInputRoleForIndex,
  imageAspectRatios,
  maxGenerationInputsForOutput,
  unresolvedGenerationPromptReferenceAliases,
  videoAspectRatios,
  videoDurations,
  videoResolutions,
  type VideoResolution,
} from "@/lib/capabilities/generation";

export type SubmitGenerationSuccess = {
  ok: true;
  job: GenerationJob;
};

export type SubmitGenerationErrorCode =
  | "invalid_request"
  | "generation_access_denied"
  | "generation_disabled"
  | "generation_active_limit_reached"
  | "generation_rate_limit_reached"
  | "generation_backend_unavailable"
  | "generation_submission_failed";

export type SubmitGenerationError = {
  ok: false;
  error: {
    code: SubmitGenerationErrorCode;
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
const videoDurationSet = new Set<number>(videoDurations);
const videoResolutionSet = new Set<string>(videoResolutions);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseInputs(value: unknown): GenerationInput[] | null {
  if (!Array.isArray(value)) return null;

  const inputs: GenerationInput[] = [];
  const aliases = new Set<string>();
  for (const [index, item] of value.entries()) {
    if (!isRecord(item) || !isRecord(item.source)) return null;
    if (typeof item.role !== "string" || !inputRoles.has(item.role as GenerationInput["role"])) return null;

    const rawAlias = item.alias;
    const alias = rawAlias === undefined ? generationInputAlias(index + 1) : rawAlias;
    if (typeof alias !== "string" || !generationInputAliasPattern.test(alias) || aliases.has(alias)) return null;
    aliases.add(alias);

    const sourceType = item.source.type;
    const sourceId = item.source.id;
    if (typeof sourceType !== "string" || !inputSourceTypes.has(sourceType as GenerationInput["source"]["type"])) return null;
    if (typeof sourceId !== "string" || !sourceId.trim()) return null;

    inputs.push({
      alias: alias as GenerationInput["alias"],
      role: item.role as GenerationInput["role"],
      source: {
        type: sourceType as GenerationInput["source"]["type"],
        id: sourceId,
      },
    });
  }
  return inputs;
}

function parseAdvanced(value: unknown, outputKind: OutputKind): GenerationAdvancedParameters | undefined | null {
  if (value === undefined) return undefined;
  if (!isRecord(value)) return null;

  const allowedKeys = outputKind === "video"
    ? new Set(["negativePrompt", "seed", "frameRate"])
    : new Set(["negativePrompt", "seed", "steps", "guidance"]);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) return null;

  const advanced: GenerationAdvancedParameters = {};
  if (value.negativePrompt !== undefined) {
    if (typeof value.negativePrompt !== "string" || value.negativePrompt.length > 4000) return null;
    advanced.negativePrompt = value.negativePrompt;
  }
  if (value.seed !== undefined) {
    if (!Number.isInteger(value.seed) || Number(value.seed) < 0 || Number(value.seed) > 2147483647) return null;
    advanced.seed = Number(value.seed);
  }
  if (outputKind === "image" && value.steps !== undefined) {
    if (!Number.isInteger(value.steps) || Number(value.steps) < generationAdvancedCapabilities.image.steps.min || Number(value.steps) > generationAdvancedCapabilities.image.steps.max) return null;
    advanced.steps = Number(value.steps);
  }
  if (outputKind === "image" && value.guidance !== undefined) {
    if (typeof value.guidance !== "number" || !Number.isFinite(value.guidance) || value.guidance < generationAdvancedCapabilities.image.guidance.min || value.guidance > generationAdvancedCapabilities.image.guidance.max) return null;
    advanced.guidance = value.guidance;
  }
  if (outputKind === "video" && value.frameRate !== undefined) {
    if (!Number.isInteger(value.frameRate) || !frameRates.has(Number(value.frameRate))) return null;
    advanced.frameRate = Number(value.frameRate) as GenerationFrameRate;
  }
  return advanced;
}

export function parseGenerationRequest(value: unknown):
  | { ok: true; request: GenerationRequest }
  | SubmitGenerationError {
  if (!isRecord(value) || !isRecord(value.output)) {
    return { ok: false, error: { code: "invalid_request", message: "Invalid generation request." } };
  }

  const prompt = value.prompt;
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 10000) {
    return { ok: false, error: { code: "invalid_request", message: "Prompt is required and must be under 10,000 characters." } };
  }

  const kind = value.output.kind;
  if (typeof kind !== "string" || !outputKinds.has(kind as OutputKind)) {
    return { ok: false, error: { code: "invalid_request", message: "Unsupported output kind." } };
  }
  const outputKind = kind as OutputKind;

  const inputs = parseInputs(value.inputs ?? []);
  if (!inputs) {
    return { ok: false, error: { code: "invalid_request", message: "Generation inputs are invalid." } };
  }
  if (inputs.length > maxGenerationInputsForOutput(outputKind)) {
    return { ok: false, error: { code: "invalid_request", message: "Too many generation inputs." } };
  }

  for (const [index, input] of inputs.entries()) {
    const expectedRole = generationInputRoleForIndex(outputKind, index);
    if (input.role !== expectedRole) {
      return {
        ok: false,
        error: {
          code: "invalid_request",
          message: `${outputKind === "image" ? "Image" : "Video"} input ${index + 1} must use the ${expectedRole ?? "supported"} role.`,
        },
      };
    }
  }

  const unresolvedReferences = unresolvedGenerationPromptReferenceAliases(
    prompt,
    inputs.map((input) => input.alias),
  );
  if (unresolvedReferences.length) {
    return {
      ok: false,
      error: {
        code: "invalid_request",
        message: `Prompt references ${unresolvedReferences.map((alias) => `@${alias}`).join(", ")} without an attached image.`,
      },
    };
  }

  const aspectRatio = value.output.aspectRatio;
  const durationSeconds = value.output.durationSeconds;
  const audioEnabled = value.output.audioEnabled;
  const resolution = value.output.resolution;
  const supportedAspectRatios = outputKind === "video" ? videoAspectRatioSet : imageAspectRatioSet;
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

  let normalizedVideoResolution: VideoResolution | undefined;
  if (outputKind === "video") {
    if (resolution === undefined) {
      normalizedVideoResolution = defaultVideoResolution;
    } else if (typeof resolution === "string" && videoResolutionSet.has(resolution)) {
      normalizedVideoResolution = resolution as VideoResolution;
    } else {
      return { ok: false, error: { code: "invalid_request", message: "Unsupported video resolution." } };
    }
    if (typeof durationSeconds !== "number" || !videoDurationSet.has(durationSeconds)) {
      return { ok: false, error: { code: "invalid_request", message: "Unsupported video duration." } };
    }
    if (audioEnabled !== undefined && typeof audioEnabled !== "boolean") {
      return { ok: false, error: { code: "invalid_request", message: "Video audio setting must be on or off." } };
    }
  } else if (durationSeconds !== undefined || audioEnabled !== undefined || resolution !== undefined) {
    return { ok: false, error: { code: "invalid_request", message: "Image requests cannot include video-only settings." } };
  }

  const advanced = parseAdvanced(value.advanced, outputKind);
  if (advanced === null) {
    return { ok: false, error: { code: "invalid_request", message: "Advanced generation parameters are invalid." } };
  }

  return {
    ok: true,
    request: {
      prompt,
      output: {
        kind: outputKind,
        aspectRatio: aspectRatio as AspectRatio,
        ...(outputKind === "video"
          ? {
              durationSeconds: durationSeconds as number,
              audioEnabled: audioEnabled === undefined ? defaultVideoAudioEnabled : audioEnabled,
              resolution: normalizedVideoResolution!,
            }
          : {}),
      },
      inputs,
      ...(advanced ? { advanced } : {}),
    },
  };
}
