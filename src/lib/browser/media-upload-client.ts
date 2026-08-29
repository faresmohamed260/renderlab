"use client";

import type {
  CompleteMediaUploadResponse,
  CreateMediaUploadTicketResponse,
  MediaUploadMimeType,
} from "@/lib/api/media-upload-contract";

async function readImageDimensions(file: File) {
  try {
    const bitmap = await createImageBitmap(file);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  } catch {
    return {};
  }
}

export async function uploadPersistentImageFile(
  file: File,
  mimeType: MediaUploadMimeType,
) {
  const ticketResponse = await fetch("/api/media/uploads/upload-tickets", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      mimeType,
      sizeBytes: file.size,
    }),
  });
  const ticketPayload = (await ticketResponse.json()) as CreateMediaUploadTicketResponse;
  if (!ticketResponse.ok || !ticketPayload.ok) {
    throw new Error(ticketPayload.ok ? "Image upload could not be prepared." : ticketPayload.error.message);
  }

  const uploadResponse = await fetch(ticketPayload.ticket.uploadUrl, {
    method: ticketPayload.ticket.method,
    headers: ticketPayload.ticket.headers,
    body: file,
  });
  if (!uploadResponse.ok) throw new Error("The image could not be uploaded.");

  const dimensions = await readImageDimensions(file);
  const completionResponse = await fetch("/api/media/uploads/upload-completions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ uploadId: ticketPayload.ticket.uploadId, ...dimensions }),
  });
  const completionPayload = (await completionResponse.json()) as CompleteMediaUploadResponse;
  if (!completionResponse.ok || !completionPayload.ok) {
    throw new Error(
      completionPayload.ok ? "Image upload could not be verified." : completionPayload.error.message,
    );
  }

  return completionPayload.asset;
}
