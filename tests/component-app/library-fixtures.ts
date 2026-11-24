import type { ComponentProps } from "react";
import type { LibraryView } from "@/features/library/library-view";
import type { PublicMediaAsset } from "@/lib/api/media-assets-contract";
import type { PublicMediaCollection } from "@/lib/api/media-collections-contract";
import { fixtureAsset } from "./fixtures";

export const firstAsset: PublicMediaAsset = { ...fixtureAsset, displayName: "First image" };
export const secondAsset: PublicMediaAsset = {
  ...fixtureAsset, id: "34567890-1234-4234-8234-123456789abc", displayName: "Second image",
};
export const collection: PublicMediaCollection = {
  id: "45678901-1234-4234-8234-123456789abc", name: "Client selects",
  createdAt: "2026-11-24T00:00:00.000Z", updatedAt: "2026-11-24T00:00:00.000Z", containsAsset: false,
};
export const libraryProps = {
  accountAvailable: true, available: true, uploadAvailable: true,
  items: [firstAsset, secondAsset], collections: [collection], collectionsAvailable: true,
  selectedCollectionId: null, collectionMissing: false, tab: "creatives", kind: "all",
  sort: "newest", searchQuery: null, favoriteOnly: false, offset: 0, limit: 24, hasMore: false,
} satisfies ComponentProps<typeof LibraryView>;
