"use client";

import { fiboMaskMaxBytes, fiboMaskUsage } from "@/lib/capabilities/fibo-mask";
import type {
  CreateReferenceUploadTicketResponse,
  CompleteReferenceUploadResponse,
} from "@/lib/api/reference-upload-contract";

/** Upload a drawn PNG mask through the normal owner-scoped signed R2 staging
 * and completion path. No data URL or worker credential enters generation JSON.
 */
export async function uploadFiboMaskFile(file: File, signal?: AbortSignal) {
  if (file.type !== "image/png" || file.size < 1 || file.size > fiboMaskMaxBytes) {
    throw new Error("An edit mask must be a PNG no larger than 8 MB.");
  }
  const ticketResponse = await fetch("/api/assets/reference/upload-tickets", {
    method: "POST",
    signal,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      mimeType: "image/png",
      sizeBytes: file.size,
      usage: fiboMaskUsage,
    }),
  });
  const ticket = await ticketResponse.json() as CreateReferenceUploadTicketResponse;
  if (!ticketResponse.ok || !ticket.ok) {
    throw new Error(ticket.ok ? "Could not prepare the mask upload." : ticket.error.message);
  }
  const uploaded = await fetch(ticket.ticket.uploadUrl, {
    method: "PUT",
    signal,
    headers: ticket.ticket.headers,
    body: file,
  });
  if (!uploaded.ok) throw new Error("Mask image upload failed.");
  const completed = await fetch("/api/assets/reference/upload-completions", {
    method: "POST",
    signal,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sourceId: ticket.ticket.sourceId }),
  });
  const result = await completed.json() as CompleteReferenceUploadResponse;
  if (!completed.ok || !result.ok) {
    throw new Error(result.ok ? "Mask image verification failed." : result.error.message);
  }
  return { type: "temporary-source" as const, id: result.source.id };
}
