import type { RetryGenerationResponse } from "@/lib/api/generation-retry-contract";
import { persistedUpscaleSourceAssetId } from "@/lib/capabilities/upscale";
import {
  loadGenerationRecipeJob,
  reconstructAvailableGenerationRecipeRequest,
} from "@/server/generation/generation-recipe";
import { submitGeneration } from "@/server/generation/submit-generation";
import { submitUpscaleImage } from "@/server/generation/submit-upscale";
import { loadPreparedUpscaleImageSource } from "@/server/generation/upscale-source";

function retryNotAvailable(): RetryGenerationResponse {
  return {
    ok: false,
    error: {
      code: "retry_not_available",
      message: "This generation can’t be retried with the current inputs and settings.",
    },
  };
}

function backendUnavailable(): RetryGenerationResponse {
  return {
    ok: false,
    error: {
      code: "generation_backend_unavailable",
      message: "Generation is temporarily unavailable. Try again shortly.",
    },
  };
}

export async function retryGeneration(
  ownerId: string,
  jobId: string,
): Promise<RetryGenerationResponse> {
  const historicalJob = await loadGenerationRecipeJob(ownerId, jobId);
  if (!historicalJob) {
    return {
      ok: false,
      error: { code: "job_not_found", message: "Generation job was not found." },
    };
  }
  if (historicalJob.status !== "failed") return retryNotAvailable();

  let submitted;
  if (historicalJob.operation === "upscale-image") {
    const sourceAssetId = persistedUpscaleSourceAssetId({
      operation: historicalJob.operation,
      outputKind: historicalJob.output_kind,
      prompt: historicalJob.prompt,
      inputs: historicalJob.inputs,
      parameters: historicalJob.parameters,
    });
    if (!sourceAssetId) return retryNotAvailable();

    let source;
    try {
      source = await loadPreparedUpscaleImageSource(ownerId, sourceAssetId);
    } catch (error) {
      if (error instanceof RangeError) return retryNotAvailable();
      return backendUnavailable();
    }
    if (!source) return retryNotAvailable();
    submitted = await submitUpscaleImage(ownerId, source);
  } else {
    const request = await reconstructAvailableGenerationRecipeRequest(ownerId, historicalJob);
    if (!request) return retryNotAvailable();
    submitted = await submitGeneration(ownerId, request);
  }

  if (!submitted.ok) {
    const code = submitted.error.code;
    if (
      code === "generation_access_denied"
      || code === "generation_disabled"
      || code === "generation_active_limit_reached"
      || code === "generation_rate_limit_reached"
    ) {
      return {
        ok: false,
        error: { code, message: submitted.error.message },
      };
    }
    if (code === "generation_backend_unavailable") return backendUnavailable();
    return {
      ok: false,
      error: {
        code: "generation_submission_failed",
        message: "Retry could not be started. Check that the original inputs are still available and try again.",
      },
    };
  }

  return { ok: true, job: submitted.job };
}
