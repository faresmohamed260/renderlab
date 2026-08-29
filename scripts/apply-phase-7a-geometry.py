from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, value: str) -> None:
    (ROOT / path).write_text(value, encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def regex_once(text: str, pattern: str, replacement: str, label: str) -> str:
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one regex match, found {count}")
    return updated


# package.json: server-side image preparation dependency.
path = "package.json"
text = read(path)
text = replace_once(
    text,
    '    "tailwind-merge": "3.6.0"\n',
    '    "tailwind-merge": "3.6.0",\n    "sharp": "0.34.3"\n',
    "package sharp",
)
write(path, text)

# Capability contract: source-aware Original + curated verified presets.
path = "src/lib/capabilities/generation.ts"
text = read(path)
text = replace_once(
    text,
    'export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";\n',
    'export type PresetAspectRatio =\n'
    '  | "1:1"\n'
    '  | "4:5"\n'
    '  | "3:4"\n'
    '  | "2:3"\n'
    '  | "9:16"\n'
    '  | "5:4"\n'
    '  | "4:3"\n'
    '  | "3:2"\n'
    '  | "16:10"\n'
    '  | "16:9"\n'
    '  | "21:9";\n\n'
    'export type AspectRatio = "original" | PresetAspectRatio;\n',
    "aspect type",
)
text = replace_once(
    text,
    'export const imageAspectRatios: AspectRatio[] = ["1:1", "16:9", "9:16", "4:3", "3:4"];\n'
    'export const videoAspectRatios: AspectRatio[] = ["16:9", "9:16", "1:1"];\n',
    'export const imageAspectRatios: PresetAspectRatio[] = [\n'
    '  "1:1", "4:5", "3:4", "2:3", "9:16", "5:4", "4:3", "3:2", "16:10", "16:9", "21:9",\n'
    '];\n'
    'export const videoAspectRatios: PresetAspectRatio[] = [\n'
    '  "1:1", "4:5", "3:4", "2:3", "9:16", "5:4", "4:3", "3:2", "16:10", "16:9", "21:9",\n'
    '];\n',
    "aspect presets",
)
write(path, text)

# Request parser: validate presets per output and permit Original only with an image input.
path = "src/lib/api/generation-contract.ts"
text = read(path)
text = replace_once(
    text,
    'import { defaultVideoAudioEnabled, generationAdvancedCapabilities } from "@/lib/capabilities/generation";\n',
    'import {\n'
    '  defaultVideoAudioEnabled,\n'
    '  generationAdvancedCapabilities,\n'
    '  imageAspectRatios,\n'
    '  videoAspectRatios,\n'
    '} from "@/lib/capabilities/generation";\n',
    "generation contract imports",
)
text = replace_once(
    text,
    'const aspectRatios = new Set<AspectRatio>(["1:1", "16:9", "9:16", "4:3", "3:4"]);\n',
    'const imageAspectRatioSet = new Set<AspectRatio>(imageAspectRatios);\n'
    'const videoAspectRatioSet = new Set<AspectRatio>(videoAspectRatios);\n',
    "aspect sets",
)
old = '''  const kind = value.output.kind;
  const aspectRatio = value.output.aspectRatio;
  const durationSeconds = value.output.durationSeconds;
  const audioEnabled = value.output.audioEnabled;

  if (typeof kind !== "string" || !outputKinds.has(kind as OutputKind)) {
    return { ok: false, error: { code: "invalid_request", message: "Output kind must be image or video." } };
  }

  if (typeof aspectRatio !== "string" || !aspectRatios.has(aspectRatio as AspectRatio)) {
    return { ok: false, error: { code: "invalid_request", message: "Unsupported aspect ratio." } };
  }

  if (kind === "video") {
'''
new = '''  const kind = value.output.kind;
  const aspectRatio = value.output.aspectRatio;
  const durationSeconds = value.output.durationSeconds;
  const audioEnabled = value.output.audioEnabled;

  if (typeof kind !== "string" || !outputKinds.has(kind as OutputKind)) {
    return { ok: false, error: { code: "invalid_request", message: "Output kind must be image or video." } };
  }

  const inputs = parseInputs(value.inputs);
  if (!inputs) {
    return { ok: false, error: { code: "invalid_request", message: "Generation inputs are invalid." } };
  }

  const supportedAspectRatios = kind === "video" ? videoAspectRatioSet : imageAspectRatioSet;
  if (
    typeof aspectRatio !== "string"
    || (aspectRatio !== "original" && !supportedAspectRatios.has(aspectRatio as AspectRatio))
  ) {
    return { ok: false, error: { code: "invalid_request", message: "Unsupported aspect ratio." } };
  }
  if (aspectRatio === "original" && inputs.length === 0) {
    return {
      ok: false,
      error: { code: "invalid_request", message: "Original geometry requires a source image." },
    };
  }

  if (kind === "video") {
'''
text = replace_once(text, old, new, "request geometry validation")
text = replace_once(
    text,
    '''  const inputs = parseInputs(value.inputs);
  if (!inputs) {
    return { ok: false, error: { code: "invalid_request", message: "Generation inputs are invalid." } };
  }

  const advanced = parseAdvanced(value.advanced);
''',
    '''  const advanced = parseAdvanced(value.advanced);
''',
    "remove duplicate input parse",
)
write(path, text)

# Geometry preparation is server-owned so durable user media remains immutable.
geometry = '''import sharp from "sharp";
import type { PresetAspectRatio } from "@/lib/capabilities/generation";

const executionMegapixels = 1;
const videoMinimumAspectRatio = 0.4;
const videoMaximumAspectRatio = 2.5;

function parsePresetAspectRatio(aspectRatio: PresetAspectRatio) {
  const [width, height] = aspectRatio.split(":").map(Number);
  if (!(width > 0) || !(height > 0)) throw new Error("Unsupported execution aspect ratio.");
  return { width, height, ratio: width / height };
}

function executionDimensions(aspectRatio: PresetAspectRatio) {
  const parsed = parsePresetAspectRatio(aspectRatio);
  const targetPixels = executionMegapixels * 1_000_000;
  const rawUnit = Math.sqrt(targetPixels / (parsed.width * parsed.height));
  const unit = Math.max(8, Math.round(rawUnit / 8) * 8);
  return {
    width: parsed.width * unit,
    height: parsed.height * unit,
  };
}

function displayDimensions(metadata: sharp.Metadata) {
  let width = metadata.width ?? 0;
  let height = metadata.height ?? 0;
  if (metadata.orientation && metadata.orientation >= 5 && metadata.orientation <= 8) {
    [width, height] = [height, width];
  }
  if (!(width > 0) || !(height > 0)) throw new Error("Source image dimensions could not be read.");
  return { width, height };
}

function greatestCommonDivisor(left: number, right: number) {
  let a = Math.abs(Math.round(left));
  let b = Math.abs(Math.round(right));
  while (b) [a, b] = [b, a % b];
  return Math.max(1, a);
}

export async function createImageGenerationCanvas(aspectRatio: PresetAspectRatio) {
  const dimensions = executionDimensions(aspectRatio);
  const bytes = await sharp({
    create: {
      width: dimensions.width,
      height: dimensions.height,
      channels: 3,
      background: { r: 128, g: 128, b: 128 },
    },
  }).png().toBuffer();
  return {
    bytes,
    contentType: "image/png",
    filename: `renderlab-${aspectRatio.replace(":", "x")}-canvas.png`,
  };
}

export async function prepareImageAspectOverride(bytes: Buffer, aspectRatio: PresetAspectRatio) {
  const dimensions = executionDimensions(aspectRatio);
  return sharp(bytes, { failOn: "error" })
    .rotate()
    .resize(dimensions.width, dimensions.height, {
      fit: "cover",
      position: "centre",
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();
}

export async function sourceVideoAspectRatio(bytes: Buffer) {
  const metadata = await sharp(bytes, { failOn: "error" }).metadata();
  const { width, height } = displayDimensions(metadata);
  const ratio = width / height;
  if (ratio < videoMinimumAspectRatio || ratio > videoMaximumAspectRatio) {
    throw new Error(
      "This source image is outside the supported video aspect range. Choose an explicit aspect ratio before generating.",
    );
  }
  const divisor = greatestCommonDivisor(width, height);
  return `${Math.round(width / divisor)}:${Math.round(height / divisor)}`;
}
'''
write("src/server/generation/geometry.ts", geometry)

# Native generation: make image geometry truthful and resolve Video Original from source bytes.
path = "src/server/generation/native-generation.ts"
text = read(path)
text = replace_once(
    text,
    'import { findWorker, workersForEcosystem, type GenerationWorker } from "@/server/generation/worker-fleet";\n',
    'import { findWorker, workersForEcosystem, type GenerationWorker } from "@/server/generation/worker-fleet";\n'
    'import { createImageGenerationCanvas, prepareImageAspectOverride, sourceVideoAspectRatio } from "@/server/generation/geometry";\n',
    "native geometry import",
)
text = regex_once(
    text,
    r'const grayPng = Buffer\.from\(.*?\n\);\n\n',
    '',
    "remove square canvas",
)
replacement = '''type PreparedWorkerPayload = {
  sources: InputBytes[];
  aspectRatio: string;
};

async function prepareWorkerPayload(
  request: GenerationRequest,
  workflow: WorkflowConfig,
  sources: InputBytes[],
): Promise<PreparedWorkerPayload> {
  const operation = resolveCreativeOperation(request);

  if (workflow.kind === "image") {
    if (operation === "create-image") {
      if (request.output.aspectRatio === "original") {
        throw new Error("Original geometry requires a source image.");
      }
      return {
        sources: [await createImageGenerationCanvas(request.output.aspectRatio)],
        aspectRatio: request.output.aspectRatio,
      };
    }

    if (!sources.length) throw new Error("Image editing requires a source image.");
    if (request.output.aspectRatio === "original") {
      return { sources, aspectRatio: "original" };
    }

    const [primary, ...rest] = sources;
    const preparedPrimary = await prepareImageAspectOverride(primary.bytes, request.output.aspectRatio);
    return {
      sources: [
        {
          bytes: preparedPrimary,
          contentType: "image/png",
          filename: `${primary.filename.replace(/\\.[^.]+$/, "")}-renderlab-${request.output.aspectRatio.replace(":", "x")}.png`,
        },
        ...rest,
      ],
      aspectRatio: request.output.aspectRatio,
    };
  }

  if (request.output.aspectRatio !== "original") {
    return { sources, aspectRatio: request.output.aspectRatio };
  }
  const primary = sources[0];
  if (!primary) throw new Error("Original geometry requires a source image.");
  return { sources, aspectRatio: await sourceVideoAspectRatio(primary.bytes) };
}

function buildForm(request: GenerationRequest, workflow: WorkflowConfig, prepared: PreparedWorkerPayload) {
  const form = new FormData();
  if (workflow.kind === "image") {
    for (const source of prepared.sources) {
      form.append("image_files", new Blob([Uint8Array.from(source.bytes).buffer], { type: source.contentType }), source.filename);
    }
    form.append("prompt", request.prompt);
    form.append("negative_prompt", request.advanced?.negativePrompt ?? "");
    form.append("seed", String(request.advanced?.seed ?? workflow.defaults.seed));
    form.append("steps", String(request.advanced?.steps ?? workflow.defaults.steps));
    form.append("cfg", String(request.advanced?.guidance ?? workflow.defaults.guidance));
    form.append("megapixels", String(workflow.defaults.megapixels));
    return form;
  }

  const source = prepared.sources[0];
  if (source) form.append("image_file", new Blob([Uint8Array.from(source.bytes).buffer], { type: source.contentType }), source.filename);
  form.append("prompt", request.prompt);
  form.append("negative_prompt", request.advanced?.negativePrompt ?? "");
  form.append("seed", String(request.advanced?.seed ?? workflow.defaults.seed));
  form.append("steps", String(request.advanced?.steps ?? workflow.defaults.steps));
  form.append("cfg", String(request.advanced?.guidance ?? workflow.defaults.guidance));
  form.append("resolution", workflow.defaults.resolution!);
  form.append("duration_seconds", String(request.output.durationSeconds ?? workflow.defaults.durationSeconds));
  form.append("audio_enabled", String(request.output.audioEnabled ?? workflow.defaults.audioEnabled));
  form.append("aspect_ratio", prepared.aspectRatio);
  form.append("frame_rate", String(request.advanced?.frameRate ?? workflow.defaults.frameRate));
  return form;
}

'''
text = regex_once(
    text,
    r'function buildForm\(request: GenerationRequest, workflow: WorkflowConfig, sources: InputBytes\[\]\) \{.*?\n\}\n\n(?=async function errorBody)',
    replacement,
    "native build form",
)
text = replace_once(
    text,
    'async function submitWorker(workflow: WorkflowConfig, request: GenerationRequest, sources: InputBytes[]) {\n  const failures: Array<Record<string, unknown>> = [];\n',
    'async function submitWorker(workflow: WorkflowConfig, request: GenerationRequest, sources: InputBytes[]) {\n'
    '  const prepared = await prepareWorkerPayload(request, workflow, sources);\n'
    '  const failures: Array<Record<string, unknown>> = [];\n',
    "prepare submit payload",
)
text = text.replace('body: buildForm(request, workflow, sources),', 'body: buildForm(request, workflow, prepared),', 1)
text = replace_once(
    text,
    '  const sources = await resolveInputs(row.owner_id, request);\n  const excluded = attemptedWorkerIds(row);\n',
    '  const sources = await resolveInputs(row.owner_id, request);\n'
    '  const prepared = await prepareWorkerPayload(request, workflow, sources);\n'
    '  const excluded = attemptedWorkerIds(row);\n',
    "prepare reassign payload",
)
# Second buildForm call belongs to reassignment.
idx = text.find('body: buildForm(request, workflow, sources),')
if idx == -1:
    raise RuntimeError("reassign buildForm call not found")
text = text[:idx] + 'body: buildForm(request, workflow, prepared),' + text[idx + len('body: buildForm(request, workflow, sources),'):]
write(path, text)

# Create: source-aware defaults + a real menu now that the preset set is larger.
path = "src/features/create/create-workspace.tsx"
text = read(path)
text = replace_once(
    text,
    'import { ImageIcon, MoreHorizontal, Plus, Volume2, VolumeX, X } from "lucide-react";\n',
    'import { ChevronDown, ImageIcon, MoreHorizontal, Plus, Volume2, VolumeX, X } from "lucide-react";\n',
    "create icons",
)
text = replace_once(
    text,
    'import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";\n',
    'import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";\n'
    'import {\n'
    '  DropdownMenu,\n'
    '  DropdownMenuContent,\n'
    '  DropdownMenuLabel,\n'
    '  DropdownMenuRadioGroup,\n'
    '  DropdownMenuRadioItem,\n'
    '  DropdownMenuSeparator,\n'
    '  DropdownMenuTrigger,\n'
    '} from "@/components/ui/dropdown-menu";\n',
    "create dropdown imports",
)
text = replace_once(
    text,
    '  GenerationInputRole,\n  OutputKind,\n} from "@/lib/capabilities/generation";\n',
    '  GenerationInputRole,\n  OutputKind,\n  PresetAspectRatio,\n} from "@/lib/capabilities/generation";\n',
    "create ratio type import",
)
# Remove obsolete cycle helper.
text = regex_once(
    text,
    r'function nextValue<T>\(values: readonly T\[\], current: T\) \{\n  const currentIndex = values\.indexOf\(current\);\n  return values\[\(currentIndex \+ 1\) % values\.length\];\n\}\n\n',
    '',
    "remove nextValue",
)
menu = '''function AspectRatioMenu({
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

'''
text = replace_once(text, 'function pollRetryDelay(attempt: number) {\n', menu + 'function pollRetryDelay(attempt: number) {\n', "aspect menu")
text = replace_once(
    text,
    '  const [imageAspect, setImageAspect] = useState<AspectRatio>("1:1");\n'
    '  const [videoAspect, setVideoAspect] = useState<AspectRatio>("16:9");\n',
    '  const [imageAspect, setImageAspect] = useState<AspectRatio>(() => initialContinuation ? "original" : "1:1");\n'
    '  const [videoAspect, setVideoAspect] = useState<AspectRatio>(() => initialContinuation ? "original" : "16:9");\n',
    "source-aware initial geometry",
)
text = replace_once(
    text,
    '    setContinuationSource(null);\n    setError(null);\n',
    '    setContinuationSource(null);\n'
    '    setImageAspect((current) => current === "original" ? "1:1" : current);\n'
    '    setVideoAspect((current) => current === "original" ? "16:9" : current);\n'
    '    setError(null);\n',
    "clear source geometry",
)
text = replace_once(
    text,
    '    setContinuationSource({ id: resultAsset.id, inputRole: action.inputRole });\n'
    '    setReferencePreviewUrl(resultAsset.contentUrl);\n'
    '    setOutputKind(action.outputKind);\n',
    '    setContinuationSource({ id: resultAsset.id, inputRole: action.inputRole });\n'
    '    setReferencePreviewUrl(resultAsset.contentUrl);\n'
    '    setImageAspect("original");\n'
    '    setVideoAspect("original");\n'
    '    setOutputKind(action.outputKind);\n',
    "continuation source geometry",
)
text = replace_once(
    text,
    '      const asset = await uploadPersistentImageFile(file, mimeType as MediaUploadMimeType);\n      setReference(asset);\n',
    '      const asset = await uploadPersistentImageFile(file, mimeType as MediaUploadMimeType);\n'
    '      setReference(asset);\n'
    '      setImageAspect("original");\n'
    '      setVideoAspect("original");\n',
    "uploaded source geometry",
)
ratio_block = '''                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (outputKind === "image") setImageAspect(nextValue(imageAspectRatios, imageAspect));
                    else setVideoAspect(nextValue(videoAspectRatios, videoAspect));
                  }}
                  aria-label={`Aspect ratio ${aspectRatio}. Activate to choose the next ratio.`}
                  className="shrink-0"
                >
                  {aspectRatio}
                </Button>
'''
ratio_menu = '''                <AspectRatioMenu
                  value={aspectRatio}
                  options={outputKind === "image" ? imageAspectRatios : videoAspectRatios}
                  sourceAware={hasReference}
                  onValueChange={(value) => {
                    if (outputKind === "image") setImageAspect(value);
                    else setVideoAspect(value);
                    setError(null);
                  }}
                />
'''
text = replace_once(text, ratio_block, ratio_menu, "create aspect menu usage")
# Duration still needs a small cycling helper; inline it rather than restore the generic helper.
text = replace_once(
    text,
    '                      onClick={() => setDurationSeconds(nextValue(videoDurations, durationSeconds))}\n',
    '                      onClick={() => {\n'
    '                        const currentIndex = videoDurations.indexOf(durationSeconds);\n'
    '                        setDurationSeconds(videoDurations[(currentIndex + 1) % videoDurations.length]);\n'
    '                      }}\n',
    "duration cycle",
)
write(path, text)

# UI parser regression: Original without a source must be rejected.
path = "tests/ui/create.spec.ts"
text = read(path)
needle = '''  const invalidAdvanced = await request.post("/api/generation/jobs", {
'''
insert = '''  const invalidOriginal = await request.post("/api/generation/jobs", {
    data: {
      prompt: "A valid prompt",
      output: { kind: "image", aspectRatio: "original" },
      inputs: [],
    },
  });
  expect(invalidOriginal.status()).toBe(400);
  const originalBody = await invalidOriginal.json();
  expect(originalBody.ok).toBe(false);
  expect(originalBody.error.message).toContain("requires a source image");

'''
text = replace_once(text, needle, insert + needle, "create parser regression")
write(path, text)

# Image integration: verify Create ratio, Edit Original, and explicit Edit override end-to-end.
path = "scripts/verify-generation-bridge.mjs"
text = read(path)
text = replace_once(text, 'import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";\n', 'import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";\nimport sharp from "sharp";\n', "generation sharp import")
text = replace_once(
    text,
    'async function verifyMediaAsset(account, assetId, expectedKind) {\n',
    'async function verifyMediaAsset(account, assetId, expectedKind) {\n',
    "generation media function anchor",
)
text = replace_once(
    text,
    '''  if (expectedKind === "video" && !contentType.startsWith("video/")) {
    throw new Error(`Media content is not a video: ${contentType}`);
  }
}

async function verifyGeneration(account, request, expectedOperation, label) {
''',
    '''  if (expectedKind === "video" && !contentType.startsWith("video/")) {
    throw new Error(`Media content is not a video: ${contentType}`);
  }
  const bytes = Buffer.from(await content.arrayBuffer());
  if (expectedKind !== "image") return null;
  const metadata = await sharp(bytes).metadata();
  if (!metadata.width || !metadata.height) throw new Error("Generated image dimensions could not be read.");
  return { width: metadata.width, height: metadata.height };
}

function assertAspectRatio(dimensions, expected, label) {
  const [expectedWidth, expectedHeight] = expected.split(":").map(Number);
  const actual = dimensions.width / dimensions.height;
  const target = expectedWidth / expectedHeight;
  if (Math.abs(actual - target) > 0.035) {
    throw new Error(`${label} geometry mismatch: got ${dimensions.width}x${dimensions.height}, expected ${expected}.`);
  }
}

async function verifyGeneration(account, request, expectedOperation, label, expectedAspect = null) {
''',
    "generation dimension verification",
)
text = replace_once(
    text,
    '      await verifyMediaAsset(account, assets[0].id, request.output.kind);\n      console.log(`${label} verified. owner=${account.id} job=${jobId} asset=${assets[0].id}`);\n',
    '      const dimensions = await verifyMediaAsset(account, assets[0].id, request.output.kind);\n'
    '      if (expectedAspect && dimensions) assertAspectRatio(dimensions, expectedAspect, label);\n'
    '      console.log(`${label} verified. owner=${account.id} job=${jobId} asset=${assets[0].id}`);\n',
    "generation aspect assertion",
)
text = replace_once(text, 'let createResult = null;\nlet editResult = null;\n', 'let createResult = null;\nlet editResult = null;\nlet overrideResult = null;\n', "generation result vars")
text = replace_once(text, '      output: { kind: "image", aspectRatio: "1:1" },\n', '      output: { kind: "image", aspectRatio: "16:9" },\n', "create ratio request")
text = replace_once(
    text,
    '    "Create Image",\n  );\n\n  editResult = await verifyGeneration(',
    '    "Create Image",\n    "16:9",\n  );\n\n  editResult = await verifyGeneration(',
    "create ratio expectation",
)
text = replace_once(
    text,
    '      output: { kind: "image", aspectRatio: "1:1" },\n',
    '      output: { kind: "image", aspectRatio: "original" },\n',
    "edit original request",
)
text = replace_once(
    text,
    '    "Edit Image from persisted media asset",\n  );\n\n  console.log(`Native Create Image -> persisted media asset -> Edit Image continuation verified successfully for owner=${account.id}.`);\n',
    '    "Edit Image Original from persisted media asset",\n'
    '    "16:9",\n'
    '  );\n\n'
    '  overrideResult = await verifyGeneration(\n'
    '    account,\n'
    '    {\n'
    '      prompt: "Reframe the red sphere as a portrait while preserving the subject",\n'
    '      output: { kind: "image", aspectRatio: "4:5" },\n'
    '      inputs: [\n'
    '        {\n'
    '          source: { type: "media-asset", id: createResult.assetId },\n'
    '          role: "primary-image",\n'
    '        },\n'
    '      ],\n'
    '    },\n'
    '    "edit-image",\n'
    '    "Edit Image explicit 4:5 override",\n'
    '    "4:5",\n'
    '  );\n\n'
    '  console.log(`Native Create ratio -> Edit Original -> Edit override verified successfully for owner=${account.id}.`);\n',
    "edit geometry scenarios",
)
text = replace_once(
    text,
    '  if (editResult?.jobId) fixtureJobIds.add(editResult.jobId);\n',
    '  if (overrideResult?.jobId) fixtureJobIds.add(overrideResult.jobId);\n'
    '  if (editResult?.jobId) fixtureJobIds.add(editResult.jobId);\n',
    "geometry cleanup",
)
write(path, text)

# Video integration: non-square source + Original intent must yield source-aware video geometry.
path = "scripts/verify-video-generation.mjs"
text = read(path)
text = replace_once(
    text,
    'import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";\n',
    'import { execFile } from "node:child_process";\n'
    'import { mkdtemp, rm, writeFile } from "node:fs/promises";\n'
    'import { tmpdir } from "node:os";\n'
    'import { join } from "node:path";\n'
    'import { promisify } from "node:util";\n'
    'import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";\n'
    'import sharp from "sharp";\n\n'
    'const execFileAsync = promisify(execFile);\n',
    "video inspection imports",
)
text = regex_once(
    text,
    r'const reference = Buffer\.from\(\n  ".*?",\n  "base64",\n\);',
    'const reference = await sharp({\n'
    '  create: { width: 128, height: 64, channels: 3, background: { r: 128, g: 128, b: 128 } },\n'
    '}).png().toBuffer();',
    "video non-square reference",
)
text = replace_once(text, '    body: JSON.stringify({ sourceId: uploadTicket.sourceId, width: 64, height: 64 }),\n', '    body: JSON.stringify({ sourceId: uploadTicket.sourceId, width: 128, height: 64 }),\n', "video source dimensions")
text = replace_once(
    text,
    'async function verifyAsset(account, assetId) {\n',
    'async function verifyAsset(account, assetId, expectedAspect) {\n',
    "video verify signature",
)
text = replace_once(
    text,
    '''  if (!content.ok || !String(content.headers.get("content-type") || "").startsWith("video/")) {
    throw new Error(`Video content invalid (${content.status}, ${content.headers.get("content-type")})`);
  }
}

async function generate(account, request, operation, label) {
''',
    '''  if (!content.ok || !String(content.headers.get("content-type") || "").startsWith("video/")) {
    throw new Error(`Video content invalid (${content.status}, ${content.headers.get("content-type")})`);
  }
  const directory = await mkdtemp(join(tmpdir(), "renderlab-video-"));
  const filename = join(directory, "output.mp4");
  try {
    await writeFile(filename, Buffer.from(await content.arrayBuffer()));
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height",
      "-of", "csv=p=0:s=x",
      filename,
    ]);
    const [width, height] = stdout.trim().split("x").map(Number);
    const [expectedWidth, expectedHeight] = expectedAspect.split(":").map(Number);
    if (!(width > 0) || !(height > 0) || Math.abs(width / height - expectedWidth / expectedHeight) > 0.04) {
      throw new Error(`Video geometry mismatch: got ${width}x${height}, expected ${expectedAspect}.`);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function generate(account, request, operation, label, expectedAspect) {
''',
    "video dimension inspection",
)
text = replace_once(
    text,
    '        || persistedJob.parameters?.output?.audioEnabled !== request.output.audioEnabled\n',
    '        || persistedJob.parameters?.output?.audioEnabled !== request.output.audioEnabled\n'
    '        || persistedJob.parameters?.output?.aspectRatio !== request.output.aspectRatio\n',
    "persisted video geometry intent",
)
text = replace_once(text, '      await verifyAsset(account, list[0].id);\n', '      await verifyAsset(account, list[0].id, expectedAspect);\n', "video aspect assertion")
text = replace_once(
    text,
    '    "Create Video",\n  );\n',
    '    "Create Video",\n    "16:9",\n  );\n',
    "video create expected ratio",
)
text = replace_once(
    text,
    '      output: { kind: "video", aspectRatio: "16:9", durationSeconds: 5, audioEnabled: true },\n',
    '      output: { kind: "video", aspectRatio: "original", durationSeconds: 5, audioEnabled: true },\n',
    "animate original request",
)
text = replace_once(
    text,
    '    "Animate Image",\n  );\n',
    '    "Animate Image Original",\n    "2:1",\n  );\n',
    "animate expected source geometry",
)
write(path, text)

# Workflows: generation contract changes should trigger the image gate; video needs ffprobe.
path = ".github/workflows/generation-bridge-integration.yml"
text = read(path)
text = replace_once(
    text,
    '      - "src/lib/supabase/**"\n',
    '      - "src/lib/supabase/**"\n'
    '      - "src/lib/capabilities/generation.ts"\n'
    '      - "src/lib/api/generation-contract.ts"\n',
    "generation PR paths",
)
# Push block has a second identical supabase path.
idx = text.find('      - "src/lib/supabase/**"\n', text.find('      - "src/lib/supabase/**"\n') + 1)
if idx == -1:
    raise RuntimeError("generation push supabase path not found")
insert = '      - "src/lib/supabase/**"\n      - "src/lib/capabilities/generation.ts"\n      - "src/lib/api/generation-contract.ts"\n'
text = text[:idx] + insert + text[idx + len('      - "src/lib/supabase/**"\n'):]
write(path, text)

path = ".github/workflows/video-generation-integration.yml"
text = read(path)
text = replace_once(
    text,
    '      - name: Install dependencies\n        run: npm install --no-audit --no-fund\n\n      - name: Build\n',
    '      - name: Install dependencies\n'
    '        run: npm install --no-audit --no-fund\n\n'
    '      - name: Install media inspection tools\n'
    '        run: sudo apt-get update && sudo apt-get install -y ffmpeg\n\n'
    '      - name: Build\n',
    "video ffprobe setup",
)
write(path, text)

print("Phase 7A geometry patch applied.")
