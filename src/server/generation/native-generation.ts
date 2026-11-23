import { envFlag, envString } from "../../lib/config/runtime-env.ts";
import { isGenerationTerminalStatus } from "@/lib/capabilities/generation-job-state-machine";
import { tryAtomicTerminalizeGeneration } from "@/server/generation/atomic-terminalization";
import { buildFiboWorkerPayload } from "@/server/generation/fibo-worker-payload";
import { parseGeneratedFiboSidecar } from "@/lib/capabilities/fibo-generated-vgl";
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
import { headR2Object, isR2Configured, readR2Object, writeR2Object } from "@/server/storage/r2";
import { FIBO_DISPATCH_BACKEND, acceptedWorkerCallId, findWorker, workerGatewayOptions, workerJobRequest, workersForEcosystem, type GenerationWorker } from "@/server/generation/worker-fleet";
import { injectGenerationFinalizationFault } from "@/server/generation/finalization-faults";
import {
  deterministicGenerationAssetId,
  generationOutputStoragePrefix,
  generationThumbnailStoragePrefix,
  possibleGenerationOutputExtensions,
  possibleGenerationThumbnailExtensions,
} from "@/server/generation/generation-storage-keys";
import { classifyWorkerFailure, type WorkerFailureClassification } from "@/server/generation/worker-failure";
import { inspectUpscaleOutputMetadata, type UpscaleOutputMetadata } from "@/server/generation/upscale-output-metadata";
import {
  IMAGE_THUMBNAIL_CONTENT_TYPE,
  createImageThumbnailBytes,
  imageThumbnailStorageKey,
} from "@/server/media/image-thumbnail";
import {
  correlationIdForGenerationJob,
  emitDiagnosticEvent,
  gatewayAuthRejectedCode,
  isGatewayAuthRejectionStatus,
} from "@/server/observability/diagnostics";
import { randomUUID } from "node:crypto";
import { workflowFor, prepareWorkerPayload, buildForm, type WorkflowConfig } from "@/server/generation/native-generation-legacy-workflows";
import { resolveInputs, resolveMaskBytes, requestFromJobRow, type InputBytes } from "@/server/generation/native-generation-worker-inputs";
import { toGenerationJob } from "@/server/generation/native-generation-job-projection";
import type { NativeGenerationJobRow } from "@/server/generation/native-generation-job-projection";
export { toGenerationJob } from "@/server/generation/native-generation-job-projection";
export type { NativeGenerationJobRow } from "@/server/generation/native-generation-job-projection";

type JobRow = NativeGenerationJobRow;

type GeneratedMediaRow = {
  id: string;
  storage_key: string;
  thumbnail_storage_key: string | null;
  mime_type: string;
};

type DurableOutputObject = {
  storageKey: string;
  contentType: string;
};

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

export async function wakeFiboDispatcher() {
  const worker = workersForEcosystem(fiboGenerationModel)[0];
  if (!worker) return;
  const options = workerGatewayOptions(worker, 6_000);
  const origin = worker.policy?.transport === "modal-proxy" ? worker.gatewayUrl : gatewayUrlForWorker(worker);
  const response = await fetch(`${origin}/dispatch/wake`, {
    ...options,
    method: "POST",
    headers: options.headers,
    body: null,
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Dispatcher wake was not accepted.");
}

export async function getJobRow(ownerId: string, jobId: string, signal?: AbortSignal) {
  const rows = await supabaseRest<JobRow[]>(
    `generation_jobs?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(jobId)}&select=*&limit=1`,
    { method: "GET", signal },
  );
  return rows?.[0] ?? null;
}

export type ConditionalJobUpdateResult =
  | { ok: true; row: NativeGenerationJobRow }
  | { ok: false; reason: "already_terminal_or_changed"; current: NativeGenerationJobRow | null };

/** A physical status CAS prevents stale snapshots from rewriting changed jobs. */
export async function patchJob(
  ownerId: string,
  jobId: string,
  patch: Record<string, unknown>,
  expectedStatus: JobRow["status"],
  reconcileToken?: string | null,
): Promise<ConditionalJobUpdateResult> {
  if (isGenerationTerminalStatus(expectedStatus)) {
    return { ok: false, reason: "already_terminal_or_changed", current: await getJobRow(ownerId, jobId) };
  }
  // Atomic terminalization is available only after the separately applied 0031
  // migration. A missing RPC alone falls back to the old status-CAS PATCH.
  if (patch.status === "succeeded" || patch.status === "failed" || patch.status === "cancelled") {
    const atomic = await tryAtomicTerminalizeGeneration({
      ownerId,
      jobId,
      expectedStatus,
      terminalStatus: patch.status,
      assetId: Array.isArray(patch.output_asset_ids) && typeof patch.output_asset_ids[0] === "string"
        ? patch.output_asset_ids[0] : null,
      errorCode: typeof patch.error_code === "string" ? patch.error_code : null,
      errorMessage: typeof patch.error_message === "string" ? patch.error_message : null,
      reconcileToken: reconcileToken ?? null,
      failoverHistory: Array.isArray(patch.failover_history)
        ? patch.failover_history as Array<Record<string, unknown>> : null,
    });
    if (atomic !== null) {
      const current = await getJobRow(ownerId, jobId);
      if (atomic.outcome === "applied" && current) return { ok: true, row: current };
      return { ok: false, reason: "already_terminal_or_changed", current };
    }
  }
  const rows = await supabaseRest<JobRow[]>(
    `generation_jobs?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(jobId)}&status=eq.${encodeURIComponent(expectedStatus)}&select=*`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
    },
  );
  if (rows?.[0]) return { ok: true, row: rows[0] };
  return { ok: false, reason: "already_terminal_or_changed", current: await getJobRow(ownerId, jobId) };
}

/** Callers receive both the latest row and whether this PATCH actually committed. */
export async function patchJobRow(row: JobRow, patch: Record<string, unknown>) {
  const outcome = await patchJob(row.owner_id, row.id, patch, row.status, row.reconcile_token);
  if (outcome.ok) return { applied: true as const, row: outcome.row };
  if (!outcome.current) throw new Error("Generation job disappeared during status-conditional update.");
  return { applied: false as const, row: outcome.current };
}

async function errorBody(response: Response) {
  try { return await response.json() as Record<string, unknown>; } catch { return {}; }
}

function gatewayUrlForWorker(worker: GenerationWorker) {
  if (envFlag("RENDERLAB_TEST_NATIVE_WORKER_OVERRIDE")) {
    const override = envString("RENDERLAB_TEST_NATIVE_WORKER_GATEWAY_URL")?.trim().replace(/\/+$/, "");
    if (!override) throw new Error("Native worker test override requires a gateway URL.");
    return override;
  }
  return worker.gatewayUrl;
}

async function prepareWorkerSubmission(workflow: WorkflowConfig, request: GenerationRequest, sources: InputBytes[], maskBytes?: Buffer): Promise<{ body: string | FormData; contentType?: string }> {
  if (Boolean(request.mask) !== Boolean(maskBytes)
    || (maskBytes && (workflow.ecosystem !== fiboGenerationModel || sources.length !== 1))) {
    throw new Error("FIBO masked edit payload is incomplete or has invalid source slots.");
  }
  if (workflow.ecosystem === fiboGenerationModel) {
    return buildFiboWorkerPayload(request, sources, maskBytes);
  }
  const prepared = await prepareWorkerPayload(request, workflow, sources);
  return { body: buildForm(request, workflow, prepared) };
}

function dispatchWorker(worker: GenerationWorker, workflow: WorkflowConfig, submission: Awaited<ReturnType<typeof prepareWorkerSubmission>>) {
  const options = workerGatewayOptions(worker);
  const headers = new Headers(options.headers);
  if (submission.contentType) headers.set("content-type", submission.contentType);
  const origin = worker.policy?.transport === "modal-proxy" ? worker.gatewayUrl : gatewayUrlForWorker(worker);
  return fetch(origin + workflow.submitPath, {
    ...options, method: "POST", body: submission.body, headers, cache: "no-store",
  });
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

function extensionFor(contentType: string) {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/webp") return "webp";
  if (contentType === "video/webm") return "webm";
  if (contentType === "video/quicktime") return "mov";
  if (contentType.startsWith("video/")) return "mp4";
  return "png";
}

function contentTypeMatchesKind(kind: JobRow["output_kind"], contentType: string) {
  return kind === "image" ? contentType.startsWith("image/") : contentType.startsWith("video/");
}

async function findDurableObject(
  prefix: string,
  extensions: readonly string[],
  expectedKind: "image" | "video",
): Promise<DurableOutputObject | null> {
  for (const extension of extensions) {
    const storageKey = `${prefix}.${extension}`;
    try {
      const object = await headR2Object(storageKey);
      if (contentTypeMatchesKind(expectedKind, object.contentType)) {
        return { storageKey, contentType: object.contentType };
      }
    } catch {
      // A deterministic candidate that does not exist is expected during ordinary polling.
    }
  }
  return null;
}

async function getGeneratedOutput(row: JobRow, outputIndex: number) {
  const rows = await supabaseRest<GeneratedMediaRow[]>(
    `media_assets?owner_id=eq.${encodeURIComponent(row.owner_id)}&generation_job_id=eq.${encodeURIComponent(row.id)}&generation_output_index=eq.${outputIndex}&select=id,storage_key,thumbnail_storage_key,mime_type&limit=1`,
    { method: "GET" },
  );
  return rows?.[0] ?? null;
}

async function completeJobWithAsset(row: JobRow, assetId: string) {
  return (await patchJobRow(row, {
    status: "succeeded",
    worker_state: "ready",
    output_asset_ids: [assetId],
    completed_at: new Date().toISOString(),
    error_code: null,
    error_message: null,
  })).row;
}

async function persistGeneratedMedia({
  row,
  outputIndex,
  assetId,
  contentType,
  storageKey,
  thumbnailStorageKey,
  upscaleMetadata,
}: {
  row: JobRow;
  outputIndex: number;
  assetId: string;
  contentType: string;
  storageKey: string;
  thumbnailStorageKey: string | null;
  upscaleMetadata?: UpscaleOutputMetadata | null;
}) {
  try {
    await supabaseRest("media_assets", {
      method: "POST",
      body: JSON.stringify({
        id: assetId,
        owner_id: row.owner_id,
        generation_job_id: row.id,
        generation_output_index: outputIndex,
        kind: row.output_kind,
        mime_type: contentType,
        storage_key: storageKey,
        thumbnail_storage_key: thumbnailStorageKey,
        ...(upscaleMetadata
          ? {
              size_bytes: upscaleMetadata.sizeBytes,
              width: upscaleMetadata.width,
              height: upscaleMetadata.height,
            }
          : {}),
        provenance: {
          operation: row.operation,
          workflowId: row.workflow_id,
          model: row.model,
          prompt: row.prompt,
          ...(typeof row.parameters.generatedVgl === "string"
            ? { generatedVgl: row.parameters.generatedVgl, vglSource: "fibo-public-qwen3vl" } : {}),
        },
        metadata: { ecosystem: row.ecosystem, workerId: row.worker_id },
      }),
    });
  } catch (error) {
    const raced = await getGeneratedOutput(row, outputIndex).catch(() => null);
    if (!raced) throw error;
    return completeJobWithAsset(row, raced.id);
  }

  injectGenerationFinalizationFault("after-media-insert");
  return completeJobWithAsset(row, assetId);
}

export async function recoverPersistingResult(row: JobRow) {
  if (row.status !== "persisting") return null;

  const outputIndex = 0;
  const existing = await getGeneratedOutput(row, outputIndex);
  if (existing) return completeJobWithAsset(row, existing.id);

  const assetId = deterministicGenerationAssetId(row.id, outputIndex);
  const primary = await findDurableObject(
    generationOutputStoragePrefix(row, assetId),
    possibleGenerationOutputExtensions(row.output_kind),
    row.output_kind,
  );
  if (!primary) return null;
  if (row.operation === "upscale-image" && primary.contentType !== "image/png") return null;

  let upscaleMetadata: UpscaleOutputMetadata | null = null;
  if (row.operation === "upscale-image") {
    const object = await readR2Object(primary.storageKey);
    upscaleMetadata = await inspectUpscaleOutputMetadata(object.bytes, primary.contentType);
  }

  let thumbnailStorageKey: string | null = null;
  if (row.output_kind === "image") {
    try {
      const object = await readR2Object(primary.storageKey);
      const thumbnailBytes = await createImageThumbnailBytes(object.bytes);
      const thumbnailKey = imageThumbnailStorageKey(assetId, primary.storageKey, row.created_at);
      await writeR2Object({
        key: thumbnailKey,
        contentType: IMAGE_THUMBNAIL_CONTENT_TYPE,
        body: thumbnailBytes,
      });
      thumbnailStorageKey = thumbnailKey;
    } catch {
      thumbnailStorageKey = null;
    }
  } else {
    const thumbnail = await findDurableObject(
      generationThumbnailStoragePrefix(row, assetId),
      possibleGenerationThumbnailExtensions(),
      "image",
    );
    thumbnailStorageKey = thumbnail?.storageKey ?? null;
  }

  return persistGeneratedMedia({
    row,
    outputIndex,
    assetId,
    contentType: primary.contentType,
    storageKey: primary.storageKey,
    thumbnailStorageKey,
    upscaleMetadata,
  });
}

export async function persistResult(row: JobRow, bytes: Buffer, contentType: string, poster?: { bytes: Buffer; contentType: string } | null) {
  const outputIndex = 0;
  const existing = await getGeneratedOutput(row, outputIndex);
  if (existing) return completeJobWithAsset(row, existing.id);

  const upscaleMetadata = row.operation === "upscale-image"
    ? await inspectUpscaleOutputMetadata(bytes, contentType)
    : null;
  const assetId = deterministicGenerationAssetId(row.id, outputIndex);
  const storageKey = `${generationOutputStoragePrefix(row, assetId)}.${extensionFor(contentType)}`;
  injectGenerationFinalizationFault("before-primary-write");
  await writeR2Object({ key: storageKey, contentType, body: bytes });
  injectGenerationFinalizationFault("after-primary-write");

  let thumbnailStorageKey: string | null = null;
  if (row.output_kind === "image" && contentType.startsWith("image/")) {
    const thumbnailKey = imageThumbnailStorageKey(assetId, storageKey, row.created_at);
    try {
      const thumbnailBytes = await createImageThumbnailBytes(bytes);
      await writeR2Object({
        key: thumbnailKey,
        contentType: IMAGE_THUMBNAIL_CONTENT_TYPE,
        body: thumbnailBytes,
      });
      thumbnailStorageKey = thumbnailKey;
    } catch {
      thumbnailStorageKey = null;
    }
  } else if (poster?.bytes?.length && poster.contentType.startsWith("image/")) {
    const posterKey = `${generationThumbnailStoragePrefix(row, assetId)}.${extensionFor(poster.contentType)}`;
    try {
      injectGenerationFinalizationFault("thumbnail-write");
      await writeR2Object({ key: posterKey, contentType: poster.contentType, body: poster.bytes });
      thumbnailStorageKey = posterKey;
    } catch {
      thumbnailStorageKey = null;
    }
  }

  return persistGeneratedMedia({
    row,
    outputIndex,
    assetId,
    contentType,
    storageKey,
    thumbnailStorageKey,
    upscaleMetadata,
  });
}

/** Same owner-assigned, signed native worker call as the PNG poll.
 * A generated caption is fetched and persisted BEFORE the image finalization
 * transitions to persisting, so recovery cannot lose its provenance.
 */
class InvalidGeneratedFiboSidecarError extends Error {}

async function getGeneratedFiboCaption(worker: GenerationWorker, callId: string, timeoutMs?: number): Promise<string> {
  const { url, options } = workerJobRequest(worker, callId, "/vgl", timeoutMs);
  const headers = new Headers(options.headers);
  headers.set("accept", "application/json");
  const response = await fetch(url, {
    ...options, method: "GET", headers, cache: "no-store",
  });
  if (response.status === 202) throw new Error("Generated FIBO VGL is still being prepared.");
  if ([404, 410, 422, 502].includes(response.status)) {
    throw new InvalidGeneratedFiboSidecarError("Generated FIBO VGL is absent or could not be validated.");
  }
  if (!response.ok) throw new Error("Generated FIBO VGL sidecar is temporarily unavailable.");
  const payload: unknown = await response.json().catch(() => null);
  if (timeoutMs) options.signal?.throwIfAborted();
  const caption = parseGeneratedFiboSidecar(payload);
  if (!caption) throw new InvalidGeneratedFiboSidecarError("Generated FIBO VGL sidecar returned invalid JSON.");
  return caption;
}

async function fetchPoster(worker: GenerationWorker, callId: string, timeoutMs?: number) {
  try {
    const response = await fetch(`${worker.gatewayUrl}/jobs/${encodeURIComponent(callId)}/poster`, {
      headers: { accept: "image/*, application/json" },
      signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined,
      cache: "no-store",
    });
    if (!response.ok) return null;
    const contentType = String(response.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
    if (!contentType.startsWith("image/")) return null;
    return { bytes: Buffer.from(await response.arrayBuffer()), contentType };
  } catch {
    return null;
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
  return (await patchJobRow(row, {
    status: "failed",
    error_code: code,
    error_message: message,
    completed_at: new Date().toISOString(),
    ...(diagnostic ? { failover_history: [...(row.failover_history || []), diagnostic] } : {}),
  })).row;
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

    if (failure.safeToReassign) {
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
  const persistTransition = await patchJobRow(row, {
    status: "persisting",
    worker_state: "finalizing",
    ...(generatedVgl ? {
      parameters: { ...row.parameters, generatedVgl, generatedVglSource: "fibo-public-qwen3vl" },
    } : {}),
  });
  if (!persistTransition.applied) return toGenerationJob(persistTransition.row);
  const persisting = persistTransition.row;
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
