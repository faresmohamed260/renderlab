import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { compositions, fixture, transition, blocker } from "../../design/rd/p6-02a-create/app/create-fixtures.ts";

test("eight deterministic compositions are independent and represent actual fixture phases", () => {
  assert.deepEqual(compositions, ["empty", "typing", "references", "advanced", "generating", "result", "error", "failed"]);
  assert.deepEqual(compositions.map((name) => fixture(name).phase), ["draft", "draft", "draft", "draft", "active", "result", "error", "failed"]);
  assert.equal(fixture("advanced").recipe.advanced, true);
  assert.equal(fixture("generating").status, "running");
  assert.ok(blocker(fixture("empty").recipe));
  for (const name of compositions.slice(1)) assert.equal(blocker(fixture(name).recipe), undefined);
  assert.notEqual(fixture("typing").recipe, fixture("typing").recipe);
});

test("explicit job events prevent duplicate submissions and distinguish cancel, result and failure", () => {
  const start = transition(fixture("typing"), { type: "submit" });
  assert.equal(start.status, "accepted");
  assert.equal(transition(start, { type: "submit" }), start);
  assert.equal(transition(start, { type: "prompt", value: "discard" }), start);
  const queued = transition(start, { type: "advance" });
  assert.equal(queued.status, "queued");
  const running = transition(queued, { type: "advance" });
  assert.equal(running.status, "running");
  const result = transition(running, { type: "advance" });
  assert.equal(result.phase, "result");
  assert.equal(result.result, "sample-result");
  assert.equal(transition(result, { type: "advance" }), result);
  const cancelling = transition(running, { type: "cancel" });
  assert.equal(cancelling.status, "cancelling");
  assert.equal(transition(cancelling, { type: "cancel" }), cancelling);
  const cancelled = transition(cancelling, { type: "advance" });
  assert.equal(cancelled.phase, "draft");
  assert.deepEqual(cancelled.recipe, start.recipe);
  const failed = transition(running, { type: "fail" });
  assert.equal(failed.phase, "failed");
  assert.ok(!("result" in failed));
  assert.deepEqual(transition(failed, { type: "reuse" }).recipe, start.recipe);
});

test("reference moves preserve aliases, removal blocks orphaned references, and mask is source-only", () => {
  const initial = fixture("references");
  const moved = transition(initial, { type: "move", key: "sample-a", direction: 1 });
  assert.deepEqual(moved.recipe.references.map((r) => r.key), ["sample-b", "sample-a"]);
  assert.match(moved.recipe.prompt, /arch from @image2/);
  assert.match(moved.recipe.prompt, /texture of @image1/);
  assert.equal(transition(moved, { type: "move", key: "sample-a", direction: 1 }), moved);
  const removed = transition(moved, { type: "remove", key: "sample-a" });
  assert.ok(blocker(removed.recipe));
  assert.match(removed.recipe.prompt, /@missing-image/);
  assert.equal(transition(initial, { type: "mask", value: true }), initial);
  const mask = transition(fixture("result"), { type: "mask", value: true });
  assert.equal(mask.recipe.mask, true);
  assert.equal(transition(mask, { type: "attach", key: "sample-b" }).recipe.mask, false);
  const four = ["sample-c", "sample-d"].reduce((state, key) => transition(state, { type: "attach", key }), initial);
  assert.equal(four.recipe.references.length, 4);
  assert.equal(transition(four, { type: "attach", key: "sample-a" }), four);
});

test("hosted fixture rejects unavailable steps and malformed manual VGL", () => {
  const start = fixture("typing");
  assert.ok(blocker(transition(start, { type: "steps", value: 5 }).recipe));
  assert.equal(transition(start, { type: "steps", value: 9 }), start);
  for (const value of ["{", "[]", "{}"]) assert.ok(blocker(transition(start, { type: "vgl", value }).recipe));
  assert.equal(transition(fixture("empty"), { type: "submit" }).phase, "error");
});

test("Create composition stays design-only and uses the canonical motion owner", async () => {
  const code = await readFile(new URL("../../design/rd/p6-02a-create/app/create-composition.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(code, /<(button|input|select|textarea)\b/);
  assert.match(code, /from "\.\.\/\.\.\/\.\.\/system\/v2\/springs"/);
  assert.match(code, /springs\.gentle/);
  assert.match(code, /springs\.smooth/);
  assert.match(code, /springs\["drag-release"\]/);
  assert.match(code, /id="create-preview-steps"/);
});
