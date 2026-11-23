import { generationApiContractSource } from "@/lib/api/generation-api-source";
import { normalizeFiboVgl } from "@/lib/capabilities/fibo-vgl";
import { parseFiboMaskSource } from "@/lib/capabilities/fibo-mask";
import {
  generationNegativePromptWithinLimit,
  generationPromptWithinLimit,
  generationTextLimits,
} from "@/lib/api/generation-text-limits";
import type {
  AspectRatio,
  GenerationAdvancedParameters,
  GenerationFrameRate,
  GenerationInput,
  GenerationJob,
  GenerationModel,
  GenerationRequest,
  OutputKind,
} from "@/lib/capabilities/generation";
import {
  defaultGenerationModelForOutput,
  generationAdvancedCapabilities,
  generationInputAlias,
  generationInputAliasPattern,
  generationInputRoleForIndex,
  fiboGenerationModel,
  imageAspectRatios,
  maxGenerationInputsForOutput,
  qwenImageFixedGuidance,
  qwenImageFixedSteps,
  unresolvedGenerationPromptReferenceAliases,
} from "@/lib/capabilities/generation";

export type SubmitGenerationSuccess = {
  ok: true;
  job: GenerationJob;
};

export type SubmitGenerationErrorCode = (typeof generationApiContractSource.domainErrors.submit)[number];

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
const inputRoles = new Set<GenerationInput["role"]>(["reference", "primary-image", "first-frame"]);
const inputSourceTypes = new Set<GenerationInput["source"]["type"]>(["temporary-source", "media-asset"]);
const frameRates = new Set<number>(generationAdvancedCapabilities.video.frameRates);

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
  model: GenerationModel,
): GenerationAdvancedParameters | null | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) return null;

  const advanced: GenerationAdvancedParameters = {};

  if (value.negativePrompt !== undefined) {
    if (
      typeof value.negativePrompt !== "string"
      || !generationNegativePromptWithinLimit(value.negativePrompt)
    ) return null;
    advanced.negativePrompt = value.negativePrompt;
  }
  if (value.seed !== undefined) {
    if (!Number.isSafeInteger(value.seed)) return null;
    advanced.seed = value.seed as number;
  }
  if (value.steps !== undefined) {
    if (kind !== "image") return null;
    if (model === "qwen-image-edit-2511") {
      if (value.steps !== qwenImageFixedSteps) return null;
    } else if (
      !Number.isInteger(value.steps)
      || (value.steps as number) < generationAdvancedCapabilities.steps.min
      || (value.steps as number) > generationAdvancedCapabilities.steps.max
    ) return null;
    advanced.steps = value.steps as number;
  }
  if (value.guidance !== undefined) {
    if (kind !== "image") return null;
    if (model === "qwen-image-edit-2511") {
      if (value.guidance !== qwenImageFixedGuidance) return null;
    } else if (
      typeof value.guidance !== "number"
      || !Number.isFinite(value.guidance)
      || value.guidance < generationAdvancedCapabilities.guidance.min
      || value.guidance > generationAdvancedCapabilities.guidance.max
    ) return null;
    advanced.guidance = value.guidance as number;
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

  if (value.prompt !== undefined && typeof value.prompt !== "string") {
    return { ok: false, error: { code: "invalid_request", message: "Prompt must be text." } };
  }
  const textPrompt = typeof value.prompt === "string" ? value.prompt.trim() : "";
  if (textPrompt && !generationPromptWithinLimit(textPrompt)) {
    return {
      ok: false,
      error: {
        code: "invalid_request",
        message: `Prompt must be ${generationTextLimits.promptCharacters.toLocaleString("en-US")} characters or fewer.`,
      },
    };
  }

  if (!isRecord(value.output)) {
    return { ok: false, error: { code: "invalid_request", message: "Output settings are required." } };
  }

  const kind = value.output.kind;
  const aspectRatio = value.output.aspectRatio;
  const durationSeconds = value.output.durationSeconds;
  const audioEnabled = value.output.audioEnabled;
  const resolution = value.output.resolution;

  if (kind !== "image") {
    return { ok: false, error: { code: "invalid_request", message: "Only FIBO image generation is available." } };
  }

  const inputs = parseInputs(value.inputs);
  if (!inputs) {
    return { ok: false, error: { code: "invalid_request", message: "Generation inputs are invalid." } };
  }

  const outputKind = kind as OutputKind;
  let model: GenerationModel;
  if (value.model === undefined) {
    model = defaultGenerationModelForOutput(outputKind);
  } else if (
    typeof value.model !== "string"
    || value.model !== fiboGenerationModel
  ) {
    return { ok: false, error: { code: "invalid_request", message: "Unsupported model for the selected output type." } };
  } else {
    model = value.model as GenerationModel;
  }

  const maxInputs = model === fiboGenerationModel ? generationApiContractSource.schemas.GenerationRequest.properties.inputs.maxItems : maxGenerationInputsForOutput(outputKind);
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
    const expectedRole = model === fiboGenerationModel ? (index === 0 ? "primary-image" : "reference") : generationInputRoleForIndex(outputKind, index);
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

  const mask = value.mask === undefined ? undefined : parseFiboMaskSource(value.mask);
  if (value.mask !== undefined && (
    !mask || inputs.length !== 1 || mask?.id === inputs[0]?.source.id
  )) {
    return { ok: false, error: { code: "invalid_request", message: "FIBO masks require one distinct owner-scoped PNG source and one edit image." } };
  }
  const aliases = inputs.map((input) => input.alias);
  const vgl = value.vgl === undefined ? undefined : normalizeFiboVgl(value.vgl, aliases);
  if (value.vgl !== undefined && vgl === null) {
    return { ok: false, error: { code: "invalid_request", message: "VGL must be a bounded non-empty JSON object with attached image references." } };
  }
  const autoVgl = value.autoVgl === true;
  if (value.autoVgl !== undefined && !autoVgl || "generatedVgl" in value) {
    return { ok: false, error: { code: "invalid_request", message: "Generated VGL mode must be an explicit supported boolean." } };
  }
  if (autoVgl && (inputs.length !== 0 || mask || vgl || !textPrompt)) {
    return { ok: false, error: { code: "invalid_request", message: "Automatic VGL requires source-free text generation without a mask or manually supplied VGL." } };
  }
  if (!textPrompt && !vgl) {
    return { ok: false, error: { code: "invalid_request", message: "A prompt or VGL JSON is required." } };
  }
  // Persist meaningful text for VGL-only jobs without a schema change. The
  // worker receives an empty plain prompt and the separate VGL document.
  const prompt = textPrompt || vgl!;
  const unresolvedReferences = unresolvedGenerationPromptReferenceAliases(
    textPrompt,
    aliases,
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

  const supportedAspectRatios = imageAspectRatioSet;
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

  if (durationSeconds !== undefined || audioEnabled !== undefined || resolution !== undefined) {
    return { ok: false, error: { code: "invalid_request", message: "Image requests cannot include video-only settings." } };
  }

  const advanced = parseAdvanced(value.advanced, outputKind, model);
  if (advanced === null) {
    return { ok: false, error: { code: "invalid_request", message: "Advanced generation parameters are invalid." } };
  }

  if (model === fiboGenerationModel && (
    !generationApiContractSource.schemas.GenerationRequest.properties.output.properties.aspectRatio.enum.includes(String(aspectRatio) as (typeof generationApiContractSource.schemas.GenerationRequest.properties.output.properties.aspectRatio.enum)[number])
    || (advanced?.steps ?? 4) > generationApiContractSource.schemas.GenerationRequest.properties.advanced.properties.steps.maximum
    || (Array.from(prompt).length > generationApiContractSource.schemas.GenerationRequest.properties.prompt["x-renderlab-fiboCodePointMax"] && !(vgl && !textPrompt)) || Array.from(advanced?.negativePrompt ?? "").length > generationApiContractSource.schemas.GenerationRequest.properties.prompt["x-renderlab-fiboCodePointMax"]
    || "json_instruction" in value
    || (advanced?.guidance ?? 1) !== generationApiContractSource.schemas.GenerationRequest.properties.advanced.properties.guidance.const
  )) {
    return { ok: false, error: { code: "invalid_request", message: "Unsupported FIBO size, inputs, or tuning." } };
  }

  return {
    ok: true,
    request: {
      model,
      prompt,
      output: {
        kind: "image",
        aspectRatio: aspectRatio as AspectRatio,
      },
      inputs,
      ...(vgl ? { vgl } : {}),
      ...(autoVgl ? { autoVgl: true as const } : {}),
      ...(mask ? { mask } : {}),
      ...(advanced ? { advanced } : {}),
    },
  };
}
