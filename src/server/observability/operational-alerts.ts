import type { DiagnosticEvent } from "@/server/observability/diagnostics";

export type OperationalAlertFamily =
  | "generation-provider-degradation"
  | "maintenance-failure"
  | "account-deletion-stuck";

export type OperationalAlertSeverity = "warning" | "critical";

export type OperationalAlertCandidate = {
  alertKey: OperationalAlertFamily;
  family: OperationalAlertFamily;
  severity: OperationalAlertSeverity;
};

export type OperationalAlertEmailInput = {
  family: OperationalAlertFamily;
  severity: OperationalAlertSeverity;
  firstSeenAt: string;
  lastSeenAt: string;
  occurrenceCount: number;
};

export async function fanoutOperationalAlertNotification<T>(
  alert: T,
  recipients: string[],
  sendEmail: (email: string, alert: T) => Promise<boolean>,
) {
  let accepted = 0;
  let failed = 0;
  for (const email of recipients) {
    if (await sendEmail(email, alert)) accepted += 1;
    else failed += 1;
  }
  return { attempted: recipients.length, accepted, failed };
}

export const generationProviderAlertCodes = new Set([
  "generation_backend_unavailable",
  "generation_submission_failed",
  "generation_orchestration_stalled",
  "reconciliation_failed",
  "generation_worker_unavailable",
  "worker_credit_exhausted",
  "worker_unavailable",
  "generation_provider_stalled",
  "WORKER_CREDIT_EXHAUSTED",
  "WORKER_UNAVAILABLE",
  "PROVIDER_FAILED",
  "timeout",
  "provider-unreachable",
]);

export function isGenerationProviderAlertEvent(event: DiagnosticEvent) {
  return (
    (event.event === "generation.submission" || event.event === "generation.reconciliation")
    && typeof event.code === "string"
    && generationProviderAlertCodes.has(event.code)
  );
}

export function operationalAlertCandidateForEvent(
  event: DiagnosticEvent,
  recentGenerationProviderFailureCount = 0,
): OperationalAlertCandidate | null {
  if (
    event.event === "maintenance.pass"
    && typeof event.failureCount === "number"
    && event.failureCount > 0
  ) {
    return {
      alertKey: "maintenance-failure",
      family: "maintenance-failure",
      severity: "warning",
    };
  }

  if (
    event.event === "account.data_lifecycle"
    && event.phase === "deletion-retry"
    && typeof event.attempt === "number"
    && event.attempt >= 3
  ) {
    return {
      alertKey: "account-deletion-stuck",
      family: "account-deletion-stuck",
      severity: "critical",
    };
  }

  if (isGenerationProviderAlertEvent(event) && recentGenerationProviderFailureCount >= 3) {
    return {
      alertKey: "generation-provider-degradation",
      family: "generation-provider-degradation",
      severity: "warning",
    };
  }

  return null;
}

export function operationalAlertEmailContent(alert: OperationalAlertEmailInput) {
  const familyLabel = alert.family.replace(/-/g, " ");
  const count = Number.isFinite(alert.occurrenceCount)
    ? Math.max(1, Math.trunc(alert.occurrenceCount))
    : 1;
  return {
    subject: `[RenderLab ${alert.severity}] ${familyLabel}`,
    html: [
      "<p><strong>RenderLab operational alert</strong></p>",
      `<p>Family: ${familyLabel}</p>`,
      `<p>Severity: ${alert.severity}</p>`,
      `<p>First seen: ${alert.firstSeenAt}</p>`,
      `<p>Last seen: ${alert.lastSeenAt}</p>`,
      `<p>Occurrences: ${count}</p>`,
      "<p>Inspect the fresh-admin Health section at /admin for bounded diagnostic context.</p>",
      "<p>This notification intentionally omits account, prompt, media, job, provider, worker, and storage identity.</p>",
    ].join(""),
  };
}
