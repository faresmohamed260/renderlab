import type { GenerationInputAlias, GenerationInputSource, GenerationRequest } from "@/lib/capabilities/generation";

export type GenerationRecipeReference = {
  alias: GenerationInputAlias;
  source: GenerationInputSource;
  previewUrl: string;
  label: string;
};

export type InitialGenerationRecipe = {
  jobId: string;
  request: GenerationRequest;
  references: GenerationRecipeReference[];
};
