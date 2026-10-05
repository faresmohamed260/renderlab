import assert from "node:assert/strict";
import test from "node:test";

import {
  fanoutOperationalAlertNotification,
  generationProviderAlertCodes,
  operationalAlertCandidateForEvent,
  operationalAlertEmailContent,
} from "../../src/server/observability/operational-alerts.ts";

function diagnostic(overrides = {}) {
  return {
    event: "generation.reconciliation",
    level: "warn",
    timestamp: "2026-10-05T16:00:00.000Z",
    correlationId: "opaque-correlation",
    ...overrides,
  };
}

test("generation provider alert opens only at the third qualifying failure", () => {
  const event = diagnostic({ code: "generation_provider_stalled" });
  assert(generationProviderAlertCodes.has(event.code));
  assert.equal(operationalAlertCandidateForEvent(event, 2), null);
  assert.deepEqual(operationalAlertCandidateForEvent(event, 3), {
    alertKey: "generation-provider-degradation",
    family: "generation-provider-degradation",
    severity: "warning",
  });
});

test("ordinary admission/input rejections do not become operational alerts", () => {
  for (const code of ["invalid_request", "generation_active_limit_reached", "generation_rate_limit_reached"]) {
    assert.equal(
      operationalAlertCandidateForEvent(diagnostic({ event: "generation.submission", code }), 99),
      null,
    );
  }
});

test("maintenance failure opens immediately and clean maintenance stays quiet", () => {
  assert.equal(
    operationalAlertCandidateForEvent(diagnostic({ event: "maintenance.pass", phase: "media-purges", failureCount: 0 })),
    null,
  );
  assert.deepEqual(
    operationalAlertCandidateForEvent(diagnostic({ event: "maintenance.pass", phase: "media-purges", failureCount: 1 })),
    {
      alertKey: "maintenance-failure",
      family: "maintenance-failure",
      severity: "warning",
    },
  );
});

test("account deletion opens a critical alert only from the third durable retry", () => {
  assert.equal(
    operationalAlertCandidateForEvent(diagnostic({ event: "account.data_lifecycle", phase: "deletion-retry", attempt: 2 })),
    null,
  );
  assert.deepEqual(
    operationalAlertCandidateForEvent(diagnostic({ event: "account.data_lifecycle", phase: "deletion-retry", attempt: 3 })),
    {
      alertKey: "account-deletion-stuck",
      family: "account-deletion-stuck",
      severity: "critical",
    },
  );
});

test("notification fanout is non-fatal and reports stubbed delivery failure", async () => {
  const result = await fanoutOperationalAlertNotification(
    { family: "maintenance-failure" },
    ["operator@example.invalid"],
    async () => false,
  );
  assert.deepEqual(result, { attempted: 1, accepted: 0, failed: 1 });
});

test("operational alert email renders only bounded alert metadata", () => {
  const input = {
    family: "generation-provider-degradation",
    severity: "warning",
    firstSeenAt: "2026-10-05T16:00:00.000Z",
    lastSeenAt: "2026-10-05T16:15:00.000Z",
    occurrenceCount: 3,
    prompt: "SECRET_PROMPT",
    email: "secret@example.com",
    jobId: "SECRET_JOB",
    provider: "SECRET_PROVIDER",
    storageKey: "SECRET_R2_KEY",
  };
  const content = operationalAlertEmailContent(input);
  const serialized = JSON.stringify(content);
  for (const forbidden of ["SECRET_PROMPT", "secret@example.com", "SECRET_JOB", "SECRET_PROVIDER", "SECRET_R2_KEY"]) {
    assert(!serialized.includes(forbidden));
  }
  assert.match(content.subject, /generation provider degradation/i);
  assert.match(content.html, /Occurrences: 3/);
  assert.match(content.html, /\/admin/);
});
