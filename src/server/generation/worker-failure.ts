export type WorkerFailureClassification = {
  retryable: boolean;
  safeToReassign: boolean;
  kind: "credit_exhausted" | "unavailable" | "failed";
  code: "WORKER_CREDIT_EXHAUSTED" | "WORKER_UNAVAILABLE" | "PROVIDER_FAILED";
};

const creditPatterns = [
  "credit",
  "credits",
  "quota",
  "budget",
  "billing",
  "payment",
  "insufficient",
  "spending limit",
  "spend limit",
  "workspace budget",
  "out of funds",
  "balance",
];
const explicitUnavailablePatterns = [
  "workspace is disabled",
  "workspace disabled",
  "disabled workspace",
  "temporarily unavailable",
  "app is stopped",
  "app stopped",
];

function workerFailureText(body: Record<string, unknown>) {
  return [body.error, body.detail, body.errorCode, body.code, body.workerState, body.worker_state]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function classifyWorkerFailure(status: number, body: Record<string, unknown>): WorkerFailureClassification {
  const explicitState = String(body.workerState || body.worker_state || "").trim().toLowerCase();
  const explicitCode = String(body.errorCode || body.code || "").trim().toUpperCase();

  if (status === 402 || explicitState === "credit_exhausted" || explicitCode === "WORKER_CREDIT_EXHAUSTED") {
    return { retryable: true, safeToReassign: true, kind: "credit_exhausted", code: "WORKER_CREDIT_EXHAUSTED" };
  }
  if (explicitState === "unavailable" || explicitCode === "WORKER_UNAVAILABLE") {
    return { retryable: true, safeToReassign: true, kind: "unavailable", code: "WORKER_UNAVAILABLE" };
  }

  const text = workerFailureText(body);
  if (creditPatterns.some((pattern) => text.includes(pattern))) {
    return { retryable: true, safeToReassign: true, kind: "credit_exhausted", code: "WORKER_CREDIT_EXHAUSTED" };
  }
  if (explicitUnavailablePatterns.some((pattern) => text.includes(pattern))) {
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
