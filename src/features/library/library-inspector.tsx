"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { animated, useReducedMotion, useSpring } from "@react-spring/web";
import { Sparkles, X } from "lucide-react";
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
  const shape = asset.width && asset.height ? (() => { let a = asset.width, b = asset.height; while (b) { const remainder = a % b; a = b; b = remainder; } return `${asset.width / a}:${asset.height / a}`; })() : null;
  const date = new Date(asset.createdAt);
  const created = Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  const reducedMotion = useReducedMotion();
  const previewStyle = useSpring({ from: { opacity: 0.92 }, opacity: 1, ...springOptions("snappy", reducedMotion !== false) });

  const preview = (
      <animated.div className={styles.inspectorPreview} style={previewStyle}>
        {asset.kind === "image" ? (
          <img src={asset.thumbnailUrl ?? asset.contentUrl} alt="" />
        ) : (
          <video controls preload="none" aria-label={title} src={asset.contentUrl} poster={asset.thumbnailUrl ?? undefined} />
        )}
      </animated.div>
  );
  function details(rename?: ReactNode, editor?: ReactNode) {
    return <>
      <div className={styles.inspectorHeader}>
        <h3 className="min-w-0 flex-1">{title}</h3>
        {rename}
        <Button type="button" variant={phone ? "link" : "ghost"} className={phone ? styles.phoneDone : undefined} size={phone ? "lg" : "icon-lg"} aria-label={phone ? "Done — close inspector" : "Close inspector"} onClick={onClose}>
          {phone ? "Done" : <X aria-hidden="true" />}
        </Button>
      </div>
      {editor}
      {asset.prompt ? <div className={styles.promptBlock}>{phone ? <span>Prompt</span> : null}<p className={styles.inspectorPrompt}>{asset.prompt}</p></div> : null}
      {phone ? <p className={styles.inspectorFactsLine}>{shape ? <span>{shape}</span> : null}{shape && created ? " · " : null}{created ? <time dateTime={asset.createdAt}>Created {created}</time> : null}</p> : <dl className={styles.inspectorFacts}>
        {created ? <><dt>Created</dt><dd><time dateTime={asset.createdAt}>{created}</time></dd></> : null}
        {shape ? <><dt>Shape</dt><dd>{shape}</dd></> : null}
      </dl>}
    </>;
  }
  function actions(manage: ReactNode, compact = false, rename?: ReactNode) {
    return (
      <div className={styles.inspectorActions}>
        {editHref ? (
          <Button asChild size="lg" className={styles.createAction}>
            <Link href={editHref} prefetch={false} aria-description={phone ? "Edit image" : undefined}>
              {phone ? <Sparkles aria-hidden="true" data-icon="inline-start" /> : null}
              <span>Open in Create</span>
            </Link>
          </Button>
        ) : null}
        {phone ? <><MediaViewerQuickActions assetId={asset.id} isFavorite={asset.isFavorite} stacked />{manage}</> : null}
        <div className={styles.inspectorSecondary}>
        {reuseRecipeJobId ? (
          <Button asChild variant="secondary" size="lg">
            <Link href={`/create?recipe=${encodeURIComponent(reuseRecipeJobId)}`} prefetch={false}>Reuse settings</Link>
          </Button>
        ) : null}
        {editHref ? <Button asChild variant="secondary" size="lg"><Link href={editHref} prefetch={false}>Edit image</Link></Button> : null}
        {phone ? rename : null}
        </div>
        {compact ? (
          <div className="grid min-w-0 grid-cols-3 gap-2">
            <MediaViewerQuickActions assetId={asset.id} isFavorite={asset.isFavorite} compact />
            {manage}
          </div>
        ) : !phone ? <>
          <MediaViewerQuickActions assetId={asset.id} isFavorite={asset.isFavorite} />
          {manage}
        </> : null}
        <Link className={styles.quietViewerLink} href={`/library/${encodeURIComponent(asset.id)}`}>Open Viewer</Link>
      </div>
    );
  }
  const manageProps = { assetId: asset.id, displayName: asset.displayName, fallbackTitle: title, onDeleted };
  return <>
    {preview}
    <MediaViewerManageActions {...manageProps} stacked={phone} renderLayout={({ rename, editor, remove }) => <>
      {details(phone ? undefined : rename, editor)}
      {actions(remove, !phone, phone ? rename : undefined)}
    </>} />
  </>;
}
