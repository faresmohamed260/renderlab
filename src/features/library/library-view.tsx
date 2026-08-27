import Link from "next/link";
import { ArrowLeft, ArrowRight, ImageIcon, Video } from "lucide-react";
import type {
  MediaAssetListKind,
  PublicMediaAsset,
} from "@/lib/api/media-assets-contract";
import { LibraryUploadButton } from "@/features/library/library-upload-button";

const filters: Array<{ value: MediaAssetListKind; label: string }> = [
  { value: "all", label: "All" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
];

function filterHref(kind: MediaAssetListKind) {
  return kind === "all" ? "/library" : `/library?kind=${kind}`;
}

function pageHref(kind: MediaAssetListKind, offset: number) {
  const params = new URLSearchParams();
  if (kind !== "all") params.set("kind", kind);
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
  available,
  uploadAvailable,
  items,
  kind,
  offset,
  limit,
  hasMore,
}: {
  available: boolean;
  uploadAvailable: boolean;
  items: PublicMediaAsset[];
  kind: MediaAssetListKind;
  offset: number;
  limit: number;
  hasMore: boolean;
}) {
  return (
    <section className="mx-auto w-full max-w-[1240px] px-4 pb-28 pt-10 sm:px-8 sm:pb-16 sm:pt-14 lg:px-10 lg:pt-16">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[28px] font-semibold tracking-[-0.02em] text-text">Library</h2>
          <p className="mt-2 max-w-xl text-[15px] text-text-muted">
            Browse durable media and continue from the work you want to keep.
          </p>
        </div>
        {uploadAvailable ? <LibraryUploadButton /> : null}
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        <nav className="flex rounded-lg bg-surface-2 p-1" aria-label="Library media type">
          {filters.map((filter) => {
            const active = kind === filter.value;
            return (
              <Link
                key={filter.value}
                href={filterHref(filter.value)}
                aria-current={active ? "page" : undefined}
                className={[
                  "inline-flex min-h-9 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors",
                  active ? "bg-surface-3 text-text" : "text-text-muted hover:text-text",
                ].join(" ")}
              >
                {filter.label}
              </Link>
            );
          })}
        </nav>
        <span className="hidden text-xs text-text-muted sm:inline">Newest first</span>
      </div>

      {!available ? (
        <div className="mt-8 rounded-xl border border-border bg-surface-1 px-5 py-8 text-sm text-text-muted" role="status">
          Library media is not connected in this environment yet.
        </div>
      ) : items.length === 0 ? (
        <div className="mt-8 flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-1 px-6 text-center">
          <div className="flex size-11 items-center justify-center rounded-lg bg-surface-2 text-text-muted">
            {kind === "video" ? <Video aria-hidden="true" size={21} /> : <ImageIcon aria-hidden="true" size={21} />}
          </div>
          <h3 className="mt-4 text-base font-semibold text-text">
            {offset > 0 ? "No older media on this page" : kind === "all" ? "No media yet" : `No ${kind === "image" ? "images" : "videos"} yet`}
          </h3>
          <p className="mt-1 max-w-sm text-sm leading-6 text-text-muted">
            {offset > 0
              ? "Go back to newer media."
              : uploadAvailable
                ? "Create or upload something and saved media will appear here automatically."
                : "Create something and saved results will appear here automatically."}
          </p>
          <Link
            href={offset > 0 ? pageHref(kind, Math.max(0, offset - limit)) : "/"}
            className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg bg-surface-2 px-4 text-sm font-medium text-text transition-colors hover:bg-surface-3"
          >
            {offset > 0 ? <ArrowLeft aria-hidden="true" size={16} /> : null}
            {offset > 0 ? "Newer media" : "Create media"}
            {offset === 0 ? <ArrowRight aria-hidden="true" size={16} /> : null}
          </Link>
        </div>
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
                  <Link
                    href={pageHref(kind, Math.max(0, offset - limit))}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-surface-1 px-4 text-sm font-medium text-text transition-colors hover:bg-surface-2"
                  >
                    <ArrowLeft aria-hidden="true" size={16} />
                    Newer
                  </Link>
                ) : null}
              </div>
              {hasMore ? (
                <Link
                  href={pageHref(kind, offset + limit)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-surface-1 px-4 text-sm font-medium text-text transition-colors hover:bg-surface-2"
                >
                  Older
                  <ArrowRight aria-hidden="true" size={16} />
                </Link>
              ) : null}
            </nav>
          ) : null}
        </>
      )}
    </section>
  );
}
