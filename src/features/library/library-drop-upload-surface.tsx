"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import type { DragEvent, ReactNode } from "react";
import { useRef, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import {
  uploadLibraryFile,
  validateLibraryUploadFile,
} from "@/features/library/library-upload-client";

function isFileDrag(event: DragEvent<HTMLElement>) {
  return Array.from(event.dataTransfer.types).includes("Files");
}

// UI-028 keeps drag/drop as a transient Library interaction over the existing persistent upload transaction.
export function LibraryDropUploadSurface({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const dragDepth = useRef(0);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function resetDragState() {
    dragDepth.current = 0;
    setDragActive(false);
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    if (!enabled || uploading || !isFileDrag(event)) return;
    event.preventDefault();
    dragDepth.current += 1;
    setError(null);
    setDragActive(true);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (!enabled || uploading || !isFileDrag(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!enabled || !dragActive) return;
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragActive(false);
  }

  async function handleDrop(event: DragEvent<HTMLDivElement>) {
    if (!enabled || uploading || !isFileDrag(event)) return;
    event.preventDefault();
    resetDragState();
    setMessage(null);
    setError(null);

    const files = Array.from(event.dataTransfer.files);
    if (files.length !== 1) {
      setError("Drop one image at a time.");
      return;
    }

    const file = files[0];
    try {
      validateLibraryUploadFile(file);
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : "Library upload failed.");
      return;
    }

    setUploading(true);
    try {
      await uploadLibraryFile(file);
      setMessage("Added to Library.");
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Library upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className="relative"
      data-library-drop-surface="true"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={(event) => void handleDrop(event)}
    >
      {children}

      {enabled && (dragActive || uploading) ? (
        <div
          className="pointer-events-none absolute inset-3 z-40 flex items-center justify-center rounded-2xl border-2 border-dashed border-accent/70 bg-canvas/90 px-6 text-center backdrop-blur-sm sm:inset-5"
          data-library-drop-overlay="true"
          role="status"
        >
          <div className="flex max-w-sm flex-col items-center gap-2 rounded-xl border border-border bg-surface-1/95 px-6 py-5 shadow-xl">
            <span className="flex size-10 items-center justify-center rounded-full bg-surface-3 text-text">
              {uploading ? <Spinner /> : <Upload aria-hidden="true" />}
            </span>
            <p className="text-sm font-semibold text-text">
              {uploading ? "Adding image to Library" : "Drop image to add to Library"}
            </p>
            <p className="text-xs text-text-muted">PNG, JPEG or WebP · up to 25 MB</p>
          </div>
        </div>
      ) : null}

      {message ? <p className="sr-only" role="status">{message}</p> : null}
      {error ? (
        <div className="pointer-events-none absolute left-1/2 top-5 z-50 w-[min(22rem,calc(100%-2rem))] -translate-x-1/2 rounded-lg border border-danger/40 bg-surface-1/95 px-3 py-2 text-center shadow-lg backdrop-blur-sm">
          <p className="text-xs text-danger" role="alert">{error}</p>
        </div>
      ) : null}
    </div>
  );
}
