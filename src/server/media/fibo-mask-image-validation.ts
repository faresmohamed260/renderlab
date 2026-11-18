import sharp from "sharp";
import { fiboMaskMaxBytes } from "@/lib/capabilities/fibo-mask";

/** Decode and validate the editor's red-channel white=selected binary mask.
 * General image upload inspection must run first to validate the PNG container.
 * The native worker revalidates bytes and selection before rendering.
 */
export async function inspectFiboMaskSelection(
  bytes: Uint8Array,
  image: { width: number; height: number },
): Promise<void> {
  if (!bytes.byteLength || bytes.byteLength > fiboMaskMaxBytes
    || image.width < 1 || image.height < 1 || image.width > 4096 || image.height > 4096
    || image.width * image.height > 16_777_216) {
    throw new RangeError("FIBO mask bytes or geometry exceed the supported bounds.");
  }
  const stats = await sharp(Buffer.from(bytes), {
    failOn: "error",
    animated: true,
    limitInputPixels: 16_777_216,
  }).extractChannel("red").stats();
  if ((stats.channels[0]?.max ?? 0) <= 8) {
    throw new RangeError("The FIBO mask does not select any editable pixels.");
  }
}
