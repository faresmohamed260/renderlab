"use client";

import Link from "next/link";
import { ChevronDown, ImagePlus, MoreHorizontal, Plus, Sparkles, Volume2, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  advancedDraftFromParameters,
  advancedParametersFromDraft,
  CreateAdvancedPanel,
  createAdvancedDraft,
  type AdvancedDraft,
} from "@/features/create/create-advanced-panel";
import { CreateReferenceMentionMenu } from "@/features/create/create-reference-mention-menu";
import type { PublicMediaAsset } from "@/lib/api/media-assets-contract";
import type { InitialGenerationRecipe } from "@/lib/api/generation-recipe-contract";
import {
  maxMediaUploadBytes,
  supportedMediaUploadMimeTypes,
  type MediaUploadMimeType,
} from "@/lib/api/media-upload-contract";
import { uploadPersistentImageFile } from "@/lib/browser/media-upload-client";
import type {
  AspectRatio,
  ContinuationAction,
  GenerationInputAlias,
  GenerationInputSource,
  GenerationJob,
  ImageGenerationModel,
  OutputKind,
  PresetAspectRatio,
  VideoResolution,
} from "@/lib/capabilities/generation";
import {
  continuationActionsForMedia,
  defaultImageGenerationModel,
  defaultVideoAudioEnabled,
  defaultVideoGenerationModel,
  defaultVideoResolution,
  generationInputAlias,
  generationInputRoleForIndex,
  generationModelDefinitions,
  imageAspectRatios,
  imageGenerationModels,
  isImageGenerationModel,
  maxGenerationInputsForOutput,
  unresolvedGenerationPromptReferenceAliases,
  videoAspectRatios,
  videoDurations,
  videoResolutions,
} from "@/lib/capabilities/generation";
import type { SubmitGenerationResponse } from "@/lib/api/generation-contract";

type InitialContinuation = {
  asset: PublicMediaAsset;
  action: ContinuationAction;
};

type AttachedReference = {
  alias: GenerationInputAlias;
  source: GenerationInputSource;
  previewUrl: string;
  label: string;
};

function nextRecipeReferenceNumber(recipe: InitialGenerationRecipe | null) {
  if (!recipe?.references.length) return 1;
  return Math.max(...recipe.references.map((reference) => Number(reference.alias.slice(5)) || 0)) + 1;
}

function referenceAssetLabel(asset: PublicMediaAsset) {
  if (asset.origin === "uploaded") {
    return asset.displayName || asset.originalFilename || "Uploaded image";
  }
  return "Generated result";
}

const maxPollRetries = 5;
const createMotionTween = { duration: 0.2, ease: "easeOut" } as const;
const createMotionSpring = { type: "spring", stiffness: 420, damping: 38, mass: 0.7 } as const;
const imageModelTriggerLabels: Record<ImageGenerationModel, string> = {
  "flux2-klein-9b": "FLUX",
  "qwen-image-edit-2511": "Qwen",
};

function ImageModelMenu({
  value,
  onValueChange,
}: {
  value: ImageGenerationModel;
  onValueChange: (value: ImageGenerationModel) => void;
}) {
  const selected = generationModelDefinitions[value];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="xs"
          aria-label={`Image model ${selected.label}`}
          className="shrink-0 gap-1 !px-1.5"
        >
          <span>{imageModelTriggerLabels[value]}</span>
          <ChevronDown aria-hidden="true" className="size-3 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-64">
        <DropdownMenuLabel>Image model</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => onValueChange(next as ImageGenerationModel)}
        >
          {imageGenerationModels.map((model) => {
            const definition = generationModelDefinitions[model];
            return (
              <DropdownMenuRadioItem key={model} value={model}>
                <span className="flex min-w-0 flex-1 items-center justify-between gap-4">
                  <span>{definition.label}</span>
                  <span className="text-xs text-text-muted">
                    {definition.version}{model === defaultImageGenerationModel ? " · Default" : ""}
                  </span>
                </span>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AspectRatioMenu({
  value,
  options,
  sourceAware,
  onValueChange,
}: {
  value: AspectRatio;
  options: readonly PresetAspectRatio[];
  sourceAware: boolean;
  onValueChange: (value: AspectRatio) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="xs"
          aria-label={`Aspect ratio ${value === "original" ? "Original" : value}`}
          className="shrink-0 gap-1 !px-1.5"
        >
          {value === "original" ? "Original" : value}
          <ChevronDown aria-hidden="true" className="size-3 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        <DropdownMenuLabel>Aspect ratio</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value} onValueChange={(next) => onValueChange(next as AspectRatio)}>
          {sourceAware ? (
            <DropdownMenuRadioItem value="original">
              <span className="flex min-w-0 flex-1 items-center justify-between gap-4">
                <span>Original</span>
                <span className="text-xs text-text-muted">From source</span>
              </span>
            </DropdownMenuRadioItem>
          ) : null}
          {sourceAware ? <DropdownMenuSeparator /> : null}
          {options.map((option) => (
            <DropdownMenuRadioItem key={option} value={option}>{option}</DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function VideoSettingsMenu({
  resolution,
  durationSeconds,
  audioEnabled,
  onResolutionChange,
  onDurationChange,
  onAudioChange,
}: {
  resolution: VideoResolution;
  durationSeconds: (typeof videoDurations)[number];
  audioEnabled: boolean;
  onResolutionChange: (value: VideoResolution) => void;
  onDurationChange: (value: (typeof videoDurations)[number]) => void;
  onAudioChange: (value: boolean) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="xs"
          aria-label={`Video settings. Resolution ${resolution}. Duration ${durationSeconds} seconds. Audio ${audioEnabled ? "on" : "off"}`}
          className="shrink-0 gap-1 !px-1.5"
        >
          <span>{resolution}·{durationSeconds}s</span>
          <ChevronDown aria-hidden="true" className="size-3 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        collisionPadding={8}
        className="min-w-48 max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto"
      >
        <DropdownMenuLabel>Resolution</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={resolution}
          onValueChange={(next) => onResolutionChange(next as VideoResolution)}
        >
          {videoResolutions.map((option) => (
            <DropdownMenuRadioItem key={option} value={option}>
              {option}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Duration</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={String(durationSeconds)}
          onValueChange={(next) => onDurationChange(Number(next) as (typeof videoDurations)[number])}
        >
          {videoDurations.map((duration) => (
            <DropdownMenuRadioItem key={duration} value={String(duration)}>
              {duration} seconds
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={audioEnabled}
          onCheckedChange={(checked) => onAudioChange(checked === true)}
        >
          <Volume2 aria-hidden="true" />
          Audio
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function pollRetryDelay(attempt: number) {
  return Math.min(2000 * 2 ** Math.max(0, attempt - 1), 15000);
}

function isRetryablePollStatus(status: number) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function isTerminalJob(job: GenerationJob | null) {
  return Boolean(job && ["succeeded", "failed", "cancelled"].includes(job.status));
}

function isFileDrag(event: DragEvent<HTMLElement>) {
  return Array.from(event.dataTransfer.types).includes("Files");
}

export function CreateWorkspace({
  accountAvailable,
  generationAvailable,
  mediaUploadAvailable,
  initialContinuation = null,
  initialRecipe = null,
  initialContinuationError = null,
}: {
  accountAvailable: boolean;
  generationAvailable: boolean;
  mediaUploadAvailable: boolean;
  initialContinuation?: InitialContinuation | null;
  initialRecipe?: InitialGenerationRecipe | null;
  initialContinuationError?: string | null;
}) {
  const reduceMotion = Boolean(useReducedMotion());
  const contextTransition = reduceMotion ? { duration: 0 } : createMotionTween;
  const layoutTransition = reduceMotion ? { duration: 0 } : createMotionSpring;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);
  const promptSelectionRef = useRef({ start: 0, end: 0 });
  const referenceDragDepth = useRef(0);
  const [prompt, setPrompt] = useState(() => initialRecipe?.request.prompt ?? "");
  const [outputKind, setOutputKind] = useState<OutputKind>(() =>
    initialRecipe?.request.output.kind ?? initialContinuation?.action.outputKind ?? "image",
  );
  const [imageModel, setImageModel] = useState<ImageGenerationModel>(() =>
    initialRecipe?.request.output.kind === "image" && isImageGenerationModel(initialRecipe.request.model)
      ? initialRecipe.request.model
      : defaultImageGenerationModel,
  );
  const [imageAspect, setImageAspect] = useState<AspectRatio>(() =>
    initialRecipe?.request.output.kind === "image"
      ? initialRecipe.request.output.aspectRatio
      : initialContinuation ? "original" : "1:1",
  );
  const [videoAspect, setVideoAspect] = useState<AspectRatio>(() =>
    initialRecipe?.request.output.kind === "video"
      ? initialRecipe.request.output.aspectRatio
      : initialContinuation ? "original" : "16:9",
  );
  const [videoResolution, setVideoResolution] = useState<VideoResolution>(() =>
    initialRecipe?.request.output.kind === "video"
      ? initialRecipe.request.output.resolution ?? defaultVideoResolution
      : defaultVideoResolution,
  );
  const [durationSeconds, setDurationSeconds] = useState<(typeof videoDurations)[number]>(() => {
    const value = initialRecipe?.request.output.kind === "video" ? initialRecipe.request.output.durationSeconds : undefined;
    return videoDurations.includes(value as (typeof videoDurations)[number])
      ? value as (typeof videoDurations)[number]
      : 5;
  });
  const [audioEnabled, setAudioEnabled] = useState(() =>
    initialRecipe?.request.output.kind === "video"
      ? initialRecipe.request.output.audioEnabled ?? defaultVideoAudioEnabled
      : defaultVideoAudioEnabled,
  );
  const [references, setReferences] = useState<AttachedReference[]>(() =>
    initialRecipe
      ? initialRecipe.references
      : initialContinuation
        ? [{
            alias: generationInputAlias(1),
            source: { type: "media-asset", id: initialContinuation.asset.id },
            previewUrl: initialContinuation.asset.contentUrl,
            label: referenceAssetLabel(initialContinuation.asset),
          }]
        : [],
  );
  const [nextReferenceNumber, setNextReferenceNumber] = useState(() =>
    initialRecipe ? nextRecipeReferenceNumber(initialRecipe) : initialContinuation ? 2 : 1,
  );
  const [referenceMentionOpen, setReferenceMentionOpen] = useState(false);
  const [mentionMenuAnchorAlias, setMentionMenuAnchorAlias] = useState<GenerationInputAlias | null>(() =>
    initialRecipe?.references[0]?.alias ?? (initialContinuation ? generationInputAlias(1) : null),
  );
  const [mentionRange, setMentionRange] = useState<{ start: number; end: number } | null>(null);
  const [referenceUploadTargetAlias, setReferenceUploadTargetAlias] = useState<GenerationInputAlias | null>(null);
  const [referenceUploading, setReferenceUploading] = useState(false);
  const [referenceDragActive, setReferenceDragActive] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [imageAdvanced, setImageAdvanced] = useState<AdvancedDraft>(() =>
    initialRecipe?.request.output.kind === "image"
      ? advancedDraftFromParameters("image", initialRecipe.request.advanced)
      : createAdvancedDraft("image"),
  );
  const [videoAdvanced, setVideoAdvanced] = useState<AdvancedDraft>(() =>
    initialRecipe?.request.output.kind === "video"
      ? advancedDraftFromParameters("video", initialRecipe.request.advanced)
      : createAdvancedDraft("video"),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(initialContinuationError);
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [resultAsset, setResultAsset] = useState<PublicMediaAsset | null>(null);
  const [resultLoading, setResultLoading] = useState(false);


  useEffect(() => {
    if (!job || isTerminalJob(job)) return;

    let cancelled = false;
    let timeoutId: number | undefined;
    let transientFailures = 0;

    function schedulePoll(delay: number) {
      timeoutId = window.setTimeout(poll, delay);
    }

    function scheduleRetry(message: string) {
      transientFailures += 1;
      if (transientFailures > maxPollRetries) {
        setError(`${message} Tracking paused after repeated connection failures. Your generation may still be running.`);
        return;
      }
      setError(`Connection interrupted while checking generation status. Retrying automatically (${transientFailures}/${maxPollRetries}).`);
      schedulePoll(pollRetryDelay(transientFailures));
    }

    async function poll() {
      try {
        const response = await fetch(`/api/generation/jobs/${encodeURIComponent(job!.id)}`, {
          method: "GET",
          headers: { accept: "application/json" },
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as
          | { ok: true; job: GenerationJob }
          | { ok: false; error?: { message?: string } }
          | null;

        if (cancelled) return;
        if (!response.ok || !payload?.ok) {
          const message =
            payload && !payload.ok && payload.error?.message
              ? payload.error.message
              : "Generation status could not be updated.";
          if (isRetryablePollStatus(response.status)) {
            scheduleRetry(message);
            return;
          }
          setError(`${message} Your work is unchanged.`);
          return;
        }

        transientFailures = 0;
        setError(null);
        setJob(payload.job);
        if (!isTerminalJob(payload.job)) schedulePoll(2000);
      } catch {
        if (!cancelled) scheduleRetry("Generation status could not be updated.");
      }
    }

    schedulePoll(1200);
    return () => {
      cancelled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [job?.id, job?.status]);

  const firstOutputAssetId = job?.status === "succeeded" ? job.outputAssetIds[0] : undefined;

  useEffect(() => {
    if (!firstOutputAssetId) return;

    let cancelled = false;

    async function loadResult() {
      setResultLoading(true);
      try {
        const response = await fetch(`/api/media/assets/${encodeURIComponent(firstOutputAssetId!)}`, {
          method: "GET",
          headers: { accept: "application/json" },
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as
          | { ok: true; asset: PublicMediaAsset }
          | { ok: false; error?: { message?: string } }
          | null;

        if (cancelled) return;
        if (!response.ok || !payload?.ok) {
          setError(
            payload && !payload.ok && payload.error?.message
              ? payload.error.message
              : "The saved result could not be loaded.",
          );
          return;
        }

        setResultAsset(payload.asset);
      } catch {
        if (!cancelled) setError("The result was saved, but its preview could not be loaded.");
      } finally {
        if (!cancelled) setResultLoading(false);
      }
    }

    void loadResult();
    return () => {
      cancelled = true;
    };
  }, [firstOutputAssetId]);

  const aspectRatio = outputKind === "image" ? imageAspect : videoAspect;
  const advancedDraft = outputKind === "image" ? imageAdvanced : videoAdvanced;
  const setAdvancedDraft = outputKind === "image" ? setImageAdvanced : setVideoAdvanced;
  const hasReference = references.length > 0;
  const maxReferences = maxGenerationInputsForOutput(outputKind);
  const referenceDropAvailable =
    accountAvailable
    && mediaUploadAvailable
    && !referenceUploading
    && references.length < maxReferences;

  const heading = outputKind === "image" ? "Create an image" : "Create a video";
  const supportingText = outputKind === "image"
    ? hasReference
      ? references.length > 1
        ? "Shape the result with a primary image and one supporting reference."
        : "Shape the result from your primary image, then describe the change you want."
      : "Describe what you want. Add references if you have them, then generate."
    : hasReference
      ? "Use the Start image as the first frame, then describe the motion or shot you want."
      : "Describe the motion or shot you want. Add a Start image only when it helps.";
  const createContextKey = `${outputKind}:${hasReference ? references.length : 0}`;

  const unresolvedReferenceAliases = useMemo(
    () => unresolvedGenerationPromptReferenceAliases(
      prompt,
      references.map((reference) => reference.alias),
    ),
    [prompt, references],
  );
  const mentionOptions = useMemo(
    () => references.map((reference) => ({
      alias: reference.alias,
      previewUrl: reference.previewUrl,
      label: reference.label,
    })),
    [references],
  );
  const jobActive = Boolean(job && !isTerminalJob(job));
  const canSubmit =
    accountAvailable
    && generationAvailable
    && Boolean(prompt.trim())
    && unresolvedReferenceAliases.length === 0
    && !submitting
    && !referenceUploading
    && !jobActive;
  const continuationActions = resultAsset ? continuationActionsForMedia(resultAsset.kind) : [];

  const statusText = useMemo(() => {
    if (!job) return null;
    if (job.status === "queued") return "Waiting for generation capacity.";
    if (job.status === "preparing") return "Preparing generation.";
    if (job.status === "running") return "Generating.";
    if (job.status === "persisting") return "Saving result.";
    if (job.status === "succeeded") return "Result saved.";
    if (job.status === "cancelled") return "Generation cancelled.";
    return job.error?.message ?? "Generation failed.";
  }, [job]);

  function rememberPromptSelection(target: HTMLTextAreaElement) {
    promptSelectionRef.current = {
      start: target.selectionStart ?? prompt.length,
      end: target.selectionEnd ?? target.selectionStart ?? prompt.length,
    };
  }

  function handlePromptChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const nextPrompt = event.currentTarget.value;
    const start = event.currentTarget.selectionStart ?? nextPrompt.length;
    const end = event.currentTarget.selectionEnd ?? start;
    promptSelectionRef.current = { start, end };
    setPrompt(nextPrompt);
    setError(null);

    const beforeCaret = nextPrompt.slice(0, start);
    const match = beforeCaret.match(/(?:^|\s)(@[A-Za-z0-9]*)$/);
    if (references.length && match) {
      setMentionMenuAnchorAlias(references[0].alias);
      setMentionRange({ start: start - match[1].length, end: start });
      setReferenceMentionOpen(true);
      return;
    }

    setMentionRange(null);
    setReferenceMentionOpen(false);
  }

  function insertReferenceMention(alias: GenerationInputAlias) {
    const range = mentionRange ?? promptSelectionRef.current;
    const before = prompt.slice(0, range.start);
    const after = prompt.slice(range.end);
    const leadingSpace = before && !/\s$/.test(before) ? " " : "";
    const trailingSpace = after && /^\s/.test(after) ? "" : " ";
    const mention = `@${alias}`;
    const insertion = `${leadingSpace}${mention}${trailingSpace}`;
    const nextPrompt = `${before}${insertion}${after}`;
    const cursor = before.length + insertion.length;

    setPrompt(nextPrompt);
    setReferenceMentionOpen(false);
    setMentionMenuAnchorAlias(alias);
    setMentionRange(null);
    setError(null);
    promptSelectionRef.current = { start: cursor, end: cursor };
    window.requestAnimationFrame(() => {
      promptInputRef.current?.focus();
      promptInputRef.current?.setSelectionRange(cursor, cursor);
    });
  }

  function removeReference(alias: GenerationInputAlias) {
    setReferences((current) => {
      const next = current.filter((reference) => reference.alias !== alias);
      if (!next.length) {
        setImageAspect((value) => value === "original" ? "1:1" : value);
        setVideoAspect((value) => value === "original" ? "16:9" : value);
      }
      return next;
    });
    if (mentionMenuAnchorAlias === alias) {
      setReferenceMentionOpen(false);
      setMentionMenuAnchorAlias(null);
      setMentionRange(null);
    }
    setError(null);
  }

  function makeReferencePrimary(alias: GenerationInputAlias) {
    if (outputKind !== "image") return;
    setReferences((current) => {
      const index = current.findIndex((reference) => reference.alias === alias);
      if (index <= 0) return current;
      const next = [...current];
      [next[0], next[index]] = [next[index], next[0]];
      return next;
    });
    setError(null);
  }

  function chooseReferenceFile(targetAlias: GenerationInputAlias | null) {
    setReferenceUploadTargetAlias(targetAlias);
    if (fileInputRef.current) fileInputRef.current.value = "";
    fileInputRef.current?.click();
  }

  function resetReferenceDragState() {
    referenceDragDepth.current = 0;
    setReferenceDragActive(false);
  }

  function handleReferenceDragEnter(event: DragEvent<HTMLFormElement>) {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    referenceDragDepth.current += 1;
    if (!referenceDropAvailable) return;
    setError(null);
    setReferenceDragActive(true);
  }

  function handleReferenceDragOver(event: DragEvent<HTMLFormElement>) {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = referenceDropAvailable ? "copy" : "none";
  }

  function handleReferenceDragLeave(event: DragEvent<HTMLFormElement>) {
    if (!isFileDrag(event) || referenceDragDepth.current === 0) return;
    event.preventDefault();
    referenceDragDepth.current = Math.max(0, referenceDragDepth.current - 1);
    if (referenceDragDepth.current === 0) setReferenceDragActive(false);
  }

  async function handleReferenceDrop(event: DragEvent<HTMLFormElement>) {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    resetReferenceDragState();
    if (referenceUploading) return;
    if (!accountAvailable) {
      setError("Sign in to add a private reference image.");
      return;
    }
    if (!mediaUploadAvailable) {
      setError("Reference upload storage is not configured in this environment.");
      return;
    }

    const files = Array.from(event.dataTransfer.files);
    if (files.length !== 1) {
      setError("Drop one image at a time.");
      return;
    }
    await uploadReference(files[0]!, null);
  }

  function startContinuation(action: ContinuationAction) {
    if (!resultAsset) return;
    const nextAlias = generationInputAlias(nextReferenceNumber);
    setReferences([{
      alias: nextAlias,
      source: { type: "media-asset", id: resultAsset.id },
      previewUrl: resultAsset.contentUrl,
      label: referenceAssetLabel(resultAsset),
    }]);
    setMentionMenuAnchorAlias(nextAlias);
    setNextReferenceNumber((current) => current + 1);
    setImageAspect("original");
    setVideoAspect("original");
    setOutputKind(action.outputKind);
    setJob(null);
    setError(null);
    window.requestAnimationFrame(() => document.getElementById("create-prompt")?.focus());
  }

  function resetAdvanced() {
    const next = createAdvancedDraft(outputKind);
    if (outputKind === "image") setImageAdvanced(next);
    else setVideoAdvanced(next);
    setError(null);
  }

  async function uploadReference(file: File, targetAlias: GenerationInputAlias | null) {
    if (!accountAvailable || !mediaUploadAvailable) return;

    const mimeType = file.type.toLowerCase();
    if (!(supportedMediaUploadMimeTypes as readonly string[]).includes(mimeType)) {
      setError("References must be PNG, JPEG, or WebP images.");
      return;
    }
    if (file.size < 1 || file.size > maxMediaUploadBytes) {
      setError("Reference images must be no larger than 25 MB.");
      return;
    }
    if (!targetAlias && references.length >= maxGenerationInputsForOutput(outputKind)) {
      setError(outputKind === "image" ? "Image supports up to two references." : "Video supports one source image.");
      return;
    }

    setReferenceUploading(true);
    setError(null);
    const uploadAlias = targetAlias ?? generationInputAlias(nextReferenceNumber);

    try {
      const asset = await uploadPersistentImageFile(file, mimeType as MediaUploadMimeType);
      const attached: AttachedReference = {
        alias: uploadAlias,
        source: { type: "media-asset", id: asset.id },
        previewUrl: asset.contentUrl,
        label: referenceAssetLabel(asset),
      };
      if (targetAlias) {
        setReferences((current) => current.map((reference) => reference.alias === targetAlias ? attached : reference));
      } else {
        setReferences((current) => [...current, attached]);
        setMentionMenuAnchorAlias((current) => current ?? uploadAlias);
        setNextReferenceNumber((current) => current + 1);
      }
      if (!targetAlias && references.length === 0) {
        setImageAspect("original");
        setVideoAspect("original");
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Reference upload failed.");
    } finally {
      setReferenceUploading(false);
      setReferenceUploadTargetAlias(null);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    const advanced = advancedParametersFromDraft(advancedDraft, outputKind, imageModel);
    if (!advanced) {
      setAdvancedOpen(true);
      setError(
        outputKind === "video"
          ? "Check the Advanced values before generating. Seed must be an integer."
          : "Check the Advanced values before generating. Seed must be an integer, steps must be 1–200, and guidance must be 0–100.",
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    setJob(null);
    setResultAsset(null);
    setResultLoading(false);

    const inputs = references.map((reference, index) => ({
      alias: reference.alias,
      source: reference.source,
      role: generationInputRoleForIndex(outputKind, index)!,
    }));

    try {
      const response = await fetch("/api/generation/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: outputKind === "image" ? imageModel : defaultVideoGenerationModel,
          prompt,
          output: {
            kind: outputKind,
            aspectRatio,
            ...(outputKind === "video" ? { resolution: videoResolution, durationSeconds, audioEnabled } : {}),
          },
          inputs,
          advanced,
        }),
      });

      const payload = (await response.json()) as SubmitGenerationResponse;
      if (!response.ok || !payload.ok) {
        setError(payload.ok ? "Generation could not be submitted." : payload.error.message);
        return;
      }

      setJob(payload.job);
    } catch {
      setError("Generation could not be submitted. Your prompt, reference, and settings are unchanged.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      className="clear-create-workspace mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-7xl flex-col px-4 pb-24 pt-10 sm:px-8 sm:pt-16 lg:pb-16 lg:pt-24"
      data-create-has-stage={jobActive || resultLoading || Boolean(resultAsset) ? "true" : "false"}
    >
      <div className="clear-create-stack mx-auto w-full max-w-6xl">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={createContextKey}
            data-create-motion="context"
            className="clear-create-context mb-8 sm:mb-10"
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
            transition={contextTransition}
          >
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-bright/80">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-accent-bright shadow-[0_0_14px_rgba(178,167,255,0.8)]" />
              <span>{outputKind === "image" ? "Create / Image" : "Create / Video"}</span>
            </div>
            <h2 className="min-h-[3.25rem] text-[38px] font-semibold tracking-[-0.05em] text-text sm:text-[48px] lg:text-[56px]">
              {heading}
            </h2>
            <p className="mt-2 max-w-2xl text-[15px] leading-6 text-text-muted">{supportingText}</p>
          </motion.div>
        </AnimatePresence>

        <form
          onSubmit={submit}
          noValidate
          className="clear-create-composer kinetic-composer relative isolate overflow-hidden rounded-[22px] border p-3 sm:p-4"
          data-create-instrument="true"
          data-create-layout="clear-composer"
          data-create-mode={outputKind}
          data-create-drop-active={referenceDragActive ? "true" : "false"}
          onDragEnter={handleReferenceDragEnter}
          onDragOver={handleReferenceDragOver}
          onDragLeave={handleReferenceDragLeave}
          onDrop={(event) => void handleReferenceDrop(event)}
        >
          <Label htmlFor="create-prompt" className="sr-only">Prompt</Label>
          {referenceDragActive ? (
            <div
              className="pointer-events-none absolute inset-0 !z-30 flex items-center justify-center bg-canvas/90 px-6 text-center backdrop-blur-sm"
              data-create-drop-overlay="true"
              role="status"
            >
              <div className="flex items-start gap-3" data-create-drop-content="true">
                <ImagePlus
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-accent-bright"
                  data-create-drop-icon="true"
                />
                <div className="flex flex-col items-start gap-0.5 text-left" data-create-drop-copy="true">
                  <span className="text-sm font-semibold leading-5 text-text" data-create-drop-title="true">
                    Drop image to add as reference
                  </span>
                  <span className="text-xs leading-4 text-text-muted" data-create-drop-detail="true">
                    PNG, JPEG or WebP · up to 25 MB
                  </span>
                </div>
              </div>
            </div>
          ) : null}
          <div className="clear-composer-mode" data-create-mode-switch="true">
            <ToggleGroup
              type="single"
              value={outputKind}
              aria-label="Output type"
              onValueChange={(value) => {
                if (!value) return;
                const kind = value as OutputKind;
                if (references.length > maxGenerationInputsForOutput(kind)) {
                  setError("Video uses one source image. Remove one reference before switching to Video.");
                  return;
                }
                setOutputKind(kind);
                setError(null);
              }}
              size="sm"
              className="relative isolate shrink-0 overflow-hidden rounded-lg border border-white/[0.06] bg-black/20 p-0.5"
            >
              <ToggleGroupItem value="image" className="relative isolate overflow-hidden !px-1 data-[state=on]:bg-transparent data-[state=on]:text-text">
                {outputKind === "image" ? (
                  <motion.span
                    layoutId="create-output-mode-highlight"
                    aria-hidden="true"
                    className="absolute inset-0 z-0 rounded-[7px] bg-[linear-gradient(135deg,rgba(129,114,246,0.32),rgba(115,215,255,0.12))] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_18px_rgba(129,114,246,0.14)]"
                    transition={reduceMotion ? { duration: 0 } : createMotionSpring}
                  />
                ) : null}
                <span className="relative z-10">Image</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="video" className="relative isolate overflow-hidden !px-1 data-[state=on]:bg-transparent data-[state=on]:text-text">
                {outputKind === "video" ? (
                  <motion.span
                    layoutId="create-output-mode-highlight"
                    aria-hidden="true"
                    className="absolute inset-0 z-0 rounded-[7px] bg-[linear-gradient(135deg,rgba(115,215,255,0.2),rgba(129,114,246,0.28))] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_18px_rgba(115,215,255,0.12)]"
                    transition={reduceMotion ? { duration: 0 } : createMotionSpring}
                  />
                ) : null}
                <span className="relative z-10">Video</span>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="clear-composer-reference-bar" data-create-reference-bar="true">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="clear-composer-reference-trigger"
              disabled={
                !accountAvailable
                || !mediaUploadAvailable
                || referenceUploading
                || (references.length >= maxReferences && !(outputKind === "video" && references.length === 1))
              }
              onClick={() => chooseReferenceFile(outputKind === "video" && references[0] ? references[0].alias : null)}
              aria-label={outputKind === "video" ? (references.length ? "Replace Start image" : "Start image") : "Add reference"}
              title={
                !accountAvailable
                  ? "Sign in to add a private reference image."
                  : !mediaUploadAvailable
                    ? "Reference upload storage is not configured in this environment."
                    : outputKind === "video" && references.length
                      ? "Replace the Start image"
                      : references.length >= maxReferences
                        ? "Image supports up to two references."
                        : outputKind === "video"
                          ? "Add an optional Start image"
                          : "Add a reference image"
              }
            >
              {referenceUploading ? <Spinner data-icon="inline-start" /> : <Plus aria-hidden="true" data-icon="inline-start" />}
              <span>{outputKind === "video" ? (references.length ? "Replace Start image" : "Start image") : "Add reference"}</span>
            </Button>
            <span className="clear-composer-reference-help">
              {outputKind === "image" ? "Optional · up to two images" : "Optional · one image"}
            </span>
          </div>

          <Textarea
            ref={promptInputRef}
            id="create-prompt"
            variant="bare"
            value={prompt}
            onChange={handlePromptChange}
            onSelect={(event) => rememberPromptSelection(event.currentTarget)}
            placeholder={
              hasReference
                ? "Describe the change or result you want…"
                : outputKind === "image"
                  ? "Describe what you want to create…"
                  : "Describe the video you want to create…"
            }
            className="clear-composer-prompt min-h-36 px-2 py-2 text-[17px] leading-7 placeholder:text-text-muted/55 sm:min-h-32 sm:text-[18px]"
          />

          {references.length ? (
            <div className="clear-composer-reference-list mb-3 space-y-2" data-create-reference-list="true" aria-label="Attached references">
              <AnimatePresence initial={false} mode="popLayout">
                {references.map((reference, index) => (
                  <motion.div
                    key={reference.alias}
                    layout="position"
                    data-create-motion="reference-row"
                    data-reference-alias={reference.alias}
                    className="kinetic-reference flex flex-wrap items-center gap-2 rounded-xl border p-2 sm:flex-nowrap sm:gap-3"
                    initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.985 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -6, scale: 0.985 }}
                    transition={layoutTransition}
                  >
                  <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-surface-3">
                    <img
                      src={reference.previewUrl}
                      alt={references.length === 1 ? "Reference preview" : `Reference @${reference.alias} preview`}
                      className="size-full object-cover"
                    />
                  </div>
                  <div className="min-w-32 flex-1 sm:min-w-0">
                    <p className="truncate text-sm font-semibold text-text">
                      {outputKind === "video"
                        ? "Start image"
                        : index === 0
                          ? "Primary image"
                          : "Reference image"}
                    </p>
                    <p className="truncate text-xs text-text-muted">{reference.label}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1 sm:contents">
                    <CreateReferenceMentionMenu
                      triggerAlias={reference.alias}
                    references={mentionOptions}
                    open={referenceMentionOpen && mentionMenuAnchorAlias === reference.alias}
                    onOpenChange={(open) => {
                      setReferenceMentionOpen(open);
                      if (open) setMentionMenuAnchorAlias(reference.alias);
                      else if (mentionMenuAnchorAlias === reference.alias) setMentionRange(null);
                    }}
                    onSelect={insertReferenceMention}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={referenceUploading}
                        aria-label={`Reference actions for @${reference.alias}`}
                      >
                        <MoreHorizontal aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {outputKind === "image" && index > 0 ? (
                        <DropdownMenuItem onSelect={() => makeReferencePrimary(reference.alias)}>
                          Make primary
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem onSelect={() => chooseReferenceFile(reference.alias)}>
                        Replace image
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeReference(reference.alias)}
                      disabled={referenceUploading}
                      aria-label={`Remove @${reference.alias}`}
                    >
                      <X aria-hidden="true" />
                    </Button>
                  </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : null}

          <Collapsible className="clear-composer-controls" open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <div className="kinetic-control-deck mt-3 flex flex-col gap-2 rounded-2xl border px-1 py-1.5 sm:flex-row sm:items-center sm:p-1.5">
              <div data-create-primary-controls className="clear-composer-settings flex min-w-0 flex-1 flex-wrap items-center gap-2 pb-1 sm:pb-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  aria-label="Reference image file"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadReference(file, referenceUploadTargetAlias);
                  }}
                />



                <AnimatePresence initial={false} mode="wait">
                  {outputKind === "image" ? (
                    <motion.div
                      key="image-model"
                      data-create-motion="mode-control"
                      className="shrink-0"
                      initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96 }}
                      transition={contextTransition}
                    >
                      <ImageModelMenu value={imageModel} onValueChange={setImageModel} />
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <AspectRatioMenu
                  value={aspectRatio}
                  options={outputKind === "image" ? imageAspectRatios : videoAspectRatios}
                  sourceAware={hasReference}
                  onValueChange={(value) => {
                    if (outputKind === "image") setImageAspect(value);
                    else setVideoAspect(value);
                    setError(null);
                  }}
                />

                <AnimatePresence initial={false} mode="wait">
                  {outputKind === "video" ? (
                    <motion.div
                      key="video-settings"
                      data-create-motion="mode-control"
                      className="shrink-0"
                      initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96 }}
                      transition={contextTransition}
                    >
                      <VideoSettingsMenu
                        resolution={videoResolution}
                        durationSeconds={durationSeconds}
                        audioEnabled={audioEnabled}
                        onResolutionChange={(value) => {
                          setVideoResolution(value);
                          setError(null);
                        }}
                        onDurationChange={(value) => {
                          setDurationSeconds(value);
                          setError(null);
                        }}
                        onAudioChange={(value) => {
                          setAudioEnabled(value);
                          setError(null);
                        }}
                      />
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    size="xs"
                    aria-pressed={advancedOpen}
                    aria-label={advancedOpen ? "Close Advanced controls" : "Open Advanced controls"}
                    title="Advanced generation controls"
                    className={`clear-composer-advanced-trigger min-h-10 gap-2 px-3${advancedOpen ? " bg-surface-3" : ""}`}
                  >
                    <span>Advanced</span>
                    <MoreHorizontal aria-hidden="true" className="size-4" />
                  </Button>
                </CollapsibleTrigger>
              </div>

              <motion.div
                className="w-full sm:w-auto"
                whileHover={!reduceMotion && canSubmit ? { scale: 1.012, y: -1 } : undefined}
                whileTap={!reduceMotion && canSubmit ? { scale: 0.985 } : undefined}
                transition={createMotionSpring}
              >
                <Button
                  type="submit"
                  size="lg"
                  disabled={!canSubmit}
                  className="kinetic-generate relative w-full overflow-hidden sm:min-w-32 sm:w-auto"
                  data-active={submitting || jobActive ? "true" : "false"}
                >
                  {submitting || jobActive ? <Spinner data-icon="inline-start" /> : <Sparkles aria-hidden="true" data-icon="inline-start" />}
                  {submitting ? "Submitting" : jobActive ? "Generating" : "Generate"}
                </Button>
              </motion.div>
            </div>

            <CreateAdvancedPanel
              outputKind={outputKind}
              imageModel={imageModel}
              draft={advancedDraft}
              onDraftChange={setAdvancedDraft}
              onReset={resetAdvanced}
            />
          </Collapsible>
        </form>

        {unresolvedReferenceAliases.length ? (
          <Alert className="mt-3" variant="destructive" role="alert">
            <AlertDescription>
              {unresolvedReferenceAliases.map((alias) => `@${alias}`).join(", ")} no longer has an attached image. Remove the unresolved reference from the prompt before generating.
            </AlertDescription>
          </Alert>
        ) : null}

        {!accountAvailable ? (
          <Alert className="mt-3" role="status">
            <AlertDescription className="flex flex-col gap-3 text-text-muted sm:flex-row sm:items-center sm:justify-between">
              <span>Sign in to generate, upload references, and save private media to your Library.</span>
              <Button asChild variant="secondary" size="sm" className="self-start sm:self-auto">
                <Link href="/settings">Open Settings</Link>
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {!generationAvailable || !mediaUploadAvailable ? (
          <Alert className="mt-3" role="status">
            <AlertDescription className="space-y-1 text-text-muted">
              {!generationAvailable ? <p>Generation is not connected in this environment yet.</p> : null}
              {!mediaUploadAvailable ? <p>Image uploads are not connected in this environment yet.</p> : null}
            </AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert className="mt-4" variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {statusText && (jobActive || job?.status === "failed" || job?.status === "cancelled") ? (
          <Alert
            className="clear-create-stage kinetic-lifecycle relative mt-6 overflow-hidden"
            role="status"
            data-create-lifecycle-state={job?.status}
            data-active={jobActive ? "true" : "false"}
          >
            <AlertDescription className="clear-create-stage-content relative z-10 flex items-center gap-3">
              <span aria-hidden="true" className="kinetic-lifecycle-orb shrink-0" />
              <span className="clear-create-stage-copy">
                <span aria-hidden="true" className="clear-create-stage-kicker">RENDERLAB / GENERATION</span>
                <strong>{statusText}</strong>
                {jobActive ? <small>Your prompt, references, and settings stay attached below.</small> : null}
              </span>
            </AlertDescription>
          </Alert>
        ) : null}

        <AnimatePresence initial={false} mode="wait">
          {resultLoading ? (
            <motion.div
              key="result-loading"
              data-create-motion="result"
              className="clear-create-result-loading kinetic-result mt-6 flex min-h-64 items-center justify-center rounded-[18px] border text-sm text-text-muted"
              role="status"
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
              transition={contextTransition}
            >
              <Spinner className="mr-2 size-5" />
              Loading saved result…
            </motion.div>
          ) : resultAsset ? (
            <motion.article
              key={resultAsset.id}
              data-create-motion="result"
              className="clear-create-result kinetic-result mt-6 overflow-hidden border"
              data-create-result-kind={resultAsset.kind}
              aria-label="Generated result"
              initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={contextTransition}
            >
              <div className="clear-create-result-info flex flex-col gap-3 border border-border px-4 py-4" data-create-result-info="true">
                <div>
                  <p className="text-sm font-semibold text-text">Generated result</p>
                  <p className="text-xs text-text-muted">Saved to your RenderLab media library.</p>
                </div>
                {continuationActions.length ? (
                  <div className="clear-create-result-actions flex items-center gap-2" aria-label="Continue from result">
                    {continuationActions.map((action) => (
                      <Button
                        key={action.id}
                        type="button"
                        variant="secondary"
                        onClick={() => startContinuation(action)}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="clear-create-result-media bg-surface-2" data-create-result-media={resultAsset.kind}>
                {resultAsset.kind === "image" ? (
                  <img src={resultAsset.contentUrl} alt="Generated result" className="clear-create-result-asset max-h-[70vh] w-full object-contain" />
                ) : (
                  <video
                    src={resultAsset.contentUrl}
                    controls
                    playsInline
                    className="clear-create-result-asset max-h-[70vh] w-full"
                    aria-label="Generated video"
                  />
                )}
              </div>
            </motion.article>
          ) : null}
        </AnimatePresence>
      </div>
    </section>
  );
}
