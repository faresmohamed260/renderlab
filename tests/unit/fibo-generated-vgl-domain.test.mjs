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
const { buildFiboWorkerPayload } = await import("../../src/server/generation/fibo-worker-payload.ts");
const { normalizeGeneratedFiboVgl, parseGeneratedFiboSidecar } =
  await import("../../src/lib/capabilities/fibo-generated-vgl.ts");

const base = {
  model: "fibo2-edit-turbo",
  prompt: "A red ceramic cube on a pale wooden table",
  output: { kind: "image", aspectRatio: "1:1" },
  inputs: [],
};
const mask = { type: "temporary-source", id: "43d78108-8b3e-4f1e-ae98-bc11f0ad428c" };
const primary = { alias: "image1", role: "primary-image", source: { type: "media-asset", id: "d04cbb4a-f4b8-439a-9de2-6b542fbf6b1c" } };

test("autoVgl source-free FIBO request is explicit, bounded and separate from manual VGL", () => {
  const parsed = parseGenerationRequest({ ...base, autoVgl: true });
  assert.equal(parsed.ok, true);
  assert.equal(parsed.request.autoVgl, true);
  assert.equal(parsed.request.vgl, undefined);
  const wire = JSON.parse(buildFiboWorkerPayload(parsed.request, []).body);
  assert.equal(wire.generate_vgl, true);
  assert.equal(wire.prompt, base.prompt);
  assert.deepEqual(wire.images, []);
  assert.equal(wire.vgl, undefined);
  const plain = parseGenerationRequest(base);
  assert.equal(plain.ok, true);
  assert.equal(plain.request.autoVgl, undefined);
  assert.equal(JSON.parse(buildFiboWorkerPayload(plain.request, []).body).generate_vgl, undefined);
});

test("autoVgl accepts ordered edits and masks but rejects manual, blank or retired modes", () => {
  assert.equal(parseGenerationRequest({ ...base, inputs: [primary], autoVgl: true }).ok, true);
  assert.equal(parseGenerationRequest({ ...base, inputs: [primary], mask, autoVgl: true }).ok, true);
  const four = [primary, ...[2, 3, 4].map((index) => ({
    alias: `image${index}`,
    role: "reference",
    source: { type: "media-asset", id: `00000000-0000-4000-8000-00000000000${index}` },
  }))];
  const fourParsed = parseGenerationRequest({ ...base, inputs: four, autoVgl: true });
  assert.equal(fourParsed.ok, true);
  const fourBytes = four.map((_, index) => ({ bytes: Buffer.from(`source-${index + 1}`) }));
  assert.deepEqual(
    JSON.parse(buildFiboWorkerPayload(fourParsed.request, fourBytes).body).images,
    fourBytes.map(({ bytes }) => bytes.toString("base64")),
  );
  for (const overrides of [
    { autoVgl: false },
    { autoVgl: "true" },
    { autoVgl: 1 },
    { autoVgl: true, vgl: '{"short_description":"manual"}' },
    { autoVgl: true, prompt: "" },
    { autoVgl: true, output: { kind: "image", aspectRatio: "original" } },
    { autoVgl: true, output: { kind: "video", aspectRatio: "1:1" } },
    { generatedVgl: '{"short_description":"I forged this worker response"}' },
  ]) {
    const result = parseGenerationRequest({ ...base, ...overrides });
    assert.equal(result.ok, false, JSON.stringify(overrides));
    assert.equal(result.error.code, "invalid_request");
  }
});

test("wire preserves image-aware auto-VGL and fails closed for manual VGL or geometry", () => {
  const req = parseGenerationRequest({ ...base, autoVgl: true }).request;
  const edit = parseGenerationRequest({ ...base, inputs: [primary], autoVgl: true }).request;
  const wire = JSON.parse(buildFiboWorkerPayload(edit, [{ bytes: Buffer.from("source") }]).body);
  assert.equal(wire.generate_vgl, true);
  assert.deepEqual(wire.images, [Buffer.from("source").toString("base64")]);
  const original = parseGenerationRequest({
    ...base,
    inputs: [primary],
    autoVgl: true,
    output: { kind: "image", aspectRatio: "original" },
  }).request;
  assert.equal(JSON.parse(buildFiboWorkerPayload(original, [{ bytes: Buffer.from("source") }]).body).width, 0);
  assert.throws(() => buildFiboWorkerPayload({ ...req, vgl: '{"short_description":"manual"}' }, []), /manual VGL/);
  assert.throws(() => buildFiboWorkerPayload({ ...req, output: { kind: "image", aspectRatio: "original" } }, []));
});

test("signed JSON VGL sidecar must contain precisely one bounded structured caption", () => {
  const vgl = '{ "short_description": "A red ceramic cube", "lighting": "soft" }';
  assert.equal(normalizeGeneratedFiboVgl(vgl), vgl);
  assert.equal(parseGeneratedFiboSidecar({ vgl }), vgl);
  for (const item of [
    null, 7, "not json", "[]", "{}", '{"edit_instruction":"bad"}',
    '{"short_description":""}', '{"short_description":"ok","edit_instruction":"bad"}',
    '{"short_description":"' + "x".repeat(1001) + '"}',
    '{"short_description":"ok","context":"' + "x".repeat(8200) + '"}',
  ]) {
    assert.equal(normalizeGeneratedFiboVgl(item), null, String(item).slice(0, 50));
  }
  for (const item of [
    {}, { vgl, owner_id: "impersonated" }, { vgl, url: "https://attacker.invalid" },
    { vgl: 7 }, { vgl: "{}" }, { vgl: '{"edit_instruction":"bad"}' }, [vgl], null,
  ]) {
    assert.equal(parseGeneratedFiboSidecar(item), null, JSON.stringify(item)?.slice(0, 60));
  }
  const editVgl = '{"edit_instruction":"Make the selected coat blue"}';
  assert.equal(normalizeGeneratedFiboVgl(editVgl, "edit"), editVgl);
  assert.equal(parseGeneratedFiboSidecar({ vgl: editVgl }, "edit"), editVgl);
  assert.equal(normalizeGeneratedFiboVgl(editVgl, "scene"), null);
  assert.equal(normalizeGeneratedFiboVgl('{"short_description":"not an edit"}', "edit"), null);
});

test("auto-VGL remains default-off and is captured before durable image finalization", () => {
  const admission = fs.readFileSync("src/server/generation/submit-generation.ts", "utf8");
  const route = fs.readFileSync("src/app/api/generation/jobs/route.ts", "utf8");
  const engine = fs.readFileSync("src/server/generation/native-generation.ts", "utf8");
  const recipe = fs.readFileSync("src/server/generation/generation-recipe.ts", "utf8");
  assert.match(admission, /process\.env\.RENDERLAB_FIBO_AUTOVGL_ENABLED === "true"/);
  assert.match(admission, /request\.autoVgl && !isFiboAutoVglAvailable\(\)/);
  assert.match(route, /fiboAutoVglAvailable: true/);
  assert.match(engine, /getGeneratedFiboCaption\(/);
  assert.match(engine, /parameters: \{ \.\.\.row\.parameters, generatedVgl, generatedVglSource:/);
  assert.match(engine, /generatedVgl: row\.parameters\.generatedVgl/);
  assert.match(engine, /generation_vgl_invalid/);
  assert.match(engine, /generation_vgl_stalled/);
  assert.match(engine, /InvalidGeneratedFiboSidecarError/);
  assert.match(recipe, /request\.mask \|\| request\.autoVgl \|\| request\.inspiration/);
});
