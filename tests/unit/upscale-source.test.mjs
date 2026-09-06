import assert from "node:assert/strict";
import test from "node:test";

import {
  imageUpscaleLimits,
  imageUpscaleSupportedMimeTypes,
  validateImageUpscaleGeometry,
} from "../../src/lib/capabilities/upscale.ts";

test("upscale limits mirror the verified fixed-2x worker contract", () => {
  assert.deepEqual(imageUpscaleSupportedMimeTypes, ["image/png", "image/jpeg", "image/webp"]);
  assert.deepEqual(imageUpscaleLimits, {
    maxInputBytes: 25 * 1024 * 1024,
    maxInputEdge: 4096,
    maxInputPixels: 4_194_304,
    maxOutputEdge: 8192,
    maxOutputPixels: 16_777_216,
  });
});

test("upscale geometry derives an exact fixed 2x result", () => {
  assert.deepEqual(validateImageUpscaleGeometry(48, 32, 2048), {
    width: 48,
    height: 32,
    outputWidth: 96,
    outputHeight: 64,
  });
  assert.deepEqual(validateImageUpscaleGeometry(4096, 1024, 1024), {
    width: 4096,
    height: 1024,
    outputWidth: 8192,
    outputHeight: 2048,
  });
});

test("upscale geometry rejects empty, oversized-byte, edge, and pixel inputs", () => {
  assert.throws(() => validateImageUpscaleGeometry(1, 1, 0), RangeError);
  assert.throws(
    () => validateImageUpscaleGeometry(1, 1, imageUpscaleLimits.maxInputBytes + 1),
    RangeError,
  );
  assert.throws(() => validateImageUpscaleGeometry(4097, 1, 1), RangeError);
  assert.throws(() => validateImageUpscaleGeometry(4096, 1025, 1), RangeError);
});
