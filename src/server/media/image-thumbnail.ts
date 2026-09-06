import sharp from "sharp";

export const IMAGE_THUMBNAIL_CONTENT_TYPE = "image/webp";
export const IMAGE_THUMBNAIL_MAX_EDGE = 640;

export async function createImageThumbnailBytes(bytes: Uint8Array) {
  return sharp(Buffer.from(bytes))
    .rotate()
    .resize({
      width: IMAGE_THUMBNAIL_MAX_EDGE,
      height: IMAGE_THUMBNAIL_MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 80, effort: 4 })
    .toBuffer();
}

export function imageThumbnailStorageKey(assetId: string, storageKey: string, createdAt: string) {
  const storageMatch = storageKey.match(/^renderlab\/(?:generations|uploads)\/(\d{4})\/(\d{2})\//);
  if (storageMatch) {
    return `renderlab/thumbnails/${storageMatch[1]}/${storageMatch[2]}/${assetId}.webp`;
  }

  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) throw new Error("Media asset creation time is invalid.");
  return [
    "renderlab",
    "thumbnails",
    created.getUTCFullYear(),
    String(created.getUTCMonth() + 1).padStart(2, "0"),
    `${assetId}.webp`,
  ].join("/");
}
