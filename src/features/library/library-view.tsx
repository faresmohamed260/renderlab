import Link from "next/link";
import { ArrowLeft, ArrowRight, FolderOpen, ImageIcon, Search, Star, Video, X } from "lucide-react";
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
import { LibraryNavigationLink } from "@/features/library/library-navigation-link";
import { LibrarySortToggle } from "@/features/library/library-sort-toggle";
import { LibraryUploadButton } from "@/features/library/library-upload-button";
import styles from "@/features/library/library-gallery.module.css";
import {
  MEDIA_ASSET_SEARCH_MAX_LENGTH,
  type MediaAssetListKind,
  type MediaAssetSortOrder,
  type PublicMediaAsset,
} from "@/lib/api/media-assets-contract";
import type { PublicMediaCollection } from "@/lib/api/media-collections-contract";

export type LibraryTab = "creatives" | "uploads";

const tabs: Array<{ value: LibraryTab; label: string }> = [
  { value: "creatives", label: "Creatives" },
  { value: "uploads", label: "Uploads" },
];

const filters: Array<{ value: MediaAssetListKind; label: string }> = [
  { value: "all", label: "All" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
];

function libraryHref(
  tab: LibraryTab,
  kind: MediaAssetListKind,
  searchQuery: string | null,
  sort: MediaAssetSortOrder,
  favoriteOnly: boolean,
  collectionId: string | null,
  offset = 0,
) {
  const params = new URLSearchParams();
  if (tab === "uploads") params.set("tab", "uploads");
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
  collectionsAvailable,
  selectedCollectionId,
  collectionMissing,
  tab,
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
  collectionsAvailable: boolean;
  selectedCollectionId: string | null;
  collectionMissing: boolean;
  tab: LibraryTab;
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
  const sectionLabel = tab === "uploads" ? "uploads" : "creatives";
  const sectionTitle = tab === "uploads" ? "Uploads" : "Creatives";
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
          : favoriteOnly ? `No favorite ${sectionLabel} match “${searchQuery}”` : `No ${sectionLabel} match “${searchQuery}”`
        : selectedCollectionName
          ? favoriteOnly ? `No favorites in “${selectedCollectionName}”` : `No media in “${selectedCollectionName}”`
          : favoriteOnly
            ? `No favorite ${sectionLabel} yet`
            : kind === "all"
              ? `No ${sectionLabel} yet`
              : `No ${kind === "image" ? "images" : "videos"} in ${sectionTitle} yet`;
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
            ? `Favorite ${sectionLabel} from the Viewer and they will appear here.`
            : tab === "uploads"
              ? "Upload an image to keep it ready for future edits and references."
              : "Create something and saved results will appear here automatically.";
  const emptyActionHref = collectionMissing
    ? libraryHref(tab, kind, searchQuery, sort, favoriteOnly, null)
    : offset > 0
      ? libraryHref(tab, kind, searchQuery, sort, favoriteOnly, selectedCollectionId, Math.max(0, offset - limit))
      : searchQuery
        ? libraryHref(tab, kind, null, sort, favoriteOnly, selectedCollectionId)
        : favoriteOnly
          ? libraryHref(tab, kind, null, sort, false, selectedCollectionId)
          : selectedCollectionName
            ? libraryHref(tab, kind, null, sort, false, null)
            : tab === "uploads" ? null : "/create";
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
            : tab === "uploads" ? null : "Create media";
  const collectionHrefs = Object.fromEntries(
    collections.map((collection) => [
      collection.id,
      libraryHref(tab, kind, searchQuery, sort, favoriteOnly, collection.id),
    ]),
  );
  const batchSelectionKey = [
    tab,
    kind,
    sort,
    searchQuery ?? "",
    favoriteOnly ? "favorites" : "all-media",
    selectedCollectionId ?? "",
    String(offset),
  ].join(":");

  const sourceControls = (
    <nav className={styles.sourceSwitch} aria-label="Library sections">
      {tabs.map((section) => {
        const active = tab === section.value;
        return (
          <Button key={section.value} asChild variant={active ? "secondary" : "ghost"} size="sm">
            <LibraryNavigationLink
              href={libraryHref(section.value, kind, searchQuery, sort, favoriteOnly, selectedCollectionId)}
              aria-current={active ? "page" : undefined}
            >
              {section.label}
            </LibraryNavigationLink>
          </Button>
        );
      })}
    </nav>
  );

  const searchControls = (
    <form action="/library" method="get" role="search" className={styles.searchForm}>
      {tab === "uploads" ? <input type="hidden" name="tab" value="uploads" /> : null}
      {kind !== "all" ? <input type="hidden" name="kind" value={kind} /> : null}
      {sort !== "newest" ? <input type="hidden" name="sort" value={sort} /> : null}
      {favoriteOnly ? <input type="hidden" name="favorite" value="true" /> : null}
      {selectedCollectionId ? <input type="hidden" name="collection" value={selectedCollectionId} /> : null}
      <Button type="submit" variant="ghost" size="icon-lg" className={styles.searchSubmit} aria-label="Search Library">
        <Search aria-hidden="true" size={17} />
      </Button>
      <label className={styles.searchLabel}>
        <span className="sr-only">Search Library</span>
        <Input
          type="search"
          name="q"
          defaultValue={searchQuery ?? ""}
          maxLength={MEDIA_ASSET_SEARCH_MAX_LENGTH}
          placeholder="Search Library"
          className={styles.searchInput}
        />
      </label>
      {searchQuery ? (
        <Button asChild variant="ghost" size="icon-lg" className={styles.clearSearch}>
          <Link
            href={libraryHref(tab, kind, null, sort, favoriteOnly, selectedCollectionId)}
            aria-label="Clear Library search"
          >
            <X aria-hidden="true" size={17} />
          </Link>
        </Button>
      ) : null}
    </form>
  );

  const filterControls = (
    <div className={styles.filterRow} aria-label="Library filters">
      <nav className={styles.kindSwitch} aria-label="Library media type">
        {filters.map((filter) => {
          const active = kind === filter.value;
          return (
            <Button key={filter.value} asChild variant={active ? "secondary" : "ghost"} size="sm">
              <LibraryNavigationLink
                href={libraryHref(tab, filter.value, searchQuery, sort, favoriteOnly, selectedCollectionId)}
                aria-current={active ? "page" : undefined}
              >
                {filter.label}
              </LibraryNavigationLink>
            </Button>
          );
        })}
      </nav>
      <span className={styles.filterDivider} aria-hidden="true" />
      <Button asChild variant={favoriteOnly ? "secondary" : "ghost"} size="sm" className="shrink-0">
        <LibraryNavigationLink href={libraryHref(tab, kind, searchQuery, sort, !favoriteOnly, selectedCollectionId)}>
          <Star aria-hidden="true" data-icon="inline-start" className={favoriteOnly ? "fill-current" : undefined} />
          Favorites
        </LibraryNavigationLink>
      </Button>
      {collectionsAvailable ? (
        <LibraryCollectionMenu
          collections={collections}
          selectedCollectionId={selectedCollectionId}
          allHref={libraryHref(tab, kind, searchQuery, sort, favoriteOnly, null)}
          collectionHrefs={collectionHrefs}
        />
      ) : null}
      <div className={styles.sortWrap}>
        <LibrarySortToggle
          sort={sort}
          newestHref={libraryHref(tab, kind, searchQuery, "newest", favoriteOnly, selectedCollectionId)}
          oldestHref={libraryHref(tab, kind, searchQuery, "oldest", favoriteOnly, selectedCollectionId)}
        />
      </div>
    </div>
  );

  const uploadAction = accountAvailable && uploadAvailable && tab === "uploads"
    ? <LibraryUploadButton />
    : null;

  const staticCommandRail = (
    <div className={styles.commandSurface} data-library-gallery-rail="true" data-selection="off">
      <div className={styles.defaultControls}>
        <div className={styles.sourceCell}>{sourceControls}</div>
        <div className={styles.searchCell}>{searchControls}</div>
        <div className={styles.actionCell}>{uploadAction}</div>
        <div className={styles.filterCell}>{filterControls}</div>
      </div>
    </div>
  );

  const mediaContextLabel = `${sectionTitle.toUpperCase()} / ${sort === "oldest" ? "OLDEST" : "NEWEST"}`;

  return (
    <LibraryDropUploadSurface enabled={accountAvailable && uploadAvailable && tab === "uploads"}>
      <section className={`${styles.workspace} mx-auto w-full max-w-[1440px] px-4 pb-28 pt-6 sm:px-8 sm:pb-16 sm:pt-8 lg:px-12 lg:pt-9`}>
        <div className={styles.contextBlock}>
          <p className={styles.eyebrow}>LIBRARY / MEDIA INDEX</p>
          <h2 className={styles.title}>Library</h2>
          <p className={styles.support}>
            Browse, find and organize durable work without putting controls ahead of the work itself.
          </p>
        </div>

        {!accountAvailable ? (
          <Empty className={`${styles.emptyState} min-h-72 rounded-xl border border-dashed border-border bg-surface-1 px-6`}>
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
            {!available || items.length === 0 ? staticCommandRail : null}

            {!available ? (
              <Alert className={styles.unavailableState} role="status">
                <AlertDescription className="text-text-muted">
                  Library media is not connected in this environment yet.
                </AlertDescription>
              </Alert>
            ) : items.length === 0 ? (
              <Empty className={`${styles.emptyState} min-h-72 rounded-xl border border-dashed border-border bg-surface-1 px-6`}>
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
                {emptyActionHref && emptyActionLabel ? (
                  <EmptyContent>
                    <Button asChild variant="secondary">
                      <Link href={emptyActionHref}>
                        {offset > 0 ? <ArrowLeft aria-hidden="true" data-icon="inline-start" /> : null}
                        {emptyActionLabel}
                        {offset === 0 && !searchQuery && !favoriteOnly && !selectedCollectionName && !collectionMissing ? <ArrowRight aria-hidden="true" data-icon="inline-end" /> : null}
                      </Link>
                    </Button>
                  </EmptyContent>
                ) : null}
              </Empty>
            ) : (
              <>
                <LibraryBatchSelection
                  key={batchSelectionKey}
                  items={items}
                  collections={collections}
                  sourceControls={sourceControls}
                  searchControls={searchControls}
                  filterControls={filterControls}
                  uploadAction={uploadAction}
                  mediaContextLabel={mediaContextLabel}
                  dropHint={tab === "uploads" ? "Drop files anywhere to upload" : null}
                />

                {(offset > 0 || hasMore) ? (
                  <nav className="mt-8 flex items-center justify-between gap-3" aria-label="Library pages">
                    <div>
                      {offset > 0 ? (
                        <Button asChild variant="outline">
                          <Link href={libraryHref(tab, kind, searchQuery, sort, favoriteOnly, selectedCollectionId, Math.max(0, offset - limit))}>
                            <ArrowLeft aria-hidden="true" data-icon="inline-start" />
                            {previousLabel}
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                    {hasMore ? (
                      <Button asChild variant="outline">
                        <Link href={libraryHref(tab, kind, searchQuery, sort, favoriteOnly, selectedCollectionId, offset + limit)}>
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
