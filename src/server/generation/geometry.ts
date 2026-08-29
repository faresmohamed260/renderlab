import sharp from "sharp";
import type { PresetAspectRatio } from "@/lib/capabilities/generation";

const executionMegapixels = 1;
const videoMinimumAspectRatio = 0.4;
const videoMaximumAspectRatio = 2.5;

function parsePresetAspectRatio(aspectRatio: PresetAspectRatio) {
  const [width, height] = aspectRatio.split(":").map(Number);
  if (!(width > 0) || !(height > 0)) throw new Error("Unsupported execution aspect ratio.");
  return { width, height, ratio: width / height };
}

function executionDimensions(aspectRatio: PresetAspectRatio) {
  const parsed = parsePresetAspectRatio(aspectRatio);
  const targetPixels = executionMegapixels * 1_000_000;
  const rawUnit = Math.sqrt(targetPixels / (parsed.width * parsed.height));
  const unit = Math.max(8, Math.round(rawUnit / 8) * 8);
  return {
    width: parsed.width * unit,
    height: parsed.height * unit,
  };
}

function displayDimensions(metadata: sharp.Metadata) {
  let width = metadata.width ?? 0;
  let height = metadata.height ?? 0;
  if (metadata.orientation && metadata.orientation >= 5 && metadata.orientation <= 8) {
    [width, height] = [height, width];
  }
  if (!(width > 0) || !(height > 0)) throw new Error("Source image dimensions could not be read.");
  return { width, height };
}

function greatestCommonDivisor(left: number, right: number) {
  let a = Math.abs(Math.round(left));
  let b = Math.abs(Math.round(right));
  while (b) [a, b] = [b, a % b];
  return Math.max(1, a);
}

export async function createImageGenerationCanvas(aspectRatio: PresetAspectRatio) {
  const dimensions = executionDimensions(aspectRatio);
  const bytes = await sharp({
    create: {
      width: dimensions.width,
      height: dimensions.height,
      channels: 3,
      background: { r: 128, g: 128, b: 128 },
    },
  }).png().toBuffer();
  return {
    bytes,
    contentType: "image/png",
    filename: `renderlab-${aspectRatio.replace(":", "x")}-canvas.png`,
  };
}

export async function prepareImageAspectOverride(bytes: Buffer, aspectRatio: PresetAspectRatio) {
  const dimensions = executionDimensions(aspectRatio);
  return sharp(bytes, { failOn: "error" })
    .rotate()
    .resize(dimensions.width, dimensions.height, {
      fit: "cover",
      position: "centre",
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();
}

export async function sourceVideoAspectRatio(bytes: Buffer) {
  const metadata = await sharp(bytes, { failOn: "error" }).metadata();
  const { width, height } = displayDimensions(metadata);
  const ratio = width / height;
  if (ratio < videoMinimumAspectRatio || ratio > videoMaximumAspectRatio) {
    throw new Error(
      "This source image is outside the supported video aspect range. Choose an explicit aspect ratio before generating.",
    );
  }
  const divisor = greatestCommonDivisor(width, height);
  return `${Math.round(width / divisor)}:${Math.round(height / divisor)}`;
}
