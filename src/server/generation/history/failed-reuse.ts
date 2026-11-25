import "server-only";
import { loadGenerationRecipeJob, reconstructGenerationRecipeRequest } from "@/server/generation/generation-recipe";
import { getMediaAsset, publicMediaAsset } from "@/server/media/media-assets";
import { getReadyReferenceSource } from "@/server/media/reference-uploads";
import { reconstructFailedDraft } from "./failed-reuse-model";

const supportedMimeTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

/** Caller must derive ownerId from the verified server session. Never submits. */
export function loadFailedReuseDraft(ownerId: string, jobId: string) {
  return reconstructFailedDraft(ownerId, jobId, {
    load: loadGenerationRecipeJob,
    parse: reconstructGenerationRecipeRequest,
    reference: async (owner, input) => {
      if (input.source.type === "media-asset") {
        const asset = await getMediaAsset(owner, input.source.id);
        if (!asset || asset.kind !== "image" || !supportedMimeTypes.has(asset.mime_type)) return null;
        const publicAsset = publicMediaAsset(asset);
        return { alias: input.alias, source: input.source, previewUrl: publicAsset.contentUrl,
          label: publicAsset.origin === "uploaded" ? publicAsset.displayName || publicAsset.originalFilename || "Uploaded image" : "Generated result" };
      }
      const source = await getReadyReferenceSource(owner, input.source.id);
      if (!source || !supportedMimeTypes.has(source.mime_type)) return null;
      return { alias: input.alias, source: input.source, previewUrl: "/api/assets/reference/" + encodeURIComponent(source.id) + "/content",
        label: source.filename || "Historical reference" };
    },
  });
}
