export const imageUpscaleScale = 2 as const;
export const imageUpscaleSupportedMimeTypes = ["image/png", "image/jpeg", "image/webp"] as const;
export type ImageUpscaleMimeType = (typeof imageUpscaleSupportedMimeTypes)[number];

export const imageUpscaleLimits = {
  maxInputBytes: 25 * 1024 * 1024,
  maxInputEdge: 4096,
  maxInputPixels: 4_194_304,
  maxOutputEdge: 8192,
  maxOutputPixels: 16_777_216,
} as const;

export type ImageUpscaleGeometry = {
  width: number;
  height: number;
  outputWidth: number;
  outputHeight: number;
};

export function validateImageUpscaleGeometry(
  width: number,
  height: number,
  sizeBytes: number,
): ImageUpscaleGeometry {
  if (!Number.isInteger(sizeBytes) || sizeBytes < 1) {
    throw new RangeError("The source image is empty.");
  }
  if (sizeBytes > imageUpscaleLimits.maxInputBytes) {
    throw new RangeError("The source image must be 25 MB or smaller.");
  }
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new RangeError("The source image geometry is invalid.");
  }
  if (width > imageUpscaleLimits.maxInputEdge || height > imageUpscaleLimits.maxInputEdge) {
    throw new RangeError(`The source image may not exceed ${imageUpscaleLimits.maxInputEdge}px on either edge.`);
  }
  if (width * height > imageUpscaleLimits.maxInputPixels) {
    throw new RangeError(`The source image may not exceed ${imageUpscaleLimits.maxInputPixels.toLocaleString("en-US")} pixels.`);
  }

  const outputWidth = width * imageUpscaleScale;
  const outputHeight = height * imageUpscaleScale;
  if (outputWidth > imageUpscaleLimits.maxOutputEdge || outputHeight > imageUpscaleLimits.maxOutputEdge) {
    throw new RangeError(`The 2× result may not exceed ${imageUpscaleLimits.maxOutputEdge}px on either edge.`);
  }
  if (outputWidth * outputHeight > imageUpscaleLimits.maxOutputPixels) {
    throw new RangeError(`The 2× result may not exceed ${imageUpscaleLimits.maxOutputPixels.toLocaleString("en-US")} pixels.`);
  }

  return { width, height, outputWidth, outputHeight };
}

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
