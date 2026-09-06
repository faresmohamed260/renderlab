import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";

import {
  imageUpscaleLimits,
  imageUpscaleSupportedMimeTypes,
} from "../../src/lib/capabilities/upscale.ts";
import { inspectUpscaleImageBytes } from "../../src/server/generation/upscale-source.ts";

function image(width, height) {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 40, g: 80, b: 120, alpha: 0.75 },
    },
  });
}

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

test("upscale byte inspection accepts a single-frame PNG and derives exact 2x geometry", async () => {
  const bytes = await image(48, 32).png().toBuffer();
  const inspected = await inspectUpscaleImageBytes(bytes, "image/png");
  assert.equal(inspected.width, 48);
  assert.equal(inspected.height, 32);
  assert.equal(inspected.outputWidth, 96);
  assert.equal(inspected.outputHeight, 64);
  assert.equal(inspected.sizeBytes, bytes.byteLength);
});

test("upscale byte inspection uses display-oriented EXIF geometry", async () => {
  const bytes = await image(30, 20).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const inspected = await inspectUpscaleImageBytes(bytes, "image/jpeg");
  assert.equal(inspected.width, 20);
  assert.equal(inspected.height, 30);
  assert.equal(inspected.outputWidth, 40);
  assert.equal(inspected.outputHeight, 60);
});

test("upscale byte inspection rejects MIME mismatch and verified geometry overflow", async () => {
  const png = await image(8, 8).png().toBuffer();
  await assert.rejects(() => inspectUpscaleImageBytes(png, "image/jpeg"), RangeError);

  const oversized = await image(4097, 1).png().toBuffer();
  await assert.rejects(() => inspectUpscaleImageBytes(oversized, "image/png"), RangeError);
});
