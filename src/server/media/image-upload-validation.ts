import sharp, { type Metadata } from "sharp";

export const uploadedImageLimits = {
  maxEdge: 8192,
  maxPixels: 33_554_432,
} as const;

export type VerifiedUploadImageMimeType = "image/png" | "image/jpeg" | "image/webp";

export type VerifiedUploadedImage = {
  mimeType: VerifiedUploadImageMimeType;
  sizeBytes: number;
  width: number;
  height: number;
};

const supportedMimeTypes = new Set<VerifiedUploadImageMimeType>([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const expectedFormatForMime: Record<VerifiedUploadImageMimeType, "png" | "jpeg" | "webp"> = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/webp": "webp",
};

function invalid(message: string): never {
  throw new RangeError(message);
}

function normalizeMimeType(value: string) {
  return value.split(";", 1)[0]?.trim().toLowerCase() ?? "";
}

function verifiedMimeType(value: string): VerifiedUploadImageMimeType | null {
  const normalized = normalizeMimeType(value);
  return supportedMimeTypes.has(normalized as VerifiedUploadImageMimeType)
    ? (normalized as VerifiedUploadImageMimeType)
    : null;
}

export function validateUploadedImageGeometry(width: number, height: number) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    invalid("Uploaded image geometry is invalid.");
  }
  if (width > uploadedImageLimits.maxEdge || height > uploadedImageLimits.maxEdge) {
    invalid(`Uploaded images may not exceed ${uploadedImageLimits.maxEdge}px on either edge.`);
  }
  if (width * height > uploadedImageLimits.maxPixels) {
    invalid(`Uploaded images may not exceed ${uploadedImageLimits.maxPixels.toLocaleString("en-US")} decoded pixels.`);
  }
  return { width, height };
}

export async function inspectUploadedImageBytes(
  bytes: Uint8Array,
  declaredMimeType: string,
): Promise<VerifiedUploadedImage> {
  const mimeType = verifiedMimeType(declaredMimeType);
  if (!mimeType) invalid("Uploaded images must be PNG, JPEG, or WebP.");
  if (!bytes.byteLength) invalid("Uploaded image is empty.");

  const image = sharp(Buffer.from(bytes), {
    animated: true,
    failOn: "error",
    limitInputPixels: uploadedImageLimits.maxPixels,
  });

  let metadata: Metadata;
  try {
    metadata = await image.metadata();
  } catch {
    invalid("Uploaded image could not be decoded.");
  }

  if (metadata.format !== expectedFormatForMime[mimeType]) {
    invalid("Uploaded image bytes do not match the declared media type.");
  }
  if ((metadata.pages ?? 1) !== 1) {
    invalid("Animated or multi-page images are not supported.");
  }

  let width = metadata.width ?? 0;
  let height = metadata.height ?? 0;
  if ([5, 6, 7, 8].includes(metadata.orientation ?? 1)) {
    [width, height] = [height, width];
  }
  validateUploadedImageGeometry(width, height);

  try {
    // `metadata()` validates the container/header. `stats()` forces a bounded full pixel decode
    // so truncated/corrupt payloads cannot become durable media merely because their header parses.
    await image.clone().stats();
  } catch {
    invalid("Uploaded image could not be fully decoded.");
  }

  return {
    mimeType,
    sizeBytes: bytes.byteLength,
    width,
    height,
  };
}
