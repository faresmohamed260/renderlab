"use client";

import { useId, useState, type FormEvent } from "react";
import { Check, Download, Pencil, Star, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { MediaViewerCollections } from "@/features/library/media-viewer-collections";
import type { PublicMediaCollection } from "@/lib/api/media-collections-contract";
import {
  MEDIA_ASSET_DISPLAY_NAME_MAX_LENGTH,
  type DeleteMediaAssetResponse,
  type FavoriteMediaAssetResponse,
  type RenameMediaAssetResponse,
} from "@/lib/api/media-assets-contract";

export function MediaViewerQuickActions({
  assetId,
  isFavorite,
}: {
  assetId: string;
  isFavorite: boolean;
}) {
  const router = useRouter();
  const [favorite, setFavorite] = useState(isFavorite);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleFavorite() {
    if (saving) return;
    const nextFavorite = !favorite;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/media/assets/${encodeURIComponent(assetId)}/favorite`, {
        method: nextFavorite ? "PUT" : "DELETE",
      });
      const payload = await response.json().catch(() => null) as FavoriteMediaAssetResponse | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload && !payload.ok ? payload.error.message : "Favorite state could not be updated.");
      }
      setFavorite(payload.asset.isFavorite);
      router.refresh();
    } catch (favoriteError) {
      setError(favoriteError instanceof Error ? favoriteError.message : "Favorite state could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-wrap justify-end gap-2">
      <Button
        type="button"
        variant={favorite ? "secondary" : "outline"}
        onClick={toggleFavorite}
        disabled={saving}
        aria-pressed={favorite}
        aria-label={saving ? "Saving favorite" : favorite ? "Remove from favorites" : "Favorite"}
        className="h-11 min-w-11 px-3 sm:min-w-0"
      >
        {saving ? (
          <Spinner />
        ) : (
          <Star aria-hidden="true" className={favorite ? "fill-current" : undefined} />
        )}
        <span className="hidden sm:inline">{saving ? "Saving…" : favorite ? "Favorited" : "Favorite"}</span>
      </Button>
      <Button asChild variant="secondary" className="h-11 min-w-11 px-3 sm:min-w-0">
        <a
          href={`/api/media/assets/${encodeURIComponent(assetId)}/download`}
          aria-label="Download media"
        >
          <Download aria-hidden="true" />
          <span className="hidden sm:inline">Download</span>
        </a>
      </Button>
      {error ? <p role="alert" className="basis-full text-right text-xs text-danger">{error}</p> : null}
    </div>
  );
}

export function MediaViewerManageActions({
  assetId,
  displayName,
  fallbackTitle,
  collections,
  collectionsAvailable,
}: {
  assetId: string;
  displayName: string | null;
  fallbackTitle: string;
  collections: PublicMediaCollection[];
  collectionsAvailable: boolean;
}) {
  const router = useRouter();
  const inputId = useId();
  const panelId = useId();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(displayName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function beginEditing() {
    setDraft(displayName ?? "");
    setError(null);
    setEditing(true);
  }

  function cancelEditing() {
    if (saving) return;
    setDraft(displayName ?? "");
    setError(null);
    setEditing(false);
  }

  async function submitRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/media/assets/${encodeURIComponent(assetId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: draft }),
      });
      const payload = await response.json().catch(() => null) as RenameMediaAssetResponse | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload && !payload.ok ? payload.error.message : "Media could not be renamed.");
      }

      setDraft(payload.asset.displayName ?? "");
      setEditing(false);
      router.refresh();
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : "Media could not be renamed.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAsset() {
    if (deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/media/assets/${encodeURIComponent(assetId)}`, {
        method: "DELETE",
      });
      const payload = await response.json().catch(() => null) as DeleteMediaAssetResponse | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload && !payload.ok ? payload.error.message : "Media could not be deleted.");
      }

      setDeleteOpen(false);
      router.push("/library");
      router.refresh();
    } catch (deleteRequestError) {
      setDeleteError(deleteRequestError instanceof Error ? deleteRequestError.message : "Media could not be deleted.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      <MediaViewerCollections assetId={assetId} collections={collections} available={collectionsAvailable} />

      <Button
        type="button"
        variant="secondary"
        size="lg"
        onClick={beginEditing}
        aria-expanded={editing}
        aria-controls={panelId}
        className="w-full"
      >
        <Pencil aria-hidden="true" data-icon="inline-start" />
        Rename
      </Button>

      {editing ? (
        <form
          id={panelId}
          onSubmit={submitRename}
          className="rounded-xl border border-border bg-surface-2 p-3 sm:col-span-2"
        >
          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor={inputId} className="text-text">Media name</FieldLabel>
            <Input
              id={inputId}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={MEDIA_ASSET_DISPLAY_NAME_MAX_LENGTH}
              placeholder={fallbackTitle}
              autoFocus
              disabled={saving}
              aria-invalid={Boolean(error)}
            />
            <FieldError>{error}</FieldError>
          </Field>
          <div className="mt-3 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={cancelEditing} disabled={saving}>
              <X aria-hidden="true" data-icon="inline-start" />
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Spinner data-icon="inline-start" /> : <Check aria-hidden="true" data-icon="inline-start" />}
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      ) : null}

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (deleting) return;
          setDeleteError(null);
          setDeleteOpen(open);
        }}
      >
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="w-full text-danger hover:text-danger sm:col-span-2"
          >
            <Trash2 aria-hidden="true" data-icon="inline-start" />
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete media?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes this media from your Library and collections. It cannot be restored or reused in new generations. Existing generation history remains.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError ? <p role="alert" className="mt-3 text-sm text-danger">{deleteError}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void deleteAsset();
              }}
            >
              {deleting ? <Spinner data-icon="inline-start" /> : <Trash2 aria-hidden="true" data-icon="inline-start" />}
              {deleting ? "Deleting…" : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
