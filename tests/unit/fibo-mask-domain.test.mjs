import assert from "node:assert/strict";
import fs from "node:fs";
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
const { validateReferenceTicketRequest } = await import("../../src/lib/api/reference-upload-contract.ts");
const {
  parseFiboMaskSource,
  persistFiboMaskInputs,
  splitPersistedFiboMaskInputs,
} = await import("../../src/lib/capabilities/fibo-mask.ts");

const sourceId = "d04cbb4a-f4b8-439a-9de2-6b542fbf6b1c";
const maskId = "43d78108-8b3e-4f1e-ae98-bc11f0ad428c";
const otherId = "1c27d33c-0bb7-4389-892b-72cf312dc513";
const mask = { type: "temporary-source", id: maskId };
const primary = { alias: "image1", role: "primary-image", source: { type: "media-asset", id: sourceId } };
const base = {
  model: "fibo2-edit-turbo",
  prompt: "Paint the selected sky violet",
  output: { kind: "image", aspectRatio: "1:1" },
  inputs: [primary],
};

test("one FIBO edit source plus one separate durable mask identity is accepted", () => {
  const parsed = parseGenerationRequest({ ...base, mask });
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.request.mask, mask);
  assert.deepEqual(parsed.request.inputs, [primary]);
  const withVgl = parseGenerationRequest({ ...base, mask, vgl: '{"edit_instruction":"Tint the sky"}' });
  assert.equal(withVgl.ok, true);
  assert.equal(withVgl.request.vgl, '{"edit_instruction":"Tint the sky"}');
});

test("mask rejects text-only generation, multiple images, reused or invented sources", () => {
  const invalid = [
    { ...base, mask: "raw-base64" },
    { ...base, mask: { type: "media-asset", id: maskId } },
    { ...base, mask: { type: "temporary-source", id: "relative/path.png" } },
    { ...base, mask: { ...mask, storageKey: "evil/key" } },
    { ...base, mask: { ...mask, id: "not-a-uuid" } },
    { ...base, inputs: [], mask },
    { ...base, inputs: [primary, {
      alias: "image2", role: "reference", source: { type: "media-asset", id: otherId },
    }], mask },
    { ...base, inputs: [ { ...primary, source: mask } ], mask },
    { ...base, output: { kind: "video", aspectRatio: "16:9" }, mask },
    { ...base, model: "flux2-klein-9b", mask },
  ];
  for (const input of invalid) {
    const result = parseGenerationRequest(input);
    assert.equal(result.ok, false, JSON.stringify(input));
    assert.equal(result.error.code, "invalid_request");
  }
});

test("stored mask sentinel is one extra durable job input, never a FIBO image slot", () => {
  const inputs = persistFiboMaskInputs([primary], mask);
  assert.equal(inputs.length, 2);
  assert.deepEqual(inputs[1], { role: "fibo-mask", source: mask });
  const persisted = splitPersistedFiboMaskInputs(inputs);
  assert.deepEqual(persisted, { inputs: [primary], mask });
  const reconstructed = parseGenerationRequest({ ...base, inputs: persisted.inputs, mask: persisted.mask });
  assert.equal(reconstructed.ok, true);
  assert.deepEqual(reconstructed.request.mask, mask);
  assert.deepEqual(splitPersistedFiboMaskInputs([primary]), { inputs: [primary] });
  assert.equal(parseFiboMaskSource({ ...mask, foo: "x" }), null);
});

test("malformed persisted mask metadata fails closed on retry or recipe reload", () => {
  for (const stored of [
    null, {},
    [{ role: "fibo-mask", source: mask }, primary],
    [primary, { role: "fibo-mask", source: mask }, { role: "fibo-mask", source: mask }],
    [primary, { role: "fibo-mask", source: { type: "media-asset", id: maskId } }],
    [primary, { role: "fibo-mask", source: { type: "temporary-source", id: "../evil.png" } }],
    [primary, { role: "fibo-mask", source: mask, alias: "image2" }],
  ]) {
    assert.equal(splitPersistedFiboMaskInputs(stored), null, JSON.stringify(stored));
  }
});

test("signed upload ticket marks masks separately and enforces PNG/8MiB", () => {
  const source = { filename: "paint.png", mimeType: "image/png", sizeBytes: 9216 };
  const good = validateReferenceTicketRequest({ ...source, usage: "fibo-mask" });
  assert.equal(good.ok, true);
  assert.equal(good.request.usage, "fibo-mask");
  const ordinary = validateReferenceTicketRequest(source);
  assert.equal(ordinary.ok, true);
  assert.equal(ordinary.request.usage, undefined);
  for (const invalid of [
    { ...source, usage: "fibo-mask", mimeType: "image/jpeg" },
    { ...source, usage: "fibo-mask", sizeBytes: 8 * 1024 * 1024 + 1 },
    { ...source, usage: "fibo-mask", sizeBytes: 0 },
    { ...source, usage: "fibo-mask", mimeType: "image/webp" },
    { ...source, usage: "inspiration" },
  ]) {
    const parsed = validateReferenceTicketRequest(invalid);
    assert.equal(parsed.ok, false, JSON.stringify(invalid));
    assert.equal(parsed.error.code, "invalid_upload");
  }
});

test("masked generation requires separately enabled server-only FIBO qualification gate", () => {
  const server = fs.readFileSync("src/server/generation/submit-generation.ts", "utf8");
  const api = fs.readFileSync("src/app/api/generation/jobs/route.ts", "utf8");
  assert.match(server, /process\.env\.RENDERLAB_FIBO_MASK_ENABLED === "true"/);
  assert.match(server, /request\.mask && !isFiboMaskGenerationAvailable\(ownerId\)/);
  assert.match(server, /code: "generation_disabled"/);
  assert.match(api, /isFiboMaskGenerationAvailable\(\) \? \{ fiboMaskAvailable: true \}/);
});
