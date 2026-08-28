"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckSquare2, Trash2, Video, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import type {
  BatchDeleteMediaAssetsResponse,
  PublicMediaAsset,
} from "@/lib/api/media-assets-contract";

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

type Feedback = {
  variant: "default" | "destructive";
  message: string;
};

export function LibraryBatchSelection({ items }: { items: PublicMediaAsset[] }) {
  const router = useRouter();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    const availableIds = new Set(items.map((item) => item.id));
    setSelectedIds((current) => {
      const next = new Set([...current].filter((assetId) => availableIds.has(assetId)));
      if (next.size === current.size && [...next].every((assetId) => current.has(assetId))) return current;
      return next;
    });
  }, [items]);

  const selectedCount = selectedIds.size;
  const allSelected = items.length > 0 && selectedCount === items.length;

  function enterSelectionMode() {
    setFeedback(null);
    setDeleteError(null);
    setSelectionMode(true);
  }

  function cancelSelection() {
    if (deleting) return;
    setSelectionMode(false);
    setSelectedIds(new Set());
    setDeleteError(null);
  }

  function toggleAsset(assetId: string, checked: boolean) {
    setFeedback(null);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(assetId);
      else next.delete(assetId);
      return next;
    });
  }

  function togglePageSelection() {
    setFeedback(null);
    setSelectedIds(allSelected ? new Set() : new Set(items.map((item) => item.id)));
  }

  async function deleteSelected() {
    if (deleting || selectedCount === 0) return;
    const requestedIds = [...selectedIds];
    setDeleting(true);
    setDeleteError(null);
    setFeedback(null);

    try {
      const response = await fetch("/api/media/assets/batch-delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetIds: requestedIds }),
      });
      const payload = await response.json().catch(() => null) as BatchDeleteMediaAssetsResponse | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload && !payload.ok ? payload.error.message : "Selected media could not be deleted.");
      }

      const failedIds = new Set(payload.results.filter((result) => !result.ok).map((result) => result.assetId));
      setSelectedIds(failedIds);
      setDialogOpen(false);

      if (payload.summary.failed > 0) {
        setSelectionMode(true);
        setFeedback({
          variant: "destructive",
          message: `${payload.summary.deleted} ${payload.summary.deleted === 1 ? "item was" : "items were"} deleted. ${payload.summary.failed} ${payload.summary.failed === 1 ? "item could" : "items could"} not be deleted and remain selected for retry.`,
        });
      } else {
        setSelectionMode(false);
        setSelectedIds(new Set());
        setFeedback({
          variant: "default",
          message: payload.summary.cleanupPending > 0
            ? `${payload.summary.deleted} ${payload.summary.deleted === 1 ? "item was" : "items were"} deleted. Storage cleanup is still finishing for ${payload.summary.cleanupPending}.`
            : `${payload.summary.deleted} ${payload.summary.deleted === 1 ? "item was" : "items were"} deleted permanently.`,
        });
      }

      router.refresh();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Selected media could not be deleted.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="mt-5 flex min-h-10 flex-wrap items-center justify-between gap-3">
        {selectionMode ? (
          <div className="flex w-full flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-1 px-3 py-2.5">
            <p className="text-sm font-medium text-text" role="status" aria-live="polite">
              {selectedCount === 0 ? "Select media on this page" : `${selectedCount} selected on this page`}
            </p>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={togglePageSelection} disabled={deleting}>
                <CheckSquare2 aria-hidden="true" data-icon="inline-start" />
                {allSelected ? "Clear page" : `Select page (${items.length})`}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={cancelSelection} disabled={deleting}>
                <X aria-hidden="true" data-icon="inline-start" />
                Cancel
              </Button>
              <AlertDialog
                open={dialogOpen}
                onOpenChange={(open) => {
                  if (deleting) return;
                  setDeleteError(null);
                  setDialogOpen(open);
                }}
              >
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" size="sm" disabled={selectedCount === 0 || deleting}>
                    <Trash2 aria-hidden="true" data-icon="inline-start" />
                    Delete {selectedCount || ""}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Delete {selectedCount} selected {selectedCount === 1 ? "item" : "items"}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently removes the selected media from your Library and collections. Completed deletions are not rolled back if another selected item cannot be deleted. Existing generation history remains.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  {deleteError ? <p role="alert" className="mt-3 text-sm text-danger">{deleteError}</p> : null}
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={deleting}
                      onClick={(event) => {
                        event.preventDefault();
                        void deleteSelected();
                      }}
                    >
                      {deleting ? <Spinner data-icon="inline-start" /> : <Trash2 aria-hidden="true" data-icon="inline-start" />}
                      {deleting ? "Deleting…" : `Delete ${selectedCount} permanently`}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ) : (
          <div className="ml-auto">
            <Button type="button" variant="ghost" size="sm" onClick={enterSelectionMode}>
              <CheckSquare2 aria-hidden="true" data-icon="inline-start" />
              Select
            </Button>
          </div>
        )}
      </div>

      {feedback ? (
        <Alert variant={feedback.variant} className="mt-3" role="status">
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-3 sm:mt-4 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
        {items.map((asset) => {
          const title = assetTitle(asset);
          const selected = selectedIds.has(asset.id);
          return (
            <div key={asset.id} className="relative min-w-0">
              <Link
                href={`/library/${encodeURIComponent(asset.id)}`}
                className={`group block min-w-0 overflow-hidden rounded-xl border bg-surface-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  selected ? "border-accent ring-1 ring-accent" : "border-border hover:border-text-muted/60"
                }`}
                aria-label={`Open ${title}`}
              >
                <div className="aspect-[4/3] overflow-hidden bg-surface-2">
                  <MediaPreview asset={asset} />
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-medium text-text">{title}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-text-muted">
                    <span>{asset.kind === "image" ? "Image" : "Video"}</span>
                    <span aria-hidden="true">·</span>
                    <time dateTime={asset.createdAt}>{createdLabel(asset.createdAt)}</time>
                  </p>
                </div>
              </Link>
              {selectionMode ? (
                <div className="absolute left-2 top-2 z-10 rounded-lg bg-canvas/80 p-1 shadow-sm backdrop-blur-sm">
                  <Checkbox
                    className="size-9 border-2 bg-canvas/90"
                    checked={selected}
                    onCheckedChange={(checked) => toggleAsset(asset.id, checked === true)}
                    aria-label={`Select ${title}`}
                    disabled={deleting}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}
