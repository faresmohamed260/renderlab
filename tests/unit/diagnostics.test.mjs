import assert from "node:assert/strict";
import test from "node:test";

import {
  correlationIdForGenerationJob,
  createDiagnosticCorrelationId,
  emitDiagnosticEvent,
  normalizeDiagnosticEvent,
} from "../../src/server/observability/diagnostics.ts";

test("diagnostic correlation is stable per job and distinct per operation", () => {
  assert.equal(correlationIdForGenerationJob("job-a"), correlationIdForGenerationJob("job-a"));
  assert.notEqual(correlationIdForGenerationJob("job-a"), correlationIdForGenerationJob("job-b"));
  assert.notEqual(createDiagnosticCorrelationId(), createDiagnosticCorrelationId());
});

test("diagnostic normalization only emits explicit typed bounded fields", () => {
  const event = normalizeDiagnosticEvent({
    event: "generation.submission",
    correlationId: "safe-correlation",
    jobId: "job-123",
    phase: "RAW_PHASE_SECRET",
    status: "RAW_STATUS_SECRET",
    code: "RAW_PROVIDER_SECRET",
    durationMs: -5,
    count: 2.8,
    ...({
      prompt: "SECRET_PROMPT",
      email: "secret@example.com",
      signedUrl: "https://signed.example/SECRET_QUERY",
      storageKey: "SECRET_R2_KEY",
      token: "SECRET_SESSION_TOKEN",
      rawProviderBody: "SECRET_PROVIDER_BODY",
    }),
  });
  const serialized = JSON.stringify(event);
  for (const forbidden of [
    "SECRET_PROMPT", "secret@example.com", "SECRET_QUERY", "SECRET_R2_KEY", "SECRET_SESSION_TOKEN",
    "SECRET_PROVIDER_BODY", "RAW_PHASE_SECRET", "RAW_STATUS_SECRET", "RAW_PROVIDER_SECRET",
  ]) {
    assert(!serialized.includes(forbidden));
  }
  assert.equal(event.phase, undefined);
  assert.equal(event.status, undefined);
  assert.equal(event.code, undefined);
  assert.equal(event.durationMs, 0);
  assert.equal(event.count, 2);
});

test("known diagnostic machine fields survive normalization", () => {
  const event = normalizeDiagnosticEvent({
    event: "generation.reconciliation",
    correlationId: "job-correlation",
    phase: "provider-ready",
    status: "persisting",
    code: "WORKER_UNAVAILABLE",
  });
  assert.equal(event.phase, "provider-ready");
  assert.equal(event.status, "persisting");
  assert.equal(event.code, "WORKER_UNAVAILABLE");
});

test("diagnostic sink failure is non-fatal", async () => {
  await emitDiagnosticEvent(
    { event: "maintenance.pass", correlationId: "maintenance-test", phase: "source-claims", count: 1 },
    async () => { throw new Error("sink unavailable"); },
  );
});
