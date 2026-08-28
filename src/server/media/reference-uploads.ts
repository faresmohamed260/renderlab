import { randomUUID } from "node:crypto";
import type {
  CompleteReferenceUploadRequest,
  CreateReferenceUploadTicketRequest,
  ReferenceSource,
  ReferenceUploadTicket,
} from "@/lib/api/reference-upload-contract";
import { maxReferenceUploadBytes } from "@/lib/api/reference-upload-contract";
import { isSupabaseConfigured, supabaseRest } from "@/server/data/supabase-rest";
import { createSignedUploadUrl, headR2Object, isR2Configured } from "@/server/storage/r2";

type SourceRow = {
  id: string;
  owner_id: string;
  storage_key: string;
  filename: string;
  mime_type: string;
  size_bytes: number | string;
  width: number | null;
  height: number | null;
  status: "pending" | "ready" | "failed";
  metadata: Record<string, unknown> | null;
};

export function isReferenceUploadConfigured() {
  return isR2Configured() && isSupabaseConfigured();
}

function safeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "reference.png";
}

function extensionFor(mimeType: CreateReferenceUploadTicketRequest["mimeType"]) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  return "png";
}

export async function createReferenceUploadTicket(
  ownerId: string,
  request: CreateReferenceUploadTicketRequest,
): Promise<ReferenceUploadTicket> {
  if (!isReferenceUploadConfigured()) {
    throw new Error("Reference upload storage is not configured.");
  }

  const now = new Date();
  const key = [
    "sources",
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    `${randomUUID()}.${extensionFor(request.mimeType)}`,
  ].join("/");

  const rows = await supabaseRest<SourceRow[]>("generation_sources?select=*", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      owner_id: ownerId,
      storage_key: key,
      filename: safeFilename(request.filename),
      mime_type: request.mimeType,
      size_bytes: request.sizeBytes,
      purpose: "reference",
      status: "pending",
      metadata: {},
    }),
  });

  const row = rows?.[0];
  if (!row) throw new Error("Reference source record could not be created.");

  const expiresInSeconds = 300;
  const uploadUrl = await createSignedUploadUrl({
    key,
    contentType: request.mimeType,
    expiresIn: expiresInSeconds,
  });

  return {
    sourceId: row.id,
    uploadUrl,
    method: "PUT",
    headers: { "content-type": request.mimeType },
    expiresInSeconds,
    maxBytes: maxReferenceUploadBytes,
  };
}

export async function completeReferenceUpload(
  ownerId: string,
  request: CompleteReferenceUploadRequest,
): Promise<ReferenceSource | null> {
  if (!isReferenceUploadConfigured()) {
    throw new Error("Reference upload storage is not configured.");
  }

  const params = new URLSearchParams({
    select: "id,owner_id,storage_key,filename,mime_type,size_bytes,width,height,status,metadata",
    owner_id: `eq.${ownerId}`,
    id: `eq.${request.sourceId}`,
    limit: "1",
  });
  const rows = await supabaseRest<SourceRow[]>(`generation_sources?${params.toString()}`, { method: "GET" });
  const row = rows?.[0];
  if (!row) return null;

  if (row.status === "ready") {
    return {
      id: row.id,
      filename: row.filename,
      mimeType: row.mime_type as ReferenceSource["mimeType"],
      sizeBytes: Number(row.size_bytes),
      width: row.width,
      height: row.height,
      status: "ready",
    };
  }

  const object = await headR2Object(row.storage_key);
  const expectedSize = Number(row.size_bytes);
  if (
    object.sizeBytes < 1 ||
    object.sizeBytes > maxReferenceUploadBytes ||
    object.sizeBytes !== expectedSize ||
    object.contentType !== row.mime_type
  ) {
    await supabaseRest(
      `generation_sources?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(row.id)}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          status: "failed",
          updated_at: new Date().toISOString(),
          metadata: {
            ...(row.metadata ?? {}),
            verificationError: "Uploaded object did not match the ticket.",
          },
        }),
      },
    );
    throw new Error("Uploaded reference did not match the signed upload ticket.");
  }

  const updated = await supabaseRest<SourceRow[]>(
    `generation_sources?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(row.id)}&select=*`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        status: "ready",
        width: request.width ?? null,
        height: request.height ?? null,
        updated_at: new Date().toISOString(),
        metadata: {
          ...(row.metadata ?? {}),
          etag: object.etag || null,
        },
      }),
    },
  );

  const ready = updated?.[0];
  if (!ready) throw new Error("Reference upload could not be finalized.");

  return {
    id: ready.id,
    filename: ready.filename,
    mimeType: ready.mime_type as ReferenceSource["mimeType"],
    sizeBytes: Number(ready.size_bytes),
    width: ready.width,
    height: ready.height,
    status: "ready",
  };
}
