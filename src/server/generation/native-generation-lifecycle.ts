import { envString } from "../../lib/config/runtime-env.ts";
import { persistFiboMaskInputs } from "@/lib/capabilities/fibo-mask";
import type {
  GenerationJob,
  GenerationRequest,
} from "@/lib/capabilities/generation";
import {
  generationModelForRequest,
  fiboGenerationModel,
  resolveCreativeOperation,
} from "@/lib/capabilities/generation";
import type { SubmitGenerationResponse } from "@/lib/api/generation-contract";
import { isSupabaseConfigured, supabaseRest } from "@/server/data/supabase-rest";
import { isR2Configured } from "@/server/storage/r2";
import { FIBO_DISPATCH_BACKEND, acceptedWorkerCallId, findWorker, workerJobRequest, workersForEcosystem } from "@/server/generation/worker-fleet";
import { classifyWorkerFailure, type WorkerFailureClassification } from "@/server/generation/worker-failure";
import {
  correlationIdForGenerationJob,
  emitDiagnosticEvent,
  gatewayAuthRejectedCode,
  isGatewayAuthRejectionStatus,
} from "@/server/observability/diagnostics";
import { randomUUID } from "node:crypto";
import { classifyGenerationProviderRejection, recordGenerationMetric } from "@/server/observability/generation-metrics";
import { workflowFor, type WorkflowConfig } from "@/server/generation/native-generation-legacy-workflows";
import { resolveInputs, resolveMaskBytes, requestFromJobRow } from "@/server/generation/native-generation-worker-inputs";
import {
  prepareWorkerSubmission, dispatchWorker, getGeneratedFiboCaption, fetchPoster,
  InvalidGeneratedFiboSidecarError, errorBody,
} from "@/server/generation/native-generation-worker-transport";
import { persistResult, recoverPersistingResult } from "@/server/generation/native-generation-output-persistence";
import { getJobRow, patchJobRow } from "@/server/generation/native-generation-job-store";
import { toGenerationJob } from "@/server/generation/native-generation-job-projection";
import type { NativeGenerationJobRow } from "@/server/generation/native-generation-job-projection";

type JobRow = NativeGenerationJobRow;

const maxPollReassignmentAttempts = 3;
const invalidWorkerGraceMs = 15 * 60 * 1000;
const retryableProviderStaleMs = 2 * 60 * 60 * 1000;
const fiboPollDetailCategories = new Map([
  ["Unknown FIBO job", "unknown-job"],
  ["FIBO result expired", "result-expired"],
  ["FIBO rejected the render inputs", "inputs-rejected"],
  ["FIBO_PROCESS_EXITED", "process-exited"],
  ["FIBO_RENDER_TIMED_OUT", "render-timed-out"],
]);

export function isNativeGenerationConfigured() {
  return isSupabaseConfigured() && isR2Configured();
}

async function acceptDurableDispatch(
  ownerId: string,
  request: GenerationRequest,
  workflow: WorkflowConfig,
  payload: Record<string, unknown>,
) {
  const operation = resolveCreativeOperation(request);
  const rows = await supabaseRest<JobRow[]>("rpc/renderlab_accept_generation_dispatch", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      p_attempt_id: randomUUID(),
      p_owner_id: ownerId,
      p_operation: operation,
      p_output_kind: request.output.kind,
      p_prompt: request.prompt,
      p_workflow_id: workflow.id,
      p_model: workflow.model,
      p_ecosystem: workflow.ecosystem,
      p_inputs: persistFiboMaskInputs(request.inputs, request.mask),
      p_parameters: {
        model: generationModelForRequest(request), output: request.output, advanced: request.advanced ?? {},
        ...(request.vgl ? { vgl: request.vgl } : {}),
        ...(request.autoVgl ? { autoVgl: true } : {}),
      },
      p_backend_key: "fibo",
      p_model_key: "fibo-2.0-turbo",
      p_model_version: "bria-fibo-2.0-turbo",
      p_payload: payload,
      p_admission_deadline: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    }),
  });
  if (!rows?.[0]) throw new Error("Generation job and dispatch intent could not be committed.");
  return rows[0];
}

export async function submitNativeGeneration(ownerId: string, request: GenerationRequest): Promise<SubmitGenerationResponse> {
  if (!isNativeGenerationConfigured()) {
    return { ok: false, error: { code: "generation_backend_unavailable", message: "Native generation infrastructure is not configured." } };
  }

  const workflow = workflowFor(request);
  try {
    const sources = await resolveInputs(ownerId, request);
    const maskBytes = await resolveMaskBytes(ownerId, request);
    const submission = await prepareWorkerSubmission(workflow, request, sources, maskBytes);
    if (workflow.ecosystem !== fiboGenerationModel || typeof submission.body !== "string") {
      throw new Error("Durable dispatch accepts the FIBO JSON protocol only.");
    }
    const payload = JSON.parse(submission.body) as Record<string, unknown>;
    const job = await acceptDurableDispatch(ownerId, request, workflow, payload);
    return { ok: true, job: toGenerationJob(job) };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "generation_submission_failed",
        message: error instanceof Error ? error.message : "Generation submission failed.",
      },
    };
  }
}

function pollReassignmentAttemptCount(row: JobRow) {
  return (row.failover_history || []).filter((entry) => entry.phase === "poll-reassign-attempt").length;
}

function attemptedWorkerIds(row: JobRow) {
  const ids = new Set<string>();
  if (row.worker_id) ids.add(row.worker_id);
  for (const entry of row.failover_history || []) {
    for (const key of ["workerId", "fromWorkerId", "toWorkerId"] as const) {
      const value = entry[key];
      if (typeof value === "string" && value) ids.add(value);
    }
  }
  return ids;
}

async function reassignPollJob(row: JobRow, failure: WorkerFailureClassification) {
  if ((row.worker_id && findWorker(row.worker_id)?.policy?.reassignment === false) || !failure.safeToReassign || pollReassignmentAttemptCount(row) >= maxPollReassignmentAttempts) return null;

  const request = requestFromJobRow(row);
  const workflow = workflowFor(request);
  if (workflow.id !== row.workflow_id || workflow.ecosystem !== row.ecosystem) {
    throw new Error("Stored generation workflow no longer matches the job routing contract.");
  }

  const sources = await resolveInputs(row.owner_id, request);
  const maskBytes = await resolveMaskBytes(row.owner_id, request);
  const submission = await prepareWorkerSubmission(workflow, request, sources, maskBytes);
  const excluded = attemptedWorkerIds(row);
  const candidate = workersForEcosystem(workflow.ecosystem).find((worker) => !excluded.has(worker.id));
  if (!candidate) return null;

  const at = new Date().toISOString();
  const attemptEntry = {
    phase: "poll-reassign-attempt",
    fromWorkerId: row.worker_id,
    workerId: candidate.id,
    reason: failure.kind,
    code: failure.code,
    at,
  };
  const attemptUpdate = await patchJobRow(row, {
    failover_history: [...(row.failover_history || []), attemptEntry],
  });
  if (!attemptUpdate.applied) return attemptUpdate.row;
  const attempted = attemptUpdate.row;
  await emitDiagnosticEvent({
    event: "generation.reconciliation",
    level: "warn",
    correlationId: correlationIdForGenerationJob(row.id),
    jobId: row.id,
    operation: row.operation,
    phase: "failover-attempt",
    status: attempted.status,
    code: failure.code,
    attempt: pollReassignmentAttemptCount(attempted),
  });

  let response: Response;
  try {
    response = await dispatchWorker(candidate, workflow, submission);
  } catch {
    throw new Error("Standby reassignment could not be confirmed, so RenderLab will not retry that worker automatically.");
  }

  if (!response.ok) {
    const body = await errorBody(response);
    throw new Error(String(body.error || body.detail || `Standby worker rejected reassignment (${response.status}).`));
  }

  const payload = await response.json().catch(() => ({})) as { call_id?: string; worker_state?: string; workerState?: string };
  if (!acceptedWorkerCallId(candidate, response.status, payload.call_id)) {
    throw new Error("Standby worker did not return a call ID; RenderLab will not retry the ambiguous reassignment automatically.");
  }

  const reassignedUpdate = await patchJobRow(attempted, {
    status: "running",
    worker_id: candidate.id,
    provider_job_id: payload.call_id,
    worker_state: payload.worker_state || payload.workerState || "queued",
    failover_history: [
      ...(attempted.failover_history || []),
      {
        phase: "poll-reassign",
        fromWorkerId: row.worker_id,
        toWorkerId: candidate.id,
        reason: failure.kind,
        code: failure.code,
        at: new Date().toISOString(),
      },
    ],
  });
  if (!reassignedUpdate.applied) return reassignedUpdate.row;
  const reassigned = reassignedUpdate.row;
  await emitDiagnosticEvent({
    event: "generation.reconciliation",
    correlationId: correlationIdForGenerationJob(row.id),
    jobId: row.id,
    operation: row.operation,
    phase: "failover-complete",
    status: reassigned.status,
    code: failure.code,
    attempt: pollReassignmentAttemptCount(reassigned),
  });
  return reassigned;
}

async function failJob(row: JobRow, code: string, message: string, diagnostic?: Record<string, unknown>) {
  const result = await patchJobRow(row, {
    status: "failed",
    error_code: code,
    error_message: message,
    completed_at: new Date().toISOString(),
    ...(diagnostic ? { failover_history: [...(row.failover_history || []), diagnostic] } : {}),
  });
  // Count a provider rejection only after its unique terminal status CAS wins.
  // Repeated 202/401/403 polling is an observation, not a unique rejection.
  const httpStatus = diagnostic?.status;
  if (result.applied && typeof httpStatus === "number"
      && httpStatus >= 400 && httpStatus < 600) {
    recordGenerationMetric({
      name: "renderlab_generation_provider_rejections_total",
      labels: {
        operation: row.operation,
        ...classifyGenerationProviderRejection(httpStatus),
      },
      value: 1,
      linkCorrelation: correlationIdForGenerationJob(row.id),
    });
  }
  return result.row;
}

function providerFailureDiagnostic(
  row: JobRow,
  responseStatus: number,
  failure: WorkerFailureClassification,
  providerMessage: string,
) {
  return {
    phase: "poll-provider-failure",
    workerId: row.worker_id,
    status: responseStatus,
    kind: failure.kind,
    code: failure.code,
    message: providerMessage.slice(0, 500),
    at: new Date().toISOString(),
  };
}

export async function pollNativeGeneration(
  ownerId: string,
  jobId: string,
  providerTimeoutMs?: number,
  lookupSignal?: AbortSignal,
): Promise<GenerationJob | null> {
  const row = await getJobRow(ownerId, jobId, lookupSignal);
  if (!row) return null;
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

  const worker = findWorker(row.worker_id);
  if (!worker) {
    if (Date.now() - Date.parse(row.updated_at) < invalidWorkerGraceMs) {
      throw new Error("Assigned generation worker is temporarily unavailable.");
    }
    const failed = await failJob(
      row,
      "generation_worker_unavailable",
      "Generation could not resume because its assigned worker is no longer available.",
      {
        phase: "poll-worker-missing",
        workerId: row.worker_id,
        at: new Date().toISOString(),
      },
    );
    return toGenerationJob(failed);
  }

  const { url, options } = workerJobRequest(worker, row.provider_job_id, "", providerTimeoutMs);
  const headers = new Headers(options.headers);
  headers.set("accept", row.output_kind === "video" ? "video/*, application/json" : "image/*, application/json");
  const response = await fetch(url, {
    ...options, method: "GET", headers,
    cache: "no-store",
  });

  if (
    envString("VERCEL_ENV") === "production"
    && worker.policy?.transport === "modal-proxy"
    && isGatewayAuthRejectionStatus(response.status)
  ) {
    await emitDiagnosticEvent({
      event: "generation.reconciliation",
      level: "warn",
      correlationId: correlationIdForGenerationJob(row.id),
      jobId: row.id,
      phase: "provider-outcome",
      code: gatewayAuthRejectedCode,
      upstreamStatus: response.status,
    });
  }

  if (response.status === 202) {
    // Modal also returns pending for an accepted call waiting on the one GPU slot.
    // Durable worker admission owns the queued-to-running transition.
    if (row.worker_id === FIBO_DISPATCH_BACKEND) return toGenerationJob(row);
    const payload = await response.json().catch(() => ({})) as { worker_state?: string; workerState?: string };
    if (providerTimeoutMs) options.signal?.throwIfAborted();
    const next = await patchJobRow(row, {
      status: "running",
      worker_state: payload.worker_state || payload.workerState || "generating",
    });
    return toGenerationJob(next.row);
  }

  if (!response.ok) {
    const body = await errorBody(response) ?? {};
    if (providerTimeoutMs) options.signal?.throwIfAborted();
    const failure = classifyWorkerFailure(response.status, body);
    const fiboProcessExited = row.worker_id === FIBO_DISPATCH_BACKEND
      && response.status === 409 && body.detail === "FIBO_PROCESS_EXITED";
    const fiboRenderTimedOut = row.worker_id === FIBO_DISPATCH_BACKEND
      && response.status === 409 && body.detail === "FIBO_RENDER_TIMED_OUT";
    const providerMessage = String(body.error || body.detail || `Worker status unavailable (${response.status}).`);
    const diagnostic = providerFailureDiagnostic(row, response.status, failure, providerMessage);
    if (fiboProcessExited || fiboRenderTimedOut) {
      const failed = await failJob(
        row, "generation_failed",
        fiboRenderTimedOut
          ? "The render timed out before generation completed."
          : "The render process exited before generation completed.",
        diagnostic,
      );
      return toGenerationJob(failed);
    }

    const terminalFiboResponse = (response.status === 410 && body.detail === "FIBO result expired")
      || (response.status === 422 && body.detail === "FIBO rejected the render inputs");
    // A proxy or routing rejection gives no confirmed outcome for the accepted Modal call.
    const unconfirmedFiboResponse = row.worker_id === FIBO_DISPATCH_BACKEND
      && !failure.retryable && !terminalFiboResponse;

    // FIBO has no safe reassignment path: provider errors may conceal an accepted result.
    if (failure.safeToReassign && row.worker_id !== FIBO_DISPATCH_BACKEND) {
      try {
        const reassigned = await reassignPollJob(row, failure);
        if (reassigned) return toGenerationJob(reassigned);
        const failed = await failJob(
          row,
          failure.code.toLowerCase(),
          "Generation could not continue because no safe standby worker remained.",
          diagnostic,
        );
        return toGenerationJob(failed);
      } catch (error) {
        const failed = await failJob(
          row,
          "generation_reassignment_failed",
          "Generation could not be reassigned safely.",
          {
            ...diagnostic,
            phase: "poll-reassignment-failed",
            reassignmentMessage: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
          },
        );
        return toGenerationJob(failed);
      }
    }

    if (failure.retryable || unconfirmedFiboResponse) {
      if (Date.now() - Date.parse(row.updated_at) >= retryableProviderStaleMs) {
        const failed = await failJob(
          row,
          "generation_provider_stalled",
          "Generation could not be confirmed after prolonged provider unavailability.",
          diagnostic,
        );
        return toGenerationJob(failed);
      }
      if (unconfirmedFiboResponse) {
        const detailCategory = typeof body.detail === "string"
          ? fiboPollDetailCategories.get(body.detail) ?? "unknown"
          : "unknown";
        console.warn(`[renderlab] ${JSON.stringify({
          event: "generation.reconciliation",
          phase: "provider-outcome",
          code: "provider-unconfirmed",
          jobId: row.id,
          upstreamStatus: response.status,
          detailCategory,
        })}`);
        return toGenerationJob(row);
      }
      throw new Error("Generation provider status is temporarily unavailable.");
    }

    const failed = await failJob(
      row,
      "generation_failed",
      "Generation failed while processing on the assigned worker.",
      diagnostic,
    );
    return toGenerationJob(failed);
  }

  const contentType = String(response.headers.get("content-type") || (row.output_kind === "video" ? "video/mp4" : "image/png"))
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (worker.policy?.resultMime && contentType !== worker.policy.resultMime) throw new Error("Worker returned an unexpected result format.");
  if (row.output_kind === "image" && !contentType.startsWith("image/")) throw new Error("Worker returned a non-image result.");
  if (row.output_kind === "video" && !contentType.startsWith("video/")) throw new Error("Worker returned a non-video result.");

  let generatedVgl: string | null = null;
  if (row.parameters.autoVgl === true) {
    try {
      generatedVgl = await getGeneratedFiboCaption(worker, row.provider_job_id, providerTimeoutMs);
    } catch (error) {
      if (providerTimeoutMs && error instanceof Error && error.name === "TimeoutError") throw error;
      if (error instanceof InvalidGeneratedFiboSidecarError) {
        const failed = await failJob(row, "generation_vgl_invalid", "Generated FIBO scene JSON could not be verified.");
        return toGenerationJob(failed);
      }
      // Transient sidecar fetch problems keep normal polling retryable, but
      // never strand a ready worker output forever after a lost sidecar.
      if (Date.now() - Date.parse(row.updated_at) >= retryableProviderStaleMs) {
        const failed = await failJob(row, "generation_vgl_stalled", "Generated FIBO scene JSON could not be retrieved.");
        return toGenerationJob(failed);
      }
      throw error;
    }
  }
  // The gateway response is the first observed ready result, not the provider's
  // actual GPU finish timestamp. This clock is never reconstructed on replay.
  const observedReadyAtMs = Date.now();
  const persistTransition = await patchJobRow(row, {
    status: "persisting",
    worker_state: "finalizing",
    ...(generatedVgl ? {
      parameters: { ...row.parameters, generatedVgl, generatedVglSource: "fibo-public-qwen3vl" },
    } : {}),
  });
  if (!persistTransition.applied) return toGenerationJob(persistTransition.row);
  const persisting = persistTransition.row;
  const finalizationStartedMs = Date.now();
  const acceptedAtMs = row.started_at ? Date.parse(row.started_at) : NaN;
  if (Number.isFinite(acceptedAtMs) && acceptedAtMs <= observedReadyAtMs) {
    recordGenerationMetric({
      name: "renderlab_generation_provider_duration_seconds",
      labels: { outcome: "ready" },
      value: (observedReadyAtMs - acceptedAtMs) / 1000,
      linkCorrelation: correlationIdForGenerationJob(row.id),
    });
  }
  await emitDiagnosticEvent({
    event: "generation.reconciliation",
    correlationId: correlationIdForGenerationJob(row.id),
    jobId: row.id,
    operation: row.operation,
    phase: "provider-ready",
    status: persisting.status,
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  const poster = row.output_kind === "video" ? await fetchPoster(worker, row.provider_job_id, providerTimeoutMs) : null;
  const completed = await persistResult(persisting, bytes, contentType, poster);
  if (completed.status === "succeeded") {
    recordGenerationMetric({
      name: "renderlab_generation_finalization_duration_seconds",
      labels: { outcome: "succeeded" },
      value: Math.max(0, Date.now() - finalizationStartedMs) / 1000,
      linkCorrelation: correlationIdForGenerationJob(row.id),
    });
    const settledAtMs = completed.completed_at ? Date.parse(completed.completed_at) : NaN;
    if (Number.isFinite(settledAtMs) && settledAtMs >= observedReadyAtMs) {
      recordGenerationMetric({
        name: "renderlab_generation_provider_to_settle_seconds",
        labels: { operation: row.operation, result: "settled" },
        value: (settledAtMs - observedReadyAtMs) / 1000,
        linkCorrelation: correlationIdForGenerationJob(row.id),
      });
    }
  }
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
