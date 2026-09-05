import assert from "node:assert/strict";
import test from "node:test";

import {
  summarizeActiveAdminJobAge,
  summarizeRecentAdminJobs,
  summarizeScopedAdminHealthBase,
} from "../../src/server/admin/admin-health-summary.ts";

const base = Date.parse("2026-09-05T12:00:00.000Z");

const succeededRow = {
  status: "succeeded",
  operation: "create-image",
  error_code: null,
  created_at: "2026-09-05T11:59:50.000Z",
  updated_at: "2026-09-05T12:00:00.000Z",
  completed_at: "2026-09-05T12:00:00.000Z",
  failover_history: [{ kind: "unavailable", workerId: "private-worker" }, { phase: "cancel-provider-confirmed" }],
};
const failedRow = {
  status: "failed",
  operation: "create-video",
  error_code: "RAW_PROVIDER_CODE",
  created_at: "2026-09-05T11:59:30.000Z",
  updated_at: "2026-09-05T12:00:00.000Z",
  completed_at: "2026-09-05T12:00:00.000Z",
  failover_history: [],
};

test("recent admin health summarizes terminal timing and failover without raw history", () => {
  const summary = summarizeRecentAdminJobs([succeededRow, failedRow], false);
  assert.deepEqual(summary.completionTiming, { sampleCount: 2, p50Ms: 10_000, p95Ms: 30_000 });
  assert.deepEqual(summary.failovers, { jobsWithFailover: 1, eventCount: 1 });
  assert(!JSON.stringify(summary).includes("private-worker"));
});

test("test-scoped core health keeps exact product counts and sanitizes raw errors", () => {
  const summary = summarizeScopedAdminHealthBase(
    [succeededRow, failedRow, { ...failedRow, error_code: "generation_submission_failed" }],
    [{ status: "queued" }, { status: "cancelling" }, { status: "persisting" }],
  );
  assert.deepEqual(summary, {
    activeJobs: 2,
    statusCounts: { succeeded: 1, failed: 2 },
    operationCounts: { "create-image": 1, "create-video": 2 },
    errorCodeCounts: { generation_failed: 1, generation_submission_failed: 1 },
  });
  assert(!JSON.stringify(summary).includes("RAW_PROVIDER_CODE"));
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
