import {
  MEDIA_ASSET_SEARCH_MAX_LENGTH,
  normalizeMediaAssetSearchQuery,
  type MediaAssetListKind,
  type MediaAssetSortOrder,
  type PublicMediaAsset,
} from "@/lib/api/media-assets-contract";
import type { PublicMediaCollection } from "@/lib/api/media-collections-contract";
import { LibraryView, type LibraryTab } from "@/features/library/library-view";
import { getCurrentRenderLabAccount } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/server/data/supabase-rest";
import { listMediaAssets, publicMediaAsset } from "@/server/media/media-assets";
import { listMediaCollections } from "@/server/media/media-collections";
import { isMediaUploadConfigured } from "@/server/media/media-uploads";
import { isR2Configured } from "@/server/storage/r2";

export const dynamic = "force-dynamic";

const pageSize = 24;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseTab(value: string | string[] | undefined): LibraryTab {
  return firstParam(value) === "uploads" ? "uploads" : "creatives";
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

function parseFavorite(value: string | string[] | undefined) {
  return firstParam(value) === "true";
}

function parseCollection(value: string | string[] | undefined) {
  const resolved = firstParam(value);
  return resolved && uuidPattern.test(resolved) ? resolved : null;
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, account] = await Promise.all([searchParams, getCurrentRenderLabAccount()]);
  const tab = parseTab(params.tab);
  const kind = parseKind(params.kind);
  const sort = parseSort(params.sort);
  const searchQuery = parseSearch(params.q);
  const favoriteOnly = parseFavorite(params.favorite);
  const selectedCollectionId = parseCollection(params.collection);
  const offset = parseOffset(params.offset);
  let available = isSupabaseConfigured() && isR2Configured();
  let collectionsAvailable = Boolean(account) && isSupabaseConfigured();
  let items: PublicMediaAsset[] = [];
  let collections: PublicMediaCollection[] = [];
  let hasMore = false;
  let collectionMissing = false;

  if (account && isSupabaseConfigured()) {
  const assetsPromise = available
    ? listMediaAssets({
        ownerId: account.id,
        origin: tab === "uploads" ? "uploaded" : "generated",
        ...(kind === "all" ? {} : { kind }),
        ...(searchQuery ? { search: searchQuery } : {}),
        ...(favoriteOnly ? { favoriteOnly: true } : {}),
        ...(selectedCollectionId ? { collectionId: selectedCollectionId } : {}),
        sort,
        limit: pageSize,
        offset,
      })
    : Promise.resolve(null);

  const [collectionsResult, assetsResult] = await Promise.allSettled([
    listMediaCollections(account.id),
    assetsPromise,
  ]);

  if (collectionsResult.status === "fulfilled") {
    collections = collectionsResult.value;
    collectionMissing = Boolean(
      selectedCollectionId && !collections.some((collection) => collection.id === selectedCollectionId),
    );
  } else {
    collectionsAvailable = false;
    available = false;
  }

  if (assetsResult.status === "rejected") {
    available = false;
  } else if (assetsResult.value && available && !collectionMissing) {
    items = assetsResult.value.items.map(publicMediaAsset);
    hasMore = assetsResult.value.page.hasMore;
  }
}

  return (
    <LibraryView
      accountAvailable={Boolean(account)}
      available={available}
      uploadAvailable={Boolean(account) && isMediaUploadConfigured()}
      items={items}
      collections={collections}
      collectionsAvailable={collectionsAvailable}
      selectedCollectionId={selectedCollectionId}
      collectionMissing={collectionMissing}
      tab={tab}
      kind={kind}
      sort={sort}
      searchQuery={searchQuery}
      favoriteOnly={favoriteOnly}
      offset={offset}
      limit={pageSize}
      hasMore={hasMore}
    />
  );
}
