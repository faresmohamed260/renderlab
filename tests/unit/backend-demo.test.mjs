import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

// Exercise the public CLI in clean Node processes, not private helper functions.
const matrix = [
  ["success", "succeeded", null,
    ["submit", "admission", "outbox", "dispatch", "provider-result", "reconcile", "persist", "settle", "release"], 1, 1],
  ["admission-denied", "not_created", "generation_rate_limit_reached",
    ["submit", "admission-denied"], 0, 0],
  ["cancel-mid-run", "cancelled", null,
    ["submit", "admission", "outbox", "dispatch", "cancel", "provider-cancel", "settle", "release"], 1, 0],
  ["provider-terminal-failure", "failed", "generation_failed",
    ["submit", "admission", "outbox", "dispatch", "provider-result", "reconcile", "persist-skipped", "settle", "release"], 1, 0],
  ["process-exit", "failed", "generation_failed",
    ["submit", "admission", "outbox", "dispatch", "provider-result", "reconcile", "persist-skipped", "settle", "release"], 1, 0],
  ["ambiguous-then-recovery", "succeeded", null,
    ["submit", "admission", "outbox", "dispatch", "provider-ambiguous", "provider-recovered", "reconcile", "persist", "settle", "release"], 1, 1],
  ["owner-return-settlement", "succeeded", null,
    ["submit", "admission", "outbox", "dispatch", "provider-result", "interruption", "owner-return", "reconcile", "persist", "settle", "release"], 1, 1],
];

for (const [scenario, status, errorCode, phases, releases, mediaAssets] of matrix) {
  test("offline demo " + scenario + " records deterministic lifecycle", () => {
    const args = ["scripts/demo-backend.mjs", "--scenario", scenario, "--json"];
    const run = () => JSON.parse(execFileSync(process.execPath, args, {
      encoding: "utf8", timeout: 30000,
    }));
    const result = run();
    assert.deepEqual(result, run(), "same scenario must repeat exactly");
    assert.equal(result.schemaVersion, 1);
    assert.equal(result.scenario, scenario);
    assert.equal(result.fixedTime, "2026-11-23T12:00:00.000Z");
    assert.deepEqual(result.events.map((event) => event.phase), phases);
    assert.deepEqual(result.events.map((event) => event.number),
      phases.map((_, index) => index + 1));
    assert.equal(result.final.status, status);
    assert.equal(result.final.errorCode, errorCode);
    assert.equal(result.final.reservationReleases, releases);
    assert.equal(result.final.reservationHeld, false);
    assert.equal(result.final.mediaAssets, mediaAssets);
    assert.equal(result.final.providerDispatches, scenario === "admission-denied" ? 0 : 1);
    assert.equal(result.final.providerCancels, scenario === "cancel-mid-run" ? 1 : 0);
    const operations = result.trace.map((item) => item.operation);
    if (scenario === "admission-denied") {
      assert.ok(operations.includes("rpc/renderlab_reserve_generation_admission"));
      assert.ok(!operations.includes("rpc/renderlab_accept_generation_dispatch"));
    } else {
      const ordered = [
        "rpc/renderlab_reserve_generation_admission",
        "rpc/renderlab_accept_generation_dispatch",
        "rpc/renderlab_bind_generation_admission",
        "/dispatch/wake",
      ].map((operation) => operations.indexOf(operation));
      assert.ok(ordered.every((value, index) => value >= 0 && (!index || value > ordered[index - 1])));
      assert.ok(operations.includes("rpc/renderlab_release_generation_admission")
        || result.trace.some((item) => item.operation === "generation_admission_reservations" && item.method === "PATCH"));
    }
    if (mediaAssets === 1) {
      assert.ok(result.trace.some((item) => item.operation === "media_assets" && item.method === "POST"));
    }
  });
}
