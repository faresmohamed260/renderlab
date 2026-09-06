import sharp from "sharp";
import {
  imageUpscaleLimits,
  imageUpscaleSupportedMimeTypes,
  type ImageUpscaleMimeType,
} from "@/lib/capabilities/upscale";
import { getMediaAsset, type MediaAssetRecord } from "@/server/media/media-assets";
import { headR2Object, readR2Object } from "@/server/storage/r2";

const supportedMimeTypes = new Set<string>(imageUpscaleSupportedMimeTypes);
const expectedFormatForMime: Record<ImageUpscaleMimeType, "png" | "jpeg" | "webp"> = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/webp": "webp",
};

export type InspectedUpscaleImage = {
  mimeType: ImageUpscaleMimeType;
  sizeBytes: number;
  width: number;
  height: number;
  outputWidth: number;
  outputHeight: number;
};

export type PreparedUpscaleImageSource = InspectedUpscaleImage & {
  asset: MediaAssetRecord;
  bytes: Buffer;
};

function normalizeMimeType(value: string) {
  return value.split(";")[0]?.trim().toLowerCase() ?? "";
}

function supportedMimeType(value: string): ImageUpscaleMimeType | null {
  const normalized = normalizeMimeType(value);
  return supportedMimeTypes.has(normalized) ? (normalized as ImageUpscaleMimeType) : null;
}

function unavailable(message: string): never {
  throw new RangeError(message);
}

export async function inspectUpscaleImageBytes(
  bytes: Uint8Array,
  declaredMimeType: string,
): Promise<InspectedUpscaleImage> {
  const mimeType = supportedMimeType(declaredMimeType);
  if (!mimeType) unavailable("Upscale supports active PNG, JPEG, or WebP images only.");
  if (!bytes.byteLength) unavailable("The source image is empty.");
  if (bytes.byteLength > imageUpscaleLimits.maxInputBytes) {
    unavailable("The source image must be 25 MB or smaller.");
  }

  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(Buffer.from(bytes), { animated: true, limitInputPixels: false }).metadata();
  } catch {
    unavailable("The source image could not be decoded for Upscale.");
  }

  if (metadata.format !== expectedFormatForMime[mimeType]) {
    unavailable("The stored image type does not match its verified media type.");
  }
  if ((metadata.pages ?? 1) !== 1) {
    unavailable("Animated or multi-frame images cannot be upscaled in v0.1.");
  }

  let width = metadata.width ?? 0;
  let height = metadata.height ?? 0;
  if ([5, 6, 7, 8].includes(metadata.orientation ?? 1)) {
    [width, height] = [height, width];
  }
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    unavailable("The source image geometry is invalid.");
  }
  if (width > imageUpscaleLimits.maxInputEdge || height > imageUpscaleLimits.maxInputEdge) {
    unavailable(`The source image may not exceed ${imageUpscaleLimits.maxInputEdge}px on either edge.`);
  }
  if (width * height > imageUpscaleLimits.maxInputPixels) {
    unavailable(`The source image may not exceed ${imageUpscaleLimits.maxInputPixels.toLocaleString("en-US")} pixels.`);
  }

  const outputWidth = width * 2;
  const outputHeight = height * 2;
  if (outputWidth > imageUpscaleLimits.maxOutputEdge || outputHeight > imageUpscaleLimits.maxOutputEdge) {
    unavailable(`The 2× result may not exceed ${imageUpscaleLimits.maxOutputEdge}px on either edge.`);
  }
  if (outputWidth * outputHeight > imageUpscaleLimits.maxOutputPixels) {
    unavailable(`The 2× result may not exceed ${imageUpscaleLimits.maxOutputPixels.toLocaleString("en-US")} pixels.`);
  }

  return {
    mimeType,
    sizeBytes: bytes.byteLength,
    width,
    height,
    outputWidth,
    outputHeight,
  };
}

export async function loadPreparedUpscaleImageSource(
  ownerId: string,
  assetId: string,
): Promise<PreparedUpscaleImageSource | null> {
  const asset = await getMediaAsset(ownerId, assetId);
  if (!asset) return null;
  if (asset.kind !== "image") unavailable("Upscale is available for active durable images only.");

  const assetMimeType = supportedMimeType(asset.mime_type);
  if (!assetMimeType) unavailable("Upscale supports active PNG, JPEG, or WebP images only.");

  const declaredSize = asset.size_bytes == null ? null : Number(asset.size_bytes);
  if (declaredSize != null && Number.isFinite(declaredSize) && declaredSize > imageUpscaleLimits.maxInputBytes) {
    unavailable("The source image must be 25 MB or smaller.");
  }

  const head = await headR2Object(asset.storage_key);
  if (!head.sizeBytes || head.sizeBytes > imageUpscaleLimits.maxInputBytes) {
    unavailable("The source image must be 25 MB or smaller.");
  }
  const storedMimeType = supportedMimeType(head.contentType);
  if (!storedMimeType || storedMimeType !== assetMimeType) {
    unavailable("The stored image type does not match its verified media type.");
  }

  const object = await readR2Object(asset.storage_key);
  const objectMimeType = supportedMimeType(object.contentType);
  if (!objectMimeType || objectMimeType !== assetMimeType) {
    unavailable("The stored image type does not match its verified media type.");
  }
  if (object.bytes.byteLength !== head.sizeBytes) {
    unavailable("The source image changed while it was being prepared. Try again.");
  }

  const inspected = await inspectUpscaleImageBytes(object.bytes, assetMimeType);
  return { asset, bytes: object.bytes, ...inspected };
}
