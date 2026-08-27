"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CollapsibleContent } from "@/components/ui/collapsible";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
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
  return (
    <CollapsibleContent className="mb-3 rounded-xl border border-border bg-surface-2 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text">Advanced</p>
          <p className="mt-1 text-xs leading-5 text-text-muted">
            Reproducibility and tuning. Defaults stay safe unless you change them.
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onReset} className="shrink-0">
          <RotateCcw aria-hidden="true" data-icon="inline-start" />
          Reset
        </Button>
      </div>

      <FieldSet>
        <FieldLegend className="sr-only">Advanced generation controls</FieldLegend>
        <FieldGroup className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field className="col-span-2 sm:col-span-3">
            <FieldLabel htmlFor="advanced-negative-prompt">
              {generationAdvancedCapabilities.negativePrompt.label}
            </FieldLabel>
            <Input
              id="advanced-negative-prompt"
              type="text"
              value={draft.negativePrompt}
              onChange={(event) => onDraftChange({ ...draft, negativePrompt: event.target.value })}
              placeholder="Optional things to avoid…"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="advanced-seed">{generationAdvancedCapabilities.seed.label}</FieldLabel>
            <Input
              id="advanced-seed"
              type="number"
              step="1"
              value={draft.seed}
              onChange={(event) => onDraftChange({ ...draft, seed: event.target.value })}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="advanced-steps">{generationAdvancedCapabilities.steps.label}</FieldLabel>
            <Input
              id="advanced-steps"
              type="number"
              min={generationAdvancedCapabilities.steps.min}
              max={generationAdvancedCapabilities.steps.max}
              step="1"
              value={draft.steps}
              onChange={(event) => onDraftChange({ ...draft, steps: event.target.value })}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="advanced-guidance">{generationAdvancedCapabilities.guidance.label}</FieldLabel>
            <Input
              id="advanced-guidance"
              type="number"
              min={generationAdvancedCapabilities.guidance.min}
              max={generationAdvancedCapabilities.guidance.max}
              step={generationAdvancedCapabilities.guidance.step}
              value={draft.guidance}
              onChange={(event) => onDraftChange({ ...draft, guidance: event.target.value })}
            />
          </Field>

          {outputKind === "video" ? (
            <Field>
              <FieldLabel htmlFor="advanced-frame-rate">Frame rate</FieldLabel>
              <NativeSelect
                id="advanced-frame-rate"
                value={draft.frameRate}
                onChange={(event) =>
                  onDraftChange({
                    ...draft,
                    frameRate: Number(event.target.value) as GenerationFrameRate,
                  })
                }
              >
                {generationAdvancedCapabilities.video.frameRates.map((frameRate) => (
                  <NativeSelectOption key={frameRate} value={frameRate}>
                    {frameRate} fps
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          ) : null}
        </FieldGroup>
      </FieldSet>
    </CollapsibleContent>
  );
}
