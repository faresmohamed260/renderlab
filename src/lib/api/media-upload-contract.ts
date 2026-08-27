import type { PublicMediaAsset } from "@/lib/api/media-assets-contract";

export const maxMediaUploadBytes = 25 * 1024 * 1024;
export const supportedMediaUploadMimeTypes = ["image/png", "image/jpeg", "image/webp"] as const;
export type MediaUploadMimeType = (typeof supportedMediaUploadMimeTypes)[number];

export type CreateMediaUploadTicketRequest = {
  filename: string;
  displayName?: string;
  mimeType: MediaUploadMimeType;
  sizeBytes: number;
};

export type MediaUploadTicket = {
  uploadId: string;
  uploadUrl: string;
  method: "PUT";
  headers: {
    "content-type": MediaUploadMimeType;
  };
  expiresInSeconds: number;
  maxBytes: number;
};

export type CompleteMediaUploadRequest = {
  uploadId: string;
  width?: number;
  height?: number;
};

export type MediaUploadError = {
  ok: false;
  error: {
    code:
      | "invalid_upload"
      | "upload_backend_unavailable"
      | "upload_verification_failed"
      | "upload_not_found";
    message: string;
  };
};

export type CreateMediaUploadTicketResponse =
  | { ok: true; ticket: MediaUploadTicket }
  | MediaUploadError;

export type CompleteMediaUploadResponse =
  | { ok: true; asset: PublicMediaAsset }
  | MediaUploadError;

export function isMediaUploadMimeType(value: string): value is MediaUploadMimeType {
  return (supportedMediaUploadMimeTypes as readonly string[]).includes(value);
}

function cleanDisplayName(value: string) {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
}

export function validateMediaUploadTicketRequest(value: unknown):
  | { ok: true; request: CreateMediaUploadTicketRequest }
  | { ok: false; error: MediaUploadError["error"] } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: { code: "invalid_upload", message: "Upload request must be an object." } };
  }

  const body = value as Record<string, unknown>;
  const filename = typeof body.filename === "string" ? body.filename.trim() : "";
  const rawDisplayName = typeof body.displayName === "string" ? cleanDisplayName(body.displayName) : "";
  const mimeType = typeof body.mimeType === "string" ? body.mimeType.toLowerCase() : "";
  const sizeBytes = body.sizeBytes;

  if (!filename || filename.length > 180) {
    return { ok: false, error: { code: "invalid_upload", message: "A valid filename is required." } };
  }
  if (rawDisplayName.length > 240) {
    return { ok: false, error: { code: "invalid_upload", message: "Display name must be 240 characters or fewer." } };
  }
  if (!isMediaUploadMimeType(mimeType)) {
    return { ok: false, error: { code: "invalid_upload", message: "Library uploads must be PNG, JPEG, or WebP images." } };
  }
  if (!Number.isInteger(sizeBytes) || (sizeBytes as number) < 1 || (sizeBytes as number) > maxMediaUploadBytes) {
    return { ok: false, error: { code: "invalid_upload", message: "Library uploads must be no larger than 25 MB." } };
  }

  return {
    ok: true,
    request: {
      filename,
      ...(rawDisplayName ? { displayName: rawDisplayName } : {}),
      mimeType,
      sizeBytes: sizeBytes as number,
    },
  };
}

export function validateMediaUploadCompletionRequest(value: unknown):
  | { ok: true; request: CompleteMediaUploadRequest }
  | { ok: false; error: MediaUploadError["error"] } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: { code: "invalid_upload", message: "Completion request must be an object." } };
  }

  const body = value as Record<string, unknown>;
  const uploadId = typeof body.uploadId === "string" ? body.uploadId.trim() : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uploadId)) {
    return { ok: false, error: { code: "invalid_upload", message: "A valid upload ID is required." } };
  }

  const width = body.width;
  const height = body.height;
  if (width !== undefined && (!Number.isInteger(width) || (width as number) < 1)) {
    return { ok: false, error: { code: "invalid_upload", message: "Upload width must be a positive integer." } };
  }
  if (height !== undefined && (!Number.isInteger(height) || (height as number) < 1)) {
    return { ok: false, error: { code: "invalid_upload", message: "Upload height must be a positive integer." } };
  }

  return {
    ok: true,
    request: {
      uploadId,
      ...(width !== undefined ? { width: width as number } : {}),
      ...(height !== undefined ? { height: height as number } : {}),
    },
  };
}
