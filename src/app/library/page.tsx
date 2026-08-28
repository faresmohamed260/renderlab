import {
  MEDIA_ASSET_SEARCH_MAX_LENGTH,
  normalizeMediaAssetSearchQuery,
  type MediaAssetListKind,
  type MediaAssetSortOrder,
  type PublicMediaAsset,
} from "@/lib/api/media-assets-contract";
import { LibraryView } from "@/features/library/library-view";
import { getCurrentRenderLabAccount } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/server/data/supabase-rest";
import { listMediaAssets, publicMediaAsset } from "@/server/media/media-assets";
import { isMediaUploadConfigured } from "@/server/media/media-uploads";
import { isR2Configured } from "@/server/storage/r2";

export const dynamic = "force-dynamic";

const pageSize = 24;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseKind(value: string | string[] | undefined): MediaAssetListKind {
  const resolved = firstParam(value);
  return resolved === "image" || resolved === "video" ? resolved : "all";
}

function parseSort(value: string | string[] | undefined): MediaAssetSortOrder {
  return firstParam(value) === "oldest" ? "oldest" : "newest";
}

function parseOffset(value: string | string[] | undefined) {
  const parsed = Number(firstParam(value) || 0);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function parseSearch(value: string | string[] | undefined) {
  const normalized = normalizeMediaAssetSearchQuery(firstParam(value));
  return normalized?.slice(0, MEDIA_ASSET_SEARCH_MAX_LENGTH) ?? null;
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const account = await getCurrentRenderLabAccount();
  const kind = parseKind(params.kind);
  const sort = parseSort(params.sort);
  const searchQuery = parseSearch(params.q);
  const offset = parseOffset(params.offset);
  let available = isSupabaseConfigured() && isR2Configured();
  let items: PublicMediaAsset[] = [];
  let hasMore = false;

  if (account && available) {
    try {
      const result = await listMediaAssets({
        ownerId: account.id,
        ...(kind === "all" ? {} : { kind }),
        ...(searchQuery ? { search: searchQuery } : {}),
        sort,
        limit: pageSize,
        offset,
      });
      items = result.items.map(publicMediaAsset);
      hasMore = result.page.hasMore;
    } catch {
      available = false;
    }
  }

  return (
    <LibraryView
      accountAvailable={Boolean(account)}
      available={available}
      uploadAvailable={Boolean(account) && isMediaUploadConfigured()}
      items={items}
      kind={kind}
      sort={sort}
      searchQuery={searchQuery}
      offset={offset}
      limit={pageSize}
      hasMore={hasMore}
    />
  );
}
