import assert from "node:assert/strict";
import test from "node:test";

import { summarizeActiveAdminJobAge, summarizeRecentAdminJobs } from "../../src/server/admin/admin-health-summary.ts";

const base = Date.parse("2026-09-05T12:00:00.000Z");

test("recent admin health summarizes terminal timing and failover without raw history", () => {
  const summary = summarizeRecentAdminJobs([
    {
      status: "succeeded",
      created_at: "2026-09-05T11:59:50.000Z",
      updated_at: "2026-09-05T12:00:00.000Z",
      completed_at: "2026-09-05T12:00:00.000Z",
      failover_history: [{ kind: "unavailable", workerId: "private-worker" }, { phase: "cancel-provider-confirmed" }],
    },
    {
      status: "failed",
      created_at: "2026-09-05T11:59:30.000Z",
      updated_at: "2026-09-05T12:00:00.000Z",
      completed_at: "2026-09-05T12:00:00.000Z",
      failover_history: [],
    },
  ], false);

  assert.deepEqual(summary.completionTiming, { sampleCount: 2, p50Ms: 10_000, p95Ms: 30_000 });
  assert.deepEqual(summary.failovers, { jobsWithFailover: 1, eventCount: 1 });
  assert(!JSON.stringify(summary).includes("private-worker"));
});

test("active state age uses lifecycle-aligned buckets", () => {
  const summary = summarizeActiveAdminJobAge([
    { updated_at: new Date(base - 5 * 60 * 1000).toISOString() },
    { updated_at: new Date(base - 30 * 60 * 1000).toISOString() },
    { updated_at: new Date(base - 90 * 60 * 1000).toISOString() },
    { updated_at: new Date(base - 3 * 60 * 60 * 1000).toISOString() },
  ], true, base);
  assert.deepEqual(summary, {
    sampleSize: 4,
    truncated: true,
    under15Minutes: 1,
    minutes15To60: 1,
    hours1To2: 1,
    over2Hours: 1,
  });
});
