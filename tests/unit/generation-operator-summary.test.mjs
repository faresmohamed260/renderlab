import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  generationOperatorSampleLimit, generationOperatorLookbackMinutes,
  summarizeGenerationDispatchLatency, summarizeGenerationTerminalHeld,
} from "../../src/server/observability/generation-operator-summary.ts";

const now = Date.parse("2026-11-24T00:00:00.000Z");
const iso = (secondsAgo) => new Date(now - secondsAgo * 1000).toISOString();

test("outbox latency measures durable created->dispatched only, never queued or provider runtime", () => {
  const rows = [
    { created_at: iso(80), dispatched_at: iso(60) },
    { created_at: iso(601), dispatched_at: iso(300) },
    { created_at: iso(100), dispatched_at: null },
    { created_at: iso(5), dispatched_at: iso(20) },
    { created_at: iso(2000), dispatched_at: iso(1000) }, // outside 15-minute window
    { created_at: "invalid", dispatched_at: iso(2) },
  ];
  const result = summarizeGenerationDispatchLatency(rows, true, now);
  assert.deepEqual(result, {
    windowMinutes: 15,
    sampleSize: 2,
    truncated: true,
    p50Seconds: 20,
    p95Seconds: 301,
    source: "outbox-confirmed-dispatched",
  });
  assert.equal(summarizeGenerationDispatchLatency([], false, now).p95Seconds, null);
  assert.equal(generationOperatorLookbackMinutes, 15);
  assert.equal(generationOperatorSampleLimit, 200);
});

test("terminal-held join returns status totals and duration, never private identities", () => {
  const marker = "private-prompt-owner-provider-handle";
  const reservations = [
    { job_id: "a", expires_at: iso(-3600), prompt: marker },
    { job_id: "b", expires_at: iso(-3600), owner_id: marker },
    { job_id: "c", expires_at: iso(5), provider_job_id: marker },
    { job_id: "d", expires_at: iso(-3600) },
    { job_id: "other", expires_at: iso(-3600) },
  ];
  const jobs = [
    { id: "a", status: "succeeded", completed_at: iso(400), secret: marker },
    { id: "b", status: "failed", completed_at: null },
    { id: "c", status: "cancelled", completed_at: iso(30) },
    { id: "d", status: "running", completed_at: null },
  ];
  const result = summarizeGenerationTerminalHeld(reservations, jobs, false, now);
  assert.deepEqual(result, {
    unexpiredByStatus: { succeeded: 1, failed: 1, cancelled: 0 },
    expiredByStatus: { succeeded: 0, failed: 0, cancelled: 1 },
    oldestUnexpiredHeldSeconds: 400,
    unknownCompletionTime: 1,
    truncated: false,
    source: "unreleased-bound-reservation-join",
  });
  assert(!JSON.stringify(result).includes(marker));
  for (const job of jobs) assert(!JSON.stringify(result).includes(job.id));
  assert.equal(summarizeGenerationTerminalHeld([], [], false, now).oldestUnexpiredHeldSeconds, null);
});

test("private scope and optional-read fail-open rule remain in the operator adapter", async () => {
  const store = await readFile(new URL("../../src/server/observability/generation-operator-store.ts", import.meta.url), "utf8");
  const admin = await readFile(new URL("../../src/server/admin/admin-operations.ts", import.meta.url), "utf8");
  const contract = await readFile(new URL("../../src/lib/api/admin-contract.ts", import.meta.url), "utf8");
  assert.match(store, /generationOperatorSampleLimit \+ 1/);
  assert.match(store, /dispatchParams\.set\("owner_id"/);
  assert.match(store, /reservationParams\.set\("owner_id"/);
  assert.match(store, /return \{ available: false as const, dispatchLatency: null, terminalHeld: null \}/);
  assert.match(admin, /readGenerationOperatorMetrics\(now\.valueOf\(\), testOwnerId \?\? undefined\)/);
  assert.match(admin, /generationObservability,/);
  assert.match(contract, /generationObservability:/);
  assert(!/select: ".*prompt|select: ".*provider_job_id|select: ".*owner_id/.test(store));
});
