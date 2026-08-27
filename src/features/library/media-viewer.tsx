import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { PublicMediaAsset } from "@/lib/api/media-assets-contract";
import { continuationActionsForMedia } from "@/lib/capabilities/generation";

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

function continuationHref(assetId: string, actionId: string) {
  const params = new URLSearchParams({ source: assetId, action: actionId });
  return `/?${params.toString()}`;
}

export function MediaViewer({ asset }: { asset: PublicMediaAsset }) {
  const actions = continuationActionsForMedia(asset.kind);
  const dimensions = asset.width && asset.height ? `${asset.width} × ${asset.height}` : null;
  const duration = durationLabel(asset.durationMs);

  return (
    <section className="mx-auto w-full max-w-[1240px] px-4 pb-28 pt-8 sm:px-8 sm:pb-16 sm:pt-10 lg:px-10 lg:pt-12">
      <Link
        href="/library"
        className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-1 hover:text-text"
      >
        <ArrowLeft aria-hidden="true" size={17} />
        Back to Library
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="flex min-h-[52vh] items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface-1 p-2 sm:p-4 lg:min-h-[70vh]">
          {asset.kind === "image" ? (
            <img
              src={asset.contentUrl}
              alt={asset.prompt || "Media asset"}
              className="max-h-[78vh] max-w-full rounded-xl object-contain"
            />
          ) : (
            <video
              src={asset.contentUrl}
              poster={asset.thumbnailUrl || undefined}
              controls
              playsInline
              className="max-h-[78vh] max-w-full rounded-xl"
              aria-label={asset.prompt || "Media asset video"}
            />
          )}
        </div>

        <aside className="rounded-xl border border-border bg-surface-1 p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">
            {asset.kind}
          </p>
          <h2 className="mt-3 text-xl font-semibold leading-7 text-text">
            {asset.prompt || (asset.kind === "image" ? "Generated image" : "Generated video")}
          </h2>
          <p className="mt-2 text-xs text-text-muted">
            Created <time dateTime={asset.createdAt}>{createdLabel(asset.createdAt)}</time>
          </p>

          {asset.prompt ? (
            <div className="mt-6 border-t border-border pt-5">
              <h3 className="text-xs font-semibold text-text">Prompt</h3>
              <p className="mt-2 text-sm leading-6 text-text-muted">{asset.prompt}</p>
            </div>
          ) : null}

          {(dimensions || duration) ? (
            <div className="mt-6 border-t border-border pt-5">
              <h3 className="text-xs font-semibold text-text">Details</h3>
              <dl className="mt-3 grid grid-cols-[92px_1fr] gap-x-3 gap-y-2 text-sm">
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
                  <Link
                    key={action.id}
                    href={continuationHref(asset.id, action.id)}
                    className={[
                      "inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold transition-colors",
                      index === 0
                        ? "bg-accent text-white hover:opacity-90"
                        : "border border-border bg-surface-2 text-text hover:bg-surface-3",
                    ].join(" ")}
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
