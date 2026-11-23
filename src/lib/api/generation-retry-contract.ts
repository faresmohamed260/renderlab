import type { generationApiContractSource } from "@/lib/api/generation-api-source";
import type { GenerationJob } from "@/lib/capabilities/generation";

export type RetryGenerationSuccess = {
  ok: true;
  job: GenerationJob;
};

export type RetryGenerationErrorCode = (typeof generationApiContractSource.domainErrors.retry)[number];

export type RetryGenerationError = {
  ok: false;
  error: {
    code: RetryGenerationErrorCode;
    message: string;
  };
};

export type RetryGenerationResponse = RetryGenerationSuccess | RetryGenerationError;
