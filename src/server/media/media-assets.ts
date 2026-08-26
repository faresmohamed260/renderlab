import { supabaseRest } from "@/server/data/supabase-rest";
import { createSignedReadUrl } from "@/server/storage/r2";

export type MediaAssetRecord = {
  id: string;
  generation_job_id: string | null;
  kind: "image" | "video";
  mime_type: string;
  storage_key: string;
  thumbnail_storage_key: string | null;
  width: number | null;
  height: number | null;
  duration_ms: number | null;
  provenance: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export async function getMediaAsset(assetId: string) {
  const rows = await supabaseRest<MediaAssetRecord[]>(
    `media_assets?id=eq.${encodeURIComponent(assetId)}&select=*&limit=1`,
    { method: "GET" },
  );
  return rows?.[0] ?? null;
}

export function publicMediaAsset(asset: MediaAssetRecord) {
  return {
    id: asset.id,
    generationJobId: asset.generation_job_id,
    kind: asset.kind,
    mimeType: asset.mime_type,
    width: asset.width,
    height: asset.height,
    durationMs: asset.duration_ms,
    provenance: asset.provenance,
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
