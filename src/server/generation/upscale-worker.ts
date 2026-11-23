// Retained read-only metadata for historical upscale jobs; no live worker.
export const imageUpscaleWorkflowId = "swinir-classical-sr-image-upscale-2x";
export const imageUpscaleModel = "SwinIR Classical SR · 2×";
export const imageUpscaleEcosystem = "image-upscale-v1";
export const imageUpscaleWorkerId = "renderlab-upscale-01";

export type ImageUpscaleWorker = {
  id: typeof imageUpscaleWorkerId;
  ecosystem: typeof imageUpscaleEcosystem;
  gatewayUrl: string;
};

/** Retired worker cannot be restored by setting a stale environment variable. */
export function getImageUpscaleWorker(): ImageUpscaleWorker | null {
  return null;
}
