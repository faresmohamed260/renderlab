"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type {
  CompleteMediaUploadResponse,
  CreateMediaUploadTicketResponse,
} from "@/lib/api/media-upload-contract";
import {
  maxMediaUploadBytes,
  supportedMediaUploadMimeTypes,
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

export function LibraryUploadButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    const mimeType = file.type.toLowerCase();
    if (!(supportedMediaUploadMimeTypes as readonly string[]).includes(mimeType)) {
      setMessage(null);
      setError("Library uploads must be PNG, JPEG, or WebP images.");
      return;
    }
    if (file.size < 1 || file.size > maxMediaUploadBytes) {
      setMessage(null);
      setError("Library uploads must be no larger than 25 MB.");
      return;
    }

    setUploading(true);
    setMessage(null);
    setError(null);

    try {
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
        throw new Error(ticketPayload.ok ? "Library upload could not be prepared." : ticketPayload.error.message);
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
          completionPayload.ok ? "Library upload could not be verified." : completionPayload.error.message,
        );
      }

      setMessage("Added to Library.");
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Library upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        aria-label="Library image file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <Button type="button" size="lg" onClick={() => inputRef.current?.click()} disabled={uploading}>
        {uploading ? <Spinner data-icon="inline-start" /> : <Upload aria-hidden="true" data-icon="inline-start" />}
        {uploading ? "Uploading" : "Upload"}
      </Button>
      {message ? <p className="text-xs text-text-muted" role="status">{message}</p> : null}
      {error ? <p className="max-w-64 text-right text-xs text-danger" role="alert">{error}</p> : null}
    </div>
  );
}
