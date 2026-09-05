from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


native_path = Path("src/server/generation/native-generation.ts")
native = native_path.read_text()
native = replace_once(
    native,
    'import { injectGenerationFinalizationFault } from "@/server/generation/finalization-faults";\n',
    'import { injectGenerationFinalizationFault } from "@/server/generation/finalization-faults";\nimport { failureKind } from "@/server/generation/worker-failure";\n',
    "native classifier import",
)
native = replace_once(
    native,
    '''type WorkerFailureClassification = {
  retryable: boolean;
  safeToReassign: boolean;
  kind: "credit_exhausted" | "unavailable" | "failed";
  code: "WORKER_CREDIT_EXHAUSTED" | "WORKER_UNAVAILABLE" | "PROVIDER_FAILED";
};

''',
    "",
    "native classifier type",
)
native = replace_once(
    native,
    '''const creditPatterns = [
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

''',
    "",
    "native classifier pattern constants",
)
native = replace_once(
    native,
    '''function workerFailureText(body: Record<string, unknown>) {
  return [body.error, body.detail, body.errorCode, body.code, body.workerState, body.worker_state]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function classifyWorkerFailure(status: number, body: Record<string, unknown>): WorkerFailureClassification {
  const text = workerFailureText(body);
  const explicitState = String(body.workerState || body.worker_state || "").trim().toLowerCase();
  const explicitCode = String(body.errorCode || body.code || "").trim().toUpperCase();
  const credit = status === 402
    || explicitState === "credit_exhausted"
    || explicitCode === "WORKER_CREDIT_EXHAUSTED"
    || creditPatterns.some((pattern) => text.includes(pattern));
  if (credit) {
    return { retryable: true, safeToReassign: true, kind: "credit_exhausted", code: "WORKER_CREDIT_EXHAUSTED" };
  }

  const explicitUnavailable = explicitState === "unavailable"
    || explicitCode === "WORKER_UNAVAILABLE"
    || explicitUnavailablePatterns.some((pattern) => text.includes(pattern));
  if (explicitUnavailable) {
    return { retryable: true, safeToReassign: true, kind: "unavailable", code: "WORKER_UNAVAILABLE" };
  }

  if (status === 429 || status >= 500) {
    return { retryable: true, safeToReassign: false, kind: "unavailable", code: "WORKER_UNAVAILABLE" };
  }
  return { retryable: false, safeToReassign: false, kind: "failed", code: "PROVIDER_FAILED" };
}

function failureKind(status: number, body: Record<string, unknown>) {
  return classifyWorkerFailure(status, body).kind;
}

''',
    "",
    "native classifier functions",
)
native_path.write_text(native)

worker_path = Path("src/server/generation/worker-failure.ts")
worker = worker_path.read_text()
worker = replace_once(
    worker,
    '''function workerFailureText(body: Record<string, unknown>) {
  return [body.error, body.detail]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
''',
    '''function workerFailureText(body: Record<string, unknown>) {
  return [body.error, body.detail, body.errorCode, body.code, body.workerState, body.worker_state]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
''',
    "worker classifier compatibility text",
)
worker_path.write_text(worker)

ui_path = Path("src/features/admin/admin-operations.tsx")
ui = ui_path.read_text()
ui = replace_once(
    ui,
    '''              "Stale source candidates": snapshot.health.maintenanceBacklog.staleSourceCandidates.count,
              "Cleaning sources": snapshot.health.maintenanceBacklog.cleaningSources.count,
              "Stale upload candidates": snapshot.health.maintenanceBacklog.staleUploadCandidates.count,
              "Cleaning uploads": snapshot.health.maintenanceBacklog.cleaningUploads.count,
              "Pending media purges": snapshot.health.maintenanceBacklog.pendingMediaPurges.count,
''',
    '''              "Stale source candidates": displayBoundedCount(snapshot.health.maintenanceBacklog.staleSourceCandidates),
              "Cleaning sources": displayBoundedCount(snapshot.health.maintenanceBacklog.cleaningSources),
              "Stale upload candidates": displayBoundedCount(snapshot.health.maintenanceBacklog.staleUploadCandidates),
              "Cleaning uploads": displayBoundedCount(snapshot.health.maintenanceBacklog.cleaningUploads),
              "Pending media purges": displayBoundedCount(snapshot.health.maintenanceBacklog.pendingMediaPurges),
''',
    "bounded maintenance UI",
)
ui = replace_once(
    ui,
    'function HealthCounts({ title, counts }: { title: string; counts: Record<string, number> }) {\n',
    'function HealthCounts({ title, counts }: { title: string; counts: Record<string, ReactNode> }) {\n',
    "health count value type",
)
ui_path.write_text(ui)

verifier_path = Path("scripts/verify-admin-operations.mjs")
verifier = verifier_path.read_text()
verifier = replace_once(
    verifier,
    '''        error_code: "WORKER_CREDIT_EXHAUSTED",
        error_message: `raw backend error ${secretMarker}`,
        completed_at: new Date().toISOString(),
''',
    '''        error_code: "WORKER_CREDIT_EXHAUSTED",
        error_message: `raw backend error ${secretMarker}`,
        failover_history: [{
          kind: "unavailable",
          workerId: `private-worker-${runToken}`,
          at: new Date().toISOString(),
        }],
        completed_at: new Date().toISOString(),
''',
    "admin failover fixture",
)
verifier = replace_once(
    verifier,
    '''  await expectOk(response, "Could not seed Admin health fixture jobs");
  return secretMarker;
}
''',
    '''  await expectOk(response, "Could not seed Admin health fixture jobs");
  await expectOk(
    await serviceRest("generation_admission_reservations", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        owner_id: ownerId,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      }),
    }),
    "Could not seed Admin health admission fixture",
  );
  return secretMarker;
}
''',
    "admin admission fixture",
)
verifier = replace_once(
    verifier,
    '''  assert(Number.isInteger(healthPayload?.health?.recentJobs?.sampleSize), "Admin health is missing the bounded recent-job sample.");
  assert(Number.isInteger(healthPayload?.health?.activeStateAge?.sampleSize), "Admin health is missing active-state age aggregation.");
  assert(Number.isInteger(healthPayload?.health?.capacity?.activeReservations?.count), "Admin health is missing bounded admission capacity.");
''',
    '''  assert(Number.isInteger(healthPayload?.health?.recentJobs?.sampleSize), "Admin health is missing the bounded recent-job sample.");
  assert(Number(healthPayload?.health?.recentJobs?.completionTiming?.sampleCount) >= 1, "Admin health missed run-owned completion timing.");
  assert(Number(healthPayload?.health?.recentJobs?.failovers?.jobsWithFailover) >= 1, "Admin health missed run-owned failover incidence.");
  assert(Number(healthPayload?.health?.recentJobs?.failovers?.eventCount) >= 1, "Admin health missed run-owned failover events.");
  assert(Number(healthPayload?.health?.activeStateAge?.sampleSize) >= 1, "Admin health missed run-owned active-state age aggregation.");
  assert(Number(healthPayload?.health?.capacity?.activeReservations?.count) >= 1, "Admin health missed the run-owned active admission reservation.");
''',
    "admin aggregate evidence assertions",
)
verifier_path.write_text(verifier)
