export type OutputKind = "image" | "video";

export type PromptGenerationOperation =
  | "create-image"
  | "edit-image"
  | "create-video"
  | "animate-image";

export type CreativeOperation = PromptGenerationOperation | "upscale-image";

const promptGenerationOperationSet = new Set<PromptGenerationOperation>([
  "create-image",
  "edit-image",
  "create-video",
  "animate-image",
]);

export function isPromptGenerationOperation(operation: string): operation is PromptGenerationOperation {
  return promptGenerationOperationSet.has(operation as PromptGenerationOperation);
}

export type PresetAspectRatio =
  | "1:1"
  | "4:5"
  | "3:4"
  | "2:3"
  | "9:16"
  | "5:4"
  | "4:3"
  | "3:2"
  | "16:10"
  | "16:9"
  | "21:9";

export type AspectRatio = "original" | PresetAspectRatio;

export type GenerationInputRole = "reference" | "primary-image" | "first-frame";

export type GenerationInputAlias = `image${number}`;

export const generationInputAliasPattern = /^image[1-9]\d*$/;

export function generationInputAlias(position: number): GenerationInputAlias {
  if (!Number.isInteger(position) || position < 1) throw new RangeError("Reference positions begin at 1.");
  return `image${position}` as GenerationInputAlias;
}

export function generationPromptReferenceAliases(prompt: string): GenerationInputAlias[] {
  const aliases = prompt.match(/@image\d+\b/g)?.map((mention) => mention.slice(1) as GenerationInputAlias) ?? [];
  return [...new Set(aliases)];
}

export function unresolvedGenerationPromptReferenceAliases(
  prompt: string,
  attachedAliases: readonly string[],
): GenerationInputAlias[] {
  const attached = new Set(attachedAliases);
  return generationPromptReferenceAliases(prompt).filter((alias) => !attached.has(alias));
}

export type GenerationInputSource =
  | { type: "temporary-source"; id: string }
  | { type: "media-asset"; id: string };

export type GenerationInput = {
  alias: GenerationInputAlias;
  source: GenerationInputSource;
  role: GenerationInputRole;
};

export const generationInputCapabilities = {
  image: {
    maxCount: 2,
    roles: ["primary-image", "reference"] as const,
  },
  video: {
    maxCount: 1,
    roles: ["first-frame"] as const,
  },
} as const;

export function maxGenerationInputsForOutput(kind: OutputKind) {
  return generationInputCapabilities[kind].maxCount;
}

export function generationInputRoleForIndex(kind: OutputKind, index: number): GenerationInputRole | null {
  if (!Number.isInteger(index) || index < 0) return null;
  const roles = generationInputCapabilities[kind].roles as readonly GenerationInputRole[];
  return roles[index] ?? null;
}

export const defaultVideoAudioEnabled = true;
export const videoResolutions = ["480p", "720p", "1080p", "2K"] as const;
export type VideoResolution = (typeof videoResolutions)[number];
export const defaultVideoResolution: VideoResolution = "480p";

export const generationAdvancedCapabilities = {
  seed: {
    label: "Seed",
  },
  steps: {
    label: "Steps",
    min: 1,
    max: 200,
  },
  guidance: {
    label: "Guidance",
    min: 0,
    max: 100,
    step: 0.1,
  },
  negativePrompt: {
    label: "Negative prompt",
  },
  image: {
    defaults: {
      seed: 42,
      steps: 4,
      guidance: 1,
    },
  },
  video: {
    defaults: {
      seed: 42,
      frameRate: 24 as const,
    },
    frameRates: [24, 25, 30] as const,
  },
} as const;

export type GenerationFrameRate = (typeof generationAdvancedCapabilities.video.frameRates)[number];

export type GenerationAdvancedParameters = {
  negativePrompt?: string;
  seed?: number;
  steps?: number;
  guidance?: number;
  frameRate?: GenerationFrameRate;
};

export function advancedDefaultsForOutput(kind: OutputKind) {
  return kind === "video"
    ? generationAdvancedCapabilities.video.defaults
    : generationAdvancedCapabilities.image.defaults;
}

export type GenerationRequest = {
  prompt: string;
  output: {
    kind: OutputKind;
    aspectRatio: AspectRatio;
    durationSeconds?: number;
    audioEnabled?: boolean;
    resolution?: VideoResolution;
  };
  inputs: GenerationInput[];
  advanced?: GenerationAdvancedParameters;
};

export type GenerationJobStatus =
  | "queued"
  | "preparing"
  | "running"
  | "cancelling"
  | "persisting"
  | "succeeded"
  | "failed"
  | "cancelled";

export type GenerationJob = {
  id: string;
  status: GenerationJobStatus;
  operation: CreativeOperation;
  createdAt: string;
  updatedAt: string;
  outputAssetIds: string[];
  error?: {
    code: string;
    message: string;
  };
};

export type ContinuationAction = {
  id: "edit-image" | "animate-image";
  label: "Edit" | "Animate";
  outputKind: OutputKind;
  inputRole: Extract<GenerationInputRole, "primary-image" | "first-frame">;
};

export const imageAspectRatios: PresetAspectRatio[] = [
  "1:1", "4:5", "3:4", "2:3", "9:16", "5:4", "4:3", "3:2", "16:10", "16:9", "21:9",
];
export const videoAspectRatios: PresetAspectRatio[] = [
  "1:1", "4:5", "3:4", "2:3", "9:16", "5:4", "4:3", "3:2", "16:10", "16:9", "21:9",
];
export const videoDurations = [5, 10, 15, 20, 30] as const;

const imageContinuationActions: ContinuationAction[] = [
  { id: "edit-image", label: "Edit", outputKind: "image", inputRole: "primary-image" },
  { id: "animate-image", label: "Animate", outputKind: "video", inputRole: "first-frame" },
];

export function continuationActionsForMedia(kind: OutputKind): ContinuationAction[] {
  return kind === "image" ? imageContinuationActions : [];
}

export function continuationActionForMedia(
  kind: OutputKind,
  actionId: ContinuationAction["id"],
): ContinuationAction | null {
  return continuationActionsForMedia(kind).find((action) => action.id === actionId) ?? null;
}

export function resolveCreativeOperation(request: GenerationRequest): PromptGenerationOperation {
  const hasImageInput = request.inputs.some(
    (input) => input.role === "reference" || input.role === "primary-image" || input.role === "first-frame",
  );

  if (request.output.kind === "video") {
    return hasImageInput ? "animate-image" : "create-video";
  }

  return hasImageInput ? "edit-image" : "create-image";
}
