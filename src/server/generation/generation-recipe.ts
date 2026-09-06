import type {
  CreativeOperation,
  GenerationRequest,
  OutputKind,
} from "@/lib/capabilities/generation";
import { isPromptGenerationOperation, resolveCreativeOperation } from "@/lib/capabilities/generation";
import { parseGenerationRequest } from "@/lib/api/generation-contract";
import { persistedUpscaleSourceAssetId } from "@/lib/capabilities/upscale";
import type { InitialGenerationRecipe } from "@/lib/api/generation-recipe-contract";
import { supabaseRest } from "@/server/data/supabase-rest";
import { generationImageInputsAvailable } from "@/server/generation/submit-generation";
import { getMediaAsset, publicMediaAsset } from "@/server/media/media-assets";
import { getReadyReferenceSource } from "@/server/media/reference-uploads";

export type GenerationRecipeJobRow = {
  id: string;
  status: string;
  operation: CreativeOperation;
  output_kind: OutputKind;
  prompt: string | null;
  inputs: unknown;
  parameters: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function loadGenerationRecipeJob(
  ownerId: string,
  jobId: string,
): Promise<GenerationRecipeJobRow | null> {
  const rows = await supabaseRest<GenerationRecipeJobRow[]>(
    `generation_jobs?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(jobId)}&select=id,status,operation,output_kind,prompt,inputs,parameters&limit=1`,
    { method: "GET" },
  );
  return rows?.[0] ?? null;
}

export function reconstructGenerationRecipeRequest(
  row: GenerationRecipeJobRow,
): GenerationRequest | null {
  if (!isPromptGenerationOperation(row.operation) || typeof row.prompt !== "string" || !row.prompt.trim()) return null;
  if (!isRecord(row.parameters) || !isRecord(row.parameters.output)) return null;

  const output = { ...row.parameters.output };
  const rawAdvanced = row.parameters.advanced;
  let advanced: unknown = rawAdvanced;

  // Historical Video jobs may contain tuning fields that are no longer part of the
  // current product contract. Keep the same narrow compatibility already accepted
  // by failed-job Retry instead of replaying obsolete execution parameters.
  if (row.output_kind === "video" && isRecord(rawAdvanced)) {
    const compatibleAdvanced = { ...rawAdvanced };
    delete compatibleAdvanced.steps;
    delete compatibleAdvanced.guidance;
    advanced = compatibleAdvanced;
  }

  const parsed = parseGenerationRequest({
    model: row.parameters.model,
    prompt: row.prompt,
    output,
    inputs: row.inputs,
    ...(advanced === undefined ? {} : { advanced }),
  });
  if (!parsed.ok) return null;
  if (parsed.request.output.kind !== row.output_kind) return null;
  if (resolveCreativeOperation(parsed.request) !== row.operation) return null;
  return parsed.request;
}

export async function reconstructAvailableGenerationRecipeRequest(
  ownerId: string,
  row: GenerationRecipeJobRow,
): Promise<GenerationRequest | null> {
  const request = reconstructGenerationRecipeRequest(row);
  if (!request) return null;
  if (!(await generationImageInputsAvailable(ownerId, request))) return null;
  return request;
}

export async function loadGenerationComparisonSource(
  ownerId: string,
  jobId: string,
) {
  const row = await loadGenerationRecipeJob(ownerId, jobId);
  if (!row || row.status !== "succeeded") return null;

  if (row.operation === "upscale-image") {
    const sourceAssetId = persistedUpscaleSourceAssetId({
      operation: row.operation,
      outputKind: row.output_kind,
      prompt: row.prompt,
      inputs: row.inputs,
      parameters: row.parameters,
    });
    if (!sourceAssetId) return null;
    const source = await getMediaAsset(ownerId, sourceAssetId);
    if (!source || source.kind !== "image") return null;
    return publicMediaAsset(source);
  }

  const primaryRole = row.operation === "edit-image"
    ? "primary-image"
    : row.operation === "animate-image"
      ? "first-frame"
      : null;
  if (!primaryRole) return null;

  const request = reconstructGenerationRecipeRequest(row);
  if (!request) return null;
  const primaryInput = request.inputs.find((input) => input.role === primaryRole);
  if (!primaryInput || primaryInput.source.type !== "media-asset") return null;

  const source = await getMediaAsset(ownerId, primaryInput.source.id);
  if (!source || source.kind !== "image") return null;
  return publicMediaAsset(source);
}

function mediaRecipeLabel(asset: ReturnType<typeof publicMediaAsset>) {
  if (asset.origin === "uploaded") {
    return asset.displayName || asset.originalFilename || "Uploaded image";
  }
  return "Generated result";
}

export async function loadInitialGenerationRecipe(
  ownerId: string,
  jobId: string,
): Promise<InitialGenerationRecipe | null> {
  const row = await loadGenerationRecipeJob(ownerId, jobId);
  if (!row || row.status !== "succeeded") return null;

  const request = await reconstructAvailableGenerationRecipeRequest(ownerId, row);
  if (!request) return null;

  const references = await Promise.all(request.inputs.map(async (input) => {
    if (input.source.type === "media-asset") {
      const asset = await getMediaAsset(ownerId, input.source.id);
      if (!asset || asset.kind !== "image") return null;
      const publicAsset = publicMediaAsset(asset);
      return {
        alias: input.alias,
        source: input.source,
        previewUrl: publicAsset.contentUrl,
        label: mediaRecipeLabel(publicAsset),
      };
    }

    const source = await getReadyReferenceSource(ownerId, input.source.id);
    if (!source) return null;
    return {
      alias: input.alias,
      source: input.source,
      previewUrl: `/api/assets/reference/${encodeURIComponent(source.id)}/content`,
      label: source.filename || "Historical reference",
    };
  }));

  if (references.some((reference) => reference === null)) return null;
  return {
    jobId: row.id,
    request,
    references: references.filter((reference): reference is NonNullable<typeof reference> => reference !== null),
  };
}
