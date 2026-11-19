import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL("../../src/" + specifier.slice(2) + ".ts", import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});

const { fiboBatchSeeds, summarizeFiboBatchSlots } = await import("../../src/lib/capabilities/fibo-batch.ts");

const slot = (outputIndex, status, outputAssetId = null, seed = 42 + outputIndex) => ({
  outputIndex, status, outputAssetId, seed,
});

test("batch seeds are stable per slot and wrap at the FIBO seed boundary", () => {
  assert.deepEqual(fiboBatchSeeds(42, 4), [42, 43, 44, 45]);
  assert.deepEqual(fiboBatchSeeds(2_147_483_646, 4), [2_147_483_646, 2_147_483_647, 0, 1]);
  for (const [seed, count] of [[-1, 1], [0, 0], [0, 5], [1.5, 2]]) {
    assert.throws(() => fiboBatchSeeds(seed, count), RangeError);
  }
});

test("batch summary preserves stable output order and truthful partial completion", () => {
  const active = summarizeFiboBatchSlots([
    slot(2, "queued"), slot(0, "succeeded", "asset-0"), slot(1, "running"),
  ], 3);
  assert.deepEqual(active, {
    requested: 3, succeeded: 1, failed: 0, cancelled: 0, active: 2,
    terminal: false, partial: false, status: "running", outputAssetIds: ["asset-0"],
  });
  const partial = summarizeFiboBatchSlots([
    slot(0, "succeeded", "asset-0"), slot(1, "failed"), slot(2, "cancelled"),
  ], 3);
  assert.deepEqual(partial, {
    requested: 3, succeeded: 1, failed: 1, cancelled: 1, active: 0,
    terminal: true, partial: true, status: "succeeded", outputAssetIds: ["asset-0"],
  });
});

test("zero-result terminal batches distinguish failure from cancellation", () => {
  assert.equal(summarizeFiboBatchSlots([slot(0, "failed"), slot(1, "cancelled")], 2).status, "failed");
  assert.equal(summarizeFiboBatchSlots([slot(0, "cancelled"), slot(1, "cancelled")], 2).status, "cancelled");
});

test("malformed, duplicate, missing, or mismatched durable slots fail closed", () => {
  for (const slots of [
    [slot(0, "queued")],
    [slot(0, "queued"), slot(0, "queued")],
    [slot(0, "succeeded"), slot(1, "queued")],
    [slot(0, "failed", "unexpected"), slot(1, "queued")],
    [slot(0, "invented"), slot(1, "queued")],
    [slot(0, "queued", null, -1), slot(1, "queued")],
  ]) assert.equal(summarizeFiboBatchSlots(slots, 2), null);
});
