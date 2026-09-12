import Link from "next/link";
import { AlertCircle, ArrowLeft, ArrowRight, ImageIcon, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActivityAutoRefresh } from "@/features/activity/activity-auto-refresh";
import { ActivityCancelButton } from "@/features/activity/activity-cancel-button";
import { ActivityRetryButton } from "@/features/activity/activity-retry-button";
import { ActivityRunAgainButton } from "@/features/activity/activity-run-again-button";
import type { PublicGenerationActivity } from "@/lib/api/generation-activity-contract";
import { isActiveGenerationStatus } from "@/lib/api/generation-activity-contract";
import styles from "./activity-view.module.css";

const operationLabels = {
  "create-image": "Create image",
  "edit-image": "Edit image",
  "create-video": "Create video",
  "animate-image": "Animate image",
  "upscale-image": "Upscale image",
} as const;

const statusLabels = {
  queued: "Queued",
  preparing: "Preparing",
  running: "Running",
  cancelling: "Cancelling",
  persisting: "Saving result",
  succeeded: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
} as const;

const statusNotes = {
  queued: "Waiting",
  preparing: "Active",
  running: "Active",
  cancelling: "Stopping",
  persisting: "Active",
  succeeded: "Complete",
  failed: "Needs action",
  cancelled: "Stopped",
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

function displayIndex(index: number) {
  return String(index + 1).padStart(2, "0");
}

function ActivityState({ item }: { item: PublicGenerationActivity }) {
  return (
    <div className={styles.state} data-state={item.status}>
      <span className={styles.stateMarker} aria-hidden="true" />
      <strong>{statusLabels[item.status]}</strong>
      <span>{statusNotes[item.status]}</span>
    </div>
  );
}

function ActivityKind({ item }: { item: PublicGenerationActivity }) {
  return (
    <span className={styles.kind}>
      {item.outputKind === "video" ? (
        <Video aria-hidden="true" className="size-3.5" />
      ) : (
        <ImageIcon aria-hidden="true" className="size-3.5" />
      )}
      {operationLabels[item.operation]}
    </span>
  );
}

function ActivityActions({ item }: { item: PublicGenerationActivity }) {
  if (item.status === "succeeded") {
    return (
      <div className={styles.actions}>
        {item.outputAssetIds.length > 0 ? (
          <Button
            asChild
            variant="secondary"
            size="sm"
            className="min-h-11 bg-text px-4 text-canvas hover:bg-white hover:text-canvas"
          >
            <Link href={`/library/${encodeURIComponent(item.outputAssetIds[0])}`}>View result</Link>
          </Button>
        ) : null}
        {item.canRunAgain ? <ActivityRunAgainButton jobId={item.id} /> : null}
      </div>
    );
  }

  if (item.status === "failed") {
    return (
      <div className={styles.actions}>
        <ActivityRetryButton jobId={item.id} />
      </div>
    );
  }

  if (item.canCancel) {
    return (
      <div className={styles.actions}>
        <ActivityCancelButton jobId={item.id} />
      </div>
    );
  }

  return null;
}

function ActivityMatrixJob({ item, index }: { item: PublicGenerationActivity; index: number }) {
  const primary = index === 0;

  return (
    <li
      className={`${styles.matrixJob} ${primary ? styles.matrixPrimary : styles.matrixSecondary}`}
      data-activity-status={item.status}
      data-active={isActiveGenerationStatus(item.status) ? "true" : "false"}
      data-matrix-index={index + 1}
    >
      {primary ? <span className={styles.primaryArc} aria-hidden="true" /> : null}
      <div className={styles.jobIndex}>
        <span>RL / {displayIndex(index)}</span>
        <time dateTime={item.createdAt}>{formatTimestamp(item.createdAt)}</time>
      </div>

      <ActivityState item={item} />

      <div className={styles.matrixCopy}>
        <h2>{item.summary}</h2>
        <ActivityKind item={item} />
      </div>

      <div className={styles.matrixFooter}>
        <ActivityActions item={item} />
      </div>

      {item.status === "failed" && item.error?.message ? (
        <p className={styles.fault} role="status">
          <AlertCircle aria-hidden="true" className="size-3.5 shrink-0" />
          <span>{item.error.message}</span>
        </p>
      ) : null}
    </li>
  );
}

function ActivityRegisterJob({ item, index }: { item: PublicGenerationActivity; index: number }) {
  return (
    <li
      className={styles.registerRow}
      data-activity-status={item.status}
      data-active={isActiveGenerationStatus(item.status) ? "true" : "false"}
    >
      <span className={styles.registerNumber}>{displayIndex(index)}</span>
      <time className={styles.registerTime} dateTime={item.createdAt}>{formatTimestamp(item.createdAt)}</time>
      <ActivityState item={item} />
      <div className={styles.registerCopy}>
        <strong>{item.summary}</strong>
        <ActivityKind item={item} />
        {item.status === "failed" && item.error?.message ? (
          <p className={styles.registerFault} role="status">{item.error.message}</p>
        ) : null}
      </div>
      <div className={styles.registerAction}>
        <ActivityActions item={item} />
      </div>
    </li>
  );
}

function ActivityFrame({
  children,
  registrationRight,
}: {
  children: React.ReactNode;
  registrationRight?: string;
}) {
  return (
    <div className={styles.stage} data-activity-stage>
      <div className={styles.stageRegistration} aria-hidden="true">
        <span>RL / ACTIVITY</span>
        <span>{registrationRight ?? "NEWEST FIRST"}</span>
      </div>
      {children}
    </div>
  );
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
  const matrixItems = items.slice(0, 3);
  const registerItems = items.slice(3);

  return (
    <section className={styles.workspace} data-activity-system="job-matrix">
      <ActivityAutoRefresh enabled={accountAvailable && available && hasActive} />
      <div className={styles.fieldGrid} aria-hidden="true" />
      <div className={styles.atmosphere} aria-hidden="true" />

      <header className={styles.context}>
        <p className={styles.eyebrow}>ACTIVITY / GENERATION LOG</p>
        <div className={styles.contextRow}>
          <div>
            <h1>Activity</h1>
            <p className={styles.support}>Recent generations and their real lifecycle state. Newest first.</p>
          </div>
          {accountAvailable && available && hasActive ? (
            <div className={styles.live} role="status" data-activity-live="true">
              <span aria-hidden="true" />
              <strong>LIVE</strong>
              <small>refreshing active work</small>
            </div>
          ) : null}
        </div>
      </header>

      {!accountAvailable ? (
        <ActivityFrame registrationRight="PRIVATE ACCOUNT">
          <div className={styles.statePanel}>
            <div className={styles.emptyArc} aria-hidden="true" />
            <p className={styles.eyebrow}>RL / PRIVATE</p>
            <h2>Sign in to view Activity</h2>
            <p>Generation activity is private to your RenderLab account.</p>
            <Button asChild variant="secondary" className="mt-6 min-h-11">
              <Link href="/settings">Open Settings</Link>
            </Button>
          </div>
        </ActivityFrame>
      ) : !available ? (
        <ActivityFrame registrationRight="TEMPORARILY UNAVAILABLE">
          <div className={styles.statePanel} role="status">
            <AlertCircle aria-hidden="true" className="size-5 text-danger" />
            <p className={styles.eyebrow}>RL / STATUS</p>
            <h2>Activity is temporarily unavailable</h2>
            <p>Your generation history has not been changed. Refresh and try again.</p>
          </div>
        </ActivityFrame>
      ) : items.length === 0 ? (
        <ActivityFrame registrationRight="NO VISIBLE JOBS">
          <div className={styles.statePanel}>
            <div className={styles.emptyArc} aria-hidden="true" />
            <p className={styles.eyebrow}>RL / 00</p>
            <h2>{offset > 0 || hasMore ? "No visible activity on this page" : "No activity yet"}</h2>
            <p>
              {offset > 0
                ? "Go back to more recent work."
                : hasMore
                  ? "Continue to older activity. Deleted results are omitted automatically."
                  : "Your generation history will appear here after you start a render."}
            </p>
            <Button asChild variant="secondary" className="mt-6 min-h-11">
              <Link
                href={
                  offset > 0
                    ? activityHref(Math.max(0, offset - limit))
                    : hasMore
                      ? activityHref(offset + limit)
                      : "/create"
                }
              >
                {offset > 0 ? "Newer activity" : hasMore ? "Older activity" : "Open Create"}
              </Link>
            </Button>
          </div>
        </ActivityFrame>
      ) : (
        <ActivityFrame>
          <ol
            className={styles.matrix}
            data-activity-matrix
            data-count={matrixItems.length}
            aria-label="Newest generation activity"
          >
            {matrixItems.map((item, index) => (
              <ActivityMatrixJob key={item.id} item={item} index={index} />
            ))}
          </ol>

          {registerItems.length > 0 ? (
            <section className={styles.register} aria-labelledby="activity-history-title">
              <div className={styles.registerHead}>
                <div>
                  <p className={styles.eyebrow}>04—{displayIndex(items.length - 1)} / RECENT HISTORY</p>
                  <h2 id="activity-history-title">Continue down the log.</h2>
                </div>
                <p>Same private generation history, still newest first.</p>
              </div>
              <ol className={styles.registerList} start={4} data-activity-register>
                {registerItems.map((item, registerIndex) => (
                  <ActivityRegisterJob key={item.id} item={item} index={registerIndex + 3} />
                ))}
              </ol>
            </section>
          ) : null}

          {(offset > 0 || hasMore) ? (
            <nav className={styles.pagination} aria-label="Activity pagination">
              <div>
                {offset > 0 ? (
                  <Button asChild variant="outline" className="min-h-11">
                    <Link href={activityHref(Math.max(0, offset - limit))}>
                      <ArrowLeft aria-hidden="true" data-icon="inline-start" />
                      Newer
                    </Link>
                  </Button>
                ) : null}
              </div>
              <span>Page {Math.floor(offset / limit) + 1}</span>
              <div>
                {hasMore ? (
                  <Button asChild variant="outline" className="min-h-11">
                    <Link href={activityHref(offset + limit)}>
                      Older
                      <ArrowRight aria-hidden="true" data-icon="inline-end" />
                    </Link>
                  </Button>
                ) : null}
              </div>
            </nav>
          ) : null}
        </ActivityFrame>
      )}
    </section>
  );
}
