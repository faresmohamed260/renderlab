import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PublicMediaAsset } from "@/lib/api/media-assets-contract";
import type { PublicMediaCollection } from "@/lib/api/media-collections-contract";
import { continuationActionsForMedia } from "@/lib/capabilities/generation";
import {
  MediaViewerCompareProvider,
  MediaViewerMediaStage,
} from "@/features/library/media-viewer-comparison";
import {
  MediaViewerManageActions,
  MediaViewerQuickActions,
} from "@/features/library/media-viewer-actions";
import { MediaViewerRegister } from "@/features/library/media-viewer-register";
import { MediaViewerUpscaleAction } from "@/features/library/media-viewer-upscale-action";
import styles from "@/features/library/media-viewer.module.css";

function createdLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function dateOnlyLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "UNKNOWN";
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date).toUpperCase();
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
  return `/create?${params.toString()}`;
}

export function MediaViewer({
  asset,
  collections,
  collectionsAvailable,
  reuseRecipeJobId,
  compareSource,
  upscaleEligible,
}: {
  asset: PublicMediaAsset;
  collections: PublicMediaCollection[];
  collectionsAvailable: boolean;
  reuseRecipeJobId: string | null;
  compareSource: PublicMediaAsset | null;
  upscaleEligible: boolean;
}) {
  const actions = continuationActionsForMedia(asset.kind);
  const dimensions = asset.width && asset.height ? `${asset.width} × ${asset.height}` : null;
  const duration = durationLabel(asset.durationMs);
  const size = sizeLabel(asset.sizeBytes);
  const title = assetTitle(asset);
  const sourceTitle = compareSource ? assetTitle(compareSource) : null;
  const hasDetails = Boolean(dimensions || duration || asset.originalFilename || size || asset.origin === "uploaded");
  const mediaFact = dimensions || duration;

  const details = hasDetails ? (
    <section aria-labelledby="viewer-details-heading">
      <h3 id="viewer-details-heading" className={styles.panelHeading}>DETAILS</h3>
      <dl className={styles.detailGrid}>
        <div>
          <dt>Type</dt>
          <dd>{asset.kind === "image" ? "Image" : "Video"}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{asset.origin === "uploaded" ? "Upload" : "Creative"}</dd>
        </div>
        {asset.originalFilename ? (
          <div>
            <dt>File</dt>
            <dd>{asset.originalFilename}</dd>
          </div>
        ) : null}
        {size ? (
          <div>
            <dt>Size</dt>
            <dd>{size}</dd>
          </div>
        ) : null}
        {dimensions ? (
          <div>
            <dt>Dimensions</dt>
            <dd>{dimensions}</dd>
          </div>
        ) : null}
        {duration ? (
          <div>
            <dt>Duration</dt>
            <dd>{duration}</dd>
          </div>
        ) : null}
        <div>
          <dt>Created</dt>
          <dd><time dateTime={asset.createdAt}>{createdLabel(asset.createdAt)}</time></dd>
        </div>
      </dl>
    </section>
  ) : null;

  const prompt = asset.prompt ? (
    <section aria-labelledby="viewer-prompt-heading">
      <h3 id="viewer-prompt-heading" className={styles.panelHeading}>PROMPT</h3>
      <p className={styles.promptCopy}>{asset.prompt}</p>
    </section>
  ) : null;

  const continuation = (
    <>
      {actions.map((action, index) => (
        <Button
          key={action.id}
          asChild
          variant={index === 0 ? "default" : "secondary"}
          size="lg"
        >
          <Link href={continuationHref(asset.id, action.id)}>{action.label}</Link>
        </Button>
      ))}
      {reuseRecipeJobId ? (
        <Button asChild variant="secondary" size="lg">
          <Link href={`/create?recipe=${encodeURIComponent(reuseRecipeJobId)}`}>Reuse settings</Link>
        </Button>
      ) : null}
      {upscaleEligible ? <MediaViewerUpscaleAction assetId={asset.id} /> : null}
    </>
  );

  return (
    <section className={styles.workspace}>
      <MediaViewerCompareProvider enabled={Boolean(compareSource)}>
        <header className={styles.context}>
          <div className={styles.returnRow}>
            <Link href="/library" className={styles.returnLink} aria-label="Back to Library">
              <ArrowLeft aria-hidden="true" className="size-4" />
              <span>Library</span>
            </Link>
            <span className={styles.contextRule} aria-hidden="true" />
            <p className={styles.eyebrow}>VIEWER / MEDIA OBJECT</p>
          </div>

          <div className={styles.titleLine}>
            <div className="min-w-0">
              <h1 className={styles.title}>{title}</h1>
              <p className={styles.meta}>
                <span>{asset.origin === "uploaded" ? "UPLOAD" : "CREATIVE"}</span>
                <span>{asset.kind.toUpperCase()}</span>
                {mediaFact ? <span>{mediaFact.toUpperCase()}</span> : null}
                <span>{dateOnlyLabel(asset.createdAt)}</span>
              </p>
            </div>
            <MediaViewerQuickActions assetId={asset.id} isFavorite={asset.isFavorite} />
          </div>
        </header>

        <div className={styles.viewerObject}>
          <div className={styles.stageShell}>
            <div className={styles.registration} aria-hidden="true">
              <span className={styles.regTl}>RL / VIEW</span>
              <span className={styles.regTr}>RESULT / 01</span>
              <span className={styles.regBl}>{dimensions ? dimensions.replace(" × ", " / ") : asset.kind.toUpperCase()}</span>
              <span className={styles.regBr}>{dateOnlyLabel(asset.createdAt)}</span>
              <i className={styles.cornerArc} />
            </div>
            <MediaViewerMediaStage
              asset={asset}
              title={title}
              source={compareSource}
              sourceTitle={sourceTitle}
            />
          </div>

          <MediaViewerRegister
            continuation={continuation}
            prompt={prompt}
            details={details}
            manage={(
              <section aria-labelledby="viewer-manage-heading">
                <h3 id="viewer-manage-heading" className={styles.panelHeading}>MANAGE</h3>
                <div className="mt-3">
                  <MediaViewerManageActions
                    assetId={asset.id}
                    displayName={asset.displayName}
                    fallbackTitle={title}
                    collections={collections}
                    collectionsAvailable={collectionsAvailable}
                  />
                </div>
              </section>
            )}
          />
        </div>
      </MediaViewerCompareProvider>
    </section>
  );
}
