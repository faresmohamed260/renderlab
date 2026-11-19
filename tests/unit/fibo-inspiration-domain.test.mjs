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
const {
  parseFiboInspirationSource,
  persistFiboInspirationInputs,
  splitPersistedFiboInspirationInputs,
} = await import("../../src/lib/capabilities/fibo-inspiration.ts");

const inspiration = { type: "temporary-source", id: "1c27d33c-0bb7-4389-892b-72cf312dc513" };
const primarySource = { type: "media-asset", id: "d04cbb4a-f4b8-439a-9de2-6b542fbf6b1c" };
const primary = { alias: "image1", role: "primary-image", source: primarySource };
const base = {
  model: "fibo2-edit-turbo",
  prompt: "A quiet modern courtyard at dawn",
  output: { kind: "image", aspectRatio: "16:9" },
  inputs: [],
  autoVgl: true,
};

test("source-free automatic VGL accepts one distinct owner-scoped inspiration", () => {
  const parsed = parseGenerationRequest({ ...base, inspiration });
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.request.inspiration, inspiration);
  const bytes = Buffer.from("inspiration-image");
  const wire = JSON.parse(buildFiboWorkerPayload(parsed.request, [], undefined, bytes).body);
  assert.equal(wire.generate_vgl, true);
  assert.equal(wire.inspiration, bytes.toString("base64"));
  assert.deepEqual(wire.images, []);
});

test("inspiration cannot become an edit slot, mask, manual VGL, or plain prompt input", () => {
  const invalid = [
    { ...base, autoVgl: undefined, inspiration },
    { ...base, inspiration, inputs: [primary] },
    { ...base, inspiration, vgl: '{"short_description":"manual"}' },
    { ...base, inspiration, mask: { type: "temporary-source", id: "43d78108-8b3e-4f1e-ae98-bc11f0ad428c" } },
    { ...base, inspiration: "base64" },
    { ...base, inspiration: { ...inspiration, storageKey: "attacker/key" } },
    { ...base, inspiration: { type: "temporary-source", id: "../image.png" } },
    { ...base, inspiration: primarySource, inputs: [primary] },
  ];
  for (const candidate of invalid) {
    assert.equal(parseGenerationRequest(candidate).ok, false, JSON.stringify(candidate));
  }
  assert.throws(() => buildFiboWorkerPayload({ ...base, inspiration }, []), /inspiration/);
  assert.throws(() => buildFiboWorkerPayload({ ...base, inspiration }, [{ bytes: Buffer.from("edit") }], undefined, Buffer.from("inspire")), /inspiration/);
});

test("inspiration is one durable sentinel and malformed persistence fails closed", () => {
  const stored = persistFiboInspirationInputs([], inspiration);
  assert.deepEqual(stored, [{ role: "fibo-inspiration", source: inspiration }]);
  assert.deepEqual(splitPersistedFiboInspirationInputs(stored), { inputs: [], inspiration });
  assert.deepEqual(splitPersistedFiboInspirationInputs([primary]), { inputs: [primary] });
  assert.deepEqual(parseFiboInspirationSource({ type: "media-asset", id: primarySource.id }), primarySource);
  for (const malformed of [
    null,
    [{ role: "fibo-inspiration", source: inspiration }, primary],
    [{ role: "fibo-inspiration", source: inspiration }, { role: "fibo-inspiration", source: inspiration }],
    [{ role: "fibo-inspiration", source: inspiration, alias: "image1" }],
    [{ role: "fibo-inspiration", source: { type: "temporary-source", id: "bad" } }],
  ]) {
    assert.equal(splitPersistedFiboInspirationInputs(malformed), null, JSON.stringify(malformed));
  }
});

test("retry and recovery preserve inspiration while the current Create recipe fails closed", () => {
  const engine = fs.readFileSync("src/server/generation/native-generation.ts", "utf8");
  const recipe = fs.readFileSync("src/server/generation/generation-recipe.ts", "utf8");
  assert.match(engine, /persistFiboInspirationInputs\(request\.inputs, request\.inspiration\)/);
  assert.match(engine, /splitPersistedFiboInspirationInputs\(persisted\.inputs\)/);
  assert.match(engine, /resolveInspirationBytes\(row\.owner_id, request\)/);
  assert.match(recipe, /splitPersistedFiboInspirationInputs\(persisted\.inputs\)/);
  assert.match(recipe, /request\.mask \|\| request\.autoVgl \|\| request\.inspiration/);
});
