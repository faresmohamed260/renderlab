import Link from "next/link";
import { ArrowLeft, ArrowRight, ImageIcon, Search, Star, Video } from "lucide-react";
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
import { LibraryDropUploadSurface } from "@/features/library/library-drop-upload-surface";
import { LibrarySortMenu } from "@/features/library/library-sort-menu";
import { LibraryUploadButton } from "@/features/library/library-upload-button";
import {
  MEDIA_ASSET_SEARCH_MAX_LENGTH,
  type MediaAssetListKind,
  type MediaAssetSortOrder,
  type PublicMediaAsset,
} from "@/lib/api/media-assets-contract";

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
  offset = 0,
) {
  const params = new URLSearchParams();
  if (kind !== "all") params.set("kind", kind);
  if (searchQuery) params.set("q", searchQuery);
  if (sort !== "newest") params.set("sort", sort);
  if (favoriteOnly) params.set("favorite", "true");
  if (offset > 0) params.set("offset", String(offset));
  const query = params.toString();
  return query ? `/library?${query}` : "/library";
}

function assetTitle(asset: PublicMediaAsset) {
  return asset.displayName
    || asset.prompt
    || asset.originalFilename
    || (asset.origin === "uploaded"
      ? asset.kind === "image" ? "Uploaded image" : "Uploaded video"
      : asset.kind === "image" ? "Generated image" : "Generated video");
}

function createdLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Saved media";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  }).format(date);
}

function MediaPreview({ asset }: { asset: PublicMediaAsset }) {
  if (asset.kind === "image") {
    return (
      <img
        src={asset.contentUrl}
        alt=""
        loading="lazy"
        className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.015]"
      />
    );
  }

  if (asset.thumbnailUrl) {
    return (
      <div className="relative size-full">
        <img src={asset.thumbnailUrl} alt="" loading="lazy" className="size-full object-cover" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-canvas/80 px-2 py-1 text-[11px] font-semibold text-text backdrop-blur-sm">
          <Video aria-hidden="true" size={13} />
          Video
        </span>
      </div>
    );
  }

  return (
    <div className="flex size-full flex-col items-center justify-center gap-2 bg-surface-2 text-text-muted">
      <Video aria-hidden="true" size={26} />
      <span className="text-xs">Video preview</span>
    </div>
  );
}

export function LibraryView({
  accountAvailable,
  available,
  uploadAvailable,
  items,
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
  kind: MediaAssetListKind;
  sort: MediaAssetSortOrder;
  searchQuery: string | null;
  favoriteOnly: boolean;
  offset: number;
  limit: number;
  hasMore: boolean;
}) {
  const previousDirection = sort === "newest" ? "newer" : "older";
  const nextDirection = sort === "newest" ? "older" : "newer";
  const previousLabel = previousDirection === "newer" ? "Newer" : "Older";
  const nextLabel = nextDirection === "older" ? "Older" : "Newer";
  const emptyTitle = offset > 0
    ? `No ${nextDirection} media on this page`
    : searchQuery
      ? favoriteOnly ? `No favorites match “${searchQuery}”` : `No media matches “${searchQuery}”`
      : favoriteOnly
        ? "No favorites yet"
        : kind === "all"
          ? "No media yet"
          : `No ${kind === "image" ? "images" : "videos"} yet`;
  const emptyDescription = offset > 0
    ? `Go back to ${previousDirection} media.`
    : searchQuery
      ? favoriteOnly
        ? "Try another name or prompt, or clear the search to browse your favorites."
        : "Try another name or prompt, or clear the search to browse all saved media."
      : favoriteOnly
        ? "Favorite media from the Viewer and it will appear here."
        : uploadAvailable
          ? "Create or upload something and saved media will appear here automatically."
          : "Create something and saved results will appear here automatically.";
  const emptyActionHref = offset > 0
    ? libraryHref(kind, searchQuery, sort, favoriteOnly, Math.max(0, offset - limit))
    : searchQuery
      ? libraryHref(kind, null, sort, favoriteOnly)
      : favoriteOnly
        ? libraryHref(kind, null, sort, false)
        : "/";
  const emptyActionLabel = offset > 0
    ? `${previousLabel} media`
    : searchQuery
      ? "Clear search"
      : favoriteOnly
        ? "Browse all media"
        : "Create media";

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
                        href={libraryHref(filter.value, searchQuery, sort, favoriteOnly)}
                        aria-current={active ? "page" : undefined}
                      >
                        {filter.label}
                      </Link>
                    </Button>
                  );
                })}
              </nav>
              <div className="flex items-center gap-2">
                <Button asChild variant={favoriteOnly ? "secondary" : "outline"} size="sm">
                  <Link href={libraryHref(kind, searchQuery, sort, !favoriteOnly)}>
                    <Star aria-hidden="true" data-icon="inline-start" className={favoriteOnly ? "fill-current" : undefined} />
                    Favorites
                  </Link>
                </Button>
                <LibrarySortMenu
                  sort={sort}
                  newestHref={libraryHref(kind, searchQuery, "newest", favoriteOnly)}
                  oldestHref={libraryHref(kind, searchQuery, "oldest", favoriteOnly)}
                />
              </div>
            </div>

            <form action="/library" method="get" role="search" className="mt-4 flex w-full max-w-xl items-center gap-2">
              {kind !== "all" ? <input type="hidden" name="kind" value={kind} /> : null}
              {sort !== "newest" ? <input type="hidden" name="sort" value={sort} /> : null}
              {favoriteOnly ? <input type="hidden" name="favorite" value="true" /> : null}
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
                  <Link href={libraryHref(kind, null, sort, favoriteOnly)}>Clear</Link>
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
                    {searchQuery ? <Search aria-hidden="true" /> : kind === "video" ? <Video aria-hidden="true" /> : <ImageIcon aria-hidden="true" />}
                  </EmptyMedia>
                  <EmptyTitle>{emptyTitle}</EmptyTitle>
                  <EmptyDescription>{emptyDescription}</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button asChild variant="secondary">
                    <Link href={emptyActionHref}>
                      {offset > 0 ? <ArrowLeft aria-hidden="true" data-icon="inline-start" /> : null}
                      {emptyActionLabel}
                      {offset === 0 && !searchQuery && !favoriteOnly ? <ArrowRight aria-hidden="true" data-icon="inline-end" /> : null}
                    </Link>
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
              <>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
                  {items.map((asset) => (
                    <Link
                      key={asset.id}
                      href={`/library/${encodeURIComponent(asset.id)}`}
                      className="group min-w-0 overflow-hidden rounded-xl border border-border bg-surface-1 transition-colors hover:border-text-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      aria-label={`Open ${assetTitle(asset)}`}
                    >
                      <div className="aspect-[4/3] overflow-hidden bg-surface-2">
                        <MediaPreview asset={asset} />
                      </div>
                      <div className="p-3">
                        <p className="truncate text-sm font-medium text-text">{assetTitle(asset)}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-text-muted">
                          <span>{asset.kind === "image" ? "Image" : "Video"}</span>
                          <span aria-hidden="true">·</span>
                          <time dateTime={asset.createdAt}>{createdLabel(asset.createdAt)}</time>
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>

                {(offset > 0 || hasMore) ? (
                  <nav className="mt-8 flex items-center justify-between gap-3" aria-label="Library pages">
                    <div>
                      {offset > 0 ? (
                        <Button asChild variant="outline">
                          <Link href={libraryHref(kind, searchQuery, sort, favoriteOnly, Math.max(0, offset - limit))}>
                            <ArrowLeft aria-hidden="true" data-icon="inline-start" />
                            {previousLabel}
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                    {hasMore ? (
                      <Button asChild variant="outline">
                        <Link href={libraryHref(kind, searchQuery, sort, favoriteOnly, offset + limit)}>
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
