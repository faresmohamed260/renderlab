"use client";

import Link from "next/link";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import type { PublicMediaAsset } from "@/lib/api/media-assets-contract";

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
        className="max-h-[78vh] max-w-full rounded-xl object-contain"
      />
    );
  }

  return (
    <video
      src={asset.contentUrl}
      poster={asset.thumbnailUrl || undefined}
      controls
      playsInline
      className="max-h-[78vh] max-w-full rounded-xl"
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

  if (!source || !open) {
    return (
      <div
        id={comparisonRegionId}
        className="flex min-h-[52vh] items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface-1 p-2 sm:p-4 lg:min-h-[70vh]"
      >
        <ResultMedia asset={asset} title={title} />
      </div>
    );
  }

  return (
    <div
      id={comparisonRegionId}
      className="grid gap-3 lg:grid-cols-[minmax(220px,2fr)_minmax(0,3fr)] lg:items-stretch"
      aria-label="Source and result comparison"
    >
      <div className="order-1 flex min-h-[52vh] flex-col rounded-2xl border border-accent/50 bg-surface-1 p-2 sm:p-4 lg:order-2 lg:min-h-[70vh]">
        <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-[0.08em] text-text">
          {asset.kind === "video" ? "Result video" : "Result"}
        </p>
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl bg-surface-2 p-2 sm:p-3">
          <ResultMedia asset={asset} title={title} />
        </div>
      </div>

      <div className="order-2 rounded-2xl border border-border bg-surface-1 p-3 lg:order-1 lg:flex lg:min-h-[70vh] lg:flex-col lg:p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">Source</p>
        <div className="mt-2 grid grid-cols-[112px_minmax(0,1fr)] items-center gap-3 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:items-stretch lg:justify-center">
          <div className="flex h-24 items-center justify-center overflow-hidden rounded-xl bg-surface-2 p-1.5 lg:h-auto lg:min-h-0 lg:flex-1 lg:p-2">
            <img
              src={source.contentUrl}
              alt={sourceTitle || "Source image"}
              className="max-h-full max-w-full rounded-lg object-contain"
            />
          </div>
          <div className="min-w-0 lg:pt-3">
            <p className="line-clamp-2 text-sm text-text">{sourceTitle || "Source image"}</p>
            <Button asChild variant="secondary" size="sm" className="mt-2">
              <Link href={`/library/${encodeURIComponent(source.id)}`}>Open source</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MediaViewerCompareButton() {
  const { enabled, open, setOpen } = useComparison();
  if (!enabled) return null;

  return (
    <Button
      type="button"
      variant="secondary"
      size="lg"
      className="w-full"
      aria-expanded={open}
      aria-controls={comparisonRegionId}
      onClick={() => setOpen(!open)}
    >
      {open ? "Close comparison" : "Compare source"}
    </Button>
  );
}
