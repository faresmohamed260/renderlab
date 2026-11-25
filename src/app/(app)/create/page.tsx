import { envFlag, envString } from "../../../lib/config/runtime-env.ts";
import { createHash } from "node:crypto";
import { Suspense } from "react";
import { RouteLoading } from "@/components/shell/route-loading";
import { CreatePreviewWorkspace } from "@/features/create/create-preview-workspace";
import { resolveCreateContinuation, type CreateSearchParams } from "@/features/create/create-continuation";
import {
  getCreatePreviewOwner,
  getHostedCreateMedia,
  getHostedCreatePreferences,
  getHostedCreateState,
} from "@/server/hosted-create";
import { isCreatePreview } from "@/server/create-preview-mode";
import type { InitialGenerationRecipe } from "@/lib/api/generation-recipe-contract";
import type { ContinuationAction } from "@/lib/capabilities/generation";
import {
  continuationActionForMedia,
  fiboGenerationModel,
  fiboPreferenceAspectRatio,
  defaultGenerationModelForOutput,
} from "@/lib/capabilities/generation";
import { CreateWorkspace } from "@/features/create/create-workspace";
import { getCurrentRenderLabAccount } from "@/lib/supabase/server";
import {
  getRenderLabAccountPreferences,
  type RenderLabCreatePreferences,
} from "@/server/account/account-preferences";
import { isSupabaseConfigured } from "@/server/data/supabase-rest";
import { loadInitialGenerationRecipe } from "@/server/generation/generation-recipe";
import { isFiboGenerationAvailable, isFiboMaskGenerationAvailable, isGenerationBackendConfigured } from "@/server/generation/submit-generation";
import { getMediaAsset, publicMediaAsset } from "@/server/media/media-assets";
import { isMediaUploadConfigured } from "@/server/media/media-uploads";
import { isR2Configured } from "@/server/storage/r2";
import { scheduleOwnerGenerationSettlement } from "@/server/generation/owner-generation-settlement";
import { readCreateHistoryJobs, readCreateHistoryPrompts, loadCreateHistoryReuse } from "@/server/generation/history/history-actions";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isContinuationActionId(value: string): value is ContinuationAction["id"] {
  return value === "edit-image" || value === "animate-image";
}

function preferenceSeedRecipe(preferences: RenderLabCreatePreferences): InitialGenerationRecipe {
  const kind = preferences.outputKind;
  return {
    jobId: "account-preferences",
    references: [],
    request: {
      model: defaultGenerationModelForOutput(kind),
      prompt: "",
      inputs: [],
      output: kind === "image"
        ? {
            kind,
            aspectRatio: preferences.imageAspectRatio,
          }
        : {
            kind,
            aspectRatio: "16:9",
            resolution: preferences.videoResolution,
            durationSeconds: preferences.videoDurationSeconds,
            audioEnabled: preferences.videoAudioEnabled,
          },
    },
  };
}

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (envString("NODE_ENV") === "production") {
    const params = await searchParams;
    return <ProductionCreatePage params={params} />;
  }
  if (await isCreatePreview()) {
    const hostedOnly = envFlag("RENDERLAB_HOSTED_CREATE");
    const owner = await getCreatePreviewOwner().catch(() => null);
    if (!owner) return CreatePreviewCreate({ owner, hostedOnly });
    return <Suspense fallback={<RouteLoading surface="create" />}><CreatePreviewCreate owner={owner} hostedOnly={hostedOnly} /></Suspense>;
  }

  const params = await searchParams;
  const hosted = await getHostedCreateState();
  const account = hosted ? null : await getCurrentRenderLabAccount();
  if (account && isSupabaseConfigured()) scheduleOwnerGenerationSettlement(account.id);
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

async function CreatePreviewCreate({ owner, hostedOnly }: { owner: Awaited<ReturnType<typeof getCreatePreviewOwner>> | null; hostedOnly: boolean }) {
  const hosted = hostedOnly && owner ? await getHostedCreateState().catch(() => null) : null;
  const hostedReady = !!(hosted?.fiboAvailable && hosted.mediaUploadAvailable && hosted.accountAvailable && owner);
  const accountKey = owner && hostedReady ? createHash("sha256").update("fibo-hosted-stage:" + owner).digest("hex") : undefined;
  const savedEditsAccount = owner && !hostedOnly ? createHash("sha256").update("fibo-preview-edits:" + owner).digest("hex") : undefined;
  return <CreatePreviewWorkspace key={accountKey ?? savedEditsAccount ?? "guest"} hostedModel={hostedReady ? { id: fiboGenerationModel, label: "Bria FIBO 2.0 Edit Turbo" } : undefined} hostedAccountKey={accountKey} savedEditsAccount={savedEditsAccount} admitted={!!owner} hostedOnly={hostedOnly} masksEnabled={hostedOnly ? hostedReady && isFiboMaskGenerationAvailable() : envFlag("RENDERLAB_CREATE_PREVIEW_MASKS")} advancedPrompt={hostedReady || envFlag("RENDERLAB_CREATE_PREVIEW_ADVANCED_PROMPT")} variableSteps={hostedReady || envFlag("RENDERLAB_CREATE_PREVIEW_VARIABLE_STEPS")} extendedSetup={hostedReady || envFlag("RENDERLAB_CREATE_PREVIEW_EXTENDED")} />;
}

const model = { id: fiboGenerationModel, label: "Bria FIBO 2.0 Edit Turbo" };

async function ProductionCreatePage({ params }: { params: CreateSearchParams }) {
  // Resolve the original account gate before any content fallback may stream.
  const account = await getCurrentRenderLabAccount();
  if (!account) return Create({ params, account });
  return <Suspense fallback={<RouteLoading surface="create" />}>
    <Create params={params} account={account} />
  </Suspense>;
}

async function Create({ params, account }: { params: CreateSearchParams; account: Awaited<ReturnType<typeof getCurrentRenderLabAccount>> }) {
  if (account && isSupabaseConfigured()) scheduleOwnerGenerationSettlement(account.id);
  const accountKey = account ? createHash("sha256").update("create-stage:" + account.id).digest("hex") : undefined;
  const ready = !!account && isFiboGenerationAvailable() && isMediaUploadConfigured();
  const useImageDefault = params.recipe === undefined && params.source === undefined && params.action === undefined;
  const continuation = await resolveCreateContinuation(params, account?.id, ready, {
    loadAsset: async (ownerId, assetId) => {
      const asset = await getMediaAsset(ownerId, assetId);
      return asset ? publicMediaAsset(asset) : null;
    },
    loadRecipe: loadInitialGenerationRecipe,
  });
  const continuationKey = useImageDefault ? "" : createHash("sha256").update(JSON.stringify([params.recipe, params.source, params.action])).digest("hex");
  const preferences = ready && useImageDefault
    ? await getRenderLabAccountPreferences(account.id).catch(() => null)
    : null;
  return <CreatePreviewWorkspace key={(accountKey ?? "guest") + ":" + continuationKey} admitted={!!account} hostedOnly
    initialContinuation={continuation.plan} initialContinuationError={continuation.error}
    hostedModel={ready ? model : undefined} hostedAccountKey={accountKey}
    historyActions={{ readJobsAction: readCreateHistoryJobs, readPromptsAction: readCreateHistoryPrompts, reuseAction: loadCreateHistoryReuse }}
    initialAspectRatio={fiboPreferenceAspectRatio(preferences?.create.imageAspectRatio ?? "1:1")}
    masksEnabled={ready && isFiboMaskGenerationAvailable()}
    advancedPrompt={ready} variableSteps={ready} extendedSetup={ready} />;
}
