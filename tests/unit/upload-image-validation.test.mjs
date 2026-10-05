import assert from "node:assert/strict";
import test from "node:test";

import {
  inspectUploadedImageBytes,
  uploadedImageLimits,
  validateUploadedImageGeometry,
} from "../../src/server/media/image-upload-validation.ts";

const pngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC",
  "base64",
);

test("uploaded image inspection derives trusted geometry from decoded bytes", async () => {
  assert.deepEqual(await inspectUploadedImageBytes(pngBytes, "image/png"), {
    mimeType: "image/png",
    sizeBytes: pngBytes.length,
    width: 1,
    height: 1,
  });
});

test("uploaded image inspection rejects MIME/data mismatch and undecodable bytes", async () => {
  await assert.rejects(() => inspectUploadedImageBytes(pngBytes, "image/jpeg"), RangeError);
  await assert.rejects(
    () => inspectUploadedImageBytes(Buffer.from("not-an-image"), "image/png"),
    RangeError,
  );
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
