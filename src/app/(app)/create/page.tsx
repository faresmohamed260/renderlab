import { createHash } from "node:crypto";
import { Suspense } from "react";
import { FiboPreviewWorkspace } from "@/features/create/fibo-preview-workspace";
import {
  getFiboPreviewOwner,
  getHostedCreateMedia,
  getHostedCreatePreferences,
  getHostedCreateState,
} from "@/server/hosted-create";
import { isFiboPreview } from "@/server/fibo-preview-mode";
import type { InitialGenerationRecipe } from "@/lib/api/generation-recipe-contract";
import type { ContinuationAction } from "@/lib/capabilities/generation";
import {
  continuationActionForMedia,
  defaultGenerationModelForOutput,
  fiboPreferenceAspectRatio,
} from "@/lib/capabilities/generation";
import { CreateWorkspace } from "@/features/create/create-workspace";
import { getCurrentRenderLabAccount } from "@/lib/supabase/server";
import {
  getRenderLabAccountPreferences,
  type RenderLabCreatePreferences,
} from "@/server/account/account-preferences";
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

function preferenceSeedRecipe(preferences: RenderLabCreatePreferences): InitialGenerationRecipe {
  // Retired Video defaults remain readable in account history but must not
  // resurrect a non-FIBO Create mode or create an unsubmit-able Image ratio.
  const ratio = fiboPreferenceAspectRatio(preferences.imageAspectRatio);
  return {
    jobId: "account-preferences",
    references: [],
    request: {
      model: defaultGenerationModelForOutput("image"),
      prompt: "",
      inputs: [],
      output: { kind: "image", aspectRatio: ratio },
    },
  };
}

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (await isFiboPreview()) return <Suspense fallback={<p className="fibo-preview-create-loading" role="status">Loading Create…</p>}><FiboPreviewCreate /></Suspense>;

  const params = await searchParams;
  const hosted = await getHostedCreateState();
  const account = hosted ? null : await getCurrentRenderLabAccount();
  const accountAvailable = hosted?.accountAvailable ?? Boolean(account);
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
    } else if (!accountAvailable) {
      initialNavigationError = "Sign in from Settings to reuse private RenderLab generation settings.";
    } else if (hosted) {
      initialNavigationError = "Saved recipes can be reopened on the hosted RenderLab site.";
    } else if (!account || !isSupabaseConfigured() || !isR2Configured()) {
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
    } else if (!accountAvailable) {
      initialNavigationError = "Sign in from Settings to continue from private RenderLab media.";
    } else if (!hosted && (!account || !isSupabaseConfigured() || !isR2Configured())) {
      initialNavigationError = "That media item cannot be loaded in this environment. Start a new creation or return to Library.";
    } else {
      try {
        const ownedAsset = account ? await getMediaAsset(account.id, sourceId) : null;
        const asset = hosted ? await getHostedCreateMedia(sourceId) : ownedAsset && publicMediaAsset(ownedAsset);
        const action = asset ? continuationActionForMedia(asset.kind, requestedAction) : null;
        if (!asset) {
          initialNavigationError = "That media item is no longer available. Start a new creation or return to Library.";
        } else if (!action) {
          initialNavigationError = "That action is not available for this media item. Start a new creation or return to Library.";
        } else {
          initialContinuation = { asset, action };
        }
      } catch {
        initialNavigationError = "That media item could not be loaded. Start a new creation or return to Library.";
      }
    }
  }

  let initialPreferenceRecipe: InitialGenerationRecipe | null = null;
  if (accountAvailable && !recipeId && !sourceId && !requestedAction) {
    try {
      const preferences = hosted ? await getHostedCreatePreferences()
        : account ? (await getRenderLabAccountPreferences(account.id)).create : null;
      initialPreferenceRecipe = preferences ? preferenceSeedRecipe(preferences) : null;
    } catch {
      initialPreferenceRecipe = null;
    }
  }

  return (
    <CreateWorkspace
      accountAvailable={accountAvailable}
      generationAvailable={hosted?.generationAvailable ?? isGenerationBackendConfigured()}
      mediaUploadAvailable={hosted?.mediaUploadAvailable ?? isMediaUploadConfigured()}
      initialContinuation={initialContinuation}
      initialRecipe={initialRecipe ?? initialPreferenceRecipe}
      initialContinuationError={initialNavigationError}
    />
  );
}

async function FiboPreviewCreate() {
  const hostedOnly = process.env.RENDERLAB_HOSTED_CREATE === "1";
  const owner = await getFiboPreviewOwner().catch(() => null);
  const hosted = hostedOnly && owner ? await getHostedCreateState().catch(() => null) : null;
  const hostedFibo = !!(hosted?.fiboAvailable && hosted.mediaUploadAvailable && hosted.accountAvailable && owner);
  const accountKey = owner && hostedFibo ? createHash("sha256").update("fibo-hosted-stage:" + owner).digest("hex") : undefined;
  const savedEditsAccount = owner && !hostedOnly ? createHash("sha256").update("fibo-preview-edits:" + owner).digest("hex") : undefined;
  return <FiboPreviewWorkspace key={accountKey ?? savedEditsAccount ?? "guest"} hostedFibo={hostedFibo} hostedAccountKey={accountKey} savedEditsAccount={savedEditsAccount} admitted={!!owner} hostedOnly={hostedOnly} masksEnabled={!hostedOnly && process.env.RENDERLAB_FIBO_PREVIEW_MASKS === "1"} advancedPrompt={hostedFibo || process.env.RENDERLAB_FIBO_PREVIEW_ADVANCED_PROMPT === "1"} variableSteps={hostedFibo || process.env.RENDERLAB_FIBO_PREVIEW_VARIABLE_STEPS === "1"} extendedSetup={hostedFibo || process.env.RENDERLAB_FIBO_PREVIEW_EXTENDED === "1"} />;
}
