import type { InitialGenerationRecipe, GenerationRecipeReference } from "../../lib/api/generation-recipe-contract.ts";
import type { PublicMediaAsset } from "../../lib/api/media-assets-contract.ts";
import { fiboGenerationModel, fiboImageAspectRatios, generationSeedMax, type AspectRatio, type GenerationInputSource, type PresetAspectRatio } from "../../lib/capabilities/generation.ts";
import { resolveFiboVglReferences } from "../../lib/capabilities/fibo-vgl.ts";

export type CreateSearchParams = Record<string, string | string[] | undefined>;
type SourceAsset = Pick<PublicMediaAsset, "id" | "kind" | "mimeType" | "originalFilename">;
export type CreateContinuationPlan = {
  mode: "edit" | "generate";
  references: GenerationRecipeReference[];
  prompt: string;
  vgl: string;
  seed: string;
  randomize: boolean;
  steps: number;
  negativePrompt: string;
  aspectRatio: AspectRatio;
};
type Dependencies = {
  loadAsset: (ownerId: string, assetId: string) => Promise<SourceAsset | null>;
  loadRecipe: (ownerId: string, jobId: string) => Promise<InitialGenerationRecipe | null>;
};
type Resolution = { plan: CreateContinuationPlan | null; error: string | null };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const supportedMimeTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const staleRecipe = "That saved generation can’t be reused with the current inputs and settings. Start a new creation instead.";
const fail = (error: string): Resolution => ({ plan: null, error });
const success = (plan: CreateContinuationPlan): Resolution => ({ plan, error: null });
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export async function resolveCreateContinuation(params: CreateSearchParams, ownerId: string | undefined, ready: boolean, deps: Dependencies): Promise<Resolution> {
  const recipeId = first(params.recipe);
  const sourceId = first(params.source);
  const action = first(params.action);
  if (params.recipe === undefined && params.source === undefined && params.action === undefined) return { plan: null, error: null };
  if (params.recipe !== undefined && (params.source !== undefined || params.action !== undefined)) {
    return fail("That Create link mixes two continuation types. Start a new creation instead.");
  }
  if (params.recipe !== undefined ? !recipeId || !uuid.test(recipeId) : !sourceId || !uuid.test(sourceId) || action !== "edit-image") {
    return fail("That continuation link is invalid or unsupported. Start a new creation or return to Library.");
  }
  if (!ownerId) return fail("Sign in from Settings to continue from private RenderLab media.");
  if (!ready) return fail("Create is unavailable. Your saved starting point cannot be opened right now.");
  if (recipeId) {
    try {
      const recipe = await deps.loadRecipe(ownerId, recipeId);
      if (!recipe) return fail(staleRecipe);
      const { request, references } = recipe;
      // Masked and generated-VGL recipes are deliberately excluded by the current
      // recipe loader. Do not silently strip provenance if that boundary changes.
      if (request.model !== fiboGenerationModel || request.output.kind !== "image" || request.mask || request.autoVgl
        || references.length !== request.inputs.length || references.length > 4
        || (request.output.aspectRatio === "original" ? !references.length : !fiboImageAspectRatios.includes(request.output.aspectRatio as PresetAspectRatio))
        || references.some((ref, index) => ref.alias !== request.inputs[index]?.alias
          || ref.source.id !== request.inputs[index]?.source.id || ref.source.type !== request.inputs[index]?.source.type)
        || (request.advanced?.seed !== undefined && (!Number.isInteger(request.advanced.seed) || request.advanced.seed < 0 || request.advanced.seed > generationSeedMax))) return fail(staleRecipe);
      const aliases = references.map((ref) => ref.alias);
      const prompt = request.vgl && request.prompt === request.vgl ? "" : request.prompt.replace(/@image\d+\b/g, (match) => {
        const position = aliases.indexOf(match.slice(1) as GenerationRecipeReference["alias"]);
        return position < 0 ? match : "@image" + (position + 1);
      });
      return success({
        mode: references.length ? "edit" : "generate", references, prompt,
        vgl: request.vgl ? resolveFiboVglReferences(request.vgl, aliases) : "",
        seed: String(request.advanced?.seed ?? 42), randomize: request.advanced?.seed === undefined,
        steps: request.advanced?.steps ?? 4, negativePrompt: request.advanced?.negativePrompt ?? "",
        aspectRatio: request.output.aspectRatio,
      });
    } catch {
      return fail("That saved generation could not be loaded. Start a new creation instead.");
    }
  }
  try {
    const asset = await deps.loadAsset(ownerId, sourceId!);
    if (!asset || asset.kind !== "image" || !supportedMimeTypes.has(asset.mimeType)) {
      return fail("That media item is no longer available as an editing source. Return to Library or start a new creation.");
    }
    return success({
      mode: "edit", references: [{ alias: "image1", source: { type: "media-asset", id: asset.id },
        previewUrl: "/api/media/assets/" + encodeURIComponent(asset.id) + "/content", label: asset.originalFilename ?? "Source image" }],
      prompt: "", vgl: "", seed: "42", randomize: true, steps: 4, negativePrompt: "", aspectRatio: "original",
    });
  } catch {
    return fail("That media item could not be loaded. Start a new creation or return to Library.");
  }
}

export async function loadContinuationFiles(plan: CreateContinuationPlan, signal: AbortSignal,
  loadFile: (reference: GenerationRecipeReference, signal: AbortSignal) => Promise<File>,
): Promise<{ source: GenerationInputSource; file: File }[]> {
  return Promise.all(plan.references.map(async (reference) => ({
    source: reference.source, file: await loadFile(reference, signal),
  })));
}
