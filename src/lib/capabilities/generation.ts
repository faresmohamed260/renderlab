export type OutputKind = "image" | "video";

export type CreativeOperation =
  | "create-image"
  | "edit-image"
  | "create-video"
  | "animate-image";

export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

export type GenerationInputRole = "reference" | "primary-image" | "first-frame";

export type GenerationInputSource =
  | { type: "temporary-source"; id: string }
  | { type: "media-asset"; id: string };

export type GenerationInput = {
  source: GenerationInputSource;
  role: GenerationInputRole;
};

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
      steps: 11,
      guidance: 1,
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
  };
  inputs: GenerationInput[];
  advanced?: GenerationAdvancedParameters;
};

export type GenerationJobStatus =
  | "queued"
  | "preparing"
  | "running"
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

export const imageAspectRatios: AspectRatio[] = ["1:1", "16:9", "9:16", "4:3", "3:4"];
export const videoAspectRatios: AspectRatio[] = ["16:9", "9:16", "1:1"];
export const videoDurations = [5, 10, 15, 20, 30] as const;

const imageContinuationActions: ContinuationAction[] = [
  { id: "edit-image", label: "Edit", outputKind: "image", inputRole: "primary-image" },
  { id: "animate-image", label: "Animate", outputKind: "video", inputRole: "first-frame" },
];

export function continuationActionsForMedia(kind: OutputKind): ContinuationAction[] {
  return kind === "image" ? imageContinuationActions : [];
}

export function resolveCreativeOperation(request: GenerationRequest): CreativeOperation {
  const hasImageInput = request.inputs.some(
    (input) => input.role === "reference" || input.role === "primary-image" || input.role === "first-frame",
  );

  if (request.output.kind === "video") {
    return hasImageInput ? "animate-image" : "create-video";
  }

  return hasImageInput ? "edit-image" : "create-image";
}
