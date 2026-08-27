"use client";

import { ImageIcon, LoaderCircle, MoreHorizontal, Plus, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  advancedParametersFromDraft,
  CreateAdvancedPanel,
  createAdvancedDraft,
  type AdvancedDraft,
} from "@/features/create/create-advanced-panel";
import type { PublicMediaAsset } from "@/lib/api/media-assets-contract";
import type {
  AspectRatio,
  ContinuationAction,
  GenerationJob,
  GenerationInputRole,
  OutputKind,
} from "@/lib/capabilities/generation";
import {
  continuationActionsForMedia,
  imageAspectRatios,
  videoAspectRatios,
  videoDurations,
} from "@/lib/capabilities/generation";
import type { SubmitGenerationResponse } from "@/lib/api/generation-contract";
import type {
  CompleteReferenceUploadResponse,
  CreateReferenceUploadTicketResponse,
  ReferenceSource,
} from "@/lib/api/reference-upload-contract";
import { maxReferenceUploadBytes, supportedReferenceMimeTypes } from "@/lib/api/reference-upload-contract";

type ContinuationSource = {
  id: string;
  inputRole: Extract<GenerationInputRole, "primary-image" | "first-frame">;
};

type InitialContinuation = {
  asset: PublicMediaAsset;
  action: ContinuationAction;
};

const maxPollRetries = 5;

function nextValue<T>(values: readonly T[], current: T) {
  const currentIndex = values.indexOf(current);
  return values[(currentIndex + 1) % values.length];
}

function pollRetryDelay(attempt: number) {
  return Math.min(2000 * 2 ** Math.max(0, attempt - 1), 15000);
}

function isRetryablePollStatus(status: number) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function revokePreviewUrl(url: string | null) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

async function readImageDimensions(file: File) {
  try {
    const bitmap = await createImageBitmap(file);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  } catch {
    return {};
  }
}

function isTerminalJob(job: GenerationJob | null) {
  return Boolean(job && ["succeeded", "failed", "cancelled"].includes(job.status));
}

export function CreateWorkspace({
  generationAvailable,
  referenceUploadAvailable,
  initialContinuation = null,
  initialContinuationError = null,
}: {
  generationAvailable: boolean;
  referenceUploadAvailable: boolean;
  initialContinuation?: InitialContinuation | null;
  initialContinuationError?: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState("");
  const [outputKind, setOutputKind] = useState<OutputKind>(() => initialContinuation?.action.outputKind ?? "image");
  const [imageAspect, setImageAspect] = useState<AspectRatio>("1:1");
  const [videoAspect, setVideoAspect] = useState<AspectRatio>("16:9");
  const [durationSeconds, setDurationSeconds] = useState<(typeof videoDurations)[number]>(5);
  const [reference, setReference] = useState<ReferenceSource | null>(null);
  const [continuationSource, setContinuationSource] = useState<ContinuationSource | null>(() =>
    initialContinuation
      ? { id: initialContinuation.asset.id, inputRole: initialContinuation.action.inputRole }
      : null,
  );
  const [referencePreviewUrl, setReferencePreviewUrl] = useState<string | null>(() =>
    initialContinuation?.asset.contentUrl ?? null,
  );
  const [referenceUploading, setReferenceUploading] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [imageAdvanced, setImageAdvanced] = useState<AdvancedDraft>(() => createAdvancedDraft("image"));
  const [videoAdvanced, setVideoAdvanced] = useState<AdvancedDraft>(() => createAdvancedDraft("video"));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(initialContinuationError);
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [resultAsset, setResultAsset] = useState<PublicMediaAsset | null>(null);
  const [resultLoading, setResultLoading] = useState(false);

  useEffect(() => {
    return () => revokePreviewUrl(referencePreviewUrl);
  }, [referencePreviewUrl]);

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
  const hasReference = Boolean(reference || continuationSource);
  const heading = hasReference
    ? outputKind === "image"
      ? "Edit an image"
      : "Animate an image"
    : outputKind === "image"
      ? "What do you want to create?"
      : "Create a video";
  const supportingText = hasReference
    ? "Your reference sets the creative context automatically."
    : outputKind === "image"
      ? "Start with an idea. Add a reference only when you need one."
      : "Only the essentials stay visible. More control is available when you ask for it.";

  const jobActive = Boolean(job && !isTerminalJob(job));
  const canSubmit =
    generationAvailable && Boolean(prompt.trim()) && !submitting && !referenceUploading && !jobActive;
  const continuationActions = resultAsset ? continuationActionsForMedia(resultAsset.kind) : [];
  const continuationSourceLabel = continuationSource
    ? continuationSource.id === initialContinuation?.asset.id
      ? initialContinuation.asset.origin === "uploaded"
        ? initialContinuation.asset.displayName
          || initialContinuation.asset.originalFilename
          || "Uploaded image"
        : "Generated result"
      : "Generated result"
    : null;

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

  function clearReference() {
    revokePreviewUrl(referencePreviewUrl);
    setReferencePreviewUrl(null);
    setReference(null);
    setContinuationSource(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function startContinuation(action: ContinuationAction) {
    if (!resultAsset) return;
    revokePreviewUrl(referencePreviewUrl);
    setReference(null);
    setContinuationSource({ id: resultAsset.id, inputRole: action.inputRole });
    setReferencePreviewUrl(resultAsset.contentUrl);
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

  async function uploadReference(file: File) {
    if (!referenceUploadAvailable) return;

    const mimeType = file.type.toLowerCase();
    if (!(supportedReferenceMimeTypes as readonly string[]).includes(mimeType)) {
      setError("References must be PNG, JPEG, or WebP images.");
      return;
    }
    if (file.size < 1 || file.size > maxReferenceUploadBytes) {
      setError("Reference images must be no larger than 25 MB.");
      return;
    }

    setReferenceUploading(true);
    setError(null);

    const previewUrl = URL.createObjectURL(file);
    revokePreviewUrl(referencePreviewUrl);
    setReferencePreviewUrl(previewUrl);
    setReference(null);
    setContinuationSource(null);

    try {
      const ticketResponse = await fetch("/api/assets/reference/upload-tickets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ filename: file.name, mimeType, sizeBytes: file.size }),
      });
      const ticketPayload = (await ticketResponse.json()) as CreateReferenceUploadTicketResponse;
      if (!ticketResponse.ok || !ticketPayload.ok) {
        throw new Error(ticketPayload.ok ? "Reference upload could not be prepared." : ticketPayload.error.message);
      }

      const uploadResponse = await fetch(ticketPayload.ticket.uploadUrl, {
        method: ticketPayload.ticket.method,
        headers: ticketPayload.ticket.headers,
        body: file,
      });
      if (!uploadResponse.ok) throw new Error("Reference image could not be uploaded.");

      const dimensions = await readImageDimensions(file);
      const completionResponse = await fetch("/api/assets/reference/upload-completions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceId: ticketPayload.ticket.sourceId, ...dimensions }),
      });
      const completionPayload = (await completionResponse.json()) as CompleteReferenceUploadResponse;
      if (!completionResponse.ok || !completionPayload.ok) {
        throw new Error(
          completionPayload.ok ? "Reference upload could not be verified." : completionPayload.error.message,
        );
      }

      setReference(completionPayload.source);
    } catch (uploadError) {
      setReference(null);
      setError(uploadError instanceof Error ? uploadError.message : "Reference upload failed.");
    } finally {
      setReferenceUploading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    const advanced = advancedParametersFromDraft(advancedDraft, outputKind);
    if (!advanced) {
      setAdvancedOpen(true);
      setError("Check the Advanced values before generating. Seed must be an integer, steps must be 1–200, and guidance must be 0–100.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setJob(null);
    setResultAsset(null);
    setResultLoading(false);

    const inputs = continuationSource
      ? [
          {
            source: { type: "media-asset" as const, id: continuationSource.id },
            role: continuationSource.inputRole,
          },
        ]
      : reference
        ? [
            {
              source: { type: "temporary-source" as const, id: reference.id },
              role: outputKind === "image" ? ("primary-image" as const) : ("first-frame" as const),
            },
          ]
        : [];

    try {
      const response = await fetch("/api/generation/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt,
          output: {
            kind: outputKind,
            aspectRatio,
            ...(outputKind === "video" ? { durationSeconds } : {}),
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
        <div className="mb-12 sm:mb-24">
          <h2 className="text-[28px] font-semibold tracking-[-0.02em] text-text sm:text-[30px]">{heading}</h2>
          <p className="mt-1 text-[15px] text-text-muted">{supportingText}</p>
        </div>

        <form onSubmit={submit} noValidate className="rounded-xl border border-border bg-surface-1 p-3 sm:p-4">
          <label htmlFor="create-prompt" className="sr-only">Prompt</label>
          <textarea
            id="create-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={
              hasReference
                ? "Describe the change or result you want…"
                : outputKind === "image"
                  ? "Describe what you want to create…"
                  : "Describe the video you want to create…"
            }
            className="min-h-32 w-full resize-none bg-transparent px-1 py-1 text-[16px] leading-6 text-text outline-none placeholder:text-text-muted sm:min-h-28"
          />

          {referencePreviewUrl ? (
            <div className="mb-3 flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-2">
              <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-surface-3">
                <img src={referencePreviewUrl} alt="Reference preview" className="size-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text">
                  {referenceUploading ? "Uploading reference…" : outputKind === "image" ? "Editing this image" : "Animating this image"}
                </p>
                <p className="truncate text-xs text-text-muted">
                  {continuationSource ? continuationSourceLabel : reference?.filename ?? "Reference image"}
                </p>
              </div>
              <button
                type="button"
                onClick={clearReference}
                disabled={referenceUploading}
                aria-label="Remove reference"
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-3 hover:text-text disabled:opacity-50"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>
          ) : null}

          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CreateAdvancedPanel
              outputKind={outputKind}
              draft={advancedDraft}
              onDraftChange={setAdvancedDraft}
              onReset={resetAdvanced}
            />

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-1 sm:overflow-visible sm:pb-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  aria-label="Reference image file"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadReference(file);
                  }}
                />
                <button
                  type="button"
                  disabled={!referenceUploadAvailable || referenceUploading}
                  onClick={() => fileInputRef.current?.click()}
                  aria-label={hasReference ? "Replace reference" : "Add reference"}
                  title={
                    referenceUploadAvailable
                      ? "Add a reference image"
                      : "Reference upload storage is not configured in this environment."
                  }
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-text-muted transition-colors hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {referenceUploading ? (
                    <LoaderCircle aria-hidden="true" className="animate-spin" size={17} />
                  ) : hasReference ? (
                    <ImageIcon aria-hidden="true" size={18} />
                  ) : (
                    <Plus aria-hidden="true" size={18} strokeWidth={1.8} />
                  )}
                </button>

                <div className="flex shrink-0 rounded-lg bg-surface-2 p-1" aria-label="Output type">
                  {(["image", "video"] as const).map((kind) => (
                    <button
                      type="button"
                      key={kind}
                      aria-pressed={outputKind === kind}
                      onClick={() => {
                        setOutputKind(kind);
                        setError(null);
                        setContinuationSource((current) =>
                          current
                            ? {
                                ...current,
                                inputRole: kind === "image" ? "primary-image" : "first-frame",
                              }
                            : current,
                        );
                      }}
                      className={[
                        "min-h-8 min-w-20 rounded-md px-3 text-sm font-medium transition-colors duration-150",
                        outputKind === kind ? "bg-surface-3 text-text" : "text-text-muted hover:text-text",
                      ].join(" ")}
                    >
                      {kind === "image" ? "Image" : "Video"}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (outputKind === "image") setImageAspect(nextValue(imageAspectRatios, imageAspect));
                    else setVideoAspect(nextValue(videoAspectRatios, videoAspect));
                  }}
                  aria-label={`Aspect ratio ${aspectRatio}. Activate to choose the next ratio.`}
                  className="min-h-10 shrink-0 rounded-lg bg-surface-2 px-4 text-sm font-medium text-text-muted transition-colors duration-150 hover:text-text"
                >
                  {aspectRatio}
                </button>

                {outputKind === "video" ? (
                  <button
                    type="button"
                    onClick={() => setDurationSeconds(nextValue(videoDurations, durationSeconds))}
                    aria-label={`Duration ${durationSeconds} seconds. Activate to choose the next duration.`}
                    className="min-h-10 shrink-0 rounded-lg bg-surface-2 px-4 text-sm font-medium text-text-muted transition-colors duration-150 hover:text-text"
                  >
                    {durationSeconds} s
                  </button>
                ) : null}

                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    aria-label={advancedOpen ? "Close Advanced controls" : "Open Advanced controls"}
                    title="Advanced generation controls"
                    className={[
                      "inline-flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                      advancedOpen
                        ? "bg-surface-3 text-text"
                        : "bg-surface-2 text-text-muted hover:text-text",
                    ].join(" ")}
                  >
                    <MoreHorizontal aria-hidden="true" size={18} strokeWidth={1.8} />
                  </button>
                </CollapsibleTrigger>
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-6 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
              >
                {submitting || jobActive ? <LoaderCircle aria-hidden="true" className="animate-spin" size={17} /> : null}
                {submitting ? "Submitting" : jobActive ? "Generating" : "Generate"}
              </button>
            </div>
          </Collapsible>
        </form>

        {!generationAvailable || !referenceUploadAvailable ? (
          <div className="mt-3 space-y-1 text-sm text-text-muted" role="status">
            {!generationAvailable ? <p>Generation is not connected in this environment yet.</p> : null}
            {!referenceUploadAvailable ? <p>Reference uploads are not connected in this environment yet.</p> : null}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-text" role="alert">
            {error}
          </div>
        ) : null}

        {statusText ? (
          <div className="mt-4 rounded-lg border border-border bg-surface-1 px-4 py-3 text-sm text-text" role="status">
            {statusText}
          </div>
        ) : null}

        {resultLoading ? (
          <div className="mt-8 flex min-h-64 items-center justify-center rounded-xl border border-border bg-surface-1 text-sm text-text-muted" role="status">
            <LoaderCircle aria-hidden="true" className="mr-2 animate-spin" size={20} />
            Loading saved result…
          </div>
        ) : null}

        {resultAsset ? (
          <article className="mt-8 overflow-hidden rounded-xl border border-border bg-surface-1" aria-label="Generated result">
            <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-text">Generated result</p>
                <p className="text-xs text-text-muted">Saved to your RenderLab media library.</p>
              </div>
              {continuationActions.length ? (
                <div className="flex items-center gap-2" aria-label="Continue from result">
                  {continuationActions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => startContinuation(action)}
                      className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-surface-2 px-4 text-sm font-medium text-text transition-colors hover:bg-surface-3"
                    >
                      {action.label}
                    </button>
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
          </article>
        ) : null}
      </div>
    </section>
  );
}