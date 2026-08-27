"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  uploadLibraryFile,
  validateLibraryUploadFile,
} from "@/features/library/library-upload-client";

export function LibraryUploadButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    try {
      validateLibraryUploadFile(file);
    } catch (validationError) {
      setMessage(null);
      setError(validationError instanceof Error ? validationError.message : "Library upload failed.");
      return;
    }

    setUploading(true);
    setMessage(null);
    setError(null);

    try {
      await uploadLibraryFile(file);
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
