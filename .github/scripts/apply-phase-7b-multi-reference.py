from pathlib import Path
import re


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, found {count}: {old[:140]!r}")
    file.write_text(text.replace(old, new, 1))


def replace_regex(path: str, pattern: str, replacement: str) -> None:
    file = Path(path)
    text = file.read_text()
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"{path}: expected one regex match, found {count}: {pattern[:140]!r}")
    file.write_text(updated)


# Central product input-slot capabilities.
replace_once(
    "src/lib/capabilities/generation.ts",
    '''export type GenerationInput = {
  alias: GenerationInputAlias;
  source: GenerationInputSource;
  role: GenerationInputRole;
};

export const defaultVideoAudioEnabled = true;''',
    '''export type GenerationInput = {
  alias: GenerationInputAlias;
  source: GenerationInputSource;
  role: GenerationInputRole;
};

export const generationInputCapabilities = {
  image: {
    maxCount: 2,
    roles: ["primary-image", "reference"] as const,
  },
  video: {
    maxCount: 1,
    roles: ["first-frame"] as const,
  },
} as const;

export function maxGenerationInputsForOutput(kind: OutputKind) {
  return generationInputCapabilities[kind].maxCount;
}

export function generationInputRoleForIndex(kind: OutputKind, index: number): GenerationInputRole | null {
  if (!Number.isInteger(index) || index < 0) return null;
  const roles = generationInputCapabilities[kind].roles as readonly GenerationInputRole[];
  return roles[index] ?? null;
}

export const defaultVideoAudioEnabled = true;''',
)

# Authoritative parse-time count/role validation.
replace_once(
    "src/lib/api/generation-contract.ts",
    '''  defaultVideoAudioEnabled,
  generationAdvancedCapabilities,
  generationInputAlias,
  generationInputAliasPattern,
  imageAspectRatios,''',
    '''  defaultVideoAudioEnabled,
  generationAdvancedCapabilities,
  generationInputAlias,
  generationInputAliasPattern,
  generationInputRoleForIndex,
  imageAspectRatios,
  maxGenerationInputsForOutput,''',
)
replace_once(
    "src/lib/api/generation-contract.ts",
    '''  const inputs = parseInputs(value.inputs);
  if (!inputs) {
    return { ok: false, error: { code: "invalid_request", message: "Generation inputs are invalid." } };
  }

  const unresolvedReferences = unresolvedGenerationPromptReferenceAliases(''',
    '''  const inputs = parseInputs(value.inputs);
  if (!inputs) {
    return { ok: false, error: { code: "invalid_request", message: "Generation inputs are invalid." } };
  }

  const outputKind = kind as OutputKind;
  const maxInputs = maxGenerationInputsForOutput(outputKind);
  if (inputs.length > maxInputs) {
    return {
      ok: false,
      error: {
        code: "invalid_request",
        message: `${outputKind === "image" ? "Image" : "Video"} accepts at most ${maxInputs} image ${maxInputs === 1 ? "input" : "inputs"}.`,
      },
    };
  }
  for (const [index, input] of inputs.entries()) {
    const expectedRole = generationInputRoleForIndex(outputKind, index);
    if (!expectedRole || input.role !== expectedRole) {
      return {
        ok: false,
        error: {
          code: "invalid_request",
          message: `${outputKind === "image" ? "Image" : "Video"} input ${index + 1} must use the ${expectedRole ?? "supported"} role.`,
        },
      };
    }
  }

  const unresolvedReferences = unresolvedGenerationPromptReferenceAliases(''',
)

# Validate temporary and durable image inputs at the owner-aware server boundary.
replace_once(
    "src/server/generation/submit-generation.ts",
    '''import { isNativeGenerationConfigured, submitNativeGeneration } from "@/server/generation/native-generation";
import { getMediaAsset } from "@/server/media/media-assets";''',
    '''import { isNativeGenerationConfigured, submitNativeGeneration } from "@/server/generation/native-generation";
import { getMediaAsset } from "@/server/media/media-assets";
import { supabaseRest } from "@/server/data/supabase-rest";''',
)
replace_regex(
    "src/server/generation/submit-generation.ts",
    r'''async function durableMediaInputsAvailable\(ownerId: string, request: GenerationRequest\) \{.*?\n\}\n\nasync function submitToRenderLabBackend''',
    '''async function generationImageInputsAvailable(ownerId: string, request: GenerationRequest) {
  const available = await Promise.all(request.inputs.map(async (input) => {
    if (input.source.type === "media-asset") {
      const asset = await getMediaAsset(ownerId, input.source.id);
      return asset?.kind === "image";
    }

    const rows = await supabaseRest<Array<{ mime_type: string; status: string }>>(
      `generation_sources?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(input.source.id)}&select=mime_type,status&limit=1`,
      { method: "GET" },
    );
    const source = rows?.[0];
    return source?.status === "ready" && source.mime_type.startsWith("image/");
  }));
  return available.every(Boolean);
}

async function submitToRenderLabBackend''',
)
replace_once(
    "src/server/generation/submit-generation.ts",
    '''  if (!(await durableMediaInputsAvailable(ownerId, request))) {
    return {
      ok: false,
      error: {
        code: "generation_submission_failed",
        message: "One or more media inputs are unavailable or are not images.",
      },
    };
  }''',
    '''  if (!(await generationImageInputsAvailable(ownerId, request))) {
    return {
      ok: false,
      error: {
        code: "generation_submission_failed",
        message: "One or more image inputs are unavailable, not ready, not images, or not owned by this account.",
      },
    };
  }''',
)

# Mention picker now lists all attached request references while keeping per-row alias triggers.
Path("src/features/create/create-reference-mention-menu.tsx").write_text('''"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { GenerationInputAlias } from "@/lib/capabilities/generation";

export type CreateReferenceMentionOption = {
  alias: GenerationInputAlias;
  previewUrl: string;
  label: string;
};

export function CreateReferenceMentionMenu({
  triggerAlias,
  references,
  open,
  onOpenChange,
  onSelect,
}: {
  triggerAlias: GenerationInputAlias;
  references: readonly CreateReferenceMentionOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (alias: GenerationInputAlias) => void;
}) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-label={`Mention @${triggerAlias}`}
          className="shrink-0 gap-1 px-2"
        >
          @{triggerAlias}
          <ChevronDown aria-hidden="true" className="size-3 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-64">
        <DropdownMenuLabel>Mention reference</DropdownMenuLabel>
        {references.map((reference) => (
          <DropdownMenuItem
            key={reference.alias}
            onSelect={() => onSelect(reference.alias)}
            className="gap-3"
          >
            <span className="size-10 shrink-0 overflow-hidden rounded-md bg-surface-3">
              <img src={reference.previewUrl} alt="" className="size-full object-cover" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-text">@{reference.alias}</span>
              <span className="block truncate text-xs text-text-muted">{reference.label}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
''')

# Create workspace: replace the single-reference state with a bounded stable-alias array.
replace_once(
    "src/features/create/create-workspace.tsx",
    '''import { ChevronDown, ImageIcon, MoreHorizontal, Plus, Volume2, X } from "lucide-react";''',
    '''import { ChevronDown, MoreHorizontal, Plus, Volume2, X } from "lucide-react";''',
)
replace_once(
    "src/features/create/create-workspace.tsx",
    '''  generationInputAlias,
  imageAspectRatios,
  unresolvedGenerationPromptReferenceAliases,
  videoAspectRatios,''',
    '''  generationInputAlias,
  generationInputRoleForIndex,
  imageAspectRatios,
  maxGenerationInputsForOutput,
  unresolvedGenerationPromptReferenceAliases,
  videoAspectRatios,''',
)
replace_once(
    "src/features/create/create-workspace.tsx",
    '''type ContinuationSource = {
  id: string;
  inputRole: Extract<GenerationInputRole, "primary-image" | "first-frame">;
};

type InitialContinuation = {
  asset: PublicMediaAsset;
  action: ContinuationAction;
};

const maxPollRetries = 5;''',
    '''type InitialContinuation = {
  asset: PublicMediaAsset;
  action: ContinuationAction;
};

type AttachedReference = {
  alias: GenerationInputAlias;
  asset: PublicMediaAsset;
  previewUrl: string;
  label: string;
};

function referenceAssetLabel(asset: PublicMediaAsset) {
  if (asset.origin === "uploaded") {
    return asset.displayName || asset.originalFilename || "Uploaded image";
  }
  return "Generated result";
}

const maxPollRetries = 5;''',
)
replace_once(
    "src/features/create/create-workspace.tsx",
    '''function revokePreviewUrl(url: string | null) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

function isTerminalJob''',
    '''function isTerminalJob''',
)
replace_once(
    "src/features/create/create-workspace.tsx",
    '''  const [audioEnabled, setAudioEnabled] = useState(defaultVideoAudioEnabled);
  const [reference, setReference] = useState<PublicMediaAsset | null>(null);
  const [continuationSource, setContinuationSource] = useState<ContinuationSource | null>(() =>
    initialContinuation
      ? { id: initialContinuation.asset.id, inputRole: initialContinuation.action.inputRole }
      : null,
  );
  const [referencePreviewUrl, setReferencePreviewUrl] = useState<string | null>(() =>
    initialContinuation?.asset.contentUrl ?? null,
  );
  const [referenceAlias, setReferenceAlias] = useState<GenerationInputAlias | null>(() =>
    initialContinuation ? generationInputAlias(1) : null,
  );
  const [nextReferenceNumber, setNextReferenceNumber] = useState(initialContinuation ? 2 : 1);
  const [referenceMentionOpen, setReferenceMentionOpen] = useState(false);
  const [mentionRange, setMentionRange] = useState<{ start: number; end: number } | null>(null);
  const [referenceUploading, setReferenceUploading] = useState(false);''',
    '''  const [audioEnabled, setAudioEnabled] = useState(defaultVideoAudioEnabled);
  const [references, setReferences] = useState<AttachedReference[]>(() =>
    initialContinuation
      ? [{
          alias: generationInputAlias(1),
          asset: initialContinuation.asset,
          previewUrl: initialContinuation.asset.contentUrl,
          label: referenceAssetLabel(initialContinuation.asset),
        }]
      : [],
  );
  const [nextReferenceNumber, setNextReferenceNumber] = useState(initialContinuation ? 2 : 1);
  const [referenceMentionOpen, setReferenceMentionOpen] = useState(false);
  const [mentionMenuAnchorAlias, setMentionMenuAnchorAlias] = useState<GenerationInputAlias | null>(() =>
    initialContinuation ? generationInputAlias(1) : null,
  );
  const [mentionRange, setMentionRange] = useState<{ start: number; end: number } | null>(null);
  const [referenceUploadTargetAlias, setReferenceUploadTargetAlias] = useState<GenerationInputAlias | null>(null);
  const [referenceUploading, setReferenceUploading] = useState(false);''',
)
replace_regex(
    "src/features/create/create-workspace.tsx",
    r'''\n  useEffect\(\(\) => \{\n    return \(\) => revokePreviewUrl\(referencePreviewUrl\);\n  \}, \[referencePreviewUrl\]\);\n''',
    '''\n''',
)
replace_once(
    "src/features/create/create-workspace.tsx",
    '''  const aspectRatio = outputKind === "image" ? imageAspect : videoAspect;
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

  const unresolvedReferenceAliases = useMemo(
    () => unresolvedGenerationPromptReferenceAliases(
      prompt,
      hasReference && referenceAlias ? [referenceAlias] : [],
    ),
    [hasReference, prompt, referenceAlias],
  );
  const jobActive = Boolean(job && !isTerminalJob(job));
  const canSubmit =
    accountAvailable
    && generationAvailable
    && Boolean(prompt.trim())
    && (!hasReference || Boolean(referenceAlias))
    && unresolvedReferenceAliases.length === 0
    && !submitting
    && !referenceUploading
    && !jobActive;
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
  const referenceLabel = continuationSource
    ? continuationSourceLabel ?? "Generated result"
    : reference?.displayName ?? reference?.originalFilename ?? "Reference image";''',
    '''  const aspectRatio = outputKind === "image" ? imageAspect : videoAspect;
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
  const continuationActions = resultAsset ? continuationActionsForMedia(resultAsset.kind) : [];''',
)
replace_once(
    "src/features/create/create-workspace.tsx",
    '''    if (referenceAlias && match) {
      setMentionRange({ start: start - match[1].length, end: start });
      setReferenceMentionOpen(true);
      return;
    }''',
    '''    if (references.length && match) {
      setMentionMenuAnchorAlias(references[0].alias);
      setMentionRange({ start: start - match[1].length, end: start });
      setReferenceMentionOpen(true);
      return;
    }''',
)
replace_regex(
    "src/features/create/create-workspace.tsx",
    r'''  function insertReferenceMention\(\) \{.*?\n  \}\n\n  function clearReference\(\) \{.*?\n  \}\n\n  function startContinuation\(action: ContinuationAction\) \{.*?\n  \}\n''',
    '''  function insertReferenceMention(alias: GenerationInputAlias) {
    const range = mentionRange ?? promptSelectionRef.current;
    const before = prompt.slice(0, range.start);
    const after = prompt.slice(range.end);
    const leadingSpace = before && !/\\s$/.test(before) ? " " : "";
    const trailingSpace = after && /^\\s/.test(after) ? "" : " ";
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
      asset: resultAsset,
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
''',
)
replace_regex(
    "src/features/create/create-workspace.tsx",
    r'''  async function uploadReference\(file: File\) \{.*?\n  \}\n\n  async function submit''',
    '''  async function uploadReference(file: File, targetAlias: GenerationInputAlias | null) {
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
        asset,
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
      setImageAspect("original");
      setVideoAspect("original");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Reference upload failed.");
    } finally {
      setReferenceUploading(false);
      setReferenceUploadTargetAlias(null);
    }
  }

  async function submit''',
)
replace_once(
    "src/features/create/create-workspace.tsx",
    '''    if (hasReference && !referenceAlias) {
      setError("The attached reference is missing its product identity. Reattach it before generating.");
      return;
    }

    const advanced = advancedParametersFromDraft''',
    '''    const advanced = advancedParametersFromDraft''',
)
replace_regex(
    "src/features/create/create-workspace.tsx",
    r'''    const inputs = continuationSource\n      \? \[.*?\n        : \[\];\n''',
    '''    const inputs = references.map((reference, index) => ({
      alias: reference.alias,
      source: { type: "media-asset" as const, id: reference.asset.id },
      role: generationInputRoleForIndex(outputKind, index)!,
    }));
''',
)

# Replace the single reference row with the bounded list + maintained row actions.
replace_regex(
    "src/features/create/create-workspace.tsx",
    r'''          \{referencePreviewUrl \? \(.*?          \) : null\}\n\n          <Collapsible''',
    '''          {references.length ? (
            <div className="mb-3 space-y-2" aria-label="Attached references">
              {references.map((reference, index) => (
                <div
                  key={reference.alias}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-2"
                >
                  <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-surface-3">
                    <img
                      src={reference.previewUrl}
                      alt={references.length === 1 ? "Reference preview" : `Reference @${reference.alias} preview`}
                      className="size-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
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
              ))}
            </div>
          ) : null}

          <Collapsible''',
)

# File chooser/add control: Add means add, replacement is per-row and aliases stay stable.
replace_once(
    "src/features/create/create-workspace.tsx",
    '''                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadReference(file);
                  }}''',
    '''                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadReference(file, referenceUploadTargetAlias);
                  }}''',
)
replace_regex(
    "src/features/create/create-workspace.tsx",
    r'''                <Button\n                  type="button"\n                  variant="secondary"\n                  size="icon"\n                  disabled=\{!accountAvailable \|\| !mediaUploadAvailable \|\| referenceUploading\}\n                  onClick=\{\(\) => fileInputRef\.current\?\.click\(\)\}\n                  aria-label=\{hasReference \? "Replace reference" : "Add reference"\}\n                  title=\{.*?\n                </Button>''',
    '''                <Button
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
                </Button>''',
)

# Output switch cannot silently discard a second image.
replace_once(
    "src/features/create/create-workspace.tsx",
    '''                    const kind = value as OutputKind;
                    setOutputKind(kind);
                    setError(null);
                    setContinuationSource((current) =>
                      current
                        ? {
                            ...current,
                            inputRole: kind === "image" ? "primary-image" : "first-frame",
                          }
                        : current,
                    );''',
    '''                    const kind = value as OutputKind;
                    if (references.length > maxGenerationInputsForOutput(kind)) {
                      setError("Video uses one source image. Remove one reference before switching to Video.");
                      return;
                    }
                    setOutputKind(kind);
                    setError(null);''',
)

# Static API tests for the new authoritative slot contract.
replace_once(
    "tests/ui/create.spec.ts",
    '''  const legacyPositionalAlias = await request.post("/api/generation/jobs", {''',
    '''  const tooManyImageInputs = await request.post("/api/generation/jobs", {
    data: {
      prompt: "Use three references",
      output: { kind: "image", aspectRatio: "1:1" },
      inputs: [
        { alias: "image1", source: { type: "temporary-source", id: "fixture-a" }, role: "primary-image" },
        { alias: "image2", source: { type: "temporary-source", id: "fixture-b" }, role: "reference" },
        { alias: "image3", source: { type: "temporary-source", id: "fixture-c" }, role: "reference" },
      ],
    },
  });
  expect(tooManyImageInputs.status()).toBe(400);
  expect((await tooManyImageInputs.json()).error.message).toContain("at most 2");

  const invalidImageRoleOrder = await request.post("/api/generation/jobs", {
    data: {
      prompt: "Use both references",
      output: { kind: "image", aspectRatio: "1:1" },
      inputs: [
        { alias: "image1", source: { type: "temporary-source", id: "fixture-a" }, role: "reference" },
        { alias: "image2", source: { type: "temporary-source", id: "fixture-b" }, role: "primary-image" },
      ],
    },
  });
  expect(invalidImageRoleOrder.status()).toBe(400);
  expect((await invalidImageRoleOrder.json()).error.message).toContain("primary-image");

  const tooManyVideoInputs = await request.post("/api/generation/jobs", {
    data: {
      prompt: "Animate two images",
      output: { kind: "video", aspectRatio: "16:9", durationSeconds: 5 },
      inputs: [
        { alias: "image1", source: { type: "temporary-source", id: "fixture-a" }, role: "first-frame" },
        { alias: "image2", source: { type: "temporary-source", id: "fixture-b" }, role: "reference" },
      ],
    },
  });
  expect(tooManyVideoInputs.status()).toBe(400);
  expect((await tooManyVideoInputs.json()).error.message).toContain("at most 1");

  const invalidVideoRole = await request.post("/api/generation/jobs", {
    data: {
      prompt: "Animate this image",
      output: { kind: "video", aspectRatio: "16:9", durationSeconds: 5 },
      inputs: [
        { alias: "image1", source: { type: "temporary-source", id: "fixture-a" }, role: "primary-image" },
      ],
    },
  });
  expect(invalidVideoRole.status()).toBe(400);
  expect((await invalidVideoRole.json()).error.message).toContain("first-frame");

  const legacyPositionalAlias = await request.post("/api/generation/jobs", {''',
)

print("Phase 7B multi-reference product patch applied.")
