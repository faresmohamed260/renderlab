import {
  MEDIA_COLLECTION_NAME_MAX_LENGTH,
  normalizeMediaCollectionName,
  type PublicMediaCollection,
} from "@/lib/api/media-collections-contract";
import { supabaseRest } from "@/server/data/supabase-rest";
import { getMediaAsset } from "@/server/media/media-assets";

export type MediaCollectionRecord = {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

type MediaCollectionItemRecord = {
  collection_id: string;
  media_asset_id: string;
  owner_id: string;
  created_at: string;
};

export function publicMediaCollection(
  collection: MediaCollectionRecord,
  containsAsset = false,
): PublicMediaCollection {
  return {
    id: collection.id,
    name: collection.name,
    createdAt: collection.created_at,
    updatedAt: collection.updated_at,
    containsAsset,
  };
}

export async function getMediaCollection(ownerId: string, collectionId: string) {
  const rows = await supabaseRest<MediaCollectionRecord[]>(
    `media_collections?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(collectionId)}&select=*&limit=1`,
    { method: "GET" },
  );
  return rows?.[0] ?? null;
}

async function getMediaCollectionMembership(ownerId: string, collectionId: string, assetId: string) {
  const rows = await supabaseRest<MediaCollectionItemRecord[]>(
    `media_collection_items?owner_id=eq.${encodeURIComponent(ownerId)}&collection_id=eq.${encodeURIComponent(collectionId)}&media_asset_id=eq.${encodeURIComponent(assetId)}&select=*&limit=1`,
    { method: "GET" },
  );
  return rows?.[0] ?? null;
}

export async function listMediaCollections(ownerId: string, assetId?: string | null) {
  const rows = await supabaseRest<MediaCollectionRecord[]>(
    `media_collections?owner_id=eq.${encodeURIComponent(ownerId)}&select=*&order=updated_at.desc,id.desc`,
    { method: "GET" },
  );

  let memberships = new Set<string>();
  if (assetId) {
    const membershipRows = await supabaseRest<Array<Pick<MediaCollectionItemRecord, "collection_id">>>(
      `media_collection_items?owner_id=eq.${encodeURIComponent(ownerId)}&media_asset_id=eq.${encodeURIComponent(assetId)}&select=collection_id`,
      { method: "GET" },
    );
    memberships = new Set((membershipRows ?? []).map((row) => row.collection_id));
  }

  return (rows ?? []).map((collection) => publicMediaCollection(collection, memberships.has(collection.id)));
}

export async function createMediaCollection(ownerId: string, requestedName: string) {
  const name = normalizeMediaCollectionName(requestedName);
  if (!name) throw new RangeError("A collection name is required.");
  if (name.length > MEDIA_COLLECTION_NAME_MAX_LENGTH) {
    throw new RangeError(`Collection names may not exceed ${MEDIA_COLLECTION_NAME_MAX_LENGTH} characters.`);
  }

  try {
    const rows = await supabaseRest<MediaCollectionRecord[]>("media_collections?select=*", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ owner_id: ownerId, name }),
    });
    return rows?.[0] ?? null;
  } catch (error) {
    if (error instanceof Error && error.message.includes('"23505"')) {
      throw new RangeError("A collection with that name already exists.");
    }
    throw error;
  }
}

export async function renameMediaCollection(ownerId: string, collectionId: string, requestedName: string) {
  const collection = await getMediaCollection(ownerId, collectionId);
  if (!collection) return null;

  const name = normalizeMediaCollectionName(requestedName);
  if (!name) throw new RangeError("A collection name is required.");
  if (name.length > MEDIA_COLLECTION_NAME_MAX_LENGTH) {
    throw new RangeError(`Collection names may not exceed ${MEDIA_COLLECTION_NAME_MAX_LENGTH} characters.`);
  }
  if (name === collection.name) return collection;

  try {
    const rows = await supabaseRest<MediaCollectionRecord[]>(
      `media_collections?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(collectionId)}&select=*`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ name, updated_at: new Date().toISOString() }),
      },
    );
    return rows?.[0] ?? null;
  } catch (error) {
    if (error instanceof Error && error.message.includes('"23505"')) {
      throw new RangeError("A collection with that name already exists.");
    }
    throw error;
  }
}

export async function deleteMediaCollection(ownerId: string, collectionId: string) {
  const collection = await getMediaCollection(ownerId, collectionId);
  if (!collection) return null;

  const rows = await supabaseRest<MediaCollectionRecord[]>(
    `media_collections?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(collectionId)}&select=*`,
    {
      method: "DELETE",
      headers: { Prefer: "return=representation" },
    },
  );
  return rows?.[0] ?? null;
}

async function touchMediaCollection(ownerId: string, collectionId: string, fallback: MediaCollectionRecord) {
  const rows = await supabaseRest<MediaCollectionRecord[]>(
    `media_collections?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(collectionId)}&select=*`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ updated_at: new Date().toISOString() }),
    },
  );
  return rows?.[0] ?? fallback;
}

export type SetResolvedMediaCollectionMembershipResult =
  | { ok: true; collection: MediaCollectionRecord; containsAsset: boolean }
  | { ok: false; reason: "asset_not_found" };

export async function setResolvedMediaCollectionMembership(
  ownerId: string,
  collection: MediaCollectionRecord,
  assetId: string,
  containsAsset: boolean,
): Promise<SetResolvedMediaCollectionMembershipResult> {
  if (collection.owner_id !== ownerId) return { ok: false, reason: "asset_not_found" };

  const asset = await getMediaAsset(ownerId, assetId);
  if (!asset) return { ok: false, reason: "asset_not_found" };

  const membership = await getMediaCollectionMembership(ownerId, collection.id, assetId);
  if (Boolean(membership) === containsAsset) {
    return { ok: true, collection, containsAsset };
  }

  if (containsAsset) {
    await supabaseRest<null>("media_collection_items?on_conflict=collection_id,media_asset_id", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify({
        collection_id: collection.id,
        media_asset_id: assetId,
        owner_id: ownerId,
      }),
    });
  } else {
    await supabaseRest<null>(
      `media_collection_items?owner_id=eq.${encodeURIComponent(ownerId)}&collection_id=eq.${encodeURIComponent(collection.id)}&media_asset_id=eq.${encodeURIComponent(assetId)}`,
      { method: "DELETE" },
    );
  }

  const updatedCollection = await touchMediaCollection(ownerId, collection.id, collection);
  return { ok: true, collection: updatedCollection, containsAsset };
}

export type SetMediaCollectionMembershipResult =
  | { ok: true; collection: MediaCollectionRecord; containsAsset: boolean }
  | { ok: false; reason: "collection_not_found" | "asset_not_found" };

export async function setMediaCollectionMembership(
  ownerId: string,
  collectionId: string,
  assetId: string,
  containsAsset: boolean,
): Promise<SetMediaCollectionMembershipResult> {
  const collection = await getMediaCollection(ownerId, collectionId);
  if (!collection) return { ok: false, reason: "collection_not_found" };
  return setResolvedMediaCollectionMembership(ownerId, collection, assetId, containsAsset);
}
