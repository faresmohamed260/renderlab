import { createHash } from "node:crypto";

export type GenerationStorageKeyRow = {
  id: string;
  output_kind: "image" | "video";
  created_at: string;
};

export function deterministicGenerationAssetId(jobId: string, outputIndex = 0) {
  const bytes = Buffer.from(
    createHash("sha256")
      .update(`renderlab:generation-output:${jobId}:${outputIndex}`)
      .digest()
      .subarray(0, 16),
  );
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function yearMonth(createdAt: string) {
  const created = new Date(createdAt);
  if (!Number.isFinite(created.getTime())) throw new Error("Generation job creation time is invalid.");
  return {
    year: created.getUTCFullYear(),
    month: String(created.getUTCMonth() + 1).padStart(2, "0"),
  };
}

export function generationOutputStoragePrefix(row: Pick<GenerationStorageKeyRow, "created_at">, assetId: string) {
  const { year, month } = yearMonth(row.created_at);
  return `renderlab/generations/${year}/${month}/${assetId}`;
}

export function generationThumbnailStoragePrefix(row: Pick<GenerationStorageKeyRow, "created_at">, assetId: string) {
  const { year, month } = yearMonth(row.created_at);
  return `renderlab/thumbnails/${year}/${month}/${assetId}`;
}

export function possibleGenerationOutputExtensions(kind: GenerationStorageKeyRow["output_kind"]) {
  return kind === "image" ? ["png", "jpg", "webp"] as const : ["mp4", "webm", "mov"] as const;
}

export function possibleGenerationThumbnailExtensions() {
  return ["png", "jpg", "webp"] as const;
}

export function generationStorageCandidates(row: GenerationStorageKeyRow, outputIndex = 0) {
  const assetId = deterministicGenerationAssetId(row.id, outputIndex);
  const outputPrefix = generationOutputStoragePrefix(row, assetId);
  const thumbnailPrefix = generationThumbnailStoragePrefix(row, assetId);
  return [
    ...possibleGenerationOutputExtensions(row.output_kind).map((extension) => `${outputPrefix}.${extension}`),
    ...possibleGenerationThumbnailExtensions().map((extension) => `${thumbnailPrefix}.${extension}`),
  ];
}
