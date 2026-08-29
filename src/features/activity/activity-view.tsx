import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  ImageIcon,
  LoaderCircle,
  Video,
  XCircle,
} from "lucide-react";
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
import { ActivityAutoRefresh } from "@/features/activity/activity-auto-refresh";
import type { PublicGenerationActivity } from "@/lib/api/generation-activity-contract";
import { isActiveGenerationStatus } from "@/lib/api/generation-activity-contract";

const operationLabels = {
  "create-image": "Create image",
  "edit-image": "Edit image",
  "create-video": "Create video",
  "animate-image": "Animate image",
} as const;

const statusLabels = {
  queued: "Queued",
  preparing: "Preparing",
  running: "Running",
  persisting: "Saving result",
  succeeded: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
} as const;

function activityHref(offset: number) {
  return offset > 0 ? `/activity?offset=${offset}` : "/activity";
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(date);
}

function statusIcon(item: PublicGenerationActivity) {
  if (item.status === "succeeded") return <CheckCircle2 aria-hidden="true" className="size-4" />;
  if (item.status === "failed") return <AlertCircle aria-hidden="true" className="size-4" />;
  if (item.status === "cancelled") return <XCircle aria-hidden="true" className="size-4" />;
  if (isActiveGenerationStatus(item.status)) return <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />;
  return <Clock3 aria-hidden="true" className="size-4" />;
}

function statusClass(item: PublicGenerationActivity) {
  if (item.status === "succeeded") return "border-success/30 bg-success/10 text-success";
  if (item.status === "failed") return "border-danger/30 bg-danger/10 text-danger";
  if (item.status === "cancelled") return "border-border bg-surface-2 text-text-muted";
  return "border-accent/30 bg-accent/10 text-accent";
}

export function ActivityView({
  accountAvailable,
  available,
  items,
  offset,
  limit,
  hasMore,
  hasActive,
}: {
  accountAvailable: boolean;
  available: boolean;
  items: PublicGenerationActivity[];
  offset: number;
  limit: number;
  hasMore: boolean;
  hasActive: boolean;
}) {
  return (
    <section className="mx-auto w-full max-w-[1000px] px-4 pb-28 pt-10 sm:px-8 sm:pb-16 sm:pt-14 lg:px-10 lg:pt-16">
      <ActivityAutoRefresh enabled={accountAvailable && available && hasActive} />

      <div>
        <h2 className="text-[28px] font-semibold tracking-[-0.02em] text-text">Activity</h2>
        <p className="mt-2 max-w-2xl text-[15px] text-text-muted">
          Follow your current and recent generations without exposing worker or provider infrastructure.
        </p>
      </div>

      {!accountAvailable ? (
        <Empty className="mt-8 min-h-72 rounded-xl border border-dashed border-border bg-surface-1 px-6">
          <EmptyHeader>
            <EmptyMedia><Clock3 aria-hidden="true" /></EmptyMedia>
            <EmptyTitle>Sign in to view Activity</EmptyTitle>
            <EmptyDescription>
              Generation activity is private to your RenderLab account.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild variant="secondary">
              <Link href="/settings">Open Settings</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : !available ? (
        <Alert className="mt-8">
          <AlertCircle aria-hidden="true" />
          <AlertDescription>
            Activity is temporarily unavailable. Your generation history has not been changed.
          </AlertDescription>
        </Alert>
      ) : items.length === 0 ? (
        <Empty className="mt-8 min-h-72 rounded-xl border border-dashed border-border bg-surface-1 px-6">
          <EmptyHeader>
            <EmptyMedia><Clock3 aria-hidden="true" /></EmptyMedia>
            <EmptyTitle>{offset > 0 ? "No older activity on this page" : "No generation activity yet"}</EmptyTitle>
            <EmptyDescription>
              {offset > 0
                ? "Go back to more recent work."
                : "Start creating and real generation state will appear here."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild variant="secondary">
              <Link href={offset > 0 ? activityHref(Math.max(0, offset - limit)) : "/"}>
                {offset > 0 ? "Newer activity" : "Create media"}
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          {hasActive ? (
            <p className="mt-8 flex items-center gap-2 text-sm text-text-muted" role="status">
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              Updates automatically while generation work is active.
            </p>
          ) : null}

          <ol className={hasActive ? "mt-4 space-y-3" : "mt-8 space-y-3"}>
            {items.map((item) => (
              <li key={item.id} className="rounded-xl border border-border bg-surface-1 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-text">
                        {item.outputKind === "video"
                          ? <Video aria-hidden="true" className="size-4 text-text-muted" />
                          : <ImageIcon aria-hidden="true" className="size-4 text-text-muted" />}
                        {operationLabels[item.operation]}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(item)}`}>
                        {statusIcon(item)}
                        {statusLabels[item.status]}
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-[15px] leading-6 text-text">
                      {item.prompt || "Untitled generation"}
                    </p>
                    <p className="mt-2 text-xs text-text-muted">
                      <time dateTime={item.createdAt}>{formatTimestamp(item.createdAt)}</time>
                    </p>
                  </div>

                  {item.status === "succeeded" && item.outputAssetIds.length > 0 ? (
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/library/${encodeURIComponent(item.outputAssetIds[0])}`}>View result</Link>
                    </Button>
                  ) : null}
                </div>

                {item.status === "failed" && item.error?.message ? (
                  <Alert className="mt-4">
                    <AlertCircle aria-hidden="true" />
                    <AlertDescription>{item.error.message}</AlertDescription>
                  </Alert>
                ) : null}
              </li>
            ))}
          </ol>

          {(offset > 0 || hasMore) ? (
            <nav className="mt-8 flex items-center justify-between gap-3" aria-label="Activity pagination">
              <div>
                {offset > 0 ? (
                  <Button asChild variant="outline">
                    <Link href={activityHref(Math.max(0, offset - limit))}>
                      <ArrowLeft aria-hidden="true" data-icon="inline-start" />
                      Newer
                    </Link>
                  </Button>
                ) : null}
              </div>
              <div>
                {hasMore ? (
                  <Button asChild variant="outline">
                    <Link href={activityHref(offset + limit)}>
                      Older
                      <ArrowRight aria-hidden="true" data-icon="inline-end" />
                    </Link>
                  </Button>
                ) : null}
              </div>
            </nav>
          ) : null}
        </>
      )}
    </section>
  );
}
