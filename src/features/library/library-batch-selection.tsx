"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { CheckSquare2, FolderOpen, Minus, Plus, Star, Trash2, Video, X } from "lucide-react";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import type {
  BatchDeleteMediaAssetsResponse,
  BatchFavoriteMediaAssetsResponse,
  PublicMediaAsset,
} from "@/lib/api/media-assets-contract";
import type {
  BatchMediaCollectionMembershipResponse,
  PublicMediaCollection,
} from "@/lib/api/media-collections-contract";

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

type OrganizingAction = "favorite" | "unfavorite" | "add-collection" | "remove-collection";

function itemCountLabel(count: number) {
  return `${count} ${count === 1 ? "item" : "items"}`;
}

export function LibraryBatchSelection({
  items,
  collections,
}: {
  items: PublicMediaAsset[];
  collections: PublicMediaCollection[];
}) {
  const router = useRouter();
  const collectionSelectId = useId();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [hiddenDeletedIds, setHiddenDeletedIds] = useState<Set<string>>(() => new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [organizeOpen, setOrganizeOpen] = useState(false);
  const [organizeCollectionId, setOrganizeCollectionId] = useState("");
  const [organizingAction, setOrganizingAction] = useState<OrganizingAction | null>(null);
  const [organizationError, setOrganizationError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    const availableIds = new Set(items.map((item) => item.id));
    setSelectedIds((current) => {
      const next = new Set([...current].filter((assetId) => availableIds.has(assetId)));
      if (next.size === current.size && [...next].every((assetId) => current.has(assetId))) return current;
      return next;
    });
  }, [items]);

  useEffect(() => {
    setOrganizeCollectionId((current) => (collections.some((collection) => collection.id === current) ? current : ""));
  }, [collections]);

  const visibleItems = items.filter((item) => !hiddenDeletedIds.has(item.id));
  const selectedCount = selectedIds.size;
  const allSelected = visibleItems.length > 0 && selectedCount === visibleItems.length;
  const busy = deleting || organizingAction !== null;
  const selectedCollection = collections.find((collection) => collection.id === organizeCollectionId) ?? null;

  function enterSelectionMode() {
    setFeedback(null);
    setDeleteError(null);
    setOrganizationError(null);
    setSelectionMode(true);
  }

  function cancelSelection() {
    if (busy) return;
    setSelectionMode(false);
    setSelectedIds(new Set());
    setDeleteError(null);
    setOrganizationError(null);
    setOrganizeOpen(false);
  }

  function toggleAsset(assetId: string, checked: boolean) {
    setFeedback(null);
    setOrganizationError(null);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(assetId);
      else next.delete(assetId);
      return next;
    });
  }

  function togglePageSelection() {
    setFeedback(null);
    setOrganizationError(null);
    setSelectedIds(allSelected ? new Set() : new Set(visibleItems.map((item) => item.id)));
  }

  async function setSelectedFavorite(favorite: boolean) {
    if (busy || selectedCount === 0) return;
    const requestedIds = [...selectedIds];
    const action: OrganizingAction = favorite ? "favorite" : "unfavorite";
    setOrganizingAction(action);
    setOrganizationError(null);
    setFeedback(null);

    try {
      const response = await fetch("/api/media/assets/batch-favorite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetIds: requestedIds, favorite }),
      });
      const payload = await response.json().catch(() => null) as BatchFavoriteMediaAssetsResponse | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload && !payload.ok ? payload.error.message : "Selected media could not be organized.");
      }

      const actionLabel = favorite ? "favorited" : "unfavorited";
      setFeedback({
        variant: payload.summary.failed > 0 ? "destructive" : "default",
        message: payload.summary.failed > 0
          ? `${itemCountLabel(payload.summary.succeeded)} ${payload.summary.succeeded === 1 ? "was" : "were"} ${actionLabel}. ${itemCountLabel(payload.summary.failed)} could not be updated.`
          : `${itemCountLabel(payload.summary.succeeded)} ${payload.summary.succeeded === 1 ? "was" : "were"} ${actionLabel}.`,
      });
      router.refresh();
    } catch (error) {
      setOrganizationError(error instanceof Error ? error.message : "Selected media could not be organized.");
    } finally {
      setOrganizingAction(null);
    }
  }

  async function setSelectedCollectionMembership(containsAsset: boolean) {
    if (busy || selectedCount === 0 || !selectedCollection) return;
    const requestedIds = [...selectedIds];
    const action: OrganizingAction = containsAsset ? "add-collection" : "remove-collection";
    setOrganizingAction(action);
    setOrganizationError(null);
    setFeedback(null);

    try {
      const response = await fetch(`/api/media/collections/${encodeURIComponent(selectedCollection.id)}/items/batch`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetIds: requestedIds, containsAsset }),
      });
      const payload = await response.json().catch(() => null) as BatchMediaCollectionMembershipResponse | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload && !payload.ok ? payload.error.message : "Selected media could not be organized.");
      }

      const actionLabel = containsAsset ? "added to" : "removed from";
      setFeedback({
        variant: payload.summary.failed > 0 ? "destructive" : "default",
        message: payload.summary.failed > 0
          ? `${itemCountLabel(payload.summary.succeeded)} ${payload.summary.succeeded === 1 ? "was" : "were"} ${actionLabel} “${selectedCollection.name}”. ${itemCountLabel(payload.summary.failed)} could not be updated.`
          : `${itemCountLabel(payload.summary.succeeded)} ${payload.summary.succeeded === 1 ? "was" : "were"} ${actionLabel} “${selectedCollection.name}”.`,
      });
      router.refresh();
    } catch (error) {
      setOrganizationError(error instanceof Error ? error.message : "Selected media could not be organized.");
    } finally {
      setOrganizingAction(null);
    }
  }

  async function deleteSelected() {
    if (busy || selectedCount === 0) return;
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
      const deletedIds = payload.results.filter((result) => result.ok).map((result) => result.assetId);
      setHiddenDeletedIds((current) => new Set([...current, ...deletedIds]));
      setSelectedIds(failedIds);
      setDialogOpen(false);
      setOrganizeOpen(false);

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
          <Collapsible
            open={organizeOpen}
            onOpenChange={(open) => {
              if (busy) return;
              setOrganizationError(null);
              setOrganizeOpen(open);
            }}
            className="flex w-full flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-1 px-3 py-2.5"
            aria-busy={busy}
          >
            <p className="text-sm font-medium text-text" role="status" aria-live="polite">
              {selectedCount === 0 ? "Select media on this page" : `${selectedCount} selected on this page`}
            </p>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <CollapsibleTrigger asChild>
                <Button type="button" variant={organizeOpen ? "secondary" : "ghost"} size="sm" disabled={selectedCount === 0 || busy}>
                  <FolderOpen aria-hidden="true" data-icon="inline-start" />
                  Organize
                </Button>
              </CollapsibleTrigger>
              <Button type="button" variant="ghost" size="sm" onClick={togglePageSelection} disabled={busy}>
                <CheckSquare2 aria-hidden="true" data-icon="inline-start" />
                {allSelected ? "Clear page" : `Select page (${visibleItems.length})`}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={cancelSelection} disabled={busy}>
                <X aria-hidden="true" data-icon="inline-start" />
                Cancel
              </Button>
              <AlertDialog
                open={dialogOpen}
                onOpenChange={(open) => {
                  if (busy) return;
                  setDeleteError(null);
                  setDialogOpen(open);
                }}
              >
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" size="sm" disabled={selectedCount === 0 || busy}>
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

            <CollapsibleContent className="basis-full pt-1">
              <div className="mt-2 grid gap-4 rounded-lg border border-border bg-surface-2/60 p-3 md:grid-cols-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text">Favorites</p>
                  <p className="mt-1 text-xs leading-5 text-text-muted">Set one explicit Favorite state for every selected item.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void setSelectedFavorite(true)}>
                      {organizingAction === "favorite" ? <Spinner data-icon="inline-start" /> : <Star aria-hidden="true" data-icon="inline-start" />}
                      Favorite selected
                    </Button>
                    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void setSelectedFavorite(false)}>
                      {organizingAction === "unfavorite" ? <Spinner data-icon="inline-start" /> : <Star aria-hidden="true" data-icon="inline-start" />}
                      Unfavorite selected
                    </Button>
                  </div>
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text">Collection</p>
                  {collections.length > 0 ? (
                    <>
                      <Field className="mt-2 max-w-sm">
                        <FieldLabel htmlFor={collectionSelectId}>Collection</FieldLabel>
                        <NativeSelect
                          id={collectionSelectId}
                          size="sm"
                          value={organizeCollectionId}
                          onChange={(event) => {
                            setOrganizationError(null);
                            setOrganizeCollectionId(event.target.value);
                          }}
                          disabled={busy}
                        >
                          <NativeSelectOption value="">Choose a collection</NativeSelectOption>
                          {collections.map((collection) => (
                            <NativeSelectOption key={collection.id} value={collection.id}>{collection.name}</NativeSelectOption>
                          ))}
                        </NativeSelect>
                      </Field>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" disabled={!selectedCollection || busy} onClick={() => void setSelectedCollectionMembership(true)}>
                          {organizingAction === "add-collection" ? <Spinner data-icon="inline-start" /> : <Plus aria-hidden="true" data-icon="inline-start" />}
                          Add selected
                        </Button>
                        <Button type="button" variant="outline" size="sm" disabled={!selectedCollection || busy} onClick={() => void setSelectedCollectionMembership(false)}>
                          {organizingAction === "remove-collection" ? <Spinner data-icon="inline-start" /> : <Minus aria-hidden="true" data-icon="inline-start" />}
                          Remove selected
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="mt-1 text-xs leading-5 text-text-muted">Create a collection from Manage collections above before adding selected media.</p>
                  )}
                </div>
                {organizationError ? <p role="alert" className="md:col-span-2 text-sm text-danger">{organizationError}</p> : null}
              </div>
            </CollapsibleContent>
          </Collapsible>
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
        {visibleItems.map((asset) => {
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
                    disabled={busy}
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
