"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { Check, CheckSquare2, Eye, FolderOpen, Grid2X2, Grid3X3, Minus, Plus, Search, Star, Trash2, Video, X } from "lucide-react";
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
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import styles from "@/features/library/library-gallery.module.css";
import { LibraryInspector } from "@/features/library/library-inspector";
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
        src={asset.thumbnailUrl ?? asset.contentUrl}
        alt=""
        loading="lazy"
        decoding="async"
        className="kinetic-media-preview size-full object-cover"
      />
    );
  }

  if (asset.thumbnailUrl) {
    return (
      <div className="relative size-full">
        <img src={asset.thumbnailUrl} alt="" loading="lazy" className="kinetic-media-preview size-full object-cover" />
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg border border-white/10 bg-canvas/70 px-2 py-1 text-[11px] font-semibold text-text shadow-sm backdrop-blur-md">
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
  sourceControls,
  searchControls,
  organizationControls,
  kindControls,
  sortControl,
  uploadAction,
  mediaContextLabel,
  dropHint,
  viewTitle,
  viewHref,
  showCount,
  inspectedAssetId,
  reuseRecipeJobId,
  children,
}: {
  items: PublicMediaAsset[];
  collections: PublicMediaCollection[];
  sourceControls: ReactNode;
  searchControls: ReactNode;
  organizationControls: ReactNode;
  kindControls: ReactNode;
  sortControl: ReactNode;
  uploadAction: ReactNode;
  mediaContextLabel: string;
  dropHint: string | null;
  viewTitle: string;
  viewHref: string;
  showCount: boolean;
  inspectedAssetId: string | null;
  reuseRecipeJobId: string | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const [compactGrid, setCompactGrid] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchContainer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (searchOpen && narrow) searchContainer.current?.querySelector<HTMLInputElement>("input[type=search]")?.focus({ preventScroll: true });
  }, [searchOpen, narrow]);
  useEffect(() => {
    const query = matchMedia("(max-width: 1199px)");
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const inspectTrigger = useRef<HTMLAnchorElement>(null);
  const phoneInspectorTrigger = useRef<HTMLAnchorElement>(null);
  const galleryHeading = useRef<HTMLHeadingElement>(null);
  const collectionSelectId = useId();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [hiddenDeletedIds, setHiddenDeletedIds] = useState<Set<string>>(() => new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const selectTrigger = useRef<HTMLButtonElement>(null);
  const returnToSelect = useRef(false);
  const returnAfterCancel = useRef(false);
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
  const inspected = visibleItems.find((item) => item.id === inspectedAssetId);
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
    returnAfterCancel.current = true;
  }

  useEffect(() => {
    if (selectionMode || !returnAfterCancel.current) return;
    returnAfterCancel.current = false;
    selectTrigger.current?.focus({ preventScroll: true });
  }, [selectionMode]);

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
      returnToSelect.current = payload.summary.failed === 0;
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

  function updateCardPointer(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") return;
    const node = event.currentTarget;
    const rect = node.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    node.style.setProperty("--gallery-rx", `${((0.5 - y) * 2.6).toFixed(2)}deg`);
    node.style.setProperty("--gallery-ry", `${((x - 0.5) * 3.2).toFixed(2)}deg`);
    node.style.setProperty("--gallery-spot-x", `${(x * 100).toFixed(1)}%`);
    node.style.setProperty("--gallery-spot-y", `${(y * 100).toFixed(1)}%`);
    node.dataset.pointer = "active";
  }

  function clearCardPointer(event: ReactPointerEvent<HTMLDivElement>) {
    const node = event.currentTarget;
    node.style.removeProperty("--gallery-rx");
    node.style.removeProperty("--gallery-ry");
    node.style.removeProperty("--gallery-spot-x");
    node.style.removeProperty("--gallery-spot-y");
    delete node.dataset.pointer;
  }

  function dismissInspector(deletedId?: string) {
    if (deletedId) {
      setHiddenDeletedIds((previous) => new Set([...previous, deletedId]));
      setSelectedIds((previous) => new Set([...previous].filter((id) => id !== deletedId)));
      phoneInspectorTrigger.current = null;
      galleryHeading.current?.focus({ preventScroll: true });
    } else {
      inspectTrigger.current?.focus({ preventScroll: true });
    }
    router.replace(viewHref, { scroll: false });
  }

  return (
    <div className={styles.layout}>
      <div
        className={styles.commandSurface}
        data-library-gallery-rail="true"
        data-selection={selectionMode ? "on" : "off"}
      >
        <div className={styles.defaultControls} data-library-default-controls="true">
          <aside className={styles.discovery} aria-label="Library discovery">
            <div ref={searchContainer} className={styles.searchCell} data-phone-search-open={searchOpen}>{searchControls}</div>
            <div className={styles.sourceCell}>{sourceControls}</div>
            {!narrow ? organizationControls : null}
          </aside>

          <div className={styles.centerToolbar}>
            <div className={styles.desktopContext}>
              <h3 ref={galleryHeading} tabIndex={-1}>{viewTitle}</h3>
              {showCount ? <span>{itemCountLabel(visibleItems.length)} on this page</span> : null}
            </div>
            <div className={styles.actionCell}>
              {narrow ? <Button type="button" variant="ghost" size="icon-lg" aria-label="Search the Library" aria-expanded={searchOpen} onClick={() => setSearchOpen(open => !open)}><Search aria-hidden="true" /></Button> : null}
              {uploadAction}
              {visibleItems.length || items.length ? (
                <Button
                  ref={selectTrigger}
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (selectionMode) cancelSelection();
                    else if (visibleItems.length > 0) enterSelectionMode();
                  }}
                  aria-disabled={busy || visibleItems.length === 0 || undefined}
                  aria-pressed={selectionMode}
                >
                  <CheckSquare2 aria-hidden="true" data-icon="inline-start" />
                  Select
                </Button>
              ) : null}
            </div>
            <div className={styles.kindCell}>
              {narrow ? <section className={styles.phoneFilters} aria-label="Library filters">{kindControls}{organizationControls}</section> : kindControls}
            </div>
            <div className={styles.sortWrap}>{sortControl}</div>
            {visibleItems.length > 0 ? (
              <div className={styles.density} role="group" aria-label="Grid size">
                <Button type="button" variant="secondary" size="icon-lg" aria-label="Compact grid" aria-pressed={compactGrid} onClick={() => setCompactGrid(true)}>
                  <Grid3X3 aria-hidden="true" />
                </Button>
                <Button type="button" variant="secondary" size="icon-lg" aria-label="Large grid" aria-pressed={!compactGrid} onClick={() => setCompactGrid(false)}>
                  <Grid2X2 aria-hidden="true" />
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        <Collapsible
          open={organizeOpen}
          onOpenChange={(open) => {
            if (busy || !selectionMode) return;
            setOrganizationError(null);
            setOrganizeOpen(open);
          }}
          className={styles.selectionMode}
          data-library-selection-mode="true"
          aria-busy={busy}
          aria-hidden={selectionMode ? undefined : "true"}
        >
          <div className={styles.selectionMain}>
            <div className={`${styles.selectionSummary} min-[75rem]:!min-w-0 min-[75rem]:!pr-2`}>
              <span className={styles.selectionEyebrow}>SELECTION</span>
              <strong role="status" aria-live="polite">
                {selectedCount === 0 ? (narrow ? "Select media" : "Select media on this page") : narrow ? `${selectedCount} selected` : `${selectedCount} selected`}
              </strong>
              <small className="min-[75rem]:hidden">{itemCountLabel(visibleItems.length)} visible</small>
            </div>

            <div className={`${styles.selectionActions} min-[75rem]:items-start! min-[75rem]:[&>[data-slot=button]]:h-[var(--rl-hit-preferred)]! min-[75rem]:[&>[data-slot=button]]:min-h-[var(--rl-hit-preferred)]!`}>
              <Button type="button" variant="ghost" size="sm" onClick={togglePageSelection} disabled={busy}>
                <CheckSquare2 aria-hidden="true" data-icon="inline-start" />
                <span className={`${styles.selectionLabel} min-[75rem]:sr-only`}>{allSelected ? "Clear page" : `Select page (${visibleItems.length})`}</span>
              </Button>
              {<Button type="button" variant="ghost" size="sm" disabled={selectedCount === 0 || busy} onClick={() => void setSelectedFavorite(true)}>
                <Star aria-hidden="true" data-icon="inline-start" /> <span className={styles.selectionLabel}>Favorite</span>
              </Button>}
              <CollapsibleTrigger asChild>
                <Button type="button" variant={organizeOpen ? "secondary" : "ghost"} size="sm" disabled={selectedCount === 0 || busy}>
                  <FolderOpen aria-hidden="true" data-icon="inline-start" />
                  <span className={styles.selectionLabel}>Organize</span>
                </Button>
              </CollapsibleTrigger>
              <AlertDialog
                open={dialogOpen}
                onOpenChange={(open) => {
                  if (busy) return;
                  setDeleteError(null);
                  if (open) returnToSelect.current = false;
                  setDialogOpen(open);
                }}
              >
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" size="sm" disabled={selectedCount === 0 || busy}>
                    <Trash2 aria-hidden="true" data-icon="inline-start" />
                    <span className={styles.selectionLabel}>Delete {selectedCount || ""}</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent onCloseAutoFocus={(event) => {
                  if (!returnToSelect.current) return;
                  // Full success leaves selection mode, hiding the original trigger.
                  event.preventDefault();
                  returnToSelect.current = false;
                  selectTrigger.current?.focus({ preventScroll: true });
                }}>
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
              <Button type="button" variant="ghost" size="sm" onClick={cancelSelection} disabled={busy}>
                <X aria-hidden="true" data-icon="inline-start" />
                <span className={`${styles.selectionLabel} min-[75rem]:sr-only`}>Cancel</span>
              </Button>
            </div>
          </div>

          <CollapsibleContent className={styles.organizeContent}>
            <div className={`${styles.organizeDeck} grid gap-4 md:grid-cols-2`}>
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
      </div>

      <section className={styles.gallery} aria-label="Library media grid">
        {feedback ? (
          <Alert variant={feedback.variant} className={styles.feedback} role="status">
            <AlertDescription>{feedback.message}</AlertDescription>
          </Alert>
        ) : null}

        <div hidden={items.length === 0} className={styles.mediaHead} data-library-media-head="true">
          <div className={styles.mediaContext}>
            <span className={styles.mediaEyebrow}>{mediaContextLabel}</span>
            <strong>{selectionMode ? `${selectedCount} of ${visibleItems.length} selected` : itemCountLabel(visibleItems.length)}</strong>
          </div>
          {dropHint ? <p className={styles.dropNote}>{dropHint}</p> : null}
        </div>

        <div className={styles.mediaGrid} data-library-media-grid="true" data-compact={compactGrid}>
          {visibleItems.map((asset) => {
            const title = assetTitle(asset);
            const selected = selectedIds.has(asset.id);
            return (
              <div
                key={asset.id}
                className={styles.cardShell}
                data-selected={selected ? "true" : "false"}
                data-inspected={inspected?.id === asset.id}
                onPointerMove={updateCardPointer}
                onPointerLeave={clearCardPointer}
              >
                <Link
                  href={narrow ? `${viewHref}${viewHref.includes("?") ? "&" : "?"}inspect=${encodeURIComponent(asset.id)}` : `/library/${encodeURIComponent(asset.id)}`}
                  scroll={!narrow}
                  prefetch={narrow ? false : undefined}
                  onClick={event => { if (narrow) phoneInspectorTrigger.current = event.currentTarget; }}
                  className={styles.cardLink}
                  data-selected={selected ? "true" : "false"}
                  aria-label={`Open ${title} ${asset.kind} ${createdLabel(asset.createdAt)}`}
                >
                  <div className={styles.mediaFrame} data-library-media-frame="true">
                    <MediaPreview asset={asset} />
                  </div>
                  <div className={styles.mediaMeta} data-library-media-meta="true">
                    <strong title={title}>{title}</strong>
                    <span>{asset.kind}</span>
                    <time dateTime={asset.createdAt}>{createdLabel(asset.createdAt)}</time>
                  </div>
                </Link>

                <Button asChild variant="secondary" size="icon-lg" className={styles.inspectAction}>
                  <Link
                    ref={inspected?.id === asset.id ? inspectTrigger : undefined}
                    href={`${viewHref}${viewHref.includes("?") ? "&" : "?"}inspect=${encodeURIComponent(asset.id)}`}
                    scroll={false}
                    prefetch={false}
                    onClick={event => { if (narrow) phoneInspectorTrigger.current = event.currentTarget; }}
                    aria-current={inspected?.id === asset.id ? "true" : undefined}
                    aria-label={`Inspect ${title}`}
                  >
                    {inspected?.id === asset.id ? <Check aria-hidden="true" /> : <Eye aria-hidden="true" />}
                  </Link>
                </Button>

                {selectionMode ? (
                  <div className={styles.selectionCheckboxWrap}>
                    <Checkbox
                      className="kinetic-selection-checkbox size-11"
                      aria-label={`Select ${title}`}
                      checked={selected}
                      disabled={busy}
                      onCheckedChange={(checked) => toggleAsset(asset.id, checked === true)}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        {children}
      </section>

      {narrow ? <Sheet open={!!inspected} onOpenChange={open => { if (!open) dismissInspector(); }}>
        {inspected ? <SheetContent side="bottom" className={styles.phoneInspector} showCloseButton={false} onCloseAutoFocus={event => {
          event.preventDefault();
          const target = phoneInspectorTrigger.current ?? inspectTrigger.current;
          if (target?.isConnected) target.focus({ preventScroll: true });
          else (selectTrigger.current ?? galleryHeading.current)?.focus({ preventScroll: true });
        }}>
          <SheetTitle className="sr-only">Media inspector</SheetTitle>
          <SheetDescription className="sr-only">Details and actions for selected Library media.</SheetDescription>
          <LibraryInspector phone key={inspected.id} asset={inspected} reuseRecipeJobId={inspected.generationJobId === reuseRecipeJobId ? reuseRecipeJobId : null} onClose={() => dismissInspector()} onDeleted={() => dismissInspector(inspected.id)} />
        </SheetContent> : null}
      </Sheet> : <aside className={styles.inspector} aria-label="Media inspector">
        {inspected ? (
          <LibraryInspector
            key={inspected.id}
            asset={inspected}
            reuseRecipeJobId={inspected.generationJobId === reuseRecipeJobId ? reuseRecipeJobId : null}
            onClose={() => dismissInspector()}
            onDeleted={() => dismissInspector(inspected.id)}
          />
        ) : (
          <p className={styles.inspectorEmpty}>Select media to inspect</p>
        )}
      </aside>}
    </div>
  );
}
