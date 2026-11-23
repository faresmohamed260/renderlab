import { supabaseRest } from "@/server/data/supabase-rest";
import { headR2Object, readR2Object, writeR2Object } from "@/server/storage/r2";
import { injectGenerationFinalizationFault } from "@/server/generation/finalization-faults";
import {
  deterministicGenerationAssetId,
  generationOutputStoragePrefix,
  generationThumbnailStoragePrefix,
  possibleGenerationOutputExtensions,
  possibleGenerationThumbnailExtensions,
} from "@/server/generation/generation-storage-keys";
import { inspectUpscaleOutputMetadata, type UpscaleOutputMetadata } from "@/server/generation/upscale-output-metadata";
import {
  IMAGE_THUMBNAIL_CONTENT_TYPE,
  createImageThumbnailBytes,
  imageThumbnailStorageKey,
} from "@/server/media/image-thumbnail";
import { patchJobRow } from "@/server/generation/native-generation-job-store";
import type { NativeGenerationJobRow } from "@/server/generation/native-generation-job-projection";

type JobRow = NativeGenerationJobRow;

// Durable R2/media writes and recovery retain their original execution order.

type GeneratedMediaRow = {
  id: string;
  storage_key: string;
  thumbnail_storage_key: string | null;
  mime_type: string;
};

type DurableOutputObject = {
  storageKey: string;
  contentType: string;
};

function extensionFor(contentType: string) {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/webp") return "webp";
  if (contentType === "video/webm") return "webm";
  if (contentType === "video/quicktime") return "mov";
  if (contentType.startsWith("video/")) return "mp4";
  return "png";
}

function contentTypeMatchesKind(kind: JobRow["output_kind"], contentType: string) {
  return kind === "image" ? contentType.startsWith("image/") : contentType.startsWith("video/");
}

async function findDurableObject(
  prefix: string,
  extensions: readonly string[],
  expectedKind: "image" | "video",
): Promise<DurableOutputObject | null> {
  for (const extension of extensions) {
    const storageKey = `${prefix}.${extension}`;
    try {
      const object = await headR2Object(storageKey);
      if (contentTypeMatchesKind(expectedKind, object.contentType)) {
        return { storageKey, contentType: object.contentType };
      }
    } catch {
      // A deterministic candidate that does not exist is expected during ordinary polling.
    }
  }
  return null;
}

async function getGeneratedOutput(row: JobRow, outputIndex: number) {
  const rows = await supabaseRest<GeneratedMediaRow[]>(
    `media_assets?owner_id=eq.${encodeURIComponent(row.owner_id)}&generation_job_id=eq.${encodeURIComponent(row.id)}&generation_output_index=eq.${outputIndex}&select=id,storage_key,thumbnail_storage_key,mime_type&limit=1`,
    { method: "GET" },
  );
  return rows?.[0] ?? null;
}

async function completeJobWithAsset(row: JobRow, assetId: string) {
  return (await patchJobRow(row, {
    status: "succeeded",
    worker_state: "ready",
    output_asset_ids: [assetId],
    completed_at: new Date().toISOString(),
    error_code: null,
    error_message: null,
  })).row;
}

async function persistGeneratedMedia({
  row,
  outputIndex,
  assetId,
  contentType,
  storageKey,
  thumbnailStorageKey,
  upscaleMetadata,
}: {
  row: JobRow;
  outputIndex: number;
  assetId: string;
  contentType: string;
  storageKey: string;
  thumbnailStorageKey: string | null;
  upscaleMetadata?: UpscaleOutputMetadata | null;
}) {
  try {
    await supabaseRest("media_assets", {
      method: "POST",
      body: JSON.stringify({
        id: assetId,
        owner_id: row.owner_id,
        generation_job_id: row.id,
        generation_output_index: outputIndex,
        kind: row.output_kind,
        mime_type: contentType,
        storage_key: storageKey,
        thumbnail_storage_key: thumbnailStorageKey,
        ...(upscaleMetadata
          ? {
              size_bytes: upscaleMetadata.sizeBytes,
              width: upscaleMetadata.width,
              height: upscaleMetadata.height,
            }
          : {}),
        provenance: {
          operation: row.operation,
          workflowId: row.workflow_id,
          model: row.model,
          prompt: row.prompt,
          ...(typeof row.parameters.generatedVgl === "string"
            ? { generatedVgl: row.parameters.generatedVgl, vglSource: "fibo-public-qwen3vl" } : {}),
        },
        metadata: { ecosystem: row.ecosystem, workerId: row.worker_id },
      }),
    });
  } catch (error) {
    const raced = await getGeneratedOutput(row, outputIndex).catch(() => null);
    if (!raced) throw error;
    return completeJobWithAsset(row, raced.id);
  }

  injectGenerationFinalizationFault("after-media-insert");
  return completeJobWithAsset(row, assetId);
}

export async function recoverPersistingResult(row: JobRow) {
  if (row.status !== "persisting") return null;

  const outputIndex = 0;
  const existing = await getGeneratedOutput(row, outputIndex);
  if (existing) return completeJobWithAsset(row, existing.id);

  const assetId = deterministicGenerationAssetId(row.id, outputIndex);
  const primary = await findDurableObject(
    generationOutputStoragePrefix(row, assetId),
    possibleGenerationOutputExtensions(row.output_kind),
    row.output_kind,
  );
  if (!primary) return null;
  if (row.operation === "upscale-image" && primary.contentType !== "image/png") return null;

  let upscaleMetadata: UpscaleOutputMetadata | null = null;
  if (row.operation === "upscale-image") {
    const object = await readR2Object(primary.storageKey);
    upscaleMetadata = await inspectUpscaleOutputMetadata(object.bytes, primary.contentType);
  }

  let thumbnailStorageKey: string | null = null;
  if (row.output_kind === "image") {
    try {
      const object = await readR2Object(primary.storageKey);
      const thumbnailBytes = await createImageThumbnailBytes(object.bytes);
      const thumbnailKey = imageThumbnailStorageKey(assetId, primary.storageKey, row.created_at);
      await writeR2Object({
        key: thumbnailKey,
        contentType: IMAGE_THUMBNAIL_CONTENT_TYPE,
        body: thumbnailBytes,
      });
      thumbnailStorageKey = thumbnailKey;
    } catch {
      thumbnailStorageKey = null;
    }
  } else {
    const thumbnail = await findDurableObject(
      generationThumbnailStoragePrefix(row, assetId),
      possibleGenerationThumbnailExtensions(),
      "image",
    );
    thumbnailStorageKey = thumbnail?.storageKey ?? null;
  }

  return persistGeneratedMedia({
    row,
    outputIndex,
    assetId,
    contentType: primary.contentType,
    storageKey: primary.storageKey,
    thumbnailStorageKey,
    upscaleMetadata,
  });
}

export async function persistResult(row: JobRow, bytes: Buffer, contentType: string, poster?: { bytes: Buffer; contentType: string } | null) {
  const outputIndex = 0;
  const existing = await getGeneratedOutput(row, outputIndex);
  if (existing) return completeJobWithAsset(row, existing.id);

  const upscaleMetadata = row.operation === "upscale-image"
    ? await inspectUpscaleOutputMetadata(bytes, contentType)
    : null;
  const assetId = deterministicGenerationAssetId(row.id, outputIndex);
  const storageKey = `${generationOutputStoragePrefix(row, assetId)}.${extensionFor(contentType)}`;
  injectGenerationFinalizationFault("before-primary-write");
  await writeR2Object({ key: storageKey, contentType, body: bytes });
  injectGenerationFinalizationFault("after-primary-write");

  let thumbnailStorageKey: string | null = null;
  if (row.output_kind === "image" && contentType.startsWith("image/")) {
    const thumbnailKey = imageThumbnailStorageKey(assetId, storageKey, row.created_at);
    try {
      const thumbnailBytes = await createImageThumbnailBytes(bytes);
      await writeR2Object({
        key: thumbnailKey,
        contentType: IMAGE_THUMBNAIL_CONTENT_TYPE,
        body: thumbnailBytes,
      });
      thumbnailStorageKey = thumbnailKey;
    } catch {
      thumbnailStorageKey = null;
    }
  } else if (poster?.bytes?.length && poster.contentType.startsWith("image/")) {
    const posterKey = `${generationThumbnailStoragePrefix(row, assetId)}.${extensionFor(poster.contentType)}`;
    try {
      injectGenerationFinalizationFault("thumbnail-write");
      await writeR2Object({ key: posterKey, contentType: poster.contentType, body: poster.bytes });
      thumbnailStorageKey = posterKey;
    } catch {
      thumbnailStorageKey = null;
    }
  }

  return persistGeneratedMedia({
    row,
    outputIndex,
    assetId,
    contentType,
    storageKey,
    thumbnailStorageKey,
    upscaleMetadata,
  });
}
