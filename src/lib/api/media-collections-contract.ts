export const MEDIA_COLLECTION_NAME_MAX_LENGTH = 120;

export function normalizeMediaCollectionName(value: string | null | undefined) {
  return (value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type PublicMediaCollection = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  containsAsset: boolean;
};

export type MediaCollectionListSuccess = {
  ok: true;
  collections: PublicMediaCollection[];
};

export type MediaCollectionSuccess = {
  ok: true;
  collection: PublicMediaCollection;
};

export type MediaCollectionError = {
  ok: false;
  error: {
    code:
      | "invalid_request"
      | "authentication_required"
      | "collection_not_found"
      | "asset_not_found"
      | "media_unavailable";
    message: string;
  };
};

export type MediaCollectionListResponse = MediaCollectionListSuccess | MediaCollectionError;
export type MediaCollectionResponse = MediaCollectionSuccess | MediaCollectionError;

export type CreateMediaCollectionRequest = {
  name: string;
};

export type UpdateMediaCollectionRequest = {
  name: string;
};

export type DeleteMediaCollectionSuccess = {
  ok: true;
  collectionId: string;
  deleted: true;
};

export type CreateMediaCollectionResponse = MediaCollectionResponse;
export type UpdateMediaCollectionResponse = MediaCollectionResponse;
export type DeleteMediaCollectionResponse = DeleteMediaCollectionSuccess | MediaCollectionError;
export type MediaCollectionMembershipResponse = MediaCollectionResponse;
