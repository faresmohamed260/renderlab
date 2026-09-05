import type { GenerationJob } from "@/lib/capabilities/generation";

export type CancelGenerationSuccess = {
  ok: true;
  job: GenerationJob;
};

export type CancelGenerationErrorCode =
  | "job_not_found"
  | "cancel_not_available"
  | "generation_backend_unavailable";

export type CancelGenerationError = {
  ok: false;
  error: {
    code: CancelGenerationErrorCode;
    message: string;
  };
};

export type CancelGenerationResponse = CancelGenerationSuccess | CancelGenerationError;
