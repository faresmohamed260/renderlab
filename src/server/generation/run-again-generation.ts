import type { RunAgainGenerationResponse } from "@/lib/api/generation-run-again-contract";
import {
  loadGenerationRecipeJob,
  reconstructAvailableGenerationRecipeRequest,
} from "@/server/generation/generation-recipe";
import { submitGeneration } from "@/server/generation/submit-generation";

function runAgainNotAvailable(): RunAgainGenerationResponse {
  return {
    ok: false,
    error: {
      code: "run_again_not_available",
      message: "This generation can’t be run again with the current inputs and settings.",
    },
  };
}

export async function runAgainGeneration(
  ownerId: string,
  jobId: string,
): Promise<RunAgainGenerationResponse> {
  const historicalJob = await loadGenerationRecipeJob(ownerId, jobId);
  if (!historicalJob) {
    return {
      ok: false,
      error: { code: "job_not_found", message: "Generation job was not found." },
    };
  }
  if (historicalJob.status !== "succeeded") return runAgainNotAvailable();

  const request = await reconstructAvailableGenerationRecipeRequest(ownerId, historicalJob);
  if (!request) return runAgainNotAvailable();

  const submitted = await submitGeneration(ownerId, request);
  if (!submitted.ok) {
    const code = submitted.error.code;
    if (
      code === "generation_access_denied"
      || code === "generation_disabled"
      || code === "generation_active_limit_reached"
      || code === "generation_rate_limit_reached"
    ) {
      return { ok: false, error: { code, message: submitted.error.message } };
    }
    if (code === "generation_backend_unavailable") {
      return {
        ok: false,
        error: {
          code: "generation_backend_unavailable",
          message: "Generation is temporarily unavailable. Try again shortly.",
        },
      };
    }
    return {
      ok: false,
      error: {
        code: "generation_submission_failed",
        message: "Run again could not be started. Check that the original inputs are still available and try again.",
      },
    };
  }

  return { ok: true, job: submitted.job };
}
