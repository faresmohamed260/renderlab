import type { GenerationRequest } from "@/lib/capabilities/generation";
import {
  defaultVideoAudioEnabled,
  defaultVideoResolution,
  generationModelForRequest,
  fiboGenerationModel,
  qwenImageFixedGuidance,
  qwenImageFixedSteps,
  resolveCreativeOperation,
  type VideoResolution,
} from "@/lib/capabilities/generation";
import type { GenerationWorker } from "@/server/generation/worker-fleet";
import type { InputBytes } from "@/server/generation/native-generation-worker-inputs";
import { createImageGenerationCanvas, prepareImageAspectOverride, sourceVideoAspectRatio } from "@/server/generation/geometry";

export type WorkflowConfig = {
  id: string;
  model: string;
  ecosystem: GenerationWorker["ecosystem"];
  kind: "image" | "video";
  submitPath: "/jobs/edit" | "/jobs/video" | "/jobs/fibo";
  outputMimeType: string;
  defaults: {
    seed: number;
    steps?: number;
    guidance?: number;
    megapixels: number;
    resolution?: VideoResolution;
    durationSeconds?: number;
    audioEnabled?: boolean;
    frameRate?: number;
  };
};


export function workflowFor(request: GenerationRequest): WorkflowConfig {
  const operation = resolveCreativeOperation(request);
  const requestedModel = generationModelForRequest(request);

  if (operation === "create-image" || operation === "edit-image") {
    if (requestedModel === fiboGenerationModel) {
      return {
        id: operation === "edit-image" ? "fibo2-turbo-edit" : "fibo2-turbo-text",
        model: "Bria FIBO 2.0 Edit Turbo", ecosystem: fiboGenerationModel, kind: "image",
        submitPath: "/jobs/fibo", outputMimeType: "image/png",
        defaults: { seed: 42, steps: 4, megapixels: 1 },
      };
    }
    if (requestedModel === "qwen-image-edit-2511") {
      return {
        id: operation === "edit-image" ? "qwen-image-edit-2511-edit" : "qwen-image-edit-2511-generate",
        model: "Qwen Image Edit 2511 · Lightning 4-step",
        ecosystem: "qwen-image-edit-2511",
        kind: "image",
        submitPath: "/jobs/edit",
        outputMimeType: "image/png",
        defaults: {
          seed: 42,
          steps: qwenImageFixedSteps,
          guidance: qwenImageFixedGuidance,
          megapixels: 1,
        },
      };
    }
    if (requestedModel !== "flux2-klein-9b") {
      throw new Error("The selected model does not support image generation.");
    }
    return {
      id: operation === "edit-image" ? "flux2-klein-image-edit" : "flux2-klein-image-generate",
      model: "FLUX.2 Klein 9B · DarkBeast V2 BFS",
      ecosystem: "flux2-klein-9b",
      kind: "image",
      submitPath: "/jobs/edit",
      outputMimeType: "image/png",
      defaults: { seed: 42, steps: 4, guidance: 1, megapixels: 1 },
    };
  }

  if (requestedModel !== "ltx25-redgraft") {
    throw new Error("The selected model does not support video generation.");
  }
  return {
    id: "ltx25-redgraft-video",
    model: "REDGraft LTX 2.5 · Sulphur2 INT8 ConvRot",
    ecosystem: "ltx25-redgraft",
    kind: "video",
    submitPath: "/jobs/video",
    outputMimeType: "video/mp4",
    defaults: {
      seed: 42,
      megapixels: 1,
      resolution: defaultVideoResolution,
      durationSeconds: 5,
      audioEnabled: defaultVideoAudioEnabled,
      frameRate: 24,
    },
  };
}


export type PreparedWorkerPayload = {
  sources: InputBytes[];
  aspectRatio: string;
};

export async function prepareWorkerPayload(
  request: GenerationRequest,
  workflow: WorkflowConfig,
  sources: InputBytes[],
): Promise<PreparedWorkerPayload> {
  const operation = resolveCreativeOperation(request);

  if (workflow.kind === "image") {
    if (operation === "create-image") {
      if (request.output.aspectRatio === "original") {
        throw new Error("Original geometry requires a source image.");
      }
      return {
        sources: [await createImageGenerationCanvas(request.output.aspectRatio)],
        aspectRatio: request.output.aspectRatio,
      };
    }

    if (!sources.length) throw new Error("Image editing requires a source image.");
    if (request.output.aspectRatio === "original") {
      return { sources, aspectRatio: "original" };
    }

    const [primary, ...rest] = sources;
    const preparedPrimary = await prepareImageAspectOverride(primary.bytes, request.output.aspectRatio);
    return {
      sources: [
        {
          bytes: preparedPrimary,
          contentType: "image/png",
          filename: `${primary.filename.replace(/\.[^.]+$/, "")}-renderlab-${request.output.aspectRatio.replace(":", "x")}.png`,
        },
        ...rest,
      ],
      aspectRatio: request.output.aspectRatio,
    };
  }

  if (request.output.aspectRatio !== "original") {
    return { sources, aspectRatio: request.output.aspectRatio };
  }
  const primary = sources[0];
  if (!primary) throw new Error("Original geometry requires a source image.");
  return { sources, aspectRatio: await sourceVideoAspectRatio(primary.bytes) };
}

export function executionPromptForRequest(request: GenerationRequest) {
  const workerPositions = new Map<string, number>(
    request.inputs.map((input, index) => [input.alias, index + 1]),
  );
  return request.prompt.replace(/@image\d+\b/g, (mention) => {
    const position = workerPositions.get(mention.slice(1));
    return position ? `image ${position}` : mention;
  });
}

export function buildForm(request: GenerationRequest, workflow: WorkflowConfig, prepared: PreparedWorkerPayload) {
  const form = new FormData();
  const executionPrompt = executionPromptForRequest(request);
  if (workflow.kind === "image") {
    for (const source of prepared.sources) {
      form.append("image_files", new Blob([Uint8Array.from(source.bytes).buffer], { type: source.contentType }), source.filename);
    }
    form.append("prompt", executionPrompt);
    form.append("negative_prompt", request.advanced?.negativePrompt ?? "");
    form.append("seed", String(request.advanced?.seed ?? workflow.defaults.seed));
    const fixedQwenTuning = workflow.ecosystem === "qwen-image-edit-2511";
    form.append("steps", String(fixedQwenTuning ? workflow.defaults.steps! : request.advanced?.steps ?? workflow.defaults.steps!));
    form.append("cfg", String(fixedQwenTuning ? workflow.defaults.guidance! : request.advanced?.guidance ?? workflow.defaults.guidance!));
    form.append("megapixels", String(workflow.defaults.megapixels));
    return form;
  }

  const source = prepared.sources[0];
  if (source) form.append("image_file", new Blob([Uint8Array.from(source.bytes).buffer], { type: source.contentType }), source.filename);
  form.append("prompt", executionPrompt);
  form.append("negative_prompt", request.advanced?.negativePrompt ?? "");
  form.append("seed", String(request.advanced?.seed ?? workflow.defaults.seed));
  form.append("resolution", request.output.resolution ?? workflow.defaults.resolution ?? defaultVideoResolution);
  form.append("duration_seconds", String(request.output.durationSeconds ?? workflow.defaults.durationSeconds));
  form.append("audio_enabled", String(request.output.audioEnabled ?? workflow.defaults.audioEnabled));
  form.append("aspect_ratio", prepared.aspectRatio);
  form.append("frame_rate", String(request.advanced?.frameRate ?? workflow.defaults.frameRate));
  return form;
}

