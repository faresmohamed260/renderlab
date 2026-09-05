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

test("diagnostic normalization only emits explicit bounded fields", () => {
  const event = normalizeDiagnosticEvent({
    event: "generation.submission",
    correlationId: "safe-correlation",
    jobId: "job-123",
    phase: "accepted",
    code: "generation_ok",
    durationMs: -5,
    count: 2.8,
    ...({ prompt: "SECRET_PROMPT", email: "secret@example.com", storageKey: "SECRET_R2" }),
  });
  const serialized = JSON.stringify(event);
  assert(!serialized.includes("SECRET_PROMPT"));
  assert(!serialized.includes("secret@example.com"));
  assert(!serialized.includes("SECRET_R2"));
  assert.equal(event.durationMs, 0);
  assert.equal(event.count, 2);
});

test("diagnostic sink failure is non-fatal", async () => {
  await emitDiagnosticEvent(
    { event: "maintenance.pass", correlationId: "maintenance-test", phase: "sources", count: 1 },
    async () => { throw new Error("sink unavailable"); },
  );
});
