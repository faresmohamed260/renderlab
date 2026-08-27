import type { CreativeOperation } from "@/lib/capabilities/generation";

export type MediaAssetKind = "image" | "video";

export type PublicMediaAsset = {
  id: string;
  generationJobId: string | null;
  kind: MediaAssetKind;
  mimeType: string;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  prompt: string | null;
  model: string | null;
  operation: CreativeOperation | null;
  createdAt: string;
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

export type MediaAssetError = {
  ok: false;
  error: {
    code: "invalid_request" | "media_unavailable" | "asset_not_found";
    message: string;
  };
};

export type ListMediaAssetsResponse = ListMediaAssetsSuccess | MediaAssetError;
