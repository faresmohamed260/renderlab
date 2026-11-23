import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  monitoredActiveStatuses,
  oldestActiveJobWarningSeconds,
  oldestActiveJobHeadQuery,
  summarizeOldestActiveJobHeads,
} from "../../src/server/observability/oldest-active-job.ts";
import { dispatchHealthIsHealthy } from "../../src/server/observability/dispatch-health.ts";

const now = Date.parse("2026-11-23T00:00:00.000Z");
const sample = (status, seconds, extra = {}) => ({
  status,
  created_at: new Date(now - seconds * 1000).toISOString(),
  ...extra,
});

test("empty four-state measurement is a non-warning null-age aggregate", () => {
  const result = summarizeOldestActiveJobHeads([], now);
  assert.deepEqual(result, {
    ageSeconds: null,
    status: null,
    byStatusSeconds: { queued: null, running: null, cancelling: null, persisting: null },
    warningSeconds: 3600,
    warning: false,
  });
});

test("every canonical active status contributes only a numeric age and oldest status", () => {
  const rows = [
    sample("queued", 100, { owner_id: "private-owner" }),
    sample("running", 3700, { provider_job_id: "private-handle" }),
    sample("cancelling", 300, { prompt: "private-prompt" }),
    sample("persisting", 700, { asset_id: "private-asset" }),
  ];
  const result = summarizeOldestActiveJobHeads(rows, now);
  assert.equal(result.ageSeconds, 3700);
  assert.equal(result.status, "running");
  assert.equal(result.warning, true);
  assert.deepEqual(result.byStatusSeconds, {
    queued: 100, running: 3700, cancelling: 300, persisting: 700,
  });
  for (const sensitive of ["private-owner", "private-handle", "private-prompt", "private-asset"]) {
    assert(!JSON.stringify(result).includes(sensitive));
  }
});

test("warning is a single conservative 60-minute boundary, not job recovery", () => {
  assert.equal(oldestActiveJobWarningSeconds, 3600);
  assert.equal(summarizeOldestActiveJobHeads([sample("running", 3599)], now).warning, false);
  assert.equal(summarizeOldestActiveJobHeads([sample("running", 3600)], now).warning, true);
  assert.equal(summarizeOldestActiveJobHeads([sample("queued", 3600)], now).warning, true);
  assert.equal(summarizeOldestActiveJobHeads([sample("cancelling", 3600)], now).warning, true);
  assert.equal(summarizeOldestActiveJobHeads([sample("persisting", 3600)], now).warning, true);
});

test("invalid timestamps are ignored and future timestamps clamp safely", () => {
  const result = summarizeOldestActiveJobHeads([
    { status: "queued", created_at: "bad" },
    { status: "running", created_at: null },
    sample("cancelling", -30),
  ], now);
  assert.deepEqual(result.byStatusSeconds, {
    queued: null, running: null, cancelling: 0, persisting: null,
  });
  assert.equal(result.warning, false);
});

test("query cost is bounded to four indexable one-row created_at reads", async () => {
  assert.deepEqual(monitoredActiveStatuses, ["queued", "running", "cancelling", "persisting"]);
  for (const status of monitoredActiveStatuses) {
    const path = oldestActiveJobHeadQuery(status);
    assert(path.startsWith("generation_jobs?"));
    const params = new URLSearchParams(path.split("?")[1]);
    assert.deepEqual([...params.keys()].sort(), ["limit", "order", "select", "status"]);
    assert.equal(params.get("status"), "eq." + status);
    assert.equal(params.get("select"), "created_at");
    assert.equal(params.get("order"), "created_at.asc");
    assert.equal(params.get("limit"), "1");
    assert(!path.includes("owner_id") && !path.includes("provider") && !path.includes("prompt"));
  }
  const isolated = new URLSearchParams(oldestActiveJobHeadQuery("running", "isolated-owner").split("?")[1]);
  assert.equal(isolated.get("owner_id"), "eq.isolated-owner");
  const indexSchema = await readFile(new URL("../../supabase/migrations/0002_generation_jobs_media_assets.sql", import.meta.url), "utf8");
  assert.match(indexSchema, /generation_jobs_status_created_at_idx/);
  assert.match(indexSchema, /on public\.generation_jobs \(status, created_at desc\)/i);
});

test("dispatch heartbeat classification remains independent of old owner jobs", () => {
  const healthy = {
    oldestDueSeconds: 3, expiredClaims: 0, unresolved: 0,
    scheduledHeartbeatAgeSeconds: 10, scheduledHeartbeatMissing: false,
  };
  assert.equal(dispatchHealthIsHealthy(healthy), true);
  assert.equal(dispatchHealthIsHealthy({ ...healthy, scheduledHeartbeatMissing: true }), false);
  assert.equal(dispatchHealthIsHealthy({ ...healthy, oldestDueSeconds: 181 }), false);
  assert.equal(dispatchHealthIsHealthy({ ...healthy, expiredClaims: 1 }), false);
  assert.equal(dispatchHealthIsHealthy({ ...healthy, unresolved: 1 }), false);
  assert.equal(summarizeOldestActiveJobHeads([sample("running", 7200)], now).warning, true);
  assert.equal(dispatchHealthIsHealthy(healthy), true);
});

test("protected monitoring route persists and resolves a distinct non-email stale-job alert", async () => {
  const files = [
    "src/app/api/internal/generation/reconcile/route.ts",
    "src/server/observability/diagnostic-store.ts",
    "src/server/observability/oldest-active-job-store.ts",
    "src/server/admin/admin-operations.ts",
  ];
  const [route, store, adapter, admin] = await Promise.all(files.map((p) =>
    readFile(new URL("../../" + p, import.meta.url), "utf8")));
  assert.match(route, /if \(!authorized\(request\)\)/);
  assert.match(route, /recordOldestActiveJobAlert/);
  assert.match(route, /resolveOldestActiveJobAlert/);
  assert.match(route, /dispatchHealthIsHealthy/);
  assert.match(route, /status: dispatchOk \? 200 : 503/);
  assert.match(store, /oldestActiveJobAlertKey = "generation-oldest-active-job"/);
  assert.match(store, /const label = row\.alert_key\.endsWith\(oldestActiveJobAlertKey\)/);
  assert.match(adapter, /Promise\.all\(monitoredActiveStatuses\.map/);
  assert.match(adapter, /supabaseRest<Array<\{ created_at: string \}>>/);
  assert.match(admin, /rpc\/renderlab_admin_health/);
  assert.match(admin, /readOldestActiveJobAge\(testOwnerId \?\? undefined/);
  const oldestAlertBranch = route.split("if (oldestActiveJob.warning)")[1]?.split("} else {")[0] ?? "";
  assert(!oldestAlertBranch.includes("sendOperationalAlertNotification"));
  assert(!oldestAlertBranch.includes("jobId:"));
  assert(!oldestAlertBranch.includes("upstreamStatus:"));
});
