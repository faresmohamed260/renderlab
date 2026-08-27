import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PublicMediaAsset } from "@/lib/api/media-assets-contract";
import { continuationActionsForMedia } from "@/lib/capabilities/generation";
import { MediaViewerActions } from "@/features/library/media-viewer-actions";

function createdLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function durationLabel(durationMs: number | null) {
  if (durationMs == null) return null;
  const seconds = durationMs / 1000;
  return `${Number.isInteger(seconds) ? seconds : seconds.toFixed(1)} s`;
}

function sizeLabel(sizeBytes: number | null) {
  if (sizeBytes == null) return null;
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function assetTitle(asset: PublicMediaAsset) {
  return asset.displayName
    || asset.prompt
    || asset.originalFilename
    || (asset.origin === "uploaded"
      ? asset.kind === "image" ? "Uploaded image" : "Uploaded video"
      : asset.kind === "image" ? "Generated image" : "Generated video");
}

function continuationHref(assetId: string, actionId: string) {
  const params = new URLSearchParams({ source: assetId, action: actionId });
  return `/?${params.toString()}`;
}

export function MediaViewer({ asset }: { asset: PublicMediaAsset }) {
  const actions = continuationActionsForMedia(asset.kind);
  const dimensions = asset.width && asset.height ? `${asset.width} × ${asset.height}` : null;
  const duration = durationLabel(asset.durationMs);
  const size = sizeLabel(asset.sizeBytes);
  const title = assetTitle(asset);
  const hasDetails = Boolean(dimensions || duration || asset.originalFilename || size || asset.origin === "uploaded");

  return (
    <section className="mx-auto w-full max-w-[1240px] px-4 pb-28 pt-8 sm:px-8 sm:pb-16 sm:pt-10 lg:px-10 lg:pt-12">
      <Button asChild variant="ghost">
        <Link href="/library">
          <ArrowLeft aria-hidden="true" data-icon="inline-start" />
          Back to Library
        </Link>
      </Button>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="flex min-h-[52vh] items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface-1 p-2 sm:p-4 lg:min-h-[70vh]">
          {asset.kind === "image" ? (
            <img
              src={asset.contentUrl}
              alt={title}
              className="max-h-[78vh] max-w-full rounded-xl object-contain"
            />
          ) : (
            <video
              src={asset.contentUrl}
              poster={asset.thumbnailUrl || undefined}
              controls
              playsInline
              className="max-h-[78vh] max-w-full rounded-xl"
              aria-label={title}
            />
          )}
        </div>

        <aside className="rounded-xl border border-border bg-surface-1 p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">
            {asset.origin === "uploaded" ? `uploaded ${asset.kind}` : asset.kind}
          </p>
          <h2 className="mt-3 text-xl font-semibold leading-7 text-text">{title}</h2>
          <p className="mt-2 text-xs text-text-muted">
            Created <time dateTime={asset.createdAt}>{createdLabel(asset.createdAt)}</time>
          </p>

          {asset.prompt ? (
            <div className="mt-6 border-t border-border pt-5">
              <h3 className="text-xs font-semibold text-text">Prompt</h3>
              <p className="mt-2 text-sm leading-6 text-text-muted">{asset.prompt}</p>
            </div>
          ) : null}

          {hasDetails ? (
            <div className="mt-6 border-t border-border pt-5">
              <h3 className="text-xs font-semibold text-text">Details</h3>
              <dl className="mt-3 grid grid-cols-[92px_1fr] gap-x-3 gap-y-2 text-sm">
                {asset.origin === "uploaded" ? (
                  <>
                    <dt className="text-text-muted">Source</dt>
                    <dd className="text-text">Upload</dd>
                  </>
                ) : null}
                {asset.originalFilename ? (
                  <>
                    <dt className="text-text-muted">File</dt>
                    <dd className="break-words text-text">{asset.originalFilename}</dd>
                  </>
                ) : null}
                {size ? (
                  <>
                    <dt className="text-text-muted">Size</dt>
                    <dd className="text-text">{size}</dd>
                  </>
                ) : null}
                {dimensions ? (
                  <>
                    <dt className="text-text-muted">Dimensions</dt>
                    <dd className="text-text">{dimensions}</dd>
                  </>
                ) : null}
                {duration ? (
                  <>
                    <dt className="text-text-muted">Duration</dt>
                    <dd className="text-text">{duration}</dd>
                  </>
                ) : null}
              </dl>
            </div>
          ) : null}

          {actions.length ? (
            <div className="mt-6 border-t border-border pt-5">
              <h3 className="text-xs font-semibold text-text">Continue</h3>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {actions.map((action, index) => (
                  <Button key={action.id} asChild variant={index === 0 ? "default" : "secondary"} size="lg" className="w-full">
                    <Link href={continuationHref(asset.id, action.id)}>{action.label}</Link>
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-6 border-t border-border pt-5">
            <h3 className="text-xs font-semibold text-text">Actions</h3>
            <div className="mt-3">
              <MediaViewerActions
                assetId={asset.id}
                displayName={asset.displayName}
                fallbackTitle={title}
              />
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
