import { NextResponse } from "next/server";
import {
  MEDIA_ASSET_SEARCH_MAX_LENGTH,
  normalizeMediaAssetSearchQuery,
  type MediaAssetKind,
  type MediaAssetSortOrder,
} from "@/lib/api/media-assets-contract";
import { getCurrentRenderLabAccount } from "@/lib/supabase/server";
import { listMediaAssets, publicMediaAsset } from "@/server/media/media-assets";
import { isSupabaseConfigured } from "@/server/data/supabase-rest";
import { isR2Configured } from "@/server/storage/r2";

const kinds = new Set<MediaAssetKind>(["image", "video"]);
const sortOrders = new Set<MediaAssetSortOrder>(["newest", "oldest"]);

function integerParam(value: string | null, fallback: number) {
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawKind = url.searchParams.get("kind");
  const kind = rawKind && rawKind !== "all" ? rawKind : undefined;
  const rawSort = url.searchParams.get("sort");
  const sort = (rawSort || "newest") as MediaAssetSortOrder;
  const search = normalizeMediaAssetSearchQuery(url.searchParams.get("q"));
  const limit = integerParam(url.searchParams.get("limit"), 24);
  const offset = integerParam(url.searchParams.get("offset"), 0);

  if (
    (kind && !kinds.has(kind as MediaAssetKind))
    || !sortOrders.has(sort)
    || (search && search.length > MEDIA_ASSET_SEARCH_MAX_LENGTH)
    || limit == null
    || offset == null
    || limit < 1
    || limit > 48
    || offset < 0
  ) {
    return NextResponse.json(
      { ok: false, error: { code: "invalid_request", message: "Media list parameters are invalid." } },
      { status: 400 },
    );
  }

  const account = await getCurrentRenderLabAccount();
  if (!account) {
    return NextResponse.json(
      { ok: false, error: { code: "authentication_required", message: "Sign in to access your RenderLab Library." } },
      { status: 401 },
    );
  }

  if (!isSupabaseConfigured() || !isR2Configured()) {
    return NextResponse.json({ available: false });
  }

  try {
    const result = await listMediaAssets({
      ownerId: account.id,
      ...(kind ? { kind: kind as MediaAssetKind } : {}),
      ...(search ? { search } : {}),
      sort,
      limit,
      offset,
    });
    return NextResponse.json({
      ok: true,
      items: result.items.map(publicMediaAsset),
      page: result.page,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "media_unavailable",
          message: error instanceof Error ? error.message : "Media could not be loaded.",
        },
      },
      { status: 503 },
    );
  }
}
