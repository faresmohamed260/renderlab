import assert from "node:assert/strict";
import test from "node:test";
import { createTabHistory, historyActions } from "../../src/features/create/history/history-state.ts";

test("this-session history persists in one tab store, not a fresh tab or switched account", () => {
  const tab = createTabHistory();
  const result = { id: "result-1", label: "First", createdAt: "2026-11-25T00:00:00Z" };
  tab.setAccount("A");
  tab.record("A", result);
  tab.record("A", result);
  assert.deepEqual(tab.snapshot("A"), [result]);
  assert.deepEqual(createTabHistory().snapshot("A"), []);
  assert.deepEqual(tab.snapshot("B"), []);
  tab.setAccount("B");
  tab.record("A", result); // stale completion must not cross accounts
  assert.deepEqual(tab.snapshot("B"), []);
  tab.setAccount("A");
  assert.deepEqual(tab.snapshot("A"), []);
  tab.record("A", result);
  tab.setAccount(null);
  assert.deepEqual(tab.snapshot("A"), []);
});
test("actions are distinct and gated by authoritative eligibility and actual job status", () => {
  const base = { canCancel: true, canRetry: true, canReuse: true, canRunAgain: true };
  for (const status of ["queued", "preparing", "running"])
    assert.deepEqual(historyActions({ ...base, status }), ["cancel"]);
  for (const status of ["cancelling", "persisting", "cancelled"])
    assert.deepEqual(historyActions({ ...base, status }), []);
  assert.deepEqual(historyActions({ ...base, status: "failed" }), ["retry", "reuse"]);
  assert.deepEqual(historyActions({ ...base, status: "succeeded" }), ["runAgain", "reuse"]);
  assert.deepEqual(historyActions({ ...base, status: "succeeded", canReuse: false }), ["runAgain"]);
  assert.deepEqual(historyActions({ ...base, status: "succeeded", canRunAgain: false }), ["reuse"]);
  assert.deepEqual(historyActions({ ...base, status: "failed", canRetry: false, canReuse: false }), []);
  assert.deepEqual(historyActions({ ...base, status: "running", canCancel: false }), []);
});
