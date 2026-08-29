from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, found {count}: {old[:160]!r}")
    target.write_text(text.replace(old, new, 1))


# Capability contract: verified REDGraft resolutions and output-specific tuning.
replace_once(
    "src/lib/capabilities/generation.ts",
    "export const defaultVideoAudioEnabled = true;\n",
    "export const videoResolutions = [\"480p\", \"720p\", \"1080p\", \"2K\"] as const;\n"
    "export type GenerationVideoResolution = (typeof videoResolutions)[number];\n"
    "export const defaultVideoResolution: GenerationVideoResolution = \"480p\";\n"
    "export const defaultVideoAudioEnabled = true;\n",
)
replace_once(
    "src/lib/capabilities/generation.ts",
    '''  video: {
    defaults: {
      seed: 42,
      steps: 11,
      guidance: 1,
      frameRate: 24 as const,
    },
    frameRates: [24, 25, 30] as const,
  },''',
    '''  video: {
    defaults: {
      seed: 42,
      frameRate: 24 as const,
    },
    frameRates: [24, 25, 30] as const,
  },''',
)
replace_once(
    "src/lib/capabilities/generation.ts",
    '''    durationSeconds?: number;
    audioEnabled?: boolean;
  };''',
    '''    durationSeconds?: number;
    audioEnabled?: boolean;
    resolution?: GenerationVideoResolution;
  };''',
)

# Advanced Create UI: Video keeps only fields the deployed gateway actually exposes.
replace_once(
    "src/features/create/create-advanced-panel.tsx",
    '''  return {
    negativePrompt: "",
    seed: String(defaults.seed),
    steps: String(defaults.steps),
    guidance: String(defaults.guidance),
    frameRate: generationAdvancedCapabilities.video.defaults.frameRate,
  };''',
    '''  return {
    negativePrompt: "",
    seed: String(defaults.seed),
    steps: kind === "image" ? String(generationAdvancedCapabilities.image.defaults.steps) : "",
    guidance: kind === "image" ? String(generationAdvancedCapabilities.image.defaults.guidance) : "",
    frameRate: generationAdvancedCapabilities.video.defaults.frameRate,
  };''',
)
replace_once(
    "src/features/create/create-advanced-panel.tsx",
    '''  if (!draft.seed.trim() || !draft.steps.trim() || !draft.guidance.trim()) return null;

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
  };''',
    '''  if (!draft.seed.trim()) return null;

  const seed = Number(draft.seed);
  if (!Number.isSafeInteger(seed)) return null;

  if (kind === "video") {
    return {
      ...(draft.negativePrompt.trim() ? { negativePrompt: draft.negativePrompt.trim() } : {}),
      seed,
      frameRate: draft.frameRate,
    };
  }

  if (!draft.steps.trim() || !draft.guidance.trim()) return null;
  const steps = Number(draft.steps);
  const guidance = Number(draft.guidance);
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
  };''',
)
replace_once(
    "src/features/create/create-advanced-panel.tsx",
    '''          <Field>
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

          {outputKind === "video" ? (''',
    '''          {outputKind === "image" ? (
            <>
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
            </>
          ) : null}

          {outputKind === "video" ? (''',
)

# Request parser: resolution is a Video output contract; image-only tuning is rejected for Video.
replace_once(
    "src/lib/api/generation-contract.ts",
    '''  GenerationRequest,
  OutputKind,
} from "@/lib/capabilities/generation";''',
    '''  GenerationRequest,
  GenerationVideoResolution,
  OutputKind,
} from "@/lib/capabilities/generation";''',
)
replace_once(
    "src/lib/api/generation-contract.ts",
    '''  defaultVideoAudioEnabled,
  generationAdvancedCapabilities,''',
    '''  defaultVideoAudioEnabled,
  defaultVideoResolution,
  generationAdvancedCapabilities,''',
)
replace_once(
    "src/lib/api/generation-contract.ts",
    '''  unresolvedGenerationPromptReferenceAliases,
  videoAspectRatios,
} from "@/lib/capabilities/generation";''',
    '''  unresolvedGenerationPromptReferenceAliases,
  videoAspectRatios,
  videoResolutions,
} from "@/lib/capabilities/generation";''',
)
replace_once(
    "src/lib/api/generation-contract.ts",
    "const frameRates = new Set<number>(generationAdvancedCapabilities.video.frameRates);\n",
    "const frameRates = new Set<number>(generationAdvancedCapabilities.video.frameRates);\n"
    "const videoResolutionSet = new Set<GenerationVideoResolution>(videoResolutions);\n",
)
replace_once(
    "src/lib/api/generation-contract.ts",
    "function parseAdvanced(value: unknown): GenerationAdvancedParameters | null | undefined {",
    "function parseAdvanced(value: unknown, outputKind: OutputKind): GenerationAdvancedParameters | null | undefined {",
)
replace_once(
    "src/lib/api/generation-contract.ts",
    '''  if (value.steps !== undefined) {
    if (
      !Number.isInteger(value.steps)
      || (value.steps as number) < generationAdvancedCapabilities.steps.min
      || (value.steps as number) > generationAdvancedCapabilities.steps.max
    ) return null;
    advanced.steps = value.steps as number;
  }
  if (value.guidance !== undefined) {
    if (
      typeof value.guidance !== "number"
      || !Number.isFinite(value.guidance)
      || value.guidance < generationAdvancedCapabilities.guidance.min
      || value.guidance > generationAdvancedCapabilities.guidance.max
    ) return null;
    advanced.guidance = value.guidance;
  }
  if (value.frameRate !== undefined) {
    if (typeof value.frameRate !== "number" || !frameRates.has(value.frameRate)) return null;
    advanced.frameRate = value.frameRate as GenerationFrameRate;
  }''',
    '''  if (value.steps !== undefined) {
    if (outputKind === "video") return null;
    if (
      !Number.isInteger(value.steps)
      || (value.steps as number) < generationAdvancedCapabilities.steps.min
      || (value.steps as number) > generationAdvancedCapabilities.steps.max
    ) return null;
    advanced.steps = value.steps as number;
  }
  if (value.guidance !== undefined) {
    if (outputKind === "video") return null;
    if (
      typeof value.guidance !== "number"
      || !Number.isFinite(value.guidance)
      || value.guidance < generationAdvancedCapabilities.guidance.min
      || value.guidance > generationAdvancedCapabilities.guidance.max
    ) return null;
    advanced.guidance = value.guidance;
  }
  if (value.frameRate !== undefined) {
    if (outputKind === "image" || typeof value.frameRate !== "number" || !frameRates.has(value.frameRate)) return null;
    advanced.frameRate = value.frameRate as GenerationFrameRate;
  }''',
)
replace_once(
    "src/lib/api/generation-contract.ts",
    '''  const durationSeconds = value.output.durationSeconds;
  const audioEnabled = value.output.audioEnabled;''',
    '''  const durationSeconds = value.output.durationSeconds;
  const audioEnabled = value.output.audioEnabled;
  const resolution = value.output.resolution;''',
)
replace_once(
    "src/lib/api/generation-contract.ts",
    '''    if (audioEnabled !== undefined && typeof audioEnabled !== "boolean") {
      return { ok: false, error: { code: "invalid_request", message: "Video audio setting must be on or off." } };
    }
  } else if (durationSeconds !== undefined || audioEnabled !== undefined) {
    return { ok: false, error: { code: "invalid_request", message: "Image requests cannot include video-only settings." } };
  }

  const advanced = parseAdvanced(value.advanced);''',
    '''    if (audioEnabled !== undefined && typeof audioEnabled !== "boolean") {
      return { ok: false, error: { code: "invalid_request", message: "Video audio setting must be on or off." } };
    }
    if (resolution !== undefined && (typeof resolution !== "string" || !videoResolutionSet.has(resolution as GenerationVideoResolution))) {
      return { ok: false, error: { code: "invalid_request", message: "Unsupported video resolution." } };
    }
  } else if (durationSeconds !== undefined || audioEnabled !== undefined || resolution !== undefined) {
    return { ok: false, error: { code: "invalid_request", message: "Image requests cannot include video-only settings." } };
  }

  const advanced = parseAdvanced(value.advanced, outputKind);''',
)
replace_once(
    "src/lib/api/generation-contract.ts",
    '''          ? { durationSeconds: durationSeconds as number, audioEnabled: audioEnabled === undefined ? defaultVideoAudioEnabled : audioEnabled }
          : {}),''',
    '''          ? {
              durationSeconds: durationSeconds as number,
              audioEnabled: audioEnabled === undefined ? defaultVideoAudioEnabled : audioEnabled,
              resolution: resolution === undefined ? defaultVideoResolution : resolution as GenerationVideoResolution,
            }
          : {}),''',
)

# Native REDGraft adapter: send selected resolution and stop sending inactive steps/cfg.
replace_once(
    "src/server/generation/native-generation.ts",
    'import { defaultVideoAudioEnabled, generationInputAlias, resolveCreativeOperation } from "@/lib/capabilities/generation";',
    'import { defaultVideoAudioEnabled, defaultVideoResolution, generationInputAlias, resolveCreativeOperation } from "@/lib/capabilities/generation";',
)
replace_once(
    "src/server/generation/native-generation.ts",
    '''    seed: number;
    steps: number;
    guidance: number;
    megapixels: number;''',
    '''    seed: number;
    steps?: number;
    guidance?: number;
    megapixels: number;''',
)
replace_once(
    "src/server/generation/native-generation.ts",
    '''      seed: 42,
      steps: 11,
      guidance: 1,
      megapixels: 1,
      resolution: "480p",''',
    '''      seed: 42,
      megapixels: 1,
      resolution: defaultVideoResolution,''',
)
replace_once(
    "src/server/generation/native-generation.ts",
    '''    form.append("steps", String(request.advanced?.steps ?? workflow.defaults.steps));
    form.append("cfg", String(request.advanced?.guidance ?? workflow.defaults.guidance));''',
    '''    form.append("steps", String(request.advanced?.steps ?? workflow.defaults.steps!));
    form.append("cfg", String(request.advanced?.guidance ?? workflow.defaults.guidance!));''',
)
replace_once(
    "src/server/generation/native-generation.ts",
    '''  form.append("seed", String(request.advanced?.seed ?? workflow.defaults.seed));
  form.append("steps", String(request.advanced?.steps ?? workflow.defaults.steps));
  form.append("cfg", String(request.advanced?.guidance ?? workflow.defaults.guidance));
  form.append("resolution", workflow.defaults.resolution!);''',
    '''  form.append("seed", String(request.advanced?.seed ?? workflow.defaults.seed));
  form.append("resolution", request.output.resolution ?? workflow.defaults.resolution!);''',
)

# Create workspace: contextual resolution selector in the existing Video settings menu.
replace_once(
    "src/features/create/create-workspace.tsx",
    '''  GenerationJob,
  OutputKind,
  PresetAspectRatio,
} from "@/lib/capabilities/generation";''',
    '''  GenerationJob,
  GenerationVideoResolution,
  OutputKind,
  PresetAspectRatio,
} from "@/lib/capabilities/generation";''',
)
replace_once(
    "src/features/create/create-workspace.tsx",
    '''  continuationActionsForMedia,
  defaultVideoAudioEnabled,
  generationInputAlias,''',
    '''  continuationActionsForMedia,
  defaultVideoAudioEnabled,
  defaultVideoResolution,
  generationInputAlias,''',
)
replace_once(
    "src/features/create/create-workspace.tsx",
    '''  videoAspectRatios,
  videoDurations,
} from "@/lib/capabilities/generation";''',
    '''  videoAspectRatios,
  videoDurations,
  videoResolutions,
} from "@/lib/capabilities/generation";''',
)
replace_once(
    "src/features/create/create-workspace.tsx",
    '''function VideoSettingsMenu({
  durationSeconds,
  audioEnabled,
  advancedOpen,
  onDurationChange,
  onAudioChange,
  onAdvancedToggle,
}: {
  durationSeconds: (typeof videoDurations)[number];
  audioEnabled: boolean;
  advancedOpen: boolean;
  onDurationChange: (value: (typeof videoDurations)[number]) => void;
  onAudioChange: (value: boolean) => void;
  onAdvancedToggle: () => void;
}) {''',
    '''function VideoSettingsMenu({
  resolution,
  durationSeconds,
  audioEnabled,
  advancedOpen,
  onResolutionChange,
  onDurationChange,
  onAudioChange,
  onAdvancedToggle,
}: {
  resolution: GenerationVideoResolution;
  durationSeconds: (typeof videoDurations)[number];
  audioEnabled: boolean;
  advancedOpen: boolean;
  onResolutionChange: (value: GenerationVideoResolution) => void;
  onDurationChange: (value: (typeof videoDurations)[number]) => void;
  onAudioChange: (value: boolean) => void;
  onAdvancedToggle: () => void;
}) {''',
)
replace_once(
    "src/features/create/create-workspace.tsx",
    '''          aria-label={`Video settings. Duration ${durationSeconds} seconds. Audio ${audioEnabled ? "on" : "off"}`}
          className="shrink-0 gap-1.5"
        >
          <span>{durationSeconds} s</span>
          <span className="hidden text-xs text-text-muted sm:inline">· {audioEnabled ? "Audio" : "Silent"}</span>''',
    '''          aria-label={`Video settings. Resolution ${resolution}. Duration ${durationSeconds} seconds. Audio ${audioEnabled ? "on" : "off"}`}
          className="shrink-0 gap-1.5"
        >
          <span>{resolution} · {durationSeconds} s</span>
          <span className="hidden text-xs text-text-muted sm:inline">· {audioEnabled ? "Audio" : "Silent"}</span>''',
)
replace_once(
    "src/features/create/create-workspace.tsx",
    '''      <DropdownMenuContent align="start" className="min-w-48">
        <DropdownMenuLabel>Duration</DropdownMenuLabel>''',
    '''      <DropdownMenuContent align="start" className="min-w-48">
        <DropdownMenuLabel>Resolution</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={resolution}
          onValueChange={(next) => onResolutionChange(next as GenerationVideoResolution)}
        >
          {videoResolutions.map((option) => (
            <DropdownMenuRadioItem key={option} value={option}>
              {option}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Duration</DropdownMenuLabel>''',
)
replace_once(
    "src/features/create/create-workspace.tsx",
    '''  const [durationSeconds, setDurationSeconds] = useState<(typeof videoDurations)[number]>(5);
  const [audioEnabled, setAudioEnabled] = useState(defaultVideoAudioEnabled);''',
    '''  const [videoResolution, setVideoResolution] = useState<GenerationVideoResolution>(defaultVideoResolution);
  const [durationSeconds, setDurationSeconds] = useState<(typeof videoDurations)[number]>(5);
  const [audioEnabled, setAudioEnabled] = useState(defaultVideoAudioEnabled);''',
)
replace_once(
    "src/features/create/create-workspace.tsx",
    '''    if (!advanced) {
      setAdvancedOpen(true);
      setError("Check the Advanced values before generating. Seed must be an integer, steps must be 1–200, and guidance must be 0–100.");
      return;
    }''',
    '''    if (!advanced) {
      setAdvancedOpen(true);
      setError(
        outputKind === "image"
          ? "Check the Advanced values before generating. Seed must be an integer, steps must be 1–200, and guidance must be 0–100."
          : "Check the Advanced values before generating. Seed must be an integer and frame rate must be supported.",
      );
      return;
    }''',
)
replace_once(
    "src/features/create/create-workspace.tsx",
    '''            ...(outputKind === "video" ? { durationSeconds, audioEnabled } : {}),''',
    '''            ...(outputKind === "video" ? { durationSeconds, audioEnabled, resolution: videoResolution } : {}),''',
)
replace_once(
    "src/features/create/create-workspace.tsx",
    '''                  <VideoSettingsMenu
                    durationSeconds={durationSeconds}
                    audioEnabled={audioEnabled}
                    advancedOpen={advancedOpen}
                    onDurationChange={(value) => {''',
    '''                  <VideoSettingsMenu
                    resolution={videoResolution}
                    durationSeconds={durationSeconds}
                    audioEnabled={audioEnabled}
                    advancedOpen={advancedOpen}
                    onResolutionChange={(value) => {
                      setVideoResolution(value);
                      setError(null);
                    }}
                    onDurationChange={(value) => {''',
)

# UI/API tests: default resolution, responsive reachability, and truthful Video Advanced fields.
replace_once(
    "tests/ui/create.spec.ts",
    'const settings = page.getByRole("button", { name: /Video settings\\. Duration 5 seconds\\. Audio on/);',
    'const settings = page.getByRole("button", { name: /Video settings\\. Resolution 480p\\. Duration 5 seconds\\. Audio on/);',
)
replace_once(
    "tests/ui/create.spec.ts",
    'await expect(page.getByRole("button", { name: /Video settings\\. Duration 5 seconds\\. Audio off/ })).toBeVisible();',
    'await expect(page.getByRole("button", { name: /Video settings\\. Resolution 480p\\. Duration 5 seconds\\. Audio off/ })).toBeVisible();',
)
replace_once(
    "tests/ui/create.spec.ts",
    '''  await settings.click();
  await expect(page.getByRole("menuitemradio", { name: "5 seconds", exact: true })).toHaveAttribute("data-state", "checked");''',
    '''  await settings.click();
  await expect(page.getByRole("menuitemradio", { name: "480p", exact: true })).toHaveAttribute("data-state", "checked");
  await page.getByRole("menuitemradio", { name: "720p", exact: true }).click();
  await expect(page.getByRole("button", { name: /Video settings\\. Resolution 720p\\. Duration 5 seconds\\. Audio on/ })).toBeVisible();
  await page.getByRole("button", { name: /Video settings\\. Resolution 720p/ }).click();
  await expect(page.getByRole("menuitemradio", { name: "5 seconds", exact: true })).toHaveAttribute("data-state", "checked");''',
)
# second settings regex (mobile) after the first occurrence was already replaced above.
replace_once(
    "tests/ui/create.spec.ts",
    'const settings = page.getByRole("button", { name: /Video settings\\. Duration 5 seconds\\. Audio on/);',
    'const settings = page.getByRole("button", { name: /Video settings\\. Resolution 480p\\. Duration 5 seconds\\. Audio on/);',
)
replace_once(
    "tests/ui/create.spec.ts",
    '''  await settings.click();
  await expect(page.getByRole("menuitemradio", { name: "5 seconds", exact: true })).toBeVisible();''',
    '''  await settings.click();
  await expect(page.getByRole("menuitemradio", { name: "480p", exact: true })).toBeVisible();
  await expect(page.getByRole("menuitemradio", { name: "2K", exact: true })).toBeVisible();
  await expect(page.getByRole("menuitemradio", { name: "5 seconds", exact: true })).toBeVisible();''',
)
replace_once(
    "tests/ui/create.spec.ts",
    '''  await page.getByRole("radio", { name: "Video", exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "Steps" })).toHaveValue("11");
  await expect(page.getByRole("combobox", { name: "Frame rate" })).toHaveValue("24");
  await page.getByRole("spinbutton", { name: "Steps" }).fill("12");

  await page.getByRole("radio", { name: "Image", exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "Steps" })).toHaveValue("4");
  await page.getByRole("radio", { name: "Video", exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "Steps" })).toHaveValue("12");''',
    '''  await page.getByRole("radio", { name: "Video", exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "Steps" })).toHaveCount(0);
  await expect(page.getByRole("spinbutton", { name: "Guidance" })).toHaveCount(0);
  await expect(page.getByRole("spinbutton", { name: "Seed" })).toHaveValue("42");
  await expect(page.getByRole("combobox", { name: "Frame rate" })).toHaveValue("24");
  await page.getByRole("spinbutton", { name: "Seed" }).fill("43");

  await page.getByRole("radio", { name: "Image", exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "Steps" })).toHaveValue("4");
  await page.getByRole("radio", { name: "Video", exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "Seed" })).toHaveValue("43");
  await expect(page.getByRole("spinbutton", { name: "Steps" })).toHaveCount(0);''',
)
replace_once(
    "tests/ui/create.spec.ts",
    '''  const invalidAudio = await request.post("/api/generation/jobs", {
    data: {
      prompt: "A valid video prompt",
      output: { kind: "video", aspectRatio: "16:9", durationSeconds: 5, audioEnabled: "yes" },
      inputs: [],
    },
  });''',
    '''  const invalidResolution = await request.post("/api/generation/jobs", {
    data: {
      prompt: "A valid video prompt",
      output: { kind: "video", aspectRatio: "16:9", durationSeconds: 5, resolution: "4K" },
      inputs: [],
    },
  });
  expect(invalidResolution.status()).toBe(400);
  expect((await invalidResolution.json()).error.message).toContain("resolution");

  const imageResolution = await request.post("/api/generation/jobs", {
    data: {
      prompt: "A valid image prompt",
      output: { kind: "image", aspectRatio: "1:1", resolution: "720p" },
      inputs: [],
    },
  });
  expect(imageResolution.status()).toBe(400);

  const invalidVideoTuning = await request.post("/api/generation/jobs", {
    data: {
      prompt: "A valid video prompt",
      output: { kind: "video", aspectRatio: "16:9", durationSeconds: 5, resolution: "480p" },
      inputs: [],
      advanced: { seed: 42, steps: 11, guidance: 1, frameRate: 24 },
    },
  });
  expect(invalidVideoTuning.status()).toBe(400);

  const invalidAudio = await request.post("/api/generation/jobs", {
    data: {
      prompt: "A valid video prompt",
      output: { kind: "video", aspectRatio: "16:9", durationSeconds: 5, audioEnabled: "yes" },
      inputs: [],
    },
  });''',
)

# Configured Video integration: prove selected 720p maps through persistence to a real 1280x720 output.
replace_once(
    "scripts/verify-video-generation.mjs",
    "async function verifyAsset(account, assetId, expectedAspect) {",
    "async function verifyAsset(account, assetId, expectedAspect, expectedDimensions = null) {",
)
replace_once(
    "scripts/verify-video-generation.mjs",
    '''    if (!(width > 0) || !(height > 0) || Math.abs(width / height - expectedWidth / expectedHeight) > 0.04) {
      throw new Error(`Video geometry mismatch: got ${width}x${height}, expected ${expectedAspect}.`);
    }''',
    '''    if (!(width > 0) || !(height > 0) || Math.abs(width / height - expectedWidth / expectedHeight) > 0.04) {
      throw new Error(`Video geometry mismatch: got ${width}x${height}, expected ${expectedAspect}.`);
    }
    if (expectedDimensions && (width !== expectedDimensions.width || height !== expectedDimensions.height)) {
      throw new Error(`Video resolution mismatch: got ${width}x${height}, expected ${expectedDimensions.width}x${expectedDimensions.height}.`);
    }''',
)
replace_once(
    "scripts/verify-video-generation.mjs",
    "async function generate(account, request, operation, label, expectedAspect) {",
    "async function generate(account, request, operation, label, expectedAspect, expectedDimensions = null) {",
)
replace_once(
    "scripts/verify-video-generation.mjs",
    '''        || persistedJob.parameters?.output?.audioEnabled !== request.output.audioEnabled
        || persistedJob.parameters?.output?.aspectRatio !== request.output.aspectRatio
        || list.length !== 1''',
    '''        || persistedJob.parameters?.output?.audioEnabled !== request.output.audioEnabled
        || persistedJob.parameters?.output?.aspectRatio !== request.output.aspectRatio
        || persistedJob.parameters?.output?.resolution !== request.output.resolution
        || persistedJob.parameters?.advanced?.steps !== undefined
        || persistedJob.parameters?.advanced?.guidance !== undefined
        || list.length !== 1''',
)
replace_once(
    "scripts/verify-video-generation.mjs",
    "      await verifyAsset(account, list[0].id, expectedAspect);",
    "      await verifyAsset(account, list[0].id, expectedAspect, expectedDimensions);",
)
replace_once(
    "scripts/verify-video-generation.mjs",
    '''      prompt: "RenderLab video integration verification: a blue sphere slowly rotating on a neutral studio background",
      output: { kind: "video", aspectRatio: "16:9", durationSeconds: 5, audioEnabled: false },
      inputs: [],''',
    '''      prompt: "RenderLab video integration verification: a blue sphere slowly rotating on a neutral studio background",
      output: { kind: "video", aspectRatio: "16:9", durationSeconds: 5, audioEnabled: false, resolution: "720p" },
      inputs: [],
      advanced: { seed: 42, frameRate: 24 },''',
)
replace_once(
    "scripts/verify-video-generation.mjs",
    '''    "Create Video",
    "16:9",
  );''',
    '''    "Create Video 720p",
    "16:9",
    { width: 1280, height: 720 },
  );''',
)
replace_once(
    "scripts/verify-video-generation.mjs",
    '''      prompt: "Slowly rotate the sphere with a subtle camera push-in",
      output: { kind: "video", aspectRatio: "original", durationSeconds: 5, audioEnabled: true },
      inputs: [{ source: { type: "temporary-source", id: sourceId }, role: "first-frame" }],''',
    '''      prompt: "Slowly rotate the sphere with a subtle camera push-in",
      output: { kind: "video", aspectRatio: "original", durationSeconds: 5, audioEnabled: true, resolution: "480p" },
      inputs: [{ source: { type: "temporary-source", id: sourceId }, role: "first-frame" }],
      advanced: { seed: 42, frameRate: 24 },''',
)

print("Phase 7D implementation patch applied.")
