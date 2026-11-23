export type WorkerFailureClassification = {
  retryable: boolean;
  safeToReassign: boolean;
  kind: "credit_exhausted" | "unavailable" | "failed";
  code: "WORKER_CREDIT_EXHAUSTED" | "WORKER_UNAVAILABLE" | "PROVIDER_FAILED";
};

export function classifyWorkerFailure(status: number, body: Record<string, unknown>): WorkerFailureClassification {
  const explicitState = String(body.workerState || body.worker_state || "").trim().toLowerCase();
  const explicitCode = String(body.errorCode || body.code || "").trim().toUpperCase();

  if (status === 402 || explicitState === "credit_exhausted" || explicitCode === "WORKER_CREDIT_EXHAUSTED") {
    return { retryable: true, safeToReassign: true, kind: "credit_exhausted", code: "WORKER_CREDIT_EXHAUSTED" };
  }
  if (explicitState === "unavailable" || explicitCode === "WORKER_UNAVAILABLE") {
    return { retryable: true, safeToReassign: true, kind: "unavailable", code: "WORKER_UNAVAILABLE" };
  }

  if (status === 429 || status >= 500) {
    return { retryable: true, safeToReassign: false, kind: "unavailable", code: "WORKER_UNAVAILABLE" };
  }
  return { retryable: false, safeToReassign: false, kind: "failed", code: "PROVIDER_FAILED" };
}

export function failureKind(status: number, body: Record<string, unknown>) {
  return classifyWorkerFailure(status, body).kind;
}
