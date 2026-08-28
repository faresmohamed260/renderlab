import Link from "next/link";
import { ArrowLeft, ArrowRight, FolderOpen, ImageIcon, Search, Star, Video } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { LibraryBatchSelection } from "@/features/library/library-batch-selection";
import { LibraryCollectionMenu } from "@/features/library/library-collection-menu";
import { LibraryDropUploadSurface } from "@/features/library/library-drop-upload-surface";
import { LibrarySortMenu } from "@/features/library/library-sort-menu";
import { LibraryUploadButton } from "@/features/library/library-upload-button";
import {
  MEDIA_ASSET_SEARCH_MAX_LENGTH,
  type MediaAssetListKind,
  type MediaAssetSortOrder,
  type PublicMediaAsset,
} from "@/lib/api/media-assets-contract";
import type { PublicMediaCollection } from "@/lib/api/media-collections-contract";

const filters: Array<{ value: MediaAssetListKind; label: string }> = [
  { value: "all", label: "All" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
];

function libraryHref(
  kind: MediaAssetListKind,
  searchQuery: string | null,
  sort: MediaAssetSortOrder,
  favoriteOnly: boolean,
  collectionId: string | null,
  offset = 0,
) {
  const params = new URLSearchParams();
  if (kind !== "all") params.set("kind", kind);
  if (searchQuery) params.set("q", searchQuery);
  if (sort !== "newest") params.set("sort", sort);
  if (favoriteOnly) params.set("favorite", "true");
  if (collectionId) params.set("collection", collectionId);
  if (offset > 0) params.set("offset", String(offset));
  const query = params.toString();
  return query ? `/library?${query}` : "/library";
}

export function LibraryView({
  accountAvailable,
  available,
  uploadAvailable,
  items,
  collections,
  selectedCollectionId,
  collectionMissing,
  kind,
  sort,
  searchQuery,
  favoriteOnly,
  offset,
  limit,
  hasMore,
}: {
  accountAvailable: boolean;
  available: boolean;
  uploadAvailable: boolean;
  items: PublicMediaAsset[];
  collections: PublicMediaCollection[];
  selectedCollectionId: string | null;
  collectionMissing: boolean;
  kind: MediaAssetListKind;
  sort: MediaAssetSortOrder;
  searchQuery: string | null;
  favoriteOnly: boolean;
  offset: number;
  limit: number;
  hasMore: boolean;
}) {
  const selectedCollection = collections.find((collection) => collection.id === selectedCollectionId) ?? null;
  const selectedCollectionName = selectedCollection?.name ?? null;
  const previousDirection = sort === "newest" ? "newer" : "older";
  const nextDirection = sort === "newest" ? "older" : "newer";
  const previousLabel = previousDirection === "newer" ? "Newer" : "Older";
  const nextLabel = nextDirection === "older" ? "Older" : "Newer";
  const emptyTitle = collectionMissing
    ? "Collection unavailable"
    : offset > 0
      ? `No ${nextDirection} media on this page`
      : searchQuery
        ? selectedCollectionName
          ? favoriteOnly
            ? `No favorites in “${selectedCollectionName}” match “${searchQuery}”`
            : `No media in “${selectedCollectionName}” matches “${searchQuery}”`
          : favoriteOnly ? `No favorites match “${searchQuery}”` : `No media matches “${searchQuery}”`
        : selectedCollectionName
          ? favoriteOnly ? `No favorites in “${selectedCollectionName}”` : `No media in “${selectedCollectionName}”`
          : favoriteOnly
            ? "No favorites yet"
            : kind === "all"
              ? "No media yet"
              : `No ${kind === "image" ? "images" : "videos"} yet`;
  const emptyDescription = collectionMissing
    ? "This collection is unavailable or does not belong to this account."
    : offset > 0
      ? `Go back to ${previousDirection} media.`
      : searchQuery
        ? favoriteOnly
          ? "Try another name or prompt, or clear the search to broaden this view."
          : "Try another name or prompt, or clear the search to browse this view."
        : selectedCollectionName
          ? favoriteOnly
            ? "Favorite media added to this collection will appear here."
            : "Add media to this collection from the Viewer and it will appear here."
          : favoriteOnly
            ? "Favorite media from the Viewer and it will appear here."
            : uploadAvailable
              ? "Create or upload something and saved media will appear here automatically."
              : "Create something and saved results will appear here automatically.";
  const emptyActionHref = collectionMissing
    ? libraryHref(kind, searchQuery, sort, favoriteOnly, null)
    : offset > 0
      ? libraryHref(kind, searchQuery, sort, favoriteOnly, selectedCollectionId, Math.max(0, offset - limit))
      : searchQuery
        ? libraryHref(kind, null, sort, favoriteOnly, selectedCollectionId)
        : favoriteOnly
          ? libraryHref(kind, null, sort, false, selectedCollectionId)
          : selectedCollectionName
            ? libraryHref(kind, null, sort, false, null)
            : "/";
  const emptyActionLabel = collectionMissing
    ? "Browse all media"
    : offset > 0
      ? `${previousLabel} media`
      : searchQuery
        ? "Clear search"
        : favoriteOnly
          ? "Browse without Favorites"
          : selectedCollectionName
            ? "Browse all media"
            : "Create media";
  const collectionHrefs = Object.fromEntries(
    collections.map((collection) => [
      collection.id,
      libraryHref(kind, searchQuery, sort, favoriteOnly, collection.id),
    ]),
  );
  const batchSelectionKey = [
    kind,
    sort,
    searchQuery ?? "",
    favoriteOnly ? "favorites" : "all-media",
    selectedCollectionId ?? "",
    String(offset),
  ].join(":");

  return (
    <LibraryDropUploadSurface enabled={accountAvailable && uploadAvailable}>
      <section className="mx-auto w-full max-w-[1240px] px-4 pb-28 pt-10 sm:px-8 sm:pb-16 sm:pt-14 lg:px-10 lg:pt-16">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-[28px] font-semibold tracking-[-0.02em] text-text">Library</h2>
            <p className="mt-2 max-w-xl text-[15px] text-text-muted">
              Browse durable media and continue from the work you want to keep.
            </p>
          </div>
          {accountAvailable && uploadAvailable ? <LibraryUploadButton /> : null}
        </div>

        {!accountAvailable ? (
          <Empty className="mt-8 min-h-72 rounded-xl border border-dashed border-border bg-surface-1 px-6">
            <EmptyHeader>
              <EmptyMedia><ImageIcon aria-hidden="true" /></EmptyMedia>
              <EmptyTitle>Sign in to use Library</EmptyTitle>
              <EmptyDescription>
                Your generated and uploaded media is private to your RenderLab account.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild variant="secondary">
                <Link href="/settings">Open Settings</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <nav className="flex rounded-lg bg-surface-2 p-1" aria-label="Library media type">
                {filters.map((filter) => {
                  const active = kind === filter.value;
                  return (
                    <Button key={filter.value} asChild variant={active ? "secondary" : "ghost"} size="sm">
                      <Link
                        href={libraryHref(filter.value, searchQuery, sort, favoriteOnly, selectedCollectionId)}
                        aria-current={active ? "page" : undefined}
                      >
                        {filter.label}
                      </Link>
                    </Button>
                  );
                })}
              </nav>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button asChild variant={favoriteOnly ? "secondary" : "outline"} size="sm">
                  <Link href={libraryHref(kind, searchQuery, sort, !favoriteOnly, selectedCollectionId)}>
                    <Star aria-hidden="true" data-icon="inline-start" className={favoriteOnly ? "fill-current" : undefined} />
                    Favorites
                  </Link>
                </Button>
                {(collections.length > 0 || selectedCollectionId) ? (
                  <LibraryCollectionMenu
                    collections={collections}
                    selectedCollectionId={selectedCollectionId}
                    allHref={libraryHref(kind, searchQuery, sort, favoriteOnly, null)}
                    collectionHrefs={collectionHrefs}
                  />
                ) : null}
                <LibrarySortMenu
                  sort={sort}
                  newestHref={libraryHref(kind, searchQuery, "newest", favoriteOnly, selectedCollectionId)}
                  oldestHref={libraryHref(kind, searchQuery, "oldest", favoriteOnly, selectedCollectionId)}
                />
              </div>
            </div>

            <form action="/library" method="get" role="search" className="mt-4 flex w-full max-w-xl items-center gap-2">
              {kind !== "all" ? <input type="hidden" name="kind" value={kind} /> : null}
              {sort !== "newest" ? <input type="hidden" name="sort" value={sort} /> : null}
              {favoriteOnly ? <input type="hidden" name="favorite" value="true" /> : null}
              {selectedCollectionId ? <input type="hidden" name="collection" value={selectedCollectionId} /> : null}
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Search Library</span>
                <Search
                  aria-hidden="true"
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-text-muted"
                />
                <Input
                  type="search"
                  name="q"
                  defaultValue={searchQuery ?? ""}
                  maxLength={MEDIA_ASSET_SEARCH_MAX_LENGTH}
                  placeholder="Search by name or prompt"
                  className="pl-10"
                />
              </label>
              <Button type="submit" variant="outline">Search</Button>
              {searchQuery ? (
                <Button asChild variant="ghost">
                  <Link href={libraryHref(kind, null, sort, favoriteOnly, selectedCollectionId)}>Clear</Link>
                </Button>
              ) : null}
            </form>

            {!available ? (
              <Alert className="mt-8" role="status">
                <AlertDescription className="text-text-muted">
                  Library media is not connected in this environment yet.
                </AlertDescription>
              </Alert>
            ) : items.length === 0 ? (
              <Empty className="mt-8 min-h-72 rounded-xl border border-dashed border-border bg-surface-1 px-6">
                <EmptyHeader>
                  <EmptyMedia>
                    {collectionMissing || selectedCollectionName ? (
                      <FolderOpen aria-hidden="true" />
                    ) : searchQuery ? (
                      <Search aria-hidden="true" />
                    ) : kind === "video" ? (
                      <Video aria-hidden="true" />
                    ) : (
                      <ImageIcon aria-hidden="true" />
                    )}
                  </EmptyMedia>
                  <EmptyTitle>{emptyTitle}</EmptyTitle>
                  <EmptyDescription>{emptyDescription}</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button asChild variant="secondary">
                    <Link href={emptyActionHref}>
                      {offset > 0 ? <ArrowLeft aria-hidden="true" data-icon="inline-start" /> : null}
                      {emptyActionLabel}
                      {offset === 0 && !searchQuery && !favoriteOnly && !selectedCollectionName && !collectionMissing ? <ArrowRight aria-hidden="true" data-icon="inline-end" /> : null}
                    </Link>
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
              <>
                <LibraryBatchSelection key={batchSelectionKey} items={items} />

                {(offset > 0 || hasMore) ? (
                  <nav className="mt-8 flex items-center justify-between gap-3" aria-label="Library pages">
                    <div>
                      {offset > 0 ? (
                        <Button asChild variant="outline">
                          <Link href={libraryHref(kind, searchQuery, sort, favoriteOnly, selectedCollectionId, Math.max(0, offset - limit))}>
                            <ArrowLeft aria-hidden="true" data-icon="inline-start" />
                            {previousLabel}
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                    {hasMore ? (
                      <Button asChild variant="outline">
                        <Link href={libraryHref(kind, searchQuery, sort, favoriteOnly, selectedCollectionId, offset + limit)}>
                          {nextLabel}
                          <ArrowRight aria-hidden="true" data-icon="inline-end" />
                        </Link>
                      </Button>
                    ) : null}
                  </nav>
                ) : null}
              </>
            )}
          </>
        )}
      </section>
    </LibraryDropUploadSurface>
  );
}
