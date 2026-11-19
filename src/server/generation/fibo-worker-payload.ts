import { resolveFiboVglReferences } from "@/lib/capabilities/fibo-vgl";
import { fiboMaskMaxBytes } from "@/lib/capabilities/fibo-mask";
import { fiboGenerationModel, type GenerationRequest } from "@/lib/capabilities/generation";

/** Build the private FIBO gateway's bounded JSON protocol, with mask bytes
 * strictly separate from the 0–4 numbered image references.
 */
export function buildFiboWorkerPayload(
  request: GenerationRequest,
  sources: readonly { bytes: Buffer }[],
  maskBytes?: Buffer,
  inspirationBytes?: Buffer,
) {
  if (request.model !== fiboGenerationModel) throw new Error("FIBO worker protocol requires the FIBO model.");
  const sizes = { original: [0, 0], "1:1": [1024, 1024], "4:3": [1152, 864],
    "3:4": [864, 1152], "16:9": [1280, 720], "9:16": [720, 1280] } as const;
  const size = sizes[request.output.aspectRatio as keyof typeof sizes];
  if (!size || sources.length > 4
    || sources.some((source) => source.bytes.length < 1 || source.bytes.length > 16 * 1024 * 1024)
    || sources.reduce((total, source) => total + source.bytes.length, 0) > 32 * 1024 * 1024) {
    throw new Error("Unsupported FIBO dimensions or input size.");
  }
  if (Boolean(request.mask) !== Boolean(maskBytes)
    || (maskBytes && (sources.length !== 1 || maskBytes.length < 8 || maskBytes.length > fiboMaskMaxBytes))) {
    throw new Error("FIBO mask payload is missing or incompatible with source slots.");
  }
  if (Boolean(request.inspiration) !== Boolean(inspirationBytes)
    || (request.inspiration && !request.autoVgl)
    || (inspirationBytes && (sources.length !== 0 || inspirationBytes.length < 1
      || inspirationBytes.length > 16 * 1024 * 1024))) {
    throw new Error("FIBO inspiration payload is missing or incompatible with edit slots.");
  }
  if (request.autoVgl && (request.vgl || !request.prompt.trim()
    || (request.output.aspectRatio === "original" && sources.length === 0))) {
    throw new Error("Generated VGL requires a bounded image request without manual VGL.");
  }
  const inputAliases = request.inputs.map((input) => input.alias);
  const indices = new Map<string, number>(inputAliases.map((alias, index) => [alias, index + 1]));
  const prompt = request.vgl && request.prompt === request.vgl ? "" : request.prompt.replace(/@image\d+\b/g, (mention) => {
    const index = indices.get(mention.slice(1));
    return index ? `<image_${index}>` : mention;
  });
  const vgl = request.vgl ? resolveFiboVglReferences(request.vgl, inputAliases) : undefined;
  return {
    contentType: "application/json",
    body: JSON.stringify({
      prompt, width: size[0], height: size[1],
      seed: request.advanced?.seed ?? 42, steps: request.advanced?.steps ?? 4,
      negative_prompt: request.advanced?.negativePrompt ?? "",
      ...(vgl ? { vgl } : {}),
      ...(request.autoVgl ? { generate_vgl: true } : {}),
      ...(maskBytes ? { mask: maskBytes.toString("base64") } : {}),
      ...(inspirationBytes ? { inspiration: inspirationBytes.toString("base64") } : {}),
      images: sources.map((source) => source.bytes.toString("base64")),
    }),
  };
}
