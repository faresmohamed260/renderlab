import type { GenerationJob } from "@/lib/capabilities/generation";

export type RunAgainGenerationErrorCode =
  | "job_not_found"
  | "run_again_not_available"
  | "generation_access_denied"
  | "generation_disabled"
  | "generation_active_limit_reached"
  | "generation_rate_limit_reached"
  | "generation_backend_unavailable"
  | "generation_submission_failed";

export type RunAgainGenerationResponse =
  | { ok: true; job: GenerationJob }
  | {
      ok: false;
      error: {
        code: RunAgainGenerationErrorCode;
        message: string;
      };
    };
