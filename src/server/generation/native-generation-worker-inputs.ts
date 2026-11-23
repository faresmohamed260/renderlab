import type { GenerationRequest } from "@/lib/capabilities/generation";
import { fiboGenerationModel, resolveCreativeOperation } from "@/lib/capabilities/generation";
import { parseGenerationRequest } from "@/lib/api/generation-contract";
import { fiboMaskMaxBytes, fiboMaskUsage, splitPersistedFiboMaskInputs } from "@/lib/capabilities/fibo-mask";
import { getReadyFiboMaskSource } from "@/server/media/reference-uploads";
import { supabaseRest } from "@/server/data/supabase-rest";
import { readR2Object } from "@/server/storage/r2";
import type { NativeGenerationJobRow } from "@/server/generation/native-generation-job-projection";

type JobRow = NativeGenerationJobRow;
export type InputBytes = { bytes: Buffer; contentType: string; filename: string };


export async function resolveInputs(ownerId: string, request: GenerationRequest): Promise<InputBytes[]> {
  const resolved: InputBytes[] = [];
  for (const input of request.inputs) {
    if (input.source.type === "temporary-source") {
      const rows = await supabaseRest<Array<{ storage_key: string; filename: string; mime_type: string; status: string; metadata: { usage?: string } | null }>>(
        `generation_sources?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(input.source.id)}&select=storage_key,filename,mime_type,status,metadata&limit=1`,
        { method: "GET" },
      );
      const source = rows?.[0];
      if (!source || source.status !== "ready" || source.metadata?.usage === fiboMaskUsage) throw new Error("Reference source is not ready.");
      const object = await readR2Object(source.storage_key);
      resolved.push({ bytes: object.bytes, contentType: source.mime_type, filename: source.filename });
      continue;
    }

    const assets = await supabaseRest<Array<{ storage_key: string; mime_type: string }>>(
      `media_assets?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(input.source.id)}&select=storage_key,mime_type&limit=1`,
      { method: "GET" },
    );
    const asset = assets?.[0];
    if (!asset) throw new Error("Media asset input was not found.");
    const object = await readR2Object(asset.storage_key);
    resolved.push({ bytes: object.bytes, contentType: asset.mime_type, filename: `asset-${input.source.id}` });
  }
  return resolved;
}

export async function resolveMaskBytes(ownerId: string, request: GenerationRequest): Promise<Buffer | undefined> {
  if (!request.mask) return undefined;
  if (request.model !== fiboGenerationModel || request.inputs.length !== 1) {
    throw new Error("FIBO masking requires one image edit input.");
  }
  const source = await getReadyFiboMaskSource(ownerId, request.mask.id);
  if (!source) throw new Error("The owner-scoped mask source is unavailable.");
  const object = await readR2Object(source.storage_key);
  const bytes = Buffer.from(object.bytes);
  if (object.contentType !== "image/png" || bytes.length < 8 || bytes.length > fiboMaskMaxBytes
    || !bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) {
    throw new Error("The stored FIBO PNG mask is invalid.");
  }
  return bytes;
}


export function requestFromJobRow(row: JobRow): GenerationRequest {
  // A rejected/malformed stored source must never be redispatched during
  // recovery. The mask is an internal job input, not an image-reference slot.
  const persisted = splitPersistedFiboMaskInputs(row.inputs);
  if (!persisted) throw new Error("Stored FIBO mask source is invalid.");
  const parsed = parseGenerationRequest({
    model: row.parameters.model,
    prompt: row.prompt,
    output: row.parameters.output,
    inputs: persisted.inputs,
    advanced: row.parameters.advanced,
    ...(Object.hasOwn(row.parameters, "vgl") ? { vgl: row.parameters.vgl } : {}),
    ...(row.parameters.autoVgl === true ? { autoVgl: true } : {}),
    ...(persisted.mask ? { mask: persisted.mask } : {}),
  });
  if (!parsed.ok || parsed.request.output.kind !== row.output_kind
    || resolveCreativeOperation(parsed.request) !== row.operation) {
    throw new Error("Stored generation request can no longer be safely dispatched.");
  }
  return parsed.request;
}

