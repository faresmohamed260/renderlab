import {
  MEDIA_ASSET_SEARCH_MAX_LENGTH,
  normalizeMediaAssetSearchQuery,
  type MediaAssetKind,
  type MediaAssetOrigin,
  type PublicMediaAsset,
} from "@/lib/api/media-assets-contract";
import type { CreativeOperation } from "@/lib/capabilities/generation";
import { supabaseRest } from "@/server/data/supabase-rest";
import { createSignedDownloadUrl, createSignedReadUrl } from "@/server/storage/r2";

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

const windowsReservedBasenames = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

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

function postgrestQuotedValue(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function regexpLiteral(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mediaSearchFilter(search: string) {
  const pattern = postgrestQuotedValue(regexpLiteral(search));
  return `(display_name.imatch.${pattern},original_filename.imatch.${pattern},provenance->>prompt.imatch.${pattern})`;
}

function downloadExtension(asset: MediaAssetRecord) {
  const mimeType = asset.mime_type.toLowerCase();
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "video/mp4") return "mp4";
  if (mimeType === "video/webm") return "webm";
  if (mimeType === "video/quicktime") return "mov";

  const subtype = mimeType.split("/")[1]?.split(/[+;]/)[0] || "";
  return /^[a-z0-9]{1,8}$/.test(subtype) ? subtype : "bin";
}

function safeDownloadBase(value: string) {
  const basename = value.split(/[\\/]/).filter(Boolean).at(-1) || "";
  const withoutExtension = basename.replace(/\.[^.]+$/, "");
  let cleaned = withoutExtension
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[ .]+|[ .]+$/g, "")
    .slice(0, 140)
    .trim();
  if (windowsReservedBasenames.test(cleaned)) cleaned = `renderlab-${cleaned}`;
  return cleaned || null;
}

function encodeDispositionFilename(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export function mediaAssetDownloadFilename(asset: MediaAssetRecord) {
  const extension = downloadExtension(asset);
  const fallback = `renderlab-${asset.kind}-${asset.id.slice(0, 8)}.${extension}`;
  if (asset.origin === "uploaded") {
    const humanName = optionalString(asset.original_filename) || optionalString(asset.display_name);
    const base = humanName ? safeDownloadBase(humanName) : null;
    if (base) return `${base}.${extension}`;
  }
  return fallback;
}

function mediaAssetDownloadContentDisposition(asset: MediaAssetRecord) {
  const filename = mediaAssetDownloadFilename(asset);
  const extension = downloadExtension(asset);
  const fallback = `renderlab-${asset.kind}-${asset.id.slice(0, 8)}.${extension}`;
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeDispositionFilename(filename)}`;
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
  search,
  limit = 24,
  offset = 0,
}: {
  kind?: MediaAssetKind;
  search?: string | null;
  limit?: number;
  offset?: number;
} = {}) {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 48);
  const safeOffset = Math.max(Math.trunc(offset), 0);
  const normalizedSearch = normalizeMediaAssetSearchQuery(search);
  if (normalizedSearch && normalizedSearch.length > MEDIA_ASSET_SEARCH_MAX_LENGTH) {
    throw new RangeError(`Media search queries may not exceed ${MEDIA_ASSET_SEARCH_MAX_LENGTH} characters.`);
  }

  const params = new URLSearchParams({
    select: "*",
    order: "created_at.desc,id.desc",
    limit: String(safeLimit + 1),
    offset: String(safeOffset),
  });
  if (kind) params.set("kind", `eq.${kind}`);
  if (normalizedSearch) params.set("or", mediaSearchFilter(normalizedSearch));

  const rows = await supabaseRest<MediaAssetRecord[]>(
    `media_assets?${params.toString()}`,
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

export async function getMediaAssetDownloadUrl(asset: MediaAssetRecord) {
  return createSignedDownloadUrl({
    key: asset.storage_key,
    contentDisposition: mediaAssetDownloadContentDisposition(asset),
    expiresIn: 300,
  });
}
