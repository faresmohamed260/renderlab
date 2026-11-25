import assert from "node:assert/strict";
import test from "node:test";
import { reconstructFailedDraft } from "../../src/server/generation/history/failed-reuse-model.ts";

const owner = "12345678-1234-4234-8234-123456789abc";
const jobId = "12345678-1234-4234-8234-123456789ab1";
const source = { type: "media-asset", id: "12345678-1234-4234-8234-123456789ab2" };
const input = { alias: "image1", role: "primary-image", source };
const request = { model: "fibo2-edit-turbo", prompt: "Edit @image1", output: { kind: "image", aspectRatio: "original" }, inputs: [input], advanced: { seed: 12, steps: 4, guidance: 1 } };
const row = { id: jobId, status: "failed", operation: "edit-image", output_kind: "image", prompt: request.prompt, inputs: [input], parameters: { model: request.model, output: request.output, advanced: request.advanced } };
const reference = { alias: input.alias, source, previewUrl: "/api/media/assets/" + source.id + "/content", label: "Owned image" };
function deps(overrides = {}) {
  return { load: async (o, j) => { assert.equal(o, owner); assert.equal(j, jobId); return row; },
    parse: () => request, reference: async (o, i) => { assert.equal(o, owner); assert.deepEqual(i, input); return reference; }, ...overrides };
}
test("failed reuse returns only an editable validated continuation plan", async () => {
  const r = await reconstructFailedDraft(owner, jobId, deps());
  assert.equal(r.ok, true);
  assert.equal(r.draft.mode, "edit");
  assert.equal(r.draft.prompt, request.prompt);
  assert.equal(r.draft.seed, "12");
  assert.equal(r.draft.randomize, false);
  assert.deepEqual(r.draft.references, [reference]);
  assert.equal(r.draft.aspectRatio, "original");
  assert.equal(r.draft.steps, 4);
});
test("missing or foreign job, wrong status, legacy model and non-image modes fail closed", async () => {
  const cases = [
    [null, "job_not_found"], [{ ...row, status: "succeeded" }, "not_failed"],
    [{ ...row, operation: "create-video", output_kind: "video" }, "unsupported_mode"],
    [{ ...row, parameters: { ...row.parameters, model: "flux2-klein-9b" } }, "unsupported_mode"],
    [{ ...row, parameters: { ...row.parameters, model: undefined } }, "unsupported_mode"],
  ];
  for (const [job, reason] of cases) {
    const r = await reconstructFailedDraft(owner, jobId, deps({ load: async () => job, parse: () => { throw Error("not reached"); } }));
    assert.deepEqual(r, { ok: false, reason });
  }
});
test("mask and auto-VGL recipes are explicitly ineligible even before parsing", async () => {
  for (const [job, reason] of [
    [{ ...row, inputs: [...row.inputs, { role: "fibo-mask", source }] }, "mask_unavailable"],
    [{ ...row, parameters: { ...row.parameters, autoVgl: true } }, "auto_vgl_unavailable"],
    [{ ...row, parameters: { ...row.parameters, generatedVgl: true } }, "auto_vgl_unavailable"],
  ]) {
    assert.deepEqual(await reconstructFailedDraft(owner, jobId, deps({ load: async () => job })), { ok: false, reason });
  }
});
test("missing, deleted, foreign or changed input cannot leak identity or create a partial draft", async () => {
  for (const candidate of [null, { ...reference, source: { ...source, id: jobId } }]) {
    assert.deepEqual(await reconstructFailedDraft(owner, jobId, deps({ reference: async () => candidate })), { ok: false, reason: "input_unavailable" });
  }
  assert.deepEqual(await reconstructFailedDraft(owner, jobId, deps({ parse: () => null })), { ok: false, reason: "invalid_recipe" });
  assert.deepEqual(await reconstructFailedDraft(owner, jobId, deps({ reference: async () => { throw Error("internal detail"); } })), { ok: false, reason: "unavailable" });
});
