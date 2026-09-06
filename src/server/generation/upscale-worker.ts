export const imageUpscaleWorkflowId = "swinir-classical-sr-image-upscale-2x";
export const imageUpscaleModel = "SwinIR Classical SR · 2×";
export const imageUpscaleEcosystem = "image-upscale-v1";
export const imageUpscaleWorkerId = "renderlab-upscale-01";

export type ImageUpscaleWorker = {
  id: typeof imageUpscaleWorkerId;
  ecosystem: typeof imageUpscaleEcosystem;
  gatewayUrl: string;
};

function normalizedGatewayUrl(value: string | undefined) {
  const url = value?.trim().replace(/\/$/, "");
  return url || null;
}

export function getImageUpscaleWorker(): ImageUpscaleWorker | null {
  const testGateway = process.env.RENDERLAB_TEST_UPSCALE_WORKER_OVERRIDE === "true"
    ? normalizedGatewayUrl(process.env.RENDERLAB_TEST_UPSCALE_WORKER_GATEWAY_URL)
    : null;
  const gatewayUrl = testGateway || normalizedGatewayUrl(process.env.RENDERLAB_UPSCALE_WORKER_GATEWAY_URL);
  if (!gatewayUrl) return null;

  return {
    id: imageUpscaleWorkerId,
    ecosystem: imageUpscaleEcosystem,
    gatewayUrl,
  };
}
