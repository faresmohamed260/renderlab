export const imageUpscaleScale = 2 as const;

export type UpscaleImageInput = {
  alias: "image1";
  role: "primary-image";
  source: {
    type: "media-asset";
    id: string;
  };
};

export type UpscaleImageCommand = {
  operation: "upscale-image";
  outputKind: "image";
  prompt: null;
  inputs: [UpscaleImageInput];
  parameters: {
    upscale: {
      scale: typeof imageUpscaleScale;
    };
  };
};

export function createUpscaleImageCommand(assetId: string): UpscaleImageCommand {
  const id = assetId.trim();
  if (!id) throw new RangeError("Upscale requires a durable media asset ID.");

  return {
    operation: "upscale-image",
    outputKind: "image",
    prompt: null,
    inputs: [
      {
        alias: "image1",
        role: "primary-image",
        source: {
          type: "media-asset",
          id,
        },
      },
    ],
    parameters: {
      upscale: {
        scale: imageUpscaleScale,
      },
    },
  };
}
