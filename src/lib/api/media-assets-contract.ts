import type { CreativeOperation } from "@/lib/capabilities/generation";

export type MediaAssetKind = "image" | "video";
export type MediaAssetOrigin = "generated" | "uploaded";
export type MediaAssetSortOrder = "newest" | "oldest";

export const MEDIA_ASSET_SEARCH_MAX_LENGTH = 120;
export const MEDIA_ASSET_DISPLAY_NAME_MAX_LENGTH = 240;
export const MEDIA_ASSET_BATCH_DELETE_MAX_ITEMS = 24;

export function normalizeMediaAssetSearchQuery(value: string | null | undefined) {
  const normalized = value?.trim().replace(/\s+/g, " ") ?? "";
  return normalized || null;
}

export function normalizeMediaAssetDisplayName(value: string | null | undefined) {
  return (value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type PublicMediaAsset = {
  id: string;
  generationJobId: string | null;
  origin: MediaAssetOrigin;
  kind: MediaAssetKind;
  mimeType: string;
  originalFilename: string | null;
  displayName: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  prompt: string | null;
  model: string | null;
  operation: CreativeOperation | null;
  createdAt: string;
  isFavorite: boolean;
  contentUrl: string;
  thumbnailUrl: string | null;
};

export type MediaAssetListKind = "all" | MediaAssetKind;

export type ListMediaAssetsSuccess = {
  ok: true;
  items: PublicMediaAsset[];
  page: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
};

export type MediaAssetSuccess = {
  ok: true;
  asset: PublicMediaAsset;
};

export type DeleteMediaAssetSuccess = {
  ok: true;
  deleted: true;
  cleanupPending: boolean;
};

export type MediaAssetError = {
  ok: false;
  error: {
    code: "invalid_request" | "authentication_required" | "media_unavailable" | "asset_not_found";
    message: string;
  };
};

export type ListMediaAssetsResponse = ListMediaAssetsSuccess | MediaAssetError;
export type MediaAssetResponse = MediaAssetSuccess | MediaAssetError;

export type RenameMediaAssetRequest = {
  displayName: string;
};

export type BatchDeleteMediaAssetsRequest = {
  assetIds: string[];
};

export type BatchDeleteMediaAssetResult =
  | {
      assetId: string;
      ok: true;
      deleted: true;
      cleanupPending: boolean;
    }
  | {
      assetId: string;
      ok: false;
      error: {
        code: "asset_not_found" | "media_unavailable";
        message: string;
      };
    };

export type BatchDeleteMediaAssetsSuccess = {
  ok: true;
  results: BatchDeleteMediaAssetResult[];
  summary: {
    requested: number;
    deleted: number;
    cleanupPending: number;
    failed: number;
  };
};

export type RenameMediaAssetResponse = MediaAssetResponse;
export type FavoriteMediaAssetResponse = MediaAssetResponse;
export type DeleteMediaAssetResponse = DeleteMediaAssetSuccess | MediaAssetError;
export type BatchDeleteMediaAssetsResponse = BatchDeleteMediaAssetsSuccess | MediaAssetError;
