"use client";

import Link from "next/link";
import { animated, useReducedMotion, useSpring } from "@react-spring/web";
import { ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import styles from "@/features/library/library-gallery.module.css";
import { MediaViewerManageActions, MediaViewerQuickActions } from "@/features/library/media-viewer-actions";
import type { PublicMediaAsset } from "@/lib/api/media-assets-contract";
import { continuationActionForMedia } from "@/lib/capabilities/generation";
import { springOptions } from "@/lib/ui/spring-roles";

export function LibraryInspector({
  asset,
  reuseRecipeJobId,
  onClose,
  onDeleted,
  phone = false,
}: {
  asset: PublicMediaAsset;
  reuseRecipeJobId: string | null;
  onClose: () => void;
  onDeleted: () => void;
  phone?: boolean;
}) {
  const title = asset.displayName || asset.originalFilename || `${asset.origin === "uploaded" ? "Uploaded" : "Generated"} ${asset.kind}`;
  const edit = continuationActionForMedia(asset.kind, "edit-image");
  const editHref = edit ? `/create?${new URLSearchParams({ source: asset.id, action: edit.id })}` : null;
  const dimensions = asset.width && asset.height ? `${asset.width} × ${asset.height}` : null;
  const date = new Date(asset.createdAt);
  const created = Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  const reducedMotion = useReducedMotion();
  const previewStyle = useSpring({ from: { opacity: 0.92 }, opacity: 1, ...springOptions("snappy", reducedMotion !== false) });

  return (
    <>
      <animated.div className={styles.inspectorPreview} style={previewStyle}>
        {asset.kind === "image" ? (
          <img src={asset.thumbnailUrl ?? asset.contentUrl} alt="" />
        ) : (
          <video controls preload="none" aria-label={title} src={asset.contentUrl} poster={asset.thumbnailUrl ?? undefined} />
        )}
      </animated.div>
      <div className={styles.inspectorHeader}>
        <h3>{title}</h3>
        <Button type="button" variant={phone ? "link" : "ghost"} className={phone ? styles.phoneDone : undefined} size={phone ? "lg" : "icon-lg"} aria-label="Close inspector" onClick={onClose}>
          {phone ? "Done" : <X aria-hidden="true" />}
        </Button>
      </div>
      {asset.prompt ? <p className={styles.inspectorPrompt}>{asset.prompt}</p> : null}
      <dl className={styles.inspectorFacts}>
        {created ? <><dt>Created</dt><dd><time dateTime={asset.createdAt}>{created}</time></dd></> : null}
        <dt>Media type</dt><dd>{asset.kind === "image" ? "Image" : "Video"}</dd>
        {dimensions ? <><dt>Dimensions</dt><dd>{dimensions}</dd></> : null}
      </dl>
      <div className={styles.inspectorActions}>
        {editHref ? (
          <Button asChild size="lg" className={styles.createAction}>
            <Link href={editHref} prefetch={false} aria-label="Open in Create" aria-description="Edit image">
              <span>Open in Create</span>
              {!phone ? <span className={styles.editLabel}>Edit image</span> : null}
            </Link>
          </Button>
        ) : null}
        {reuseRecipeJobId ? (
          <Button asChild variant="secondary" size="lg">
            <Link href={`/create?recipe=${encodeURIComponent(reuseRecipeJobId)}`} prefetch={false}>Reuse settings</Link>
          </Button>
        ) : null}
        <Button asChild variant="ghost" size="lg">
          <Link href={`/library/${encodeURIComponent(asset.id)}`}>
            <ExternalLink aria-hidden="true" data-icon="inline-start" />
            Open Viewer
          </Link>
        </Button>
        <MediaViewerQuickActions assetId={asset.id} isFavorite={asset.isFavorite} />
        <MediaViewerManageActions assetId={asset.id} displayName={asset.displayName} fallbackTitle={title} onDeleted={onDeleted} />
      </div>
    </>
  );
}
