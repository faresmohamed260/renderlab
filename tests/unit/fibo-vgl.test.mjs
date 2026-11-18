import assert from "node:assert/strict";
import test from "node:test";

import {
  fiboVglCharacterLimit,
  normalizeFiboVgl,
  resolveFiboVglReferences,
} from "../../src/lib/capabilities/fibo-vgl.ts";

test("manual FIBO VGL requires bounded nonempty JSON objects", () => {
  assert.equal(normalizeFiboVgl('{"edit_instruction":"replace the coat"}', []),
    '{"edit_instruction":"replace the coat"}');
  for (const input of ["", "[]", "null", "false", "{}", "[1]", "{invalid}", '"string"',
    JSON.stringify({ edit_instruction: "x".repeat(fiboVglCharacterLimit) })]) {
    assert.equal(normalizeFiboVgl(input, []), null, input.slice(0, 40));
  }
  assert.equal(normalizeFiboVgl({ edit_instruction: "not a string" }, []), null);
});

test("manual VGL references may only address attached ordered FIBO image inputs", () => {
  const aliases = ["image3", "image1"];
  const vgl = '{"edit_instruction":"Use @image3 with @image1; compare <image_2> to <image_1>."}';
  assert.equal(normalizeFiboVgl(vgl, aliases), vgl);
  for (const invalid of [
    '{"edit_instruction":"Use @image2"}',
    '{"edit_instruction":"Use <image_3>"}',
    '{"edit_instruction":"Use <image_0>"}',
    '{"instruction":["Valid @image3", "Invalid @image4"]}',
  ]) {
    assert.equal(normalizeFiboVgl(invalid, aliases), null, invalid);
  }
});

test("VGL reference conversion changes values but not JSON property names", () => {
  const source = '{"@image3":{"caption":"Move @image1 beside @image3 and keep <image_2>."},"items":["@image3",4]}';
  const resolved = JSON.parse(resolveFiboVglReferences(source, ["image3", "image1"]));
  assert.deepEqual(resolved, {
    "@image3": { caption: "Move <image_2> beside <image_1> and keep <image_2>." },
    items: ["<image_1>", 4],
  });
});
