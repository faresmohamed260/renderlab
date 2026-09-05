import type { ContinuationAction } from "@/lib/capabilities/generation";
import { continuationActionForMedia } from "@/lib/capabilities/generation";
import { CreateWorkspace } from "@/features/create/create-workspace";
import { getCurrentRenderLabAccount } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/server/data/supabase-rest";
import { loadInitialGenerationRecipe } from "@/server/generation/generation-recipe";
import { isGenerationBackendConfigured } from "@/server/generation/submit-generation";
import { getMediaAsset, publicMediaAsset } from "@/server/media/media-assets";
import { isMediaUploadConfigured } from "@/server/media/media-uploads";
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
  const account = await getCurrentRenderLabAccount();
  const recipeId = firstValue(params.recipe);
  const sourceId = firstValue(params.source);
  const requestedAction = firstValue(params.action);
  let initialContinuation = null;
  let initialRecipe = null;
  let initialNavigationError: string | null = null;

  if (recipeId && (sourceId || requestedAction)) {
    initialNavigationError = "That Create link mixes two continuation types. Start a new creation or use one saved starting point.";
  } else if (recipeId) {
    if (!uuidPattern.test(recipeId)) {
      initialNavigationError = "That saved generation link is invalid. Start a new creation instead.";
    } else if (!account) {
      initialNavigationError = "Sign in from Settings to reuse private RenderLab generation settings.";
    } else if (!isSupabaseConfigured() || !isR2Configured()) {
      initialNavigationError = "That saved generation cannot be loaded in this environment. Start a new creation instead.";
    } else {
      try {
        initialRecipe = await loadInitialGenerationRecipe(account.id, recipeId);
        if (!initialRecipe) {
          initialNavigationError = "That saved generation can’t be reused with the current inputs and settings. Start a new creation instead.";
        }
      } catch {
        initialNavigationError = "That saved generation could not be loaded. Start a new creation instead.";
      }
    }
  } else if (sourceId || requestedAction) {
    if (!sourceId || !requestedAction || !uuidPattern.test(sourceId) || !isContinuationActionId(requestedAction)) {
      initialNavigationError = "That continuation link is invalid. Start a new creation or return to Library.";
    } else if (!account) {
      initialNavigationError = "Sign in from Settings to continue from private RenderLab media.";
    } else if (!isSupabaseConfigured() || !isR2Configured()) {
      initialNavigationError = "That media item cannot be loaded in this environment. Start a new creation or return to Library.";
    } else {
      try {
        const asset = await getMediaAsset(account.id, sourceId);
        const action = asset ? continuationActionForMedia(asset.kind, requestedAction) : null;
        if (!asset) {
          initialNavigationError = "That media item is no longer available. Start a new creation or return to Library.";
        } else if (!action) {
          initialNavigationError = "That action is not available for this media item. Start a new creation or return to Library.";
        } else {
          initialContinuation = { asset: publicMediaAsset(asset), action };
        }
      } catch {
        initialNavigationError = "That media item could not be loaded. Start a new creation or return to Library.";
      }
    }
  }

  return (
    <CreateWorkspace
      accountAvailable={Boolean(account)}
      generationAvailable={isGenerationBackendConfigured()}
      mediaUploadAvailable={isMediaUploadConfigured()}
      initialContinuation={initialContinuation}
      initialRecipe={initialRecipe}
      initialContinuationError={initialNavigationError}
    />
  );
}
