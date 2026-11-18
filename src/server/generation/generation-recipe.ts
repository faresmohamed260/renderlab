import type {
  CreativeOperation,
  GenerationRequest,
  OutputKind,
} from "@/lib/capabilities/generation";
import { isPromptGenerationOperation, resolveCreativeOperation } from "@/lib/capabilities/generation";
import { parseGenerationRequest } from "@/lib/api/generation-contract";
import { persistedUpscaleSourceAssetId } from "@/lib/capabilities/upscale";
import { comparisonSourceAssetId } from "@/lib/capabilities/generation-comparison";
import { splitPersistedFiboMaskInputs } from "@/lib/capabilities/fibo-mask";
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

  const persisted = splitPersistedFiboMaskInputs(row.inputs);
  if (!persisted) return null;
  const parsed = parseGenerationRequest({
    model: row.parameters.model,
    prompt: row.prompt,
    output,
    inputs: persisted.inputs,
    ...(advanced === undefined ? {} : { advanced }),
    ...(Object.hasOwn(row.parameters, "vgl") ? { vgl: row.parameters.vgl } : {}),
    ...(row.parameters.autoVgl === true ? { autoVgl: true } : {}),
    ...(persisted.mask ? { mask: persisted.mask } : {}),
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

  // Comparing an existing result is read-only: retired model settings must not
  // hide an otherwise valid historical source. Reuse/Retry still require the
  // separate current-valid recipe parser; source ownership remains enforced.
  const sourceId = comparisonSourceAssetId(row.operation, row.inputs);
  if (!sourceId) return null;
  const source = await getMediaAsset(ownerId, sourceId);
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
  // Until the normal Create composer supports displaying and preserving masks,
  // do not open a masked recipe as an unmasked draft. Server-owned retry still
  // reconstructs and revalidates the mask through this same request parser.
  if (request.mask || request.autoVgl) return null;

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
