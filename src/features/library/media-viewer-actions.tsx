"use client";

import { useId, useState, type FormEvent } from "react";
import { Check, Download, Pencil, Star, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  MEDIA_ASSET_DISPLAY_NAME_MAX_LENGTH,
  type FavoriteMediaAssetResponse,
  type RenameMediaAssetResponse,
} from "@/lib/api/media-assets-contract";

export function MediaViewerActions({
  assetId,
  displayName,
  fallbackTitle,
  isFavorite,
}: {
  assetId: string;
  displayName: string | null;
  fallbackTitle: string;
  isFavorite: boolean;
}) {
  const router = useRouter();
  const inputId = useId();
  const panelId = useId();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(displayName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [favorite, setFavorite] = useState(isFavorite);
  const [favoriteSaving, setFavoriteSaving] = useState(false);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);

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

  async function toggleFavorite() {
    if (favoriteSaving) return;
    const nextFavorite = !favorite;
    setFavoriteSaving(true);
    setFavoriteError(null);
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
    } catch (favoriteUpdateError) {
      setFavoriteError(
        favoriteUpdateError instanceof Error ? favoriteUpdateError.message : "Favorite state could not be updated.",
      );
    } finally {
      setFavoriteSaving(false);
    }
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

  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        type="button"
        variant={favorite ? "secondary" : "outline"}
        size="lg"
        onClick={toggleFavorite}
        disabled={favoriteSaving}
        aria-pressed={favorite}
        className="col-span-2 w-full"
      >
        {favoriteSaving ? (
          <Spinner data-icon="inline-start" />
        ) : (
          <Star
            aria-hidden="true"
            data-icon="inline-start"
            className={favorite ? "fill-current" : undefined}
          />
        )}
        {favoriteSaving ? "Saving…" : favorite ? "Favorited" : "Favorite"}
      </Button>
      {favoriteError ? (
        <p role="alert" className="col-span-2 text-xs text-danger">{favoriteError}</p>
      ) : null}

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
      <Button asChild variant="secondary" size="lg" className="w-full">
        <a href={`/api/media/assets/${encodeURIComponent(assetId)}/download`}>
          <Download aria-hidden="true" data-icon="inline-start" />
          Download
        </a>
      </Button>

      {editing ? (
        <form
          id={panelId}
          onSubmit={submitRename}
          className="col-span-2 rounded-lg border border-border bg-surface-2 p-3"
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
    </div>
  );
}
