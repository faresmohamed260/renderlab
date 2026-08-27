"use client";

import { useId, useState, type FormEvent } from "react";
import { Check, Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  MEDIA_ASSET_DISPLAY_NAME_MAX_LENGTH,
  type RenameMediaAssetResponse,
} from "@/lib/api/media-assets-contract";

export function MediaRenameControl({
  assetId,
  displayName,
  fallbackTitle,
}: {
  assetId: string;
  displayName: string | null;
  fallbackTitle: string;
}) {
  const router = useRouter();
  const inputId = useId();
  const panelId = useId();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(displayName ?? "");
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="contents">
      <button
        type="button"
        onClick={beginEditing}
        aria-expanded={editing}
        aria-controls={panelId}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface-2 px-4 text-sm font-semibold text-text transition-colors hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Pencil aria-hidden="true" size={16} />
        Rename
      </button>

      {editing ? (
        <form
          id={panelId}
          onSubmit={submitRename}
          className="col-span-2 rounded-lg border border-border bg-surface-2 p-3"
        >
          <label htmlFor={inputId} className="text-xs font-semibold text-text">
            Media name
          </label>
          <input
            id={inputId}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={MEDIA_ASSET_DISPLAY_NAME_MAX_LENGTH}
            placeholder={fallbackTitle}
            autoFocus
            disabled={saving}
            className="mt-2 min-h-10 w-full rounded-lg border border-border bg-surface-1 px-3 text-sm text-text outline-none transition-colors placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/25 disabled:opacity-60"
          />
          {error ? (
            <p className="mt-2 text-xs leading-5 text-danger" role="alert">
              {error}
            </p>
          ) : null}
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={cancelEditing}
              disabled={saving}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-text-muted transition-colors hover:bg-surface-3 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
            >
              <X aria-hidden="true" size={15} />
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-accent px-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check aria-hidden="true" size={15} />
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
