import { CreatePreviewWorkspace } from "@/features/create/create-preview-workspace";
import { resolveCreateContinuation, type CreateSearchParams } from "@/features/create/create-continuation";
import type { InitialGenerationRecipe } from "@/lib/api/generation-recipe-contract";
import { fiboGenerationModel } from "@/lib/capabilities/generation";
import { createProps, fixtureAsset, fixtureAssetId, fixtureJobId } from "../../fixtures";

const reference = { alias: "image7", source: { type: "media-asset", id: fixtureAssetId },
  label: "fixture.png", previewUrl: "/api/media/assets/" + fixtureAssetId + "/content" } as const;
const recipe = {
  jobId: fixtureJobId,
  request: { model: fiboGenerationModel, prompt: "Edit @image7", inputs: [{ alias: reference.alias, source: reference.source, role: "primary-image" }],
    output: { kind: "image", aspectRatio: "4:3" }, advanced: { seed: 1234, steps: 7, negativePrompt: "blur" }, vgl: '{"scene":"@image7"}' },
  references: [reference],
} satisfies InitialGenerationRecipe;

export default async function FixtureContinuation({ searchParams }: { searchParams: Promise<CreateSearchParams> }) {
  const owner = "synthetic-component-fixture";
  const continuation = await resolveCreateContinuation(await searchParams, owner, true, {
    loadAsset: async (actingOwner, id) => actingOwner === owner && id === fixtureAssetId ? fixtureAsset : null,
    loadRecipe: async (actingOwner, id) => actingOwner === owner && id === fixtureJobId ? recipe : null,
  });
  return <CreatePreviewWorkspace {...createProps} initialContinuation={continuation.plan} initialContinuationError={continuation.error} />;
}
