"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { Check, FolderOpen, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  MEDIA_COLLECTION_NAME_MAX_LENGTH,
  type CreateMediaCollectionResponse,
  type MediaCollectionMembershipResponse,
  type PublicMediaCollection,
} from "@/lib/api/media-collections-contract";

export function MediaViewerCollections({
  assetId,
  collections,
  available,
}: {
  assetId: string;
  collections: PublicMediaCollection[];
  available: boolean;
}) {
  const router = useRouter();
  const panelId = useId();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(collections);
  const [busyCollectionId, setBusyCollectionId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(collections);
  }, [collections]);

  async function toggleMembership(collection: PublicMediaCollection) {
    if (busyCollectionId || creating) return;
    const nextContainsAsset = !collection.containsAsset;
    setBusyCollectionId(collection.id);
    setError(null);
    try {
      const response = await fetch(
        `/api/media/collections/${encodeURIComponent(collection.id)}/items/${encodeURIComponent(assetId)}`,
        { method: nextContainsAsset ? "PUT" : "DELETE" },
      );
      const payload = await response.json().catch(() => null) as MediaCollectionMembershipResponse | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload && !payload.ok ? payload.error.message : "Collection membership could not be updated.");
      }
      setItems((current) => current.map((item) => item.id === collection.id ? payload.collection : item));
      router.refresh();
    } catch (membershipError) {
      setError(membershipError instanceof Error ? membershipError.message : "Collection membership could not be updated.");
    } finally {
      setBusyCollectionId(null);
    }
  }

  async function createAndAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating || busyCollectionId) return;
    setCreating(true);
    setError(null);
    let created: PublicMediaCollection | null = null;
    try {
      const createResponse = await fetch("/api/media/collections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const createPayload = await createResponse.json().catch(() => null) as CreateMediaCollectionResponse | null;
      if (!createResponse.ok || !createPayload?.ok) {
        throw new Error(createPayload && !createPayload.ok ? createPayload.error.message : "Collection could not be created.");
      }
      created = createPayload.collection;
      setItems((current) => [created!, ...current.filter((item) => item.id !== created!.id)]);
      setName("");

      const membershipResponse = await fetch(
        `/api/media/collections/${encodeURIComponent(created.id)}/items/${encodeURIComponent(assetId)}`,
        { method: "PUT" },
      );
      const membershipPayload = await membershipResponse.json().catch(() => null) as MediaCollectionMembershipResponse | null;
      if (!membershipResponse.ok || !membershipPayload?.ok) {
        throw new Error(
          membershipPayload && !membershipPayload.ok
            ? `Collection created, but media could not be added: ${membershipPayload.error.message}`
            : "Collection created, but media could not be added.",
        );
      }
      setItems((current) => current.map((item) => item.id === created!.id ? membershipPayload.collection : item));
      router.refresh();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Collection could not be created.");
      if (created) router.refresh();
    } finally {
      setCreating(false);
    }
  }

  const membershipCount = items.filter((collection) => collection.containsAsset).length;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="col-span-2 w-full"
      >
        <FolderOpen aria-hidden="true" data-icon="inline-start" />
        Collections{membershipCount ? ` (${membershipCount})` : ""}
      </Button>

      {open ? (
        <div id={panelId} className="col-span-2 rounded-lg border border-border bg-surface-2 p-3">
          {!available ? (
            <p className="text-sm text-text-muted">Collections are not connected in this environment yet.</p>
          ) : (
            <>
              <div>
                <p className="text-xs font-semibold text-text">Add to collections</p>
                {items.length ? (
                  <div className="mt-2 grid gap-1.5">
                    {items.map((collection) => {
                      const busy = busyCollectionId === collection.id;
                      return (
                        <Button
                          key={collection.id}
                          type="button"
                          variant={collection.containsAsset ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => toggleMembership(collection)}
                          disabled={Boolean(busyCollectionId) || creating}
                          aria-pressed={collection.containsAsset}
                          className="w-full justify-start"
                        >
                          {busy ? (
                            <Spinner data-icon="inline-start" />
                          ) : collection.containsAsset ? (
                            <Check aria-hidden="true" data-icon="inline-start" />
                          ) : (
                            <FolderOpen aria-hidden="true" data-icon="inline-start" />
                          )}
                          <span className="truncate">{collection.name}</span>
                        </Button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-2 text-xs leading-5 text-text-muted">
                    Create a collection to organize this media.
                  </p>
                )}
              </div>

              <form onSubmit={createAndAdd} className="mt-3 border-t border-border pt-3">
                <Field data-invalid={Boolean(error)}>
                  <FieldLabel htmlFor={inputId} className="text-text">New collection</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      id={inputId}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      maxLength={MEDIA_COLLECTION_NAME_MAX_LENGTH}
                      placeholder="e.g. Client selects"
                      disabled={creating || Boolean(busyCollectionId)}
                      aria-invalid={Boolean(error)}
                    />
                    <Button type="submit" variant="secondary" disabled={creating || Boolean(busyCollectionId) || !name.trim()}>
                      {creating ? <Spinner data-icon="inline-start" /> : <Plus aria-hidden="true" data-icon="inline-start" />}
                      {creating ? "Creating…" : "Create and add"}
                    </Button>
                  </div>
                  <FieldError>{error}</FieldError>
                </Field>
              </form>
            </>
          )}
        </div>
      ) : null}
    </>
  );
}
