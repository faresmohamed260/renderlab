"use client";

import { LoaderCircle, MoreHorizontal, Plus } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import type { AspectRatio, GenerationJob, OutputKind } from "@/lib/capabilities/generation";
import { imageAspectRatios, videoAspectRatios, videoDurations } from "@/lib/capabilities/generation";
import type { SubmitGenerationResponse } from "@/lib/api/generation-contract";

function nextValue<T>(values: readonly T[], current: T) {
  const currentIndex = values.indexOf(current);
  return values[(currentIndex + 1) % values.length];
}

export function CreateWorkspace({ generationAvailable }: { generationAvailable: boolean }) {
  const [prompt, setPrompt] = useState("");
  const [outputKind, setOutputKind] = useState<OutputKind>("image");
  const [imageAspect, setImageAspect] = useState<AspectRatio>("1:1");
  const [videoAspect, setVideoAspect] = useState<AspectRatio>("16:9");
  const [durationSeconds, setDurationSeconds] = useState<(typeof videoDurations)[number]>(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<GenerationJob | null>(null);

  const aspectRatio = outputKind === "image" ? imageAspect : videoAspect;
  const heading = outputKind === "image" ? "What do you want to create?" : "Create a video";
  const supportingText = outputKind === "image"
    ? "Start with an idea. Add a reference only when you need one."
    : "Only the essentials stay visible. More control is available when you ask for it.";

  const canSubmit = generationAvailable && Boolean(prompt.trim()) && !submitting;

  const statusText = useMemo(() => {
    if (!job) return null;
    if (job.status === "queued") return "Generation queued.";
    if (job.status === "preparing") return "Preparing generation.";
    if (job.status === "running") return "Generating.";
    if (job.status === "persisting") return "Saving result.";
    if (job.status === "succeeded") return "Result saved.";
    if (job.status === "cancelled") return "Generation cancelled.";
    return job.error?.message ?? "Generation failed.";
  }, [job]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    setJob(null);

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
          inputs: [],
        }),
      });

      const payload = (await response.json()) as SubmitGenerationResponse;
      if (!response.ok || !payload.ok) {
        setError(payload.ok ? "Generation could not be submitted." : payload.error.message);
        return;
      }

      setJob(payload.job);
    } catch {
      setError("Generation could not be submitted. Your prompt and settings are unchanged.");
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

        <form onSubmit={submit} className="rounded-xl border border-border bg-surface-1 p-3 sm:p-4">
          <label htmlFor="create-prompt" className="sr-only">Prompt</label>
          <textarea
            id="create-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={outputKind === "image" ? "Describe what you want to create…" : "Describe the video you want to create…"}
            className="min-h-32 w-full resize-none bg-transparent px-1 py-1 text-[16px] leading-6 text-text outline-none placeholder:text-text-muted sm:min-h-28"
          />

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-1 sm:overflow-visible sm:pb-0">
              <button
                type="button"
                disabled
                aria-label="Add reference (coming next)"
                title="Reference upload integration is the next Create slice."
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-text-muted opacity-70"
              >
                <Plus aria-hidden="true" size={18} strokeWidth={1.8} />
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
                      setJob(null);
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

              <button
                type="button"
                disabled
                aria-label="Advanced controls (coming later)"
                title="Advanced controls will be added from capability definitions rather than hard-coded here."
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-text-muted opacity-70"
              >
                <MoreHorizontal aria-hidden="true" size={18} strokeWidth={1.8} />
              </button>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-6 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              {submitting ? <LoaderCircle aria-hidden="true" className="animate-spin" size={17} /> : null}
              {submitting ? "Submitting" : "Generate"}
            </button>
          </div>
        </form>

        {!generationAvailable ? (
          <p className="mt-3 text-sm text-text-muted" role="status">
            Generation backend is not connected in this environment yet. Your Create UI and request contract are ready for the backend adapter.
          </p>
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
      </div>
    </section>
  );
}
