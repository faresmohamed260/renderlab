import type { GenerationRecipeReference } from "../../../lib/api/generation-recipe-contract.ts";
import { fiboGenerationModel, type GenerationRequest, type GenerationInput } from "../../../lib/capabilities/generation.ts";
import { resolveCreateContinuation, type CreateContinuationPlan } from "../../../features/create/create-continuation.ts";
import type { GenerationRecipeJobRow } from "../generation-recipe.ts";

export type FailedReuseReason = "job_not_found" | "not_failed" | "unsupported_mode" | "mask_unavailable" | "auto_vgl_unavailable" | "invalid_recipe" | "input_unavailable" | "unavailable";
export type FailedReuseResult = { ok: true; draft: CreateContinuationPlan } | { ok: false; reason: FailedReuseReason };
type Dependencies = {
  load(ownerId: string, jobId: string): Promise<GenerationRecipeJobRow | null>;
  parse(row: GenerationRecipeJobRow): GenerationRequest | null;
  reference(ownerId: string, input: GenerationInput): Promise<GenerationRecipeReference | null>;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail = (reason: FailedReuseReason): FailedReuseResult => ({ ok: false, reason });
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

// Missing/deleted/foreign inputs deliberately share one public reason: never
// perform an unscoped lookup to distinguish the existence of another owner's data.
export async function reconstructFailedDraft(ownerId: string, jobId: string, deps: Dependencies): Promise<FailedReuseResult> {
  if (!uuid.test(ownerId) || !uuid.test(jobId)) return fail("job_not_found");
  try {
    const row = await deps.load(ownerId, jobId);
    if (!row || row.id !== jobId) return fail("job_not_found");
    if (row.status !== "failed") return fail("not_failed");
    if (row.output_kind !== "image" || (row.operation !== "create-image" && row.operation !== "edit-image")) return fail("unsupported_mode");
    if (!record(row.parameters)) return fail("invalid_recipe");
    // Do not default a missing historical model to today's model.
    if (row.parameters.model !== fiboGenerationModel) return fail("unsupported_mode");
    if (Object.hasOwn(row.parameters, "mask") || Array.isArray(row.inputs) && row.inputs.some(i => record(i) && i.role === "fibo-mask")) return fail("mask_unavailable");
    if (Object.hasOwn(row.parameters, "autoVgl") || Object.hasOwn(row.parameters, "generatedVgl")) return fail("auto_vgl_unavailable");
    const request = deps.parse(row);
    if (!request || request.model !== fiboGenerationModel || request.output.kind !== "image") return fail("invalid_recipe");
    if (request.mask) return fail("mask_unavailable");
    if (request.autoVgl) return fail("auto_vgl_unavailable");
    const references = await Promise.all(request.inputs.map(input => deps.reference(ownerId, input)));
    const verified: GenerationRecipeReference[] = [];
    for (const [index, ref] of references.entries()) {
      const input = request.inputs[index]!;
      if (!ref || ref.alias !== input.alias || ref.source.id !== input.source.id || ref.source.type !== input.source.type) return fail("input_unavailable");
      verified.push(ref);
    }
    // Reuse the actual Create continuation validation/mapping, with no mutation
    // dependencies. This is a plan only; a future explicit Generate is separate.
    const resolved = await resolveCreateContinuation({ recipe: jobId }, ownerId, true, {
      loadAsset: async () => null,
      loadRecipe: async () => ({ jobId, request, references: verified }),
    });
    return resolved.plan ? { ok: true, draft: resolved.plan } : fail("invalid_recipe");
  } catch {
    return fail("unavailable");
  }
}
