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

const { buildFiboWorkerPayload } = await import("../../src/server/generation/fibo-worker-payload.ts");

const mask = { type: "temporary-source", id: "43d78108-8b3e-4f1e-ae98-bc11f0ad428c" };
const primary = { alias: "image3", role: "primary-image", source: { type: "media-asset", id: "source-owned" } };
const source = Buffer.from("actual source image bytes");
const png = Buffer.from("89504e470d0a1a0a001122334455", "hex");
const request = {
  model: "fibo2-edit-turbo",
  prompt: "Replace @image3 sky",
  mask,
  inputs: [primary],
  output: { kind: "image", aspectRatio: "4:3" },
  advanced: { seed: 7, steps: 3 },
};

test("masked edit wire sends source as image_1 and a separate PNG mask, never image_2", () => {
  const wire = buildFiboWorkerPayload(request, [{ bytes: source }], png);
  assert.equal(wire.contentType, "application/json");
  const decoded = JSON.parse(wire.body);
  assert.equal(decoded.prompt, "Replace <image_1> sky");
  assert.equal(decoded.width, 1152);
  assert.equal(decoded.height, 864);
  assert.equal(decoded.seed, 7);
  assert.equal(decoded.steps, 3);
  assert.deepEqual(decoded.images, [source.toString("base64")]);
  assert.equal(decoded.mask, png.toString("base64"));
  assert.equal(Buffer.from(decoded.mask, "base64").equals(png), true);
});

test("VGL-only and mask send both correct JSON and source references through native wire", () => {
  const vgl = '{"edit_instruction":"Change @image3 sky"}';
  const wire = buildFiboWorkerPayload({ ...request, prompt: vgl, vgl }, [{ bytes: source }], png);
  const decoded = JSON.parse(wire.body);
  assert.equal(decoded.prompt, "");
  assert.equal(decoded.vgl, '{"edit_instruction":"Change <image_1> sky"}');
  assert.equal(decoded.images.length, 1);
  assert.equal(decoded.mask, png.toString("base64"));
});

test("worker wire rejects absent, substituted or oversized masks instead of silently dropping", () => {
  assert.throws(() => buildFiboWorkerPayload(request, [{ bytes: source }]), /mask/);
  assert.throws(() => buildFiboWorkerPayload({ ...request, mask: undefined }, [{ bytes: source }], png), /mask/);
  assert.throws(() => buildFiboWorkerPayload(request, [], png), /mask/);
  assert.throws(() => buildFiboWorkerPayload(request, [{ bytes: source }, { bytes: source }], png), /mask/);
  assert.throws(() => buildFiboWorkerPayload(request, [{ bytes: source }], Buffer.alloc(8 * 1024 * 1024 + 1)), /mask/);
  assert.throws(() => buildFiboWorkerPayload({ ...request, output: { kind: "image", aspectRatio: "21:9" } },
    [{ bytes: source }], png), /dimensions/);
  assert.throws(() => buildFiboWorkerPayload({ ...request, model: "qwen-image-edit-2511" },
    [{ bytes: source }], png), /model/);
});
