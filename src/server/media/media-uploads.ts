import { randomUUID } from "node:crypto";
import type {
  CompleteMediaUploadRequest,
  CreateMediaUploadTicketRequest,
  MediaUploadTicket,
} from "@/lib/api/media-upload-contract";
import { maxMediaUploadBytes } from "@/lib/api/media-upload-contract";
import { isSupabaseConfigured, supabaseRest } from "@/server/data/supabase-rest";
import { ensureMediaAssetThumbnail, getMediaAsset } from "@/server/media/media-assets";
import {
  createSignedUploadUrl,
  deleteR2Object,
  headR2Object,
  isR2Configured,
} from "@/server/storage/r2";

type MediaUploadSessionRow = {
  id: string;
  owner_id: string;
  storage_key: string;
  filename: string;
  display_name: string;
  mime_type: CreateMediaUploadTicketRequest["mimeType"];
  size_bytes: number | string;
  status: "pending" | "completed" | "failed";
  media_asset_id: string | null;
  metadata: Record<string, unknown> | null;
};

function extensionFor(mimeType: CreateMediaUploadTicketRequest["mimeType"]) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  return "png";
}

function originalFilenameFor(request: CreateMediaUploadTicketRequest) {
  const cleaned = request.filename
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const basename = cleaned.split(/[\\/]/).filter(Boolean).at(-1) || "";
  return basename.slice(0, 180) || `upload.${extensionFor(request.mimeType)}`;
}

function displayNameFor(request: CreateMediaUploadTicketRequest) {
  const fallback = originalFilenameFor(request).replace(/\.[^.]+$/, "") || "Untitled upload";
  return (request.displayName || fallback)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240) || "Untitled upload";
}

export function isMediaUploadConfigured() {
  return isSupabaseConfigured() && isR2Configured();
}

export async function createMediaUploadTicket(
  ownerId: string,
  request: CreateMediaUploadTicketRequest,
): Promise<MediaUploadTicket> {
  if (!isMediaUploadConfigured()) throw new Error("Media upload storage is not configured.");

  const now = new Date();
  const key = [
    "renderlab",
    "uploads",
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    `${randomUUID()}.${extensionFor(request.mimeType)}`,
  ].join("/");

  const rows = await supabaseRest<MediaUploadSessionRow[]>("media_upload_sessions?select=*", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      owner_id: ownerId,
      storage_key: key,
      filename: originalFilenameFor(request),
      display_name: displayNameFor(request),
      mime_type: request.mimeType,
      size_bytes: request.sizeBytes,
      status: "pending",
      metadata: {},
    }),
  });

  const row = rows?.[0];
  if (!row) throw new Error("Media upload session could not be created.");

  const expiresInSeconds = 300;
  try {
    const uploadUrl = await createSignedUploadUrl({
      key,
      contentType: request.mimeType,
      expiresIn: expiresInSeconds,
    });
    return {
      uploadId: row.id,
      uploadUrl,
      method: "PUT",
      headers: { "content-type": request.mimeType },
      expiresInSeconds,
      maxBytes: maxMediaUploadBytes,
    };
  } catch (error) {
    await supabaseRest(
      `media_upload_sessions?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(row.id)}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          status: "failed",
          updated_at: new Date().toISOString(),
          metadata: {
            signingError: error instanceof Error ? error.message : "Upload signing failed.",
          },
        }),
      },
    ).catch(() => null);
    throw error;
  }
}

async function getUploadSession(ownerId: string, uploadId: string) {
  const rows = await supabaseRest<MediaUploadSessionRow[]>(
    `media_upload_sessions?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(uploadId)}&select=*&limit=1`,
    { method: "GET" },
  );
  return rows?.[0] ?? null;
}

async function findAssetByStorageKey(ownerId: string, storageKey: string) {
  const rows = await supabaseRest<Array<{ id: string }>>(
    `media_assets?owner_id=eq.${encodeURIComponent(ownerId)}&storage_key=eq.${encodeURIComponent(storageKey)}&select=id&limit=1`,
    { method: "GET" },
  );
  const id = rows?.[0]?.id;
  return id ? getMediaAsset(ownerId, id) : null;
}

async function markUploadFailed(ownerId: string, row: MediaUploadSessionRow, message: string) {
  await supabaseRest(
    `media_upload_sessions?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(row.id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        status: "failed",
        updated_at: new Date().toISOString(),
        metadata: {
          ...(row.metadata ?? {}),
          verificationError: message,
        },
      }),
    },
  );
  await deleteR2Object(row.storage_key).catch(() => null);
}

async function markUploadCompleted(
  ownerId: string,
  row: MediaUploadSessionRow,
  assetId: string,
  etag: string | null,
) {
  await supabaseRest(
    `media_upload_sessions?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(row.id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        status: "completed",
        media_asset_id: assetId,
        updated_at: new Date().toISOString(),
        metadata: {
          ...(row.metadata ?? {}),
          etag,
        },
      }),
    },
  );
}

async function withBestEffortImageThumbnail(asset: Awaited<ReturnType<typeof getMediaAsset>>) {
  if (!asset) return asset;
  try {
    return await ensureMediaAssetThumbnail(asset);
  } catch {
    return asset;
  }
}

export async function completeMediaUpload(ownerId: string, request: CompleteMediaUploadRequest) {
  if (!isMediaUploadConfigured()) throw new Error("Media upload storage is not configured.");

  const row = await getUploadSession(ownerId, request.uploadId);
  if (!row) return null;

  if (row.status === "completed" && row.media_asset_id) {
    return withBestEffortImageThumbnail(await getMediaAsset(ownerId, row.media_asset_id));
  }
  if (row.status === "failed") throw new Error("This media upload can no longer be completed.");

  const existingAsset = await findAssetByStorageKey(ownerId, row.storage_key);
  if (existingAsset) {
    await markUploadCompleted(ownerId, row, existingAsset.id, null);
    return withBestEffortImageThumbnail(existingAsset);
  }

  const object = await headR2Object(row.storage_key);
  const expectedSize = Number(row.size_bytes);
  if (
    object.sizeBytes < 1 ||
    object.sizeBytes > maxMediaUploadBytes ||
    object.sizeBytes !== expectedSize ||
    object.contentType !== row.mime_type
  ) {
    await markUploadFailed(ownerId, row, "Uploaded object did not match the upload ticket.");
    throw new Error("Uploaded media did not match the signed upload ticket.");
  }

  let assetId: string = randomUUID();
  try {
    await supabaseRest("media_assets", {
      method: "POST",
      body: JSON.stringify({
        id: assetId,
        owner_id: ownerId,
        generation_job_id: null,
        origin: "uploaded",
        kind: "image",
        mime_type: row.mime_type,
        storage_key: row.storage_key,
        thumbnail_storage_key: null,
        original_filename: row.filename,
        display_name: row.display_name,
        size_bytes: expectedSize,
        width: request.width ?? null,
        height: request.height ?? null,
        duration_ms: null,
        provenance: { source: "user-upload" },
        metadata: { etag: object.etag || null },
      }),
    });
  } catch (error) {
    const racedAsset = await findAssetByStorageKey(ownerId, row.storage_key).catch(() => null);
    if (!racedAsset) throw error;
    assetId = racedAsset.id;
  }

  await markUploadCompleted(ownerId, row, assetId, object.etag || null);
  return withBestEffortImageThumbnail(await getMediaAsset(ownerId, assetId));
}
