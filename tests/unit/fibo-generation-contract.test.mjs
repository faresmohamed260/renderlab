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

const { parseGenerationRequest } = await import("../../src/lib/api/generation-contract.ts");

function request(overrides = {}) {
  return {
    model: "fibo2-edit-turbo",
    prompt: "Make a cinematic portrait",
    output: { kind: "image", aspectRatio: "1:1" },
    inputs: [],
    ...overrides,
  };
}
function image(i) {
  return { alias: `image${i}`, role: i === 1 ? "primary-image" : "reference",
    source: { type: "media-asset", id: `owned-input-${i}` } };
}

test("native FIBO API admits manual VGL with a text prompt or standalone VGL", () => {
  const vgl = '{"caption":"A bright portrait","lighting":"soft"}';
  const withText = parseGenerationRequest(request({ vgl }));
  assert.equal(withText.ok, true);
  assert.equal(withText.request.vgl, vgl);
  assert.equal(withText.request.prompt, "Make a cinematic portrait");

  const standalone = parseGenerationRequest(request({ prompt: "", vgl }));
  assert.equal(standalone.ok, true);
  assert.equal(standalone.request.prompt, vgl);
  assert.equal(standalone.request.vgl, vgl);
});

test("FIBO API admits four owner-identifiable ordered image slots in VGL", () => {
  const inputs = [image(1), image(2), image(3), image(4)];
  const submitted = parseGenerationRequest(request({
    prompt: "",
    vgl: '{"edit_instruction":"Put @image4 behind @image1, with <image_2> and <image_3>."}',
    inputs,
  }));
  assert.equal(submitted.ok, true);
  assert.deepEqual(submitted.request.inputs, inputs);
});

test("manual VGL rejects malformed JSON, missing references and retired operations", () => {
  const baseline = request({ inputs: [image(1)] });
  const invalid = [
    { ...baseline, vgl: "[]" },
    { ...baseline, vgl: "{}" },
    { ...baseline, vgl: '{"edit_instruction":"Use @image2"}' },
    { ...baseline, vgl: '{"edit_instruction":"Use <image_4>"}' },
    { ...baseline, vgl: '{"edit_instruction":"broken"' },
    { ...baseline, mask: "unsupported" },
    { ...baseline, json_instruction: '{"caption":"unsupported spelling"}' },
    { ...baseline, output: { kind: "video", aspectRatio: "16:9" }, vgl: '{"caption":"video"}' },
    { ...baseline, model: "flux2-klein-9b", vgl: '{"caption":"legacy"}' },
  ];
  for (const candidate of invalid) {
    const result = parseGenerationRequest(candidate);
    assert.equal(result.ok, false, JSON.stringify(candidate));
    assert.equal(result.error.code, "invalid_request");
  }
});

test("VGL-only JSON up to 8192 characters has separate bounded input from prompt", () => {
  const largeVgl = JSON.stringify({ caption: "x".repeat(4400) });
  assert.equal(parseGenerationRequest(request({ prompt: "", vgl: largeVgl })).ok, true);
  const tooLongVgl = JSON.stringify({ caption: "x".repeat(8200) });
  assert.equal(parseGenerationRequest(request({ prompt: "", vgl: tooLongVgl })).ok, false);
  assert.equal(parseGenerationRequest(request({ prompt: "x".repeat(9000) })).ok, false);
});
