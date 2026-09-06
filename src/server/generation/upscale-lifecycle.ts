import type { GenerationJob } from "@/lib/capabilities/generation";
import {
  getJobRow,
  patchJob,
  persistResult,
  recoverPersistingResult,
  toGenerationJob,
  type NativeGenerationJobRow,
} from "@/server/generation/native-generation";
import { getImageUpscaleWorker } from "@/server/generation/upscale-worker";
import { classifyWorkerFailure } from "@/server/generation/worker-failure";
import { correlationIdForGenerationJob, emitDiagnosticEvent } from "@/server/observability/diagnostics";

const invalidWorkerGraceMs = 15 * 60 * 1000;
const retryableProviderStaleMs = 2 * 60 * 60 * 1000;
const providerPollTimeoutMs = 30_000;

async function errorBody(response: Response) {
  try {
    return await response.json() as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function failUpscaleJob(
  row: NativeGenerationJobRow,
  code: string,
  message: string,
  diagnostic?: Record<string, unknown>,
) {
  return patchJob(row.owner_id, row.id, {
    status: "failed",
    error_code: code,
    error_message: message,
    completed_at: new Date().toISOString(),
    ...(diagnostic ? { failover_history: [...(row.failover_history || []), diagnostic] } : {}),
  });
}

function providerFailureDiagnostic(
  row: NativeGenerationJobRow,
  responseStatus: number | null,
  code: string,
  providerMessage: string,
) {
  return {
    phase: "upscale-poll-provider-failure",
    workerId: row.worker_id,
    status: responseStatus,
    code,
    message: providerMessage.slice(0, 500),
    at: new Date().toISOString(),
  };
}

export async function pollNativeUpscaleGeneration(
  ownerId: string,
  jobId: string,
): Promise<GenerationJob | null> {
  const row = await getJobRow(ownerId, jobId);
  if (!row || row.operation !== "upscale-image") return null;
  if (["succeeded", "failed", "cancelled"].includes(row.status)) return toGenerationJob(row);

  const recovered = await recoverPersistingResult(row);
  if (recovered) {
    await emitDiagnosticEvent({
      event: "generation.reconciliation",
      correlationId: correlationIdForGenerationJob(row.id),
      jobId: row.id,
      operation: row.operation,
      phase: "finalization-recovered",
      status: recovered.status,
    });
    return toGenerationJob(recovered);
  }

  if (!row.worker_id || !row.provider_job_id) return toGenerationJob(row);

  const worker = getImageUpscaleWorker();
  if (!worker || worker.id !== row.worker_id) {
    if (Date.now() - Date.parse(row.updated_at) < invalidWorkerGraceMs) {
      throw new Error("Assigned Upscale worker is temporarily unavailable.");
    }
    const failed = await failUpscaleJob(
      row,
      "generation_worker_unavailable",
      "Upscale could not resume because its assigned worker is no longer available.",
      {
        phase: "upscale-poll-worker-missing",
        workerId: row.worker_id,
        at: new Date().toISOString(),
      },
    );
    return toGenerationJob(failed);
  }

  let response: Response;
  try {
    response = await fetch(`${worker.gatewayUrl}/jobs/${encodeURIComponent(row.provider_job_id)}`, {
      method: "GET",
      headers: { accept: "image/png, application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(providerPollTimeoutMs),
    });
  } catch (error) {
    const providerMessage = error instanceof Error ? error.message : String(error);
    const diagnostic = providerFailureDiagnostic(row, null, "WORKER_UNAVAILABLE", providerMessage);
    if (Date.now() - Date.parse(row.updated_at) >= retryableProviderStaleMs) {
      const failed = await failUpscaleJob(
        row,
        "generation_provider_stalled",
        "Upscale could not be confirmed after prolonged worker unavailability.",
        diagnostic,
      );
      return toGenerationJob(failed);
    }
    throw new Error("Upscale worker status is temporarily unavailable.");
  }

  if (response.status === 202) {
    const payload = await response.json().catch(() => ({})) as { worker_state?: string; workerState?: string };
    const next = await patchJob(row.owner_id, row.id, {
      status: "running",
      worker_state: payload.worker_state || payload.workerState || "generating",
    });
    return toGenerationJob(next);
  }

  if (!response.ok) {
    const body = await errorBody(response);
    const failure = classifyWorkerFailure(response.status, body);
    const providerMessage = String(body.error || body.detail || `Upscale worker status unavailable (${response.status}).`);
    const diagnostic = providerFailureDiagnostic(row, response.status, failure.code, providerMessage);

    if (failure.retryable && Date.now() - Date.parse(row.updated_at) < retryableProviderStaleMs) {
      throw new Error("Upscale worker status is temporarily unavailable.");
    }

    const failed = await failUpscaleJob(
      row,
      failure.retryable ? "generation_provider_stalled" : "generation_failed",
      failure.retryable
        ? "Upscale could not be confirmed after prolonged worker unavailability."
        : "Upscale failed while processing on the assigned worker.",
      diagnostic,
    );
    return toGenerationJob(failed);
  }

  const contentType = String(response.headers.get("content-type") || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (contentType !== "image/png") {
    const failed = await failUpscaleJob(
      row,
      "generation_failed",
      "Upscale worker returned an unsupported result type.",
      {
        phase: "upscale-poll-result-type",
        workerId: row.worker_id,
        contentType: contentType.slice(0, 100),
        at: new Date().toISOString(),
      },
    );
    return toGenerationJob(failed);
  }

  const persisting = await patchJob(row.owner_id, row.id, {
    status: "persisting",
    worker_state: "finalizing",
  });
  await emitDiagnosticEvent({
    event: "generation.reconciliation",
    correlationId: correlationIdForGenerationJob(row.id),
    jobId: row.id,
    operation: row.operation,
    phase: "provider-ready",
    status: persisting.status,
  });

  const bytes = Buffer.from(await response.arrayBuffer());
  const completed = await persistResult(persisting, bytes, contentType, null);
  await emitDiagnosticEvent({
    event: "generation.reconciliation",
    correlationId: correlationIdForGenerationJob(row.id),
    jobId: row.id,
    operation: row.operation,
    phase: "finalization-complete",
    status: completed.status,
  });
  return toGenerationJob(completed);
}
