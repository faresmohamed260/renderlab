import type { ComponentProps } from "react";
import type { CreatePreviewWorkspace } from "@/features/create/create-preview-workspace";
import type { PublicMediaAsset, ListMediaAssetsSuccess } from "@/lib/api/media-assets-contract";
import { fiboGenerationModel } from "@/lib/capabilities/generation";

export const fixtureAssetId = "12345678-1234-4234-8234-123456789abc";
export const fixtureJobId = "23456789-1234-4234-8234-123456789abc";
export const fixtureImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jR2YAAAAASUVORK5CYII=";

export const fixtureAsset = {
  id: fixtureAssetId, generationJobId: fixtureJobId, origin: "generated", kind: "image",
  mimeType: "image/png", originalFilename: "fixture.png", displayName: "Fixture image",
  sizeBytes: 68, width: 512, height: 512, durationMs: null, prompt: "Fixture prompt",
  model: "Bria FIBO 2.0 Edit Turbo", operation: "create-image", createdAt: "2026-11-24T00:00:00.000Z",
  isFavorite: false, contentUrl: fixtureImage, thumbnailUrl: fixtureImage,
} satisfies PublicMediaAsset;

export const emptyHistory = {
  ok: true, items: [], page: { limit: 48, offset: 0, hasMore: false },
} satisfies ListMediaAssetsSuccess;

export const createProps = {
  admitted: true, hostedOnly: true, hostedModel: { id: fiboGenerationModel, label: "Bria FIBO 2.0 Edit Turbo" },
  hostedAccountKey: "synthetic-component-fixture", initialAspectRatio: "1:1",
  masksEnabled: true, advancedPrompt: true, variableSteps: true, extendedSetup: true,
} satisfies ComponentProps<typeof CreatePreviewWorkspace>;
