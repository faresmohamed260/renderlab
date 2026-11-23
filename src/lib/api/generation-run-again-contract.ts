import type { generationApiContractSource } from "@/lib/api/generation-api-source";
import type { GenerationJob } from "@/lib/capabilities/generation";

export type RunAgainGenerationErrorCode = (typeof generationApiContractSource.domainErrors.runAgain)[number];

export type RunAgainGenerationResponse =
  | { ok: true; job: GenerationJob }
  | {
      ok: false;
      error: {
        code: RunAgainGenerationErrorCode;
        message: string;
      };
    };
