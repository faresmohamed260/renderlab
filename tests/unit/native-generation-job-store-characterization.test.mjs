import assert from "node:assert/strict";
import test from "node:test";
import {
  runtime, resetRuntime, fakeFetch, flushAfter, currentJob,
  OWNER_A, OWNER_B, JOB_ID, FIXED_TIME,
} from "../helpers/generation-critical-path-runtime.mjs";

// Import the existing public facade before moving its DB functions. These
// tests characterize the runtime behavior and trace, not a copied fake module.
const submitApi = await import("../../src/app/api/generation/jobs/route.ts");
const native = await import("../../src/server/generation/native-generation.ts");

const request = {
  prompt: "Stable native job-store seam",
  model: "fibo2-edit-turbo",
  output: { kind: "image", aspectRatio: "1:1" },
  inputs: [],
};
const origin = "https://renderlab.example.invalid";

function fixture(t, options = {}) {
  resetRuntime(options);
  t.mock.method(globalThis, "fetch", fakeFetch);
  t.mock.method(AbortSignal, "timeout", () => new AbortController().signal);
  assert.equal(Date.now(), FIXED_TIME);
}

async function dispatched() {
  const accepted = await submitApi.POST(new Request(origin + "/api/generation/jobs", {
    method: "POST", headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(request),
  }));
  assert.equal(accepted.status, 202);
  await flushAfter();
  assert.equal(currentJob().status, "running");
}

const failedPatch = {
  status: "failed",
  error_code: "generation_failed",
  error_message: "Characterized fixture failure.",
  completed_at: new Date(FIXED_TIME).toISOString(),
};

function dbOpsFrom(index) {
  return runtime.traces.slice(index).filter((entry) => entry.side === "db");
}

test("native-generation public row-store facade has all established function exports", () => {
  for (const key of [
    "isNativeGenerationConfigured", "toGenerationJob", "getJobRow",
    "patchJob", "patchJobRow", "wakeFiboDispatcher",
    "submitNativeGeneration", "persistResult",
    "recoverPersistingResult", "pollNativeGeneration",
  ]) assert.equal(typeof native[key], "function", key);
});

test("native row getter stays owner-scoped and maps public job projection", async (t) => {
  fixture(t);
  await dispatched();
  const wrongOwner = await native.getJobRow(OWNER_B, JOB_ID);
  assert.equal(wrongOwner, null);
  const expected = await native.getJobRow(OWNER_A, JOB_ID);
  assert.equal(expected?.id, JOB_ID);
  assert.equal(expected?.status, "running");
  assert.deepEqual(native.toGenerationJob(expected), {
    id: JOB_ID, status: "running", operation: "create-image",
    createdAt: expected.created_at, updatedAt: expected.updated_at,
    outputAssetIds: [],
  });
});

test("nonterminal patchJobRow uses one owner/status CAS, no atomic RPC", async (t) => {
  fixture(t);
  await dispatched();
  const start = runtime.traces.length;
  const outcome = await native.patchJobRow({ ...currentJob() }, {
    status: "persisting", worker_state: "finalizing",
  });
  assert.equal(outcome.applied, true);
  assert.equal(outcome.row.status, "persisting");
  assert.equal(currentJob().worker_state, "finalizing");
  assert.equal(runtime.atomicAttempts, 0);
  assert.equal(runtime.jobPatchAttempts, 1);
  const operations = dbOpsFrom(start);
  assert.deepEqual(operations.map((row) => [row.method, row.table]), [
    ["PATCH", "generation_jobs"],
  ]);
  assert.match(operations[0].search, /owner_id=eq\./);
  assert.match(operations[0].search, /status=eq\.running/);
});

test("terminal patchJob uses atomic RPC, reads current row and never falls back to PATCH", async (t) => {
  fixture(t);
  await dispatched();
  const start = runtime.traces.length;
  const outcome = await native.patchJob(OWNER_A, JOB_ID, failedPatch, "running");
  assert.equal(outcome.ok, true);
  assert.equal(outcome.row.status, "failed");
  assert.equal(runtime.atomicAttempts, 1);
  assert.equal(runtime.atomicCommits, 1);
  assert.equal(runtime.releases, 1);
  assert.equal(runtime.jobPatchAttempts, 0);
  assert.deepEqual(dbOpsFrom(start).map((row) => [row.method, row.table]), [
    ["POST", "rpc/renderlab_terminalize_generation_and_release"],
    ["GET", "generation_jobs"],
  ]);
});

test("only an absent atomic RPC falls back to the original status CAS", async (t) => {
  fixture(t, { atomicRpcAvailable: false });
  await dispatched();
  const start = runtime.traces.length;
  const outcome = await native.patchJob(OWNER_A, JOB_ID, failedPatch, "running");
  assert.equal(outcome.ok, true);
  assert.equal(outcome.row.status, "failed");
  assert.equal(runtime.atomicAttempts, 1);
  assert.equal(runtime.atomicCommits, 0);
  assert.equal(runtime.jobPatchAttempts, 1);
  assert.deepEqual(dbOpsFrom(start).map((row) => [row.method, row.table]), [
    ["POST", "rpc/renderlab_terminalize_generation_and_release"],
    ["PATCH", "generation_jobs"],
  ]);
  assert.match(dbOpsFrom(start)[1].search, /owner_id=eq\./);
  assert.match(dbOpsFrom(start)[1].search, /status=eq\.running/);
});

test("terminalization RPC backend failure fails closed without fallback mutation", async (t) => {
  fixture(t, { atomicRpcFailure: true });
  await dispatched();
  const start = runtime.traces.length;
  await assert.rejects(() => native.patchJob(OWNER_A, JOB_ID, failedPatch, "running"));
  assert.equal(currentJob().status, "running");
  assert.equal(runtime.atomicAttempts, 1);
  assert.equal(runtime.jobPatchAttempts, 0);
  assert.deepEqual(dbOpsFrom(start).map((row) => [row.method, row.table]), [
    ["POST", "rpc/renderlab_terminalize_generation_and_release"],
  ]);
});

test("foreign-owner terminalization cannot alter job or reservation", async (t) => {
  fixture(t);
  await dispatched();
  const start = runtime.traces.length;
  const outcome = await native.patchJob(OWNER_B, JOB_ID, failedPatch, "running");
  assert.equal(outcome.ok, false);
  assert.equal(outcome.reason, "already_terminal_or_changed");
  assert.equal(outcome.current, null);
  assert.equal(currentJob().status, "running");
  assert.equal(runtime.atomicCommits, 0);
  assert.equal(runtime.releases, 0);
  assert.equal(runtime.jobPatchAttempts, 0);
  assert.deepEqual(dbOpsFrom(start).map((row) => [row.method, row.table]), [
    ["POST", "rpc/renderlab_terminalize_generation_and_release"],
    ["GET", "generation_jobs"],
  ]);
});
