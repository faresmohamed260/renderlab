"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import type { PublicMediaAsset } from "@/lib/api/media-assets-contract";
import styles from "@/features/library/media-viewer.module.css";

const comparisonRegionId = "media-viewer-comparison";

type ComparisonContextValue = {
  enabled: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
};

const ComparisonContext = createContext<ComparisonContextValue | null>(null);

function useComparison() {
  const value = useContext(ComparisonContext);
  if (!value) throw new Error("Media Viewer comparison controls must be inside MediaViewerCompareProvider.");
  return value;
}

export function MediaViewerCompareProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ enabled, open: enabled && open, setOpen }), [enabled, open]);
  return <ComparisonContext.Provider value={value}>{children}</ComparisonContext.Provider>;
}

function ResultMedia({ asset, title }: { asset: PublicMediaAsset; title: string }) {
  if (asset.kind === "image") {
    return (
      <img
        src={asset.contentUrl}
        alt={title}
        className={`${styles.resultMedia} kinetic-viewer-media`}
      />
    );
  }

  return (
    <video
      src={asset.contentUrl}
      poster={asset.thumbnailUrl || undefined}
      controls
      playsInline
      className={`${styles.resultMedia} kinetic-viewer-media`}
      aria-label={title}
    />
  );
}

export function MediaViewerMediaStage({
  asset,
  title,
  source,
  sourceTitle,
}: {
  asset: PublicMediaAsset;
  title: string;
  source: PublicMediaAsset | null;
  sourceTitle: string | null;
}) {
  const { open } = useComparison();
  const reduceMotion = useReducedMotion();

  function resetDepth(element: HTMLElement) {
    element.style.removeProperty("--viewer-rx");
    element.style.removeProperty("--viewer-ry");
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLElement>) {
    if (reduceMotion || open || asset.kind !== "image" || event.pointerType === "touch") return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const nx = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2));
    const ny = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - 0.5) * 2));
    event.currentTarget.style.setProperty("--viewer-rx", `${(-ny * 0.7).toFixed(2)}deg`);
    event.currentTarget.style.setProperty("--viewer-ry", `${(nx * 0.9).toFixed(2)}deg`);
  }

  const layoutTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.36, ease: [0.2, 0.8, 0.2, 1] as const };

  const sourceTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.36, ease: [0.2, 0.8, 0.2, 1] as const };

  return (
    <div
      id={comparisonRegionId}
      className={styles.stageGrid}
      data-compare={Boolean(source && open)}
      aria-label={source && open ? "Source and result comparison" : "Media result"}
    >
      <motion.figure
        layout={!reduceMotion}
        className={`${styles.mediaFrame} ${styles.resultFrame}`}
        onPointerMove={handlePointerMove}
        onPointerLeave={(event) => resetDepth(event.currentTarget)}
        onPointerCancel={(event) => resetDepth(event.currentTarget)}
        animate={reduceMotion || open || asset.kind !== "image"
          ? { rotateX: 0, rotateY: 0 }
          : {
              rotateX: "var(--viewer-rx, 0deg)",
              rotateY: "var(--viewer-ry, 0deg)",
            }}
        transition={layoutTransition}
      >
        <div className={styles.mediaWell}>
          <ResultMedia asset={asset} title={title} />
        </div>
        <figcaption className={styles.frameLabel}>
          <strong>RESULT</strong>
          <span>{title}</span>
        </figcaption>
      </motion.figure>

      <AnimatePresence initial={false}>
        {source && open ? (
          <motion.figure
            key={source.id}
            layout={!reduceMotion}
            className={`${styles.mediaFrame} ${styles.sourceFrame}`}
            initial={reduceMotion ? false : {
              opacity: 0,
              x: -30,
              scale: 0.985,
              clipPath: "inset(0 100% 0 0 round 14px)",
            }}
            animate={{
              opacity: 1,
              x: 0,
              scale: 1,
              clipPath: "inset(0 0 0 0 round 14px)",
            }}
            exit={reduceMotion ? { opacity: 0 } : {
              opacity: 0,
              x: -24,
              scale: 0.99,
              clipPath: "inset(0 100% 0 0 round 14px)",
            }}
            transition={sourceTransition}
          >
            <div className={styles.mediaWell}>
              <img
                src={source.contentUrl}
                alt={sourceTitle || "Source image"}
                className={styles.sourceMedia}
              />
            </div>
            <figcaption className={`${styles.frameLabel} ${styles.sourceLabel}`}>
              <div>
                <strong>SOURCE</strong>
                <span>{sourceTitle || "Source image"}</span>
              </div>
              <Link
                href={`/library/${encodeURIComponent(source.id)}`}
                className={styles.sourceLink}
              >
                Open source
              </Link>
            </figcaption>
          </motion.figure>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function MediaViewerCompareButton({ className }: { className?: string }) {
  const { enabled, open, setOpen } = useComparison();
  if (!enabled) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={className}
      aria-expanded={open}
      aria-controls={comparisonRegionId}
      onClick={() => setOpen(!open)}
    >
      {open ? "Close comparison" : "Compare source"}
    </Button>
  );
}
