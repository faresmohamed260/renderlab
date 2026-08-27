import type {
  MediaAssetKind,
  MediaAssetOrigin,
  PublicMediaAsset,
} from "@/lib/api/media-assets-contract";
import type { CreativeOperation } from "@/lib/capabilities/generation";
import { supabaseRest } from "@/server/data/supabase-rest";
import { createSignedReadUrl } from "@/server/storage/r2";

export type MediaAssetRecord = {
  id: string;
  generation_job_id: string | null;
  origin?: MediaAssetOrigin;
  kind: MediaAssetKind;
  mime_type: string;
  storage_key: string;
  thumbnail_storage_key: string | null;
  original_filename?: string | null;
  display_name?: string | null;
  size_bytes?: number | string | null;
  width: number | null;
  height: number | null;
  duration_ms: number | null;
  provenance: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

const creativeOperations = new Set<CreativeOperation>([
  "create-image",
  "edit-image",
  "create-video",
  "animate-image",
]);

function provenanceString(asset: MediaAssetRecord, key: string) {
  const value = asset.provenance?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function provenanceOperation(asset: MediaAssetRecord): CreativeOperation | null {
  const value = provenanceString(asset, "operation");
  return value && creativeOperations.has(value as CreativeOperation) ? (value as CreativeOperation) : null;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function getMediaAsset(assetId: string) {
  const rows = await supabaseRest<MediaAssetRecord[]>(
    `media_assets?id=eq.${encodeURIComponent(assetId)}&select=*&limit=1`,
    { method: "GET" },
  );
  return rows?.[0] ?? null;
}

export async function listMediaAssets({
  kind,
  limit = 24,
  offset = 0,
}: {
  kind?: MediaAssetKind;
  limit?: number;
  offset?: number;
} = {}) {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 48);
  const safeOffset = Math.max(Math.trunc(offset), 0);
  const filters = kind ? `&kind=eq.${encodeURIComponent(kind)}` : "";
  const rows = await supabaseRest<MediaAssetRecord[]>(
    `media_assets?select=*&order=created_at.desc,id.desc&limit=${safeLimit + 1}&offset=${safeOffset}${filters}`,
    { method: "GET" },
  );
  const items = rows ?? [];
  return {
    items: items.slice(0, safeLimit),
    page: {
      limit: safeLimit,
      offset: safeOffset,
      hasMore: items.length > safeLimit,
    },
  };
}

export function publicMediaAsset(asset: MediaAssetRecord): PublicMediaAsset {
  const numericSize = asset.size_bytes == null ? null : Number(asset.size_bytes);
  return {
    id: asset.id,
    generationJobId: asset.generation_job_id,
    origin: asset.origin === "uploaded" ? "uploaded" : "generated",
    kind: asset.kind,
    mimeType: asset.mime_type,
    originalFilename: optionalString(asset.original_filename),
    displayName: optionalString(asset.display_name),
    sizeBytes: Number.isFinite(numericSize) ? numericSize : null,
    width: asset.width,
    height: asset.height,
    durationMs: asset.duration_ms,
    prompt: provenanceString(asset, "prompt"),
    model: provenanceString(asset, "model"),
    operation: provenanceOperation(asset),
    createdAt: asset.created_at,
    contentUrl: `/api/media/assets/${encodeURIComponent(asset.id)}/content`,
    thumbnailUrl: asset.thumbnail_storage_key
      ? `/api/media/assets/${encodeURIComponent(asset.id)}/thumbnail`
      : null,
  };
}

export async function getMediaAssetContentUrl(asset: MediaAssetRecord, variant: "content" | "thumbnail") {
  const key = variant === "thumbnail" ? asset.thumbnail_storage_key : asset.storage_key;
  if (!key) return null;
  return createSignedReadUrl(key, 300);
}
