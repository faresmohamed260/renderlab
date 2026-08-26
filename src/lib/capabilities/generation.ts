export type OutputKind = "image" | "video";

export type CreativeOperation =
  | "create-image"
  | "edit-image"
  | "create-video"
  | "animate-image";

export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

export type GenerationInputRole = "reference" | "primary-image" | "first-frame";

export type GenerationInput = {
  assetId: string;
  role: GenerationInputRole;
};

export type GenerationAdvancedParameters = {
  negativePrompt?: string;
  seed?: number;
  steps?: number;
  guidance?: number;
  frameRate?: 24 | 25 | 30;
};

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

export const imageAspectRatios: AspectRatio[] = ["1:1", "16:9", "9:16", "4:3", "3:4"];
export const videoAspectRatios: AspectRatio[] = ["16:9", "9:16", "1:1"];
export const videoDurations = [5, 10, 15, 20, 30] as const;

export function resolveCreativeOperation(request: GenerationRequest): CreativeOperation {
  const hasImageInput = request.inputs.some(
    (input) => input.role === "reference" || input.role === "primary-image" || input.role === "first-frame",
  );

  if (request.output.kind === "video") {
    return hasImageInput ? "animate-image" : "create-video";
  }

  return hasImageInput ? "edit-image" : "create-image";
}
