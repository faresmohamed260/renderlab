import { envFlag, envString } from "../../lib/config/runtime-env.ts";
import { fiboProvider } from "@/server/generation/adapters/fibo-provider-port";
import { parseGeneratedFiboSidecar } from "@/lib/capabilities/fibo-generated-vgl";
import { fiboGenerationModel, type GenerationRequest } from "@/lib/capabilities/generation";
import { workerGatewayOptions, workerJobRequest, workersForEcosystem, type GenerationWorker } from "@/server/generation/worker-fleet";
import { prepareWorkerPayload, buildForm, type WorkflowConfig } from "@/server/generation/native-generation-legacy-workflows";
import type { InputBytes } from "@/server/generation/native-generation-worker-inputs";

// Transport-only implementation. No database, owner identity or lifecycle writes.

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

export async function errorBody(response: Response) {
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

export async function prepareWorkerSubmission(workflow: WorkflowConfig, request: GenerationRequest, sources: InputBytes[], maskBytes?: Buffer): Promise<{ body: string | FormData; contentType?: string }> {
  if (Boolean(request.mask) !== Boolean(maskBytes)
    || (maskBytes && (workflow.ecosystem !== fiboGenerationModel || sources.length !== 1))) {
    throw new Error("FIBO masked edit payload is incomplete or has invalid source slots.");
  }
  if (workflow.ecosystem === fiboGenerationModel) {
    return fiboProvider.prepareDurableSubmission(request, sources, maskBytes);
  }
  const prepared = await prepareWorkerPayload(request, workflow, sources);
  return { body: buildForm(request, workflow, prepared) };
}

export function dispatchWorker(worker: GenerationWorker, workflow: WorkflowConfig, submission: Awaited<ReturnType<typeof prepareWorkerSubmission>>) {
  const options = workerGatewayOptions(worker);
  const headers = new Headers(options.headers);
  if (submission.contentType) headers.set("content-type", submission.contentType);
  const origin = worker.policy?.transport === "modal-proxy" ? worker.gatewayUrl : gatewayUrlForWorker(worker);
  return fetch(origin + workflow.submitPath, {
    ...options, method: "POST", body: submission.body, headers, cache: "no-store",
  });
}

/** Same owner-assigned, signed native worker call as the PNG poll.
 * A generated caption is fetched and persisted BEFORE the image finalization
 * transitions to persisting, so recovery cannot lose its provenance.
 */
export class InvalidGeneratedFiboSidecarError extends Error {}

export async function getGeneratedFiboCaption(worker: GenerationWorker, callId: string, timeoutMs?: number): Promise<string> {
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

export async function fetchPoster(worker: GenerationWorker, callId: string, timeoutMs?: number) {
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
