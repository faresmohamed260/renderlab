"use client";

import Link from "next/link";
import { ChevronDown, MoreHorizontal, Plus, Volume2, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
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
  OutputKind,
  PresetAspectRatio,
  VideoResolution,
} from "@/lib/capabilities/generation";
import {
  continuationActionsForMedia,
  defaultVideoAudioEnabled,
  defaultVideoResolution,
  generationInputAlias,
  generationInputRoleForIndex,
  imageAspectRatios,
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
          aria-label={`Aspect ratio ${value === "original" ? "Original" : value}`}
          className="shrink-0 gap-1.5"
        >
          {value === "original" ? "Original" : value}
          <ChevronDown aria-hidden="true" className="size-3.5 opacity-70" />
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
  advancedOpen,
  onResolutionChange,
  onDurationChange,
  onAudioChange,
  onAdvancedToggle,
}: {
  resolution: VideoResolution;
  durationSeconds: (typeof videoDurations)[number];
  audioEnabled: boolean;
  advancedOpen: boolean;
  onResolutionChange: (value: VideoResolution) => void;
  onDurationChange: (value: (typeof videoDurations)[number]) => void;
  onAudioChange: (value: boolean) => void;
  onAdvancedToggle: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          aria-label={`Video settings. Resolution ${resolution}. Duration ${durationSeconds} seconds. Audio ${audioEnabled ? "on" : "off"}`}
          className="shrink-0 gap-1.5"
        >
          <span>{resolution} · {durationSeconds} s</span>
          <ChevronDown aria-hidden="true" className="size-3.5 opacity-70" />
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
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onAdvancedToggle}>
          <MoreHorizontal aria-hidden="true" />
          {advancedOpen ? "Hide Advanced controls" : "Advanced controls"}
        </DropdownMenuItem>
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
  const [prompt, setPrompt] = useState(() => initialRecipe?.request.prompt ?? "");
  const [outputKind, setOutputKind] = useState<OutputKind>(() =>
    initialRecipe?.request.output.kind ?? initialContinuation?.action.outputKind ?? "image",
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
  const heading = hasReference
    ? outputKind === "image"
      ? "Edit an image"
      : "Animate an image"
    : outputKind === "image"
      ? "What do you want to create?"
      : "Create a video";
  const supportingText = hasReference
    ? references.length > 1
      ? "Your references set the creative context. The first image controls the primary edit geometry."
      : "Your reference sets the creative context automatically."
    : outputKind === "image"
      ? "Start with an idea. Add a reference only when you need one."
      : "Only the essentials stay visible. More control is available when you ask for it.";
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
    const advanced = advancedParametersFromDraft(advancedDraft, outputKind);
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
    <section className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-5xl flex-col px-4 pb-24 pt-12 sm:px-8 sm:pt-20 lg:pb-12 lg:pt-36">
      <div className="mx-auto w-full max-w-3xl">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={createContextKey}
            data-create-motion="context"
            className="mb-12 sm:mb-24"
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
            transition={contextTransition}
          >
            <h2 className="text-[28px] font-semibold tracking-[-0.02em] text-text sm:text-[30px]">{heading}</h2>
            <p className="mt-1 text-[15px] text-text-muted">{supportingText}</p>
          </motion.div>
        </AnimatePresence>

        <form onSubmit={submit} noValidate className="rounded-xl border border-border bg-surface-1 p-3 sm:p-4">
          <Label htmlFor="create-prompt" className="sr-only">Prompt</Label>
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
            className="min-h-32 px-1 py-1 text-[16px] leading-6 sm:min-h-28"
          />

          {references.length ? (
            <div className="mb-3 space-y-2" aria-label="Attached references">
              <AnimatePresence initial={false} mode="popLayout">
                {references.map((reference, index) => (
                  <motion.div
                    key={reference.alias}
                    layout="position"
                    data-create-motion="reference-row"
                    data-reference-alias={reference.alias}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-2 p-2 sm:flex-nowrap sm:gap-3"
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
                        ? "Animating this image"
                        : references.length === 1
                          ? "Editing this image"
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

          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 pb-1 sm:flex-nowrap sm:overflow-visible sm:pb-0">
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
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  disabled={
                    !accountAvailable
                    || !mediaUploadAvailable
                    || referenceUploading
                    || references.length >= maxReferences
                  }
                  onClick={() => chooseReferenceFile(null)}
                  aria-label="Add reference"
                  title={
                    !accountAvailable
                      ? "Sign in to add a private reference image."
                      : !mediaUploadAvailable
                        ? "Reference upload storage is not configured in this environment."
                        : references.length >= maxReferences
                          ? outputKind === "image"
                            ? "Image supports up to two references."
                            : "Video supports one source image."
                          : "Add a reference image"
                  }
                >
                  {referenceUploading ? <Spinner /> : <Plus aria-hidden="true" />}
                </Button>

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
                  className="shrink-0"
                >
                  <ToggleGroupItem value="image">Image</ToggleGroupItem>
                  <ToggleGroupItem value="video">Video</ToggleGroupItem>
                </ToggleGroup>

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

                <AnimatePresence initial={false} mode="popLayout">
                  <motion.div
                    key={outputKind}
                    layout="position"
                    data-create-motion="mode-control"
                    className="shrink-0"
                    initial={reduceMotion ? false : { opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, x: -6 }}
                    transition={contextTransition}
                  >
                    {outputKind === "video" ? (
                      <VideoSettingsMenu
                        resolution={videoResolution}
                        durationSeconds={durationSeconds}
                        audioEnabled={audioEnabled}
                        advancedOpen={advancedOpen}
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
                        onAdvancedToggle={() => setAdvancedOpen((current) => !current)}
                      />
                    ) : (
                      <CollapsibleTrigger asChild>
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          aria-pressed={advancedOpen}
                          aria-label={advancedOpen ? "Close Advanced controls" : "Open Advanced controls"}
                          title="Advanced generation controls"
                          className={advancedOpen ? "bg-surface-3" : undefined}
                        >
                          <MoreHorizontal aria-hidden="true" />
                        </Button>
                      </CollapsibleTrigger>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              <Button type="submit" size="lg" disabled={!canSubmit} className="w-full sm:w-auto">
                {submitting || jobActive ? <Spinner data-icon="inline-start" /> : null}
                {submitting ? "Submitting" : jobActive ? "Generating" : "Generate"}
              </Button>
            </div>

            <CreateAdvancedPanel
              outputKind={outputKind}
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

        {statusText ? (
          <Alert className="mt-4" role="status">
            <AlertDescription>{statusText}</AlertDescription>
          </Alert>
        ) : null}

        <AnimatePresence initial={false} mode="wait">
          {resultLoading ? (
            <motion.div
              key="result-loading"
              data-create-motion="result"
              className="mt-8 flex min-h-64 items-center justify-center rounded-xl border border-border bg-surface-1 text-sm text-text-muted"
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
              className="mt-8 overflow-hidden rounded-xl border border-border bg-surface-1"
              aria-label="Generated result"
              initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={contextTransition}
            >
              <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-text">Generated result</p>
                  <p className="text-xs text-text-muted">Saved to your RenderLab media library.</p>
                </div>
                {continuationActions.length ? (
                  <div className="flex items-center gap-2" aria-label="Continue from result">
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
              <div className="bg-surface-2">
                {resultAsset.kind === "image" ? (
                  <img src={resultAsset.contentUrl} alt="Generated result" className="max-h-[70vh] w-full object-contain" />
                ) : (
                  <video
                    src={resultAsset.contentUrl}
                    controls
                    playsInline
                    className="max-h-[70vh] w-full"
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
