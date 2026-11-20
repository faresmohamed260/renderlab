export type GenerationWorker = {
  id: string;
  ecosystem: "flux2-klein-9b" | "ltx25-redgraft" | "qwen-image-edit-2511" | "fibo2-edit-turbo";
  gatewayUrl: string;
  policy?: {
    transport: "modal-proxy";
    cancellation: boolean;
    reassignment: boolean;
    retryAmbiguousSubmit: boolean;
    resultMime: string;
    timeoutMs: number;
  };
  displayName: string;
  role: "primary" | "standby";
  routingStatus: "active" | "disabled";
};

const modalGatewayOriginPattern = /^https:\/\/(?:[a-z0-9-]+\.)+modal\.run$/;

const FIBO_WORKER_ID = "renderlab-fibo-native-01";
export const FIBO_DISPATCH_BACKEND = "fibo";

// The sole live RenderLab worker is configured from server-only FIBO settings
// below. Legacy FLUX, Qwen and LTX registrations were deliberately removed:
// no new job can route to a retired Modal worker.
export const generationWorkers: GenerationWorker[] = [];

function configuredFiboWorker(): GenerationWorker | null {
  const url = (process.env.RENDERLAB_GENERATION_GATEWAY_URL?.trim() ||
    process.env.RENDERLAB_FIBO_GATEWAY_URL?.trim())?.replace(/\/$/, "");
  const key = process.env.RENDERLAB_FIBO_MODAL_KEY?.trim();
  const secret = process.env.RENDERLAB_FIBO_MODAL_SECRET?.trim();
  if (!url || !key || !secret || !modalGatewayOriginPattern.test(url)) return null;
  return { id: FIBO_WORKER_ID, ecosystem: "fibo2-edit-turbo", gatewayUrl: url,
    policy: { transport: "modal-proxy", cancellation: true, reassignment: false,
      retryAmbiguousSubmit: false, resultMime: "image/png", timeoutMs: 30_000 },
    displayName: "Bria FIBO 2.0 Edit Turbo", role: "primary", routingStatus: "active" };
}

function fiboWorkerHeaders() {
  return {
    "Modal-Key": process.env.RENDERLAB_FIBO_MODAL_KEY!.trim(),
    "Modal-Secret": process.env.RENDERLAB_FIBO_MODAL_SECRET!.trim(),
  };
}

export function workerSupportsCancellation(worker: GenerationWorker) {
  return worker.policy?.cancellation ?? (worker.ecosystem === "flux2-klein-9b" || worker.ecosystem === "ltx25-redgraft");
}

export function workerGatewayOptions(worker: GenerationWorker, timeoutMs = worker.policy?.timeoutMs): RequestInit {
  return {
    ...(worker.policy?.transport === "modal-proxy" ? { headers: fiboWorkerHeaders(), redirect: "error" as const } : {}),
    ...(timeoutMs ? { signal: AbortSignal.timeout(timeoutMs) } : {}),
  };
}

export function workerJobRequest(
  worker: GenerationWorker,
  callId: string,
  suffix: "" | "/vgl" = "",
  timeoutMs = worker.policy?.timeoutMs,
) {
  const options = workerGatewayOptions(worker, timeoutMs);
  if (worker.policy?.transport === "modal-proxy") {
    const headers = new Headers(options.headers);
    headers.set("X-RenderLab-Job-Handle", callId);
    return { url: `${worker.gatewayUrl}/jobs${suffix}`, options: { ...options, headers } };
  }
  return { url: `${worker.gatewayUrl}/jobs/${encodeURIComponent(callId)}${suffix}`, options };
}

export function acceptedWorkerCallId(worker: GenerationWorker, status: number, id: unknown): id is string {
  return typeof id === "string" && !!id && (worker.policy?.transport !== "modal-proxy"
    || (status === 202 && /^fc-[A-Za-z0-9]{16,64}\.[0-9a-f]{64}$/.test(id)));
}

function registeredWorkers() {
  const candidate = configuredFiboWorker();
  return candidate ? [...generationWorkers, candidate] : generationWorkers;
}

export function workersForEcosystem(ecosystem: GenerationWorker["ecosystem"]) {
  if (ecosystem === "fibo2-edit-turbo" && process.env.RENDERLAB_FIBO_GENERATION !== "1") return [];
  return registeredWorkers()
    .filter((worker) => worker.ecosystem === ecosystem && worker.routingStatus === "active")
    .sort((a, b) => (a.role === b.role ? a.id.localeCompare(b.id) : a.role === "primary" ? -1 : 1));
}

export function findWorker(workerId: string) {
  // Durable dispatch stores the backend key. Earlier jobs store the fleet ID.
  const fleetId = workerId === FIBO_DISPATCH_BACKEND ? FIBO_WORKER_ID : workerId;
  return registeredWorkers().find((worker) => worker.id === fleetId) ?? null;
}
