"use client";

import {
  maxMediaUploadBytes,
  supportedMediaUploadMimeTypes,
  type MediaUploadMimeType,
} from "@/lib/api/media-upload-contract";
import { uploadPersistentImageFile } from "@/lib/browser/media-upload-client";

export function validateLibraryUploadFile(file: File) {
  const mimeType = file.type.toLowerCase();
  if (!(supportedMediaUploadMimeTypes as readonly string[]).includes(mimeType)) {
    throw new Error("Library uploads must be PNG, JPEG, or WebP images.");
  }
  if (file.size < 1 || file.size > maxMediaUploadBytes) {
    throw new Error("Library uploads must be no larger than 25 MB.");
  }
  return mimeType as MediaUploadMimeType;
}

export async function uploadLibraryFile(file: File) {
  const mimeType = validateLibraryUploadFile(file);
  return uploadPersistentImageFile(file, mimeType);
}
