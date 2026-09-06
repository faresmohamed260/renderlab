import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";

import {
  imageUpscaleLimits,
  imageUpscaleSupportedMimeTypes,
  persistedUpscaleSourceAssetId,
  validateImageUpscaleGeometry,
} from "../../src/lib/capabilities/upscale.ts";
import { inspectUpscaleOutputMetadata } from "../../src/server/generation/upscale-output-metadata.ts";

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

test("persisted Upscale reconstruction accepts only canonical fixed-2x durable intent", () => {
  const canonical = {
    operation: "upscale-image",
    outputKind: "image",
    prompt: null,
    inputs: [{
      alias: "image1",
      role: "primary-image",
      source: { type: "media-asset", id: "source-asset-id" },
    }],
    parameters: { upscale: { scale: 2 } },
  };
  assert.equal(persistedUpscaleSourceAssetId(canonical), "source-asset-id");
  assert.equal(persistedUpscaleSourceAssetId({ ...canonical, prompt: "synthetic" }), null);
  assert.equal(persistedUpscaleSourceAssetId({ ...canonical, parameters: { upscale: { scale: 4 } } }), null);
  assert.equal(
    persistedUpscaleSourceAssetId({
      ...canonical,
      inputs: [{ ...canonical.inputs[0], source: { type: "temporary-source", id: "source-asset-id" } }],
    }),
    null,
  );
});

test("Upscale result metadata is derived from the actual single-frame PNG bytes", async () => {
  const png = await sharp({
    create: {
      width: 26,
      height: 14,
      channels: 4,
      background: { r: 12, g: 34, b: 56, alpha: 0.8 },
    },
  }).png().toBuffer();

  assert.deepEqual(await inspectUpscaleOutputMetadata(png, "image/png"), {
    sizeBytes: png.length,
    width: 26,
    height: 14,
  });
  await assert.rejects(() => inspectUpscaleOutputMetadata(png, "image/jpeg"));
  await assert.rejects(() => inspectUpscaleOutputMetadata(Buffer.alloc(0), "image/png"));
});