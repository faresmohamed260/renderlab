import type { GenerationJob } from "@/lib/capabilities/generation";

export type RetryGenerationSuccess = {
  ok: true;
  job: GenerationJob;
};

export type RetryGenerationErrorCode =
  | "job_not_found"
  | "retry_not_available"
  | "generation_access_denied"
  | "generation_disabled"
  | "generation_active_limit_reached"
  | "generation_rate_limit_reached"
  | "generation_backend_unavailable"
  | "generation_submission_failed";

export type RetryGenerationError = {
  ok: false;
  error: {
    code: RetryGenerationErrorCode;
    message: string;
  };
};

export type RetryGenerationResponse = RetryGenerationSuccess | RetryGenerationError;
