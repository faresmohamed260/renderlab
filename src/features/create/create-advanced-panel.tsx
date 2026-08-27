"use client";

import { RotateCcw } from "lucide-react";
import { CollapsibleContent } from "@/components/ui/collapsible";
import type {
  GenerationAdvancedParameters,
  GenerationFrameRate,
  OutputKind,
} from "@/lib/capabilities/generation";
import {
  advancedDefaultsForOutput,
  generationAdvancedCapabilities,
} from "@/lib/capabilities/generation";

export type AdvancedDraft = {
  negativePrompt: string;
  seed: string;
  steps: string;
  guidance: string;
  frameRate: GenerationFrameRate;
};

export function createAdvancedDraft(kind: OutputKind): AdvancedDraft {
  const defaults = advancedDefaultsForOutput(kind);
  return {
    negativePrompt: "",
    seed: String(defaults.seed),
    steps: String(defaults.steps),
    guidance: String(defaults.guidance),
    frameRate: generationAdvancedCapabilities.video.defaults.frameRate,
  };
}

export function advancedParametersFromDraft(
  draft: AdvancedDraft,
  kind: OutputKind,
): GenerationAdvancedParameters | null {
  if (!draft.seed.trim() || !draft.steps.trim() || !draft.guidance.trim()) return null;

  const seed = Number(draft.seed);
  const steps = Number(draft.steps);
  const guidance = Number(draft.guidance);

  if (!Number.isSafeInteger(seed)) return null;
  if (
    !Number.isInteger(steps)
    || steps < generationAdvancedCapabilities.steps.min
    || steps > generationAdvancedCapabilities.steps.max
  ) return null;
  if (
    !Number.isFinite(guidance)
    || guidance < generationAdvancedCapabilities.guidance.min
    || guidance > generationAdvancedCapabilities.guidance.max
  ) return null;

  return {
    ...(draft.negativePrompt.trim() ? { negativePrompt: draft.negativePrompt.trim() } : {}),
    seed,
    steps,
    guidance,
    ...(kind === "video" ? { frameRate: draft.frameRate } : {}),
  };
}

export function CreateAdvancedPanel({
  outputKind,
  draft,
  onDraftChange,
  onReset,
}: {
  outputKind: OutputKind;
  draft: AdvancedDraft;
  onDraftChange: (next: AdvancedDraft) => void;
  onReset: () => void;
}) {
  const fieldClassName =
    "min-h-10 w-full rounded-lg border border-border bg-surface-1 px-3 text-sm text-text outline-none transition-colors placeholder:text-text-muted focus-visible:border-accent";

  return (
    <CollapsibleContent className="mb-3 rounded-xl border border-border bg-surface-2 p-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-text">Advanced</p>
          <p className="mt-1 text-xs leading-5 text-text-muted">
            Technical controls for reproducibility and tuning. Defaults stay safe unless you change them.
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-medium text-text-muted transition-colors hover:bg-surface-3 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <RotateCcw aria-hidden="true" size={15} />
          Reset
        </button>
      </div>

      <fieldset className="grid gap-3 sm:grid-cols-3">
        <legend className="sr-only">Advanced generation controls</legend>

        <label className="flex flex-col gap-1.5 sm:col-span-3">
          <span className="text-xs font-medium text-text-muted">
            {generationAdvancedCapabilities.negativePrompt.label}
          </span>
          <input
            type="text"
            value={draft.negativePrompt}
            onChange={(event) => onDraftChange({ ...draft, negativePrompt: event.target.value })}
            placeholder="Optional things to avoid…"
            className={fieldClassName}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-muted">
            {generationAdvancedCapabilities.seed.label}
          </span>
          <input
            type="number"
            step="1"
            value={draft.seed}
            onChange={(event) => onDraftChange({ ...draft, seed: event.target.value })}
            className={fieldClassName}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-muted">
            {generationAdvancedCapabilities.steps.label}
          </span>
          <input
            type="number"
            min={generationAdvancedCapabilities.steps.min}
            max={generationAdvancedCapabilities.steps.max}
            step="1"
            value={draft.steps}
            onChange={(event) => onDraftChange({ ...draft, steps: event.target.value })}
            className={fieldClassName}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-muted">
            {generationAdvancedCapabilities.guidance.label}
          </span>
          <input
            type="number"
            min={generationAdvancedCapabilities.guidance.min}
            max={generationAdvancedCapabilities.guidance.max}
            step={generationAdvancedCapabilities.guidance.step}
            value={draft.guidance}
            onChange={(event) => onDraftChange({ ...draft, guidance: event.target.value })}
            className={fieldClassName}
          />
        </label>

        {outputKind === "video" ? (
          <label className="flex flex-col gap-1.5 sm:col-span-1">
            <span className="text-xs font-medium text-text-muted">Frame rate</span>
            <select
              value={draft.frameRate}
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  frameRate: Number(event.target.value) as GenerationFrameRate,
                })
              }
              className={fieldClassName}
            >
              {generationAdvancedCapabilities.video.frameRates.map((frameRate) => (
                <option key={frameRate} value={frameRate}>
                  {frameRate} fps
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </fieldset>
    </CollapsibleContent>
  );
}
