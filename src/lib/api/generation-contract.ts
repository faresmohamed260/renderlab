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
        id: sourceId.trim(),
      },
    });
  }
  return inputs;
}

function parseAdvanced(
  value: unknown,
  kind: OutputKind,
): GenerationAdvancedParameters | null | undefined {
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
    if (kind !== "image") return null;
    if (
      !Number.isInteger(value.steps)
      || (value.steps as number) < generationAdvancedCapabilities.steps.min
      || (value.steps as number) > generationAdvancedCapabilities.steps.max
    ) return null;
    advanced.steps = value.steps as number;
  }
  if (value.guidance !== undefined) {
    if (kind !== "image") return null;
    if (
      typeof value.guidance !== "number"
      || !Number.isFinite(value.guidance)
      || value.guidance < generationAdvancedCapabilities.guidance.min
      || value.guidance > generationAdvancedCapabilities.guidance.max
    ) return null;
    advanced.guidance = value.guidance;
  }
  if (value.frameRate !== undefined) {
    if (kind !== "video") return null;
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
  const prompt = value.prompt.trim();

  if (!isRecord(value.output)) {
    return { ok: false, error: { code: "invalid_request", message: "Output settings are required." } };
  }

  const kind = value.output.kind;
  const aspectRatio = value.output.aspectRatio;
  const durationSeconds = value.output.durationSeconds;
  const audioEnabled = value.output.audioEnabled;
  const resolution = value.output.resolution;

  if (typeof kind !== "string" || !outputKinds.has(kind as OutputKind)) {
    return { ok: false, error: { code: "invalid_request", message: "Output kind must be image or video." } };
  }

  const inputs = parseInputs(value.inputs);
  if (!inputs) {
    return { ok: false, error: { code: "invalid_request", message: "Generation inputs are invalid." } };
  }

  const outputKind = kind as OutputKind;
  const maxInputs = maxGenerationInputsForOutput(outputKind);
  if (inputs.length > maxInputs) {
    return {
      ok: false,
      error: {
        code: "invalid_request",
        message: `${outputKind === "image" ? "Image" : "Video"} accepts at most ${maxInputs} image ${maxInputs === 1 ? "input" : "inputs"}.`,
      },
    };
  }
  for (const [index, input] of inputs.entries()) {
    const expectedRole = generationInputRoleForIndex(outputKind, index);
    if (!expectedRole || input.role !== expectedRole) {
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

  let normalizedVideoResolution: VideoResolution | undefined;
  if (kind === "video") {
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
        kind: kind as OutputKind,
        aspectRatio: aspectRatio as AspectRatio,
        ...(kind === "video"
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
