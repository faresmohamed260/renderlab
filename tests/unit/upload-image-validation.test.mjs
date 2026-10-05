import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";

import {
  inspectUploadedImageBytes,
  uploadedImageLimits,
  validateUploadedImageGeometry,
} from "../../src/server/media/image-upload-validation.ts";

const pngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC",
  "base64",
);

async function generatedImage(format) {
  const image = sharp({
    create: {
      width: 3,
      height: 2,
      channels: 3,
      background: { r: 10, g: 20, b: 30 },
    },
  });
  return format === "jpeg" ? image.jpeg().toBuffer() : image.webp().toBuffer();
}

test("uploaded image inspection derives trusted geometry from valid PNG/JPEG/WebP bytes", async () => {
  assert.deepEqual(await inspectUploadedImageBytes(pngBytes, "image/png"), {
    mimeType: "image/png",
    sizeBytes: pngBytes.length,
    width: 1,
    height: 1,
  });

  for (const [format, mimeType] of [["jpeg", "image/jpeg"], ["webp", "image/webp"]]) {
    const bytes = await generatedImage(format);
    assert.deepEqual(await inspectUploadedImageBytes(bytes, mimeType), {
      mimeType,
      sizeBytes: bytes.length,
      width: 3,
      height: 2,
    });
  }
});

test("uploaded image inspection rejects MIME/data mismatch and undecodable bytes", async () => {
  await assert.rejects(() => inspectUploadedImageBytes(pngBytes, "image/jpeg"), RangeError);
  await assert.rejects(
    () => inspectUploadedImageBytes(Buffer.from("not-an-image"), "image/png"),
    RangeError,
  );
});

test("uploaded image inspection rejects animated WebP", async () => {
  const stackedFrames = Buffer.from([
    255, 0, 0, 255,
    0, 0, 255, 255,
  ]);
  const animatedWebp = await sharp(stackedFrames, {
    raw: { width: 1, height: 2, channels: 4, pageHeight: 1 },
  }).webp({ loop: 0, delay: [100, 100] }).toBuffer();

  await assert.rejects(() => inspectUploadedImageBytes(animatedWebp, "image/webp"), RangeError);
});

test("uploaded image geometry has explicit edge and decoded-pixel ceilings", () => {
  assert.deepEqual(validateUploadedImageGeometry(8192, 4096), { width: 8192, height: 4096 });
  assert.throws(
    () => validateUploadedImageGeometry(uploadedImageLimits.maxEdge + 1, 1),
    RangeError,
  );
  assert.throws(
    () => validateUploadedImageGeometry(8192, 4097),
    RangeError,
  );
});
