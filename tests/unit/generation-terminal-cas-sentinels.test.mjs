import assert from "node:assert/strict";
import test from "node:test";
import {
  runtime, resetRuntime, fakeFetch, flushAfter, currentJob, heldReservation,
  OWNER_A, JOB_ID, FIXED_TIME,
} from "../helpers/generation-critical-path-runtime.mjs";

const submitApi = await import("../../src/app/api/generation/jobs/route.ts");
const native = await import("../../src/server/generation/native-generation.ts");
const reconcile = await import("../../src/server/generation/reconcile-generation.ts");
const ownerReturn = await import("../../src/server/generation/owner-generation-settlement.ts");
const { evaluateJobTransition } = await import("../../src/lib/capabilities/generation-job-state-machine.ts");

const request = {
  prompt: "Fixed race sentinel", model: "fibo2-edit-turbo",
  output: { kind: "image", aspectRatio: "1:1" }, inputs: [],
};
const origin = "https://renderlab.example.invalid";

// PR B: all five previously red witnesses run in normal CI.
const witness = test;

function fixture(t, options = {}) {
  resetRuntime(options);
  t.mock.method(globalThis, "fetch", fakeFetch);
  t.mock.method(AbortSignal, "timeout", () => new AbortController().signal);
  t.mock.method(console, "info", () => {});
  t.mock.method(console, "warn", () => {});
  t.mock.method(console, "error", () => {});
  assert.equal(Date.now(), FIXED_TIME);
}

async function dispatched() {
  const response = await submitApi.POST(new Request(origin + "/api/generation/jobs", {
    method: "POST", headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(request),
  }));
  assert.equal(response.status, 202);
  await flushAfter();
  assert.equal(currentJob().status, "running");
  assert.equal(heldReservation(), true);
}

function interposeTerminalOnPatch(expectedStatus, terminalStatus) {
  runtime.beforeJobPatch = ({ patch }) => {
    assert.equal(patch.status, expectedStatus);
    const row = currentJob();
    row.status = terminalStatus;
    row.worker_state = terminalStatus;
    row.completed_at = new Date().toISOString();
    if (terminalStatus === "failed") {
      row.error_code = "generation_failed";
      row.error_message = "Previously settled by another writer.";
    }
    if (terminalStatus === "succeeded") {
      row.output_asset_ids = ["fixture-already-durable"];
      row.error_code = null;
      row.error_message = null;
    }
  };
}

witness("P0 CAS: cancellation winning a completion race rejects the stale persisting write", async (t) => {
  fixture(t);
  await dispatched();
  assert.equal(evaluateJobTransition("cancelled", "persisting"), "forbidden");
  interposeTerminalOnPatch("persisting", "cancelled");
  const settled = await reconcile.reconcileNativeGeneration(OWNER_A, JOB_ID);
  assert.equal(settled.status, "cancelled");
  assert.equal(currentJob().status, "cancelled");
  assert.equal(runtime.mediaWrites, 0);
  assert.equal(runtime.r2Writes, 0);
  assert.equal(runtime.jobPatchMutations, 0);
  assert.equal(runtime.releases, 1);
});

witness("P0 CAS: late ready provider after failure never reopens or persists terminal job", async (t) => {
  fixture(t);
  await dispatched();
  interposeTerminalOnPatch("persisting", "failed");
  const settled = await reconcile.reconcileNativeGeneration(OWNER_A, JOB_ID);
  assert.equal(settled.status, "failed");
  assert.equal(currentJob().error_code, "generation_failed");
  assert.equal(runtime.mediaWrites, 0);
  assert.equal(runtime.r2Writes, 0);
  assert.equal(runtime.jobPatchMutations, 0);
  assert.equal(runtime.releases, 1);
});

witness("P0 CAS: stale provider process-exit failure cannot overwrite already succeeded job", async (t) => {
  fixture(t, { providerOutcome: "process-exited" });
  await dispatched();
  interposeTerminalOnPatch("failed", "succeeded");
  const settled = await reconcile.reconcileNativeGeneration(OWNER_A, JOB_ID);
  assert.equal(settled.status, "succeeded");
  assert.deepEqual(currentJob().output_asset_ids, ["fixture-already-durable"]);
  assert.equal(currentJob().error_code, null);
  assert.equal(runtime.jobPatchMutations, 0);
  assert.equal(runtime.releases, 1);
});

witness("P0 CAS: a stale poll after settlement returns typed conflict without mutating status", async (t) => {
  fixture(t);
  await dispatched();
  interposeTerminalOnPatch("running", "succeeded");
  const outcome = await native.patchJob(OWNER_A, JOB_ID, {
    status: "running", worker_state: "generating",
  }, "running");
  assert.equal(outcome.ok, false);
  assert.equal(outcome.reason, "already_terminal_or_changed");
  assert.equal(outcome.current?.status, "succeeded");
  assert.equal(currentJob().status, "succeeded");
  assert.equal(runtime.jobPatchMutations, 0);
});

witness("P0 CAS: late retry and double owner-return settlement never rewrite terminal job", async (t) => {
  fixture(t, { finalizationFault: "after-media-insert" });
  await dispatched();
  await assert.rejects(
    () => reconcile.reconcileNativeGeneration(OWNER_A, JOB_ID),
    /OFFLINE_FINALIZATION_FAULT/,
  );
  assert.equal(currentJob().status, "persisting");
  assert.equal(runtime.mediaWrites, 1);
  interposeTerminalOnPatch("succeeded", "succeeded");
  const recovered = await ownerReturn.settleOwnerGenerationWithinResponse(OWNER_A, "activity");
  assert.equal(recovered, true);
  assert.equal(currentJob().status, "succeeded");
  assert.equal(runtime.jobPatchMutations, 1, "only original running->persisting may write");
  assert.equal(runtime.releases, 1);
  const again = await ownerReturn.settleOwnerGenerationWithinResponse(OWNER_A, "activity");
  assert.equal(again, false);
  assert.equal(runtime.jobPatchMutations, 1);
  const late = await native.patchJob(OWNER_A, JOB_ID, { status: "failed" }, "persisting");
  assert.equal(late.ok, false);
  assert.equal(late.reason, "already_terminal_or_changed");
  assert.equal(late.current?.status, "succeeded");
  assert.equal(currentJob().status, "succeeded");
  assert.equal(runtime.releases, 1);
});

test("P0 CAS: direct terminal expected-status update is rejected without a physical PATCH", async (t) => {
  fixture(t);
  await dispatched();
  const job = currentJob();
  job.status = "succeeded";
  job.completed_at = new Date().toISOString();
  const before = runtime.jobPatchAttempts;
  const outcome = await native.patchJob(OWNER_A, JOB_ID, { status: "failed" }, "succeeded");
  assert.equal(outcome.ok, false);
  assert.equal(outcome.reason, "already_terminal_or_changed");
  assert.equal(outcome.current?.status, "succeeded");
  assert.equal(runtime.jobPatchAttempts, before);
  assert.equal(currentJob().status, "succeeded");
});
