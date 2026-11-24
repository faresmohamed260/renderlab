import { fiboGenerationModel, type GenerationRequest } from "@/lib/capabilities/generation";
import { buildFiboWorkerPayload } from "@/server/generation/fibo-worker-payload";
import { classifyWorkerFailure } from "@/server/generation/worker-failure";
import { workerJobRequest, type GenerationWorker } from "@/server/generation/worker-fleet";

/**
 * Provider-only FIBO boundary. The application resolves and authorizes inputs,
 * accepts a durable job and outbox row, owns claims and persists output.
 *
 * PREPARE is NOT a network submit: the existing durable outbox is the sole
 * authorized provider submission path. Never POST again after outbox acceptance.
 * The legacy createFiboAdapter facade is intentionally NOT used by this port.
 */
export type FiboPreparedSource = { bytes: Buffer };
export type FiboProviderCancellationOutcome =
  | { kind: "confirmed"; status: number }
  | { kind: "not-running"; status: number }
  | { kind: "retryable"; status: number | null; reason: string };

const detailCategories = new Map([
  ["Unknown FIBO job", "unknown-job"],
  ["FIBO result expired", "result-expired"],
  ["FIBO rejected the render inputs", "inputs-rejected"],
  ["FIBO_PROCESS_EXITED", "process-exited"],
  ["FIBO_RENDER_TIMED_OUT", "render-timed-out"],
]);

function assertFiboWorker(worker: GenerationWorker) {
  if (worker.ecosystem !== fiboGenerationModel || worker.policy?.transport !== "modal-proxy") {
    throw new Error("FIBO provider boundary requires the signed FIBO worker.");
  }
}

export function prepareFiboProviderSubmission(
  request: GenerationRequest, sources: readonly FiboPreparedSource[], maskBytes?: Buffer,
) {
  // Byte-for-byte existing FIBO JSON encoding; source and mask authorization
  // belongs to the application and is completed BEFORE this call.
  return buildFiboWorkerPayload(request, sources, maskBytes);
}

export async function readFiboProviderStatus(
  worker: GenerationWorker, callId: string, outputKind: "image" | "video", timeoutMs?: number,
) {
  assertFiboWorker(worker);
  const { url, options } = workerJobRequest(worker, callId, "", timeoutMs);
  const headers = new Headers(options.headers);
  headers.set("accept", outputKind === "video" ? "video/*, application/json" : "image/*, application/json");
  const response = await fetch(url, {
    ...options, method: "GET", headers,
    cache: "no-store",
  });
  // The application still controls pending/ready/failed transitions and
  // deadline handling. Return the exact response and abort signal.
  return { response, options };
}

/** Final deadline observation uses separate bounded header/body phases on the
 * same signed GET. Drain the body before fetching generated VGL so the image
 * transport cannot expire while an unrelated sidecar request is in flight. */
export async function readFiboProviderFinalStatus(
  worker: GenerationWorker, callId: string, outputKind: "image" | "video", timeoutMs = 4_000,
) {
  assertFiboWorker(worker);
  const { url, options: baseOptions } = workerJobRequest(worker, callId, "", 0);
  const controller = new AbortController();
  const options = { ...baseOptions, signal: controller.signal };
  const headers = new Headers(options.headers);
  headers.set("accept", outputKind === "video" ? "video/*, application/json" : "image/*, application/json");
  const timeout = () => setTimeout(() => controller.abort(new DOMException("FIBO observation timed out.", "TimeoutError")), timeoutMs);
  let timer = timeout();
  try {
    const response = await fetch(url, { ...options, method: "GET", headers, cache: "no-store" });
    controller.signal.throwIfAborted();
    clearTimeout(timer);
    timer = timeout();
    if (response.status === 202) {
      await response.body?.cancel();
      controller.signal.throwIfAborted();
      return { response, options, bytes: undefined };
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    controller.signal.throwIfAborted();
    // Keep the existing failure interpreter's Response contract. Successful
    // output is already buffered and is not read a second time.
    const observed = response.ok ? response : new Response(response.body === null ? null : bytes, {
      status: response.status, statusText: response.statusText, headers: response.headers,
    });
    return { response: observed, options, bytes: response.ok ? bytes : undefined };
  } finally {
    clearTimeout(timer);
  }
}

export function interpretFiboProviderFailure(status: number, body: Record<string, unknown>) {
  const failure = classifyWorkerFailure(status, body);
  const processExited = status === 409 && body.detail === "FIBO_PROCESS_EXITED";
  const renderTimedOut = status === 409 && body.detail === "FIBO_RENDER_TIMED_OUT";
  const terminal = (status === 410 && body.detail === "FIBO result expired")
    || (status === 422 && body.detail === "FIBO rejected the render inputs");
  return {
    failure,
    processExited,
    renderTimedOut,
    terminal,
    unconfirmed: !failure.retryable && !terminal,
    detailCategory: typeof body.detail === "string" ? detailCategories.get(body.detail) ?? "unknown" : "unknown",
  };
}

export async function cancelFiboProviderCall(
  worker: GenerationWorker, callId: string, timeoutMs = 10_000,
): Promise<FiboProviderCancellationOutcome> {
  assertFiboWorker(worker);
  const { url, options } = workerJobRequest(worker, callId, "", timeoutMs);
  const headers = new Headers(options.headers);
  headers.set("accept", "application/json");
  try {
    const response = await fetch(url, {
      ...options, method: "DELETE", headers, cache: "no-store",
    });
    if (response.ok) return { kind: "confirmed", status: response.status };
    if (response.status === 404 || response.status === 410) {
      return { kind: "not-running", status: response.status };
    }
    return { kind: "retryable", status: response.status, reason: "provider-unconfirmed" };
  } catch (error) {
    return {
      kind: "retryable",
      status: null,
      reason: error instanceof Error && error.name === "TimeoutError" ? "timeout" : "provider-unreachable",
    };
  }
}

/** Single provider port for the current FIBO worker, with no application I/O. */
export const fiboProvider = {
  id: "fibo",
  prepareDurableSubmission: prepareFiboProviderSubmission,
  status: readFiboProviderStatus,
  finalStatus: readFiboProviderFinalStatus,
  interpretFailure: interpretFiboProviderFailure,
  cancel: cancelFiboProviderCall,
} as const;
