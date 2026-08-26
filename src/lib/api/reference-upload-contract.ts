export const maxReferenceUploadBytes = 25 * 1024 * 1024;

export const supportedReferenceMimeTypes = ["image/png", "image/jpeg", "image/webp"] as const;
export type ReferenceMimeType = (typeof supportedReferenceMimeTypes)[number];

export type CreateReferenceUploadTicketRequest = {
  filename: string;
  mimeType: ReferenceMimeType;
  sizeBytes: number;
};

export type ReferenceUploadTicket = {
  sourceId: string;
  uploadUrl: string;
  method: "PUT";
  headers: {
    "content-type": ReferenceMimeType;
  };
  expiresInSeconds: number;
  maxBytes: number;
};

export type CompleteReferenceUploadRequest = {
  sourceId: string;
  width?: number;
  height?: number;
};

export type ReferenceSource = {
  id: string;
  filename: string;
  mimeType: ReferenceMimeType;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  status: "ready";
};

export type ReferenceUploadError = {
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

export type CreateReferenceUploadTicketResponse =
  | { ok: true; ticket: ReferenceUploadTicket }
  | ReferenceUploadError;

export type CompleteReferenceUploadResponse =
  | { ok: true; source: ReferenceSource }
  | ReferenceUploadError;

export function isReferenceMimeType(value: string): value is ReferenceMimeType {
  return (supportedReferenceMimeTypes as readonly string[]).includes(value);
}

export function validateReferenceTicketRequest(value: unknown):
  | { ok: true; request: CreateReferenceUploadTicketRequest }
  | { ok: false; error: ReferenceUploadError["error"] } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: { code: "invalid_upload", message: "Upload request must be an object." } };
  }

  const body = value as Record<string, unknown>;
  const filename = typeof body.filename === "string" ? body.filename.trim() : "";
  const mimeType = typeof body.mimeType === "string" ? body.mimeType.toLowerCase() : "";
  const sizeBytes = body.sizeBytes;

  if (!filename || filename.length > 180) {
    return { ok: false, error: { code: "invalid_upload", message: "A valid filename is required." } };
  }
  if (!isReferenceMimeType(mimeType)) {
    return { ok: false, error: { code: "invalid_upload", message: "References must be PNG, JPEG, or WebP images." } };
  }
  if (!Number.isInteger(sizeBytes) || (sizeBytes as number) < 1 || (sizeBytes as number) > maxReferenceUploadBytes) {
    return { ok: false, error: { code: "invalid_upload", message: "Reference images must be no larger than 25 MB." } };
  }

  return {
    ok: true,
    request: {
      filename,
      mimeType,
      sizeBytes: sizeBytes as number,
    },
  };
}

export function validateReferenceCompletionRequest(value: unknown):
  | { ok: true; request: CompleteReferenceUploadRequest }
  | { ok: false; error: ReferenceUploadError["error"] } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: { code: "invalid_upload", message: "Completion request must be an object." } };
  }

  const body = value as Record<string, unknown>;
  const sourceId = typeof body.sourceId === "string" ? body.sourceId.trim() : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sourceId)) {
    return { ok: false, error: { code: "invalid_upload", message: "A valid source ID is required." } };
  }

  const width = body.width;
  const height = body.height;
  if (width !== undefined && (!Number.isInteger(width) || (width as number) < 1)) {
    return { ok: false, error: { code: "invalid_upload", message: "Reference width must be a positive integer." } };
  }
  if (height !== undefined && (!Number.isInteger(height) || (height as number) < 1)) {
    return { ok: false, error: { code: "invalid_upload", message: "Reference height must be a positive integer." } };
  }

  return {
    ok: true,
    request: {
      sourceId,
      ...(width !== undefined ? { width: width as number } : {}),
      ...(height !== undefined ? { height: height as number } : {}),
    },
  };
}
