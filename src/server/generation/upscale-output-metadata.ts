import sharp from "sharp";

export type UpscaleOutputMetadata = {
  sizeBytes: number;
  width: number;
  height: number;
};

export async function inspectUpscaleOutputMetadata(
  bytes: Uint8Array,
  contentType: string,
): Promise<UpscaleOutputMetadata> {
  if (contentType !== "image/png" || bytes.byteLength < 1) {
    throw new Error("Upscale finalization requires a non-empty PNG result.");
  }

  const metadata = await sharp(Buffer.from(bytes), { animated: true, limitInputPixels: false }).metadata();
  if (
    metadata.format !== "png"
    || (metadata.pages ?? 1) !== 1
    || !Number.isInteger(metadata.width)
    || !Number.isInteger(metadata.height)
    || !metadata.width
    || !metadata.height
  ) {
    throw new Error("Upscale finalization could not verify the PNG result geometry.");
  }

  return {
    sizeBytes: bytes.byteLength,
    width: metadata.width,
    height: metadata.height,
  };
}
