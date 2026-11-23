import type { generationApiContractSource } from "@/lib/api/generation-api-source";
import type { GenerationJob } from "@/lib/capabilities/generation";

export type CancelGenerationSuccess = {
  ok: true;
  job: GenerationJob;
};

export type CancelGenerationErrorCode = (typeof generationApiContractSource.domainErrors.cancel)[number];

export type CancelGenerationError = {
  ok: false;
  error: {
    code: CancelGenerationErrorCode;
    message: string;
  };
};

export type CancelGenerationResponse = CancelGenerationSuccess | CancelGenerationError;
