import type { CreativeOperation, OutputKind } from "@/lib/capabilities/generation";
import { resolveCreativeOperation } from "@/lib/capabilities/generation";
import { parseGenerationRequest } from "@/lib/api/generation-contract";
import type { RetryGenerationResponse } from "@/lib/api/generation-retry-contract";
import { supabaseRest } from "@/server/data/supabase-rest";
import {
  generationImageInputsAvailable,
  submitGeneration,
} from "@/server/generation/submit-generation";

type RetryJobRow = {
  id: string;
  status: string;
  operation: CreativeOperation;
  output_kind: OutputKind;
  prompt: string;
  inputs: unknown;
  parameters: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function retryNotAvailable(): RetryGenerationResponse {
  return {
    ok: false,
    error: {
      code: "retry_not_available",
      message: "This generation can’t be retried with the current inputs and settings.",
    },
  };
}

function reconstructedRequest(row: RetryJobRow) {
  if (!isRecord(row.parameters) || !isRecord(row.parameters.output)) return null;

  const output = { ...row.parameters.output };
  const rawAdvanced = row.parameters.advanced;
  let advanced: unknown = rawAdvanced;

  if (row.output_kind === "video" && isRecord(rawAdvanced)) {
    const compatibleAdvanced = { ...rawAdvanced };
    delete compatibleAdvanced.steps;
    delete compatibleAdvanced.guidance;
    advanced = compatibleAdvanced;
  }

  const parsed = parseGenerationRequest({
    prompt: row.prompt,
    output,
    inputs: row.inputs,
    ...(advanced === undefined ? {} : { advanced }),
  });
  if (!parsed.ok) return null;
  if (parsed.request.output.kind !== row.output_kind) return null;
  if (resolveCreativeOperation(parsed.request) !== row.operation) return null;
  return parsed.request;
}

export async function retryGeneration(
  ownerId: string,
  jobId: string,
): Promise<RetryGenerationResponse> {
  const rows = await supabaseRest<RetryJobRow[]>(
    `generation_jobs?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(jobId)}&select=id,status,operation,output_kind,prompt,inputs,parameters&limit=1`,
    { method: "GET" },
  );
  const historicalJob = rows?.[0];
  if (!historicalJob) {
    return {
      ok: false,
      error: { code: "job_not_found", message: "Generation job was not found." },
    };
  }
  if (historicalJob.status !== "failed") return retryNotAvailable();

  const request = reconstructedRequest(historicalJob);
  if (!request) return retryNotAvailable();

  if (!(await generationImageInputsAvailable(ownerId, request))) return retryNotAvailable();

  const submitted = await submitGeneration(ownerId, request);
  if (!submitted.ok) {
    if (
      submitted.error.code === "generation_access_denied"
      || submitted.error.code === "generation_disabled"
      || submitted.error.code === "generation_active_limit_reached"
      || submitted.error.code === "generation_rate_limit_reached"
    ) {
      return { ok: false, error: submitted.error };
    }
    if (submitted.error.code === "generation_backend_unavailable") {
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
        message: "Retry could not be started. Check that the original inputs are still available and try again.",
      },
    };
  }

  return { ok: true, job: submitted.job };
}