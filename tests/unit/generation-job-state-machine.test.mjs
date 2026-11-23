import assert from "node:assert/strict";
import test from "node:test";
import {
  generationJobStatuses, generationActiveStatuses, generationTerminalStatuses, generationJobTransitions,
  evaluateJobTransition, isGenerationTerminalStatus, initialGenerationLifecycle,
  changeJobStatus, recordPersistedOutput, releaseGenerationReservation,
  settleTerminalOnOwnerReturn, projectProviderObservation, requestRetryOfExistingJob,
  inspectJobLifecycle,
} from "../../src/lib/capabilities/generation-job-state-machine.ts";

const expectedEdges = {
  queued: ["running", "cancelling", "cancelled", "persisting", "failed"],
  preparing: ["running", "cancelling", "persisting", "failed"],
  running: ["cancelling", "persisting", "failed"],
  cancelling: ["cancelled"],
  persisting: ["succeeded", "failed"],
  succeeded: [],
  failed: [],
  cancelled: [],
};

test("P0-04 inventory has eight distinct states and exact active/terminal partition", () => {
  assert.equal(new Set(generationJobStatuses).size, 8);
  assert.deepEqual([...generationJobStatuses].sort(),
    [...generationActiveStatuses, ...generationTerminalStatuses].sort());
  assert.deepEqual([...generationTerminalStatuses].sort(), ["cancelled", "failed", "succeeded"]);
  for (const status of generationJobStatuses) assert.equal(
    isGenerationTerminalStatus(status),
    generationTerminalStatuses.includes(status),
  );
  assert.deepEqual(JSON.parse(JSON.stringify(generationJobTransitions)), expectedEdges);
});

for (const from of generationJobStatuses) {
  for (const to of generationJobStatuses) {
    test("P0-04 exhaustive " + from + " -> " + to, () => {
      const expected = from === to ? "idempotent"
        : expectedEdges[from].includes(to) ? "allowed" : "forbidden";
      assert.equal(evaluateJobTransition(from, to), expected);
      const start = { ...initialGenerationLifecycle(), status: from, persistedAssetId:
        from === "persisting" || from === "succeeded" ? "existing-output-id" : null };
      const result = changeJobStatus(start, to);
      assert.equal(result.decision, expected === "allowed" ? "accepted" : expected);
      if (expected === "forbidden" || expected === "idempotent") assert.equal(result.next, start);
      if (expected === "allowed") assert.equal(result.next.status, to);
    });
  }
}

test("P0-04 immutable terminal states cannot become active or change terminal outcome", () => {
  for (const terminal of generationTerminalStatuses) {
    const record = { ...initialGenerationLifecycle("released"), status: terminal };
    for (const to of generationJobStatuses) {
      const result = changeJobStatus(record, to);
      if (to !== terminal) assert.equal(result.decision, "forbidden");
      assert.equal(result.next, record);
    }
    assert.equal(requestRetryOfExistingJob(record).decision, "forbidden");
    assert.equal(requestRetryOfExistingJob(record).reason, "terminal-retry-requires-new-job");
  }
});

test("P0-04 success requires durable output, with one indexed finalization", () => {
  let job = changeJobStatus(initialGenerationLifecycle(), "running").next;
  job = changeJobStatus(job, "persisting").next;
  const premature = changeJobStatus(job, "succeeded");
  assert.equal(premature.decision, "forbidden");
  assert.equal(premature.reason, "success-requires-durable-asset");
  let saved = recordPersistedOutput(job, "asset-0");
  assert.equal(saved.decision, "accepted");
  job = saved.next;
  const replay = recordPersistedOutput(job, "asset-0");
  assert.equal(replay.decision, "idempotent");
  assert.equal(replay.next, job);
  const conflicting = recordPersistedOutput(job, "asset-1");
  assert.equal(conflicting.decision, "forbidden");
  assert.equal(conflicting.next, job);
  job = changeJobStatus(job, "succeeded").next;
  assert.equal(job.persistedOutputWrites, 1);
  assert.ok(inspectJobLifecycle(job).includes("terminal-reservation-held"));
  job = settleTerminalOnOwnerReturn(job).next;
  assert.deepEqual(inspectJobLifecycle(job), []);
  assert.equal(job.reservationReleaseCount, 1);
});

test("P0-04 cancel wins serialized race: completion cannot follow cancelling", () => {
  let state = changeJobStatus(initialGenerationLifecycle(), "running").next;
  state = changeJobStatus(state, "cancelling").next;
  assert.equal(projectProviderObservation(state, {kind:"ready"}).decision, "forbidden");
  assert.equal(recordPersistedOutput(state, "asset-0").decision, "forbidden");
  state = changeJobStatus(state, "cancelled").next;
  assert.equal(projectProviderObservation(state, {kind:"ready"}).next, state);
  state = settleTerminalOnOwnerReturn(state).next;
  assert.deepEqual(inspectJobLifecycle(state), []);
});

test("P0-04 provider completion wins serialized race: cancellation cannot follow persisting", () => {
  let state = changeJobStatus(initialGenerationLifecycle(), "running").next;
  state = projectProviderObservation(state, {kind:"ready"}).next;
  assert.equal(changeJobStatus(state, "cancelling").decision, "forbidden");
  state = recordPersistedOutput(state, "asset-0").next;
  state = changeJobStatus(state, "succeeded").next;
  assert.equal(changeJobStatus(state, "cancelled").decision, "forbidden");
  assert.equal(state.persistedOutputWrites, 1);
});

test("P0-04 process-exit HTTP 409 FIBO_PROCESS_EXITED maps to generic failed outcome", () => {
  const running = changeJobStatus(initialGenerationLifecycle(), "running").next;
  const result = projectProviderObservation(running, {kind:"process-exited"});
  assert.equal(result.decision, "accepted");
  assert.equal(result.next.status, "failed");
  assert.equal(result.next.errorCode, "generation_failed");
  assert.equal(projectProviderObservation(result.next, {kind:"process-exited"}).decision, "idempotent");
});

test("P0-04 ambiguous provider status stays unresolved until exactly the two-hour stale threshold", () => {
  const running = changeJobStatus(initialGenerationLifecycle(), "running").next;
  for (const ageMs of [0, 1, 30_000, 2 * 60 * 60 * 1000 - 1]) {
    const result = projectProviderObservation(running, {kind:"ambiguous", ageMs});
    assert.equal(result.decision, "idempotent");
    assert.equal(result.next, running);
    assert.equal(result.reason, "provider-outcome-unconfirmed");
  }
  const stale = projectProviderObservation(running, {kind:"ambiguous", ageMs:2*60*60*1000});
  assert.equal(stale.decision, "accepted");
  assert.equal(stale.next.status, "failed");
  assert.equal(stale.next.errorCode, "generation_provider_stalled");
});

test("P0-04 missing-dispatch fallback takes at least 15 minutes, excludes cancelling", () => {
  for (const status of ["queued","preparing","running","persisting"]) {
    const state = { ...initialGenerationLifecycle(), status };
    const early = projectProviderObservation(state, {kind:"stale-undispatched", ageMs: 15*60*1000 - 1});
    assert.equal(early.next, state);
    const expired = projectProviderObservation(state, {kind:"stale-undispatched", ageMs: 15*60*1000});
    assert.equal(expired.next.status,"failed");
    assert.equal(expired.next.errorCode,"generation_orchestration_stalled");
  }
  const cancelling = { ...initialGenerationLifecycle(), status:"cancelling" };
  assert.equal(projectProviderObservation(cancelling, {kind:"stale-undispatched",ageMs: 999999999}).next,cancelling);
});

test("P0-04 failed/succeeded owner-return settlement twice releases once", () => {
  for (const terminal of ["failed", "succeeded", "cancelled"]) {
    const initial = {...initialGenerationLifecycle(), status:terminal,
      persistedAssetId:terminal === "succeeded" ? "asset-0" : null};
    assert.deepEqual(inspectJobLifecycle(initial).includes("terminal-reservation-held"), true);
    const first = settleTerminalOnOwnerReturn(initial);
    const second = settleTerminalOnOwnerReturn(first.next);
    assert.equal(first.decision, "accepted");
    assert.equal(second.decision, "idempotent");
    assert.equal(second.next,first.next);
    assert.equal(second.next.reservationReleaseCount,1);
    assert.deepEqual(inspectJobLifecycle(second.next), []);
    assert.equal(releaseGenerationReservation(second.next).decision,"idempotent");
  }
});

test("P0-04 legacy preparing, pending provider and terminal provider error preserve known transitions", () => {
  let state={...initialGenerationLifecycle(),status:"preparing"};
  state=changeJobStatus(state,"running").next;
  assert.equal(projectProviderObservation(state,{kind:"pending"}).next,state);
  state=projectProviderObservation(state,{kind:"terminal-failure",code:"generation_failed"}).next;
  assert.equal(state.status,"failed");
  assert.equal(state.errorCode,"generation_failed");
  assert.equal(projectProviderObservation(state,{kind:"ready"}).reason,"terminal-replay-ignored");
});

test("P0-04 invariant inspector detects invalid persisted-output and release snapshots", () => {
  assert.deepEqual(inspectJobLifecycle({...initialGenerationLifecycle("released"),
    status:"failed",persistedOutputWrites:2,reservationReleaseCount:2,
    persistedAssetId:"asset-0"}).sort(),
    ["multiple-output-writes","multiple-reservation-releases","output-without-persisting-or-success"].sort());
  assert.deepEqual(inspectJobLifecycle({...initialGenerationLifecycle("released"),
    status:"succeeded"}), ["success-without-output"]);
});
