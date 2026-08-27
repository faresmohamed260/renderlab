import type { ContinuationAction } from "@/lib/capabilities/generation";
import { continuationActionForMedia } from "@/lib/capabilities/generation";
import { CreateWorkspace } from "@/features/create/create-workspace";
import { isSupabaseConfigured } from "@/server/data/supabase-rest";
import { isGenerationBackendConfigured } from "@/server/generation/submit-generation";
import { getMediaAsset, publicMediaAsset } from "@/server/media/media-assets";
import { isReferenceUploadConfigured } from "@/server/media/reference-uploads";
import { isR2Configured } from "@/server/storage/r2";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isContinuationActionId(value: string): value is ContinuationAction["id"] {
  return value === "edit-image" || value === "animate-image";
}

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const sourceId = firstValue(params.source);
  const requestedAction = firstValue(params.action);
  let initialContinuation = null;
  let initialContinuationError: string | null = null;

  if (sourceId || requestedAction) {
    if (!sourceId || !requestedAction || !uuidPattern.test(sourceId) || !isContinuationActionId(requestedAction)) {
      initialContinuationError = "That continuation link is invalid. Start a new creation or return to Library.";
    } else if (!isSupabaseConfigured() || !isR2Configured()) {
      initialContinuationError = "That media item cannot be loaded in this environment. Start a new creation or return to Library.";
    } else {
      try {
        const asset = await getMediaAsset(sourceId);
        const action = asset ? continuationActionForMedia(asset.kind, requestedAction) : null;

        if (!asset) {
          initialContinuationError = "That media item is no longer available. Start a new creation or return to Library.";
        } else if (!action) {
          initialContinuationError = "That action is not available for this media item. Start a new creation or return to Library.";
        } else {
          initialContinuation = {
            asset: publicMediaAsset(asset),
            action,
          };
        }
      } catch {
        initialContinuationError = "That media item could not be loaded. Start a new creation or return to Library.";
      }
    }
  }

  return (
    <CreateWorkspace
      generationAvailable={isGenerationBackendConfigured()}
      referenceUploadAvailable={isReferenceUploadConfigured()}
      initialContinuation={initialContinuation}
      initialContinuationError={initialContinuationError}
    />
  );
}
