"use client";

import { useId, useState, type FormEvent } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  MEDIA_COLLECTION_NAME_MAX_LENGTH,
  type CreateMediaCollectionResponse,
  type DeleteMediaCollectionResponse,
  type PublicMediaCollection,
  type UpdateMediaCollectionResponse,
} from "@/lib/api/media-collections-contract";

export function LibraryCollectionManager({
  collections,
  selectedCollectionId,
  allHref,
  onClose,
}: {
  collections: PublicMediaCollection[];
  selectedCollectionId: string | null;
  allHref: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const createInputId = useId();
  const renameInputId = useId();
  const [createName, setCreateName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const [saving, setSaving] = useState<"create" | "rename" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PublicMediaCollection | null>(null);

  function beginRename(collection: PublicMediaCollection) {
    if (saving) return;
    setEditingId(collection.id);
    setRenameName(collection.name);
    setError(null);
    setStatus(null);
  }

  function cancelRename() {
    if (saving === "rename") return;
    setEditingId(null);
    setRenameName("");
    setError(null);
  }

  async function createCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving("create");
    setError(null);
    setStatus(null);
    try {
      const response = await fetch("/api/media/collections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: createName }),
      });
      const payload = await response.json().catch(() => null) as CreateMediaCollectionResponse | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload && !payload.ok ? payload.error.message : "Collection could not be created.");
      }
      setCreateName("");
      setStatus(`Created ${payload.collection.name}.`);
      router.refresh();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Collection could not be created.");
    } finally {
      setSaving(null);
    }
  }

  async function renameCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId || saving) return;
    setSaving("rename");
    setError(null);
    setStatus(null);
    try {
      const response = await fetch(`/api/media/collections/${encodeURIComponent(editingId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: renameName }),
      });
      const payload = await response.json().catch(() => null) as UpdateMediaCollectionResponse | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload && !payload.ok ? payload.error.message : "Collection could not be renamed.");
      }
      setEditingId(null);
      setRenameName("");
      setStatus(`Renamed collection to ${payload.collection.name}.`);
      router.refresh();
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : "Collection could not be renamed.");
    } finally {
      setSaving(null);
    }
  }

  async function deleteCollection() {
    if (!deleteTarget || saving) return;
    const target = deleteTarget;
    setSaving("delete");
    setError(null);
    setStatus(null);
    try {
      const response = await fetch(`/api/media/collections/${encodeURIComponent(target.id)}`, {
        method: "DELETE",
      });
      const payload = await response.json().catch(() => null) as DeleteMediaCollectionResponse | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload && !payload.ok ? payload.error.message : "Collection could not be deleted.");
      }
      setDeleteTarget(null);
      setStatus(`Deleted ${target.name}. Your media remains in Library.`);
      if (target.id === selectedCollectionId) {
        router.push(allHref);
      }
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Collection could not be deleted.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <section
      aria-label="Manage collections"
      className="w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface-2 p-3 text-left shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-text">Manage collections</h3>
          <p className="mt-1 text-xs leading-5 text-text-muted">Create, rename, or remove collections. Media stays in Library.</p>
        </div>
        <Button type="button" variant="ghost" size="icon-lg" onClick={onClose} aria-label="Close collection manager">
          <X aria-hidden="true" />
        </Button>
      </div>

      <form onSubmit={createCollection} className="mt-3">
        <Field data-invalid={Boolean(error && !editingId)}>
          <FieldLabel htmlFor={createInputId}>New collection</FieldLabel>
          <div className="flex items-center gap-2">
            <Input
              id={createInputId}
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              maxLength={MEDIA_COLLECTION_NAME_MAX_LENGTH}
              placeholder="Collection name"
              disabled={Boolean(saving)}
              aria-invalid={Boolean(error && !editingId)}
            />
            <Button type="submit" size="lg" disabled={Boolean(saving)} className="px-3">
              {saving === "create" ? <Spinner data-icon="inline-start" /> : <Plus aria-hidden="true" data-icon="inline-start" />}
              Create
            </Button>
          </div>
        </Field>
      </form>

      <div className="mt-4 space-y-2">
        {collections.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-text-muted">
            No collections yet. Create your first one above.
          </p>
        ) : collections.map((collection) => (
          <div key={collection.id} className="rounded-lg border border-border bg-surface-1 p-2">
            {editingId === collection.id ? (
              <form onSubmit={renameCollection}>
                <Field data-invalid={Boolean(error)}>
                  <FieldLabel htmlFor={renameInputId}>Collection name</FieldLabel>
                  <Input
                    id={renameInputId}
                    value={renameName}
                    onChange={(event) => setRenameName(event.target.value)}
                    maxLength={MEDIA_COLLECTION_NAME_MAX_LENGTH}
                    autoFocus
                    disabled={saving === "rename"}
                    aria-invalid={Boolean(error)}
                  />
                  <FieldError>{error}</FieldError>
                </Field>
                <div className="mt-2 flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={cancelRename} disabled={saving === "rename"} className="min-h-11">
                    <X aria-hidden="true" data-icon="inline-start" />
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving === "rename"} className="min-h-11">
                    {saving === "rename" ? <Spinner data-icon="inline-start" /> : <Check aria-hidden="true" data-icon="inline-start" />}
                    {saving === "rename" ? "Saving…" : "Save"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">{collection.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  onClick={() => beginRename(collection)}
                  disabled={Boolean(saving)}
                  aria-label={`Rename collection ${collection.name}`}
                >
                  <Pencil aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  onClick={() => {
                    setError(null);
                    setStatus(null);
                    setDeleteTarget(collection);
                  }}
                  disabled={Boolean(saving)}
                  aria-label={`Delete collection ${collection.name}`}
                  className="text-danger hover:text-danger"
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {editingId ? null : <FieldError className="mt-2">{error}</FieldError>}
      {status ? <p role="status" aria-live="polite" className="mt-2 text-xs leading-5 text-text-muted">{status}</p> : null}

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (saving === "delete") return;
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget ? `“${deleteTarget.name}”` : "collection"}?</AlertDialogTitle>
            <AlertDialogDescription>
              The collection and its memberships will be removed. Your media, Favorites, files, and generation history stay in Library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? <p role="alert" className="mt-3 text-sm text-danger">{error}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving === "delete"}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving === "delete"}
              onClick={(event) => {
                event.preventDefault();
                void deleteCollection();
              }}
            >
              {saving === "delete" ? <Spinner data-icon="inline-start" /> : <Trash2 aria-hidden="true" data-icon="inline-start" />}
              {saving === "delete" ? "Deleting…" : "Delete collection"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
