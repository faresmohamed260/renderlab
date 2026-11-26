import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const load = () => import("../../src/features/create/create-hosted-capabilities.ts");

test("P5-01 hosted capability matrix fails closed; absent fields are not support", async () => {
  const { readHostedCreateCapabilities } = await load();
  for (const payload of [null, {}, { available: false, fiboAvailable: true }, { available: true }, { available: true, fiboAvailable: "true" }]) {
    const state = readHostedCreateCapabilities(payload);
    assert.equal(state.ready, false);
    assert.equal(state.autoVglAdvertised, false);
    assert.equal(state.mask, false);
    assert.equal(state.inspiration, false);
    assert.equal(state.multiOutput, false);
    assert.equal(state.negativeConditioning, false);
  }
  const base = { available: true, fiboAvailable: true };
  const ready = readHostedCreateCapabilities(base);
  assert.equal(ready.ready, true);
  assert.equal(ready.manualVgl, true);
  assert.equal(ready.mask, false);
  assert.equal(ready.autoVglAdvertised, false);
  assert.match(ready.generatedVglNotice, /unavailable/i);
  const enabled = readHostedCreateCapabilities({ ...base, fiboMaskAvailable: true, fiboAutoVglAvailable: true });
  assert.equal(enabled.ready, true);
  assert.equal(enabled.mask, true);
  assert.equal(enabled.autoVglAdvertised, true);
  assert.match(enabled.generatedVglNotice, /server.*workspace/i);
  assert.equal(enabled.inspiration, false);
  assert.equal(enabled.multiOutput, false);
  assert.equal(enabled.negativeConditioning, false);
  const invented = readHostedCreateCapabilities({ ...base, inspiration: true, multiOutput: true, negativeConditioning: true });
  assert.equal(invented.inspiration, false);
  assert.equal(invented.multiOutput, false);
  assert.equal(invented.negativeConditioning, false);
});

test("P5-01 live capability response uses the existing GET and never fabricates flags", async () => {
  const { fetchHostedCreateCapabilities } = await load();
  const controller = new AbortController();
  const calls = [];
  const read = await fetchHostedCreateCapabilities(controller.signal, async (url, options) => {
    calls.push([url, options]);
    return Response.json({ available: true, fiboAvailable: true, fiboMaskAvailable: true });
  });
  assert.equal(read.ready, true);
  assert.equal(read.mask, true);
  assert.deepEqual(calls, [["/api/generation/jobs", { cache: "no-store", signal: controller.signal }]]);
  await assert.rejects(() => fetchHostedCreateCapabilities(controller.signal, async () => new Response(null, { status: 503 })));
});

test("P5-01 production workspace gates all visible and alternate attachment paths", async () => {
  const workspace = await readFile(new URL("../../src/features/create/create-preview-workspace.tsx", import.meta.url), "utf8");
  const stage = await readFile(new URL("../../src/features/create/create-preview-stage.tsx", import.meta.url), "utf8");
  assert.match(workspace, /fetchHostedCreateCapabilities\(controller\.signal\)/);
  assert.match(workspace, /if \(file && !inspirationEnabled\) return/);
  assert.match(workspace, /index === 4 && !inspirationEnabled/);
  assert.match(workspace, /target === 4 \|\| \(target === "canvas" && mode === "generate"\)/);
  assert.match(workspace, /inspirationEnabled \? <div className="create-preview-tile"/);
  assert.match(workspace, /browseUnavailableReason=\{/);
  assert.match(stage, /browseUnavailableReason \? <p/);
  assert.match(workspace, /multiOutputEnabled \? <Input id="create-preview-count"/);
  // Negative prompt control removed by owner decision (2026-11-26); the submit gate below still never sends it unless the capability is advertised.
  assert.doesNotMatch(workspace, /create-preview-negative-label/);
  assert.match(workspace, /negativeConditioningEnabled \? negativePrompt\.trim\(\) : ""/);
  assert.match(workspace, /generatedVglNotice/);
  assert.match(workspace, /manual VGL JSON/i);
});

test("P5-01 unavailable inspiration consumes file drops without opening the file or attaching it", async () => {
  const { rejectUnavailableInspirationDrop } = await load();
  const calls = [];
  const event = { dataTransfer: { types: ["Files"], dropEffect: "copy" }, preventDefault() { calls.push("prevent"); } };
  rejectUnavailableInspirationDrop(event);
  assert.equal(event.dataTransfer.dropEffect, "none");
  assert.deepEqual(calls, ["prevent"]);
  const textDrag = { dataTransfer: { types: ["text/plain"], dropEffect: "copy" }, preventDefault() { calls.push("text"); } };
  rejectUnavailableInspirationDrop(textDrag);
  assert.deepEqual(calls, ["prevent"]);
});
