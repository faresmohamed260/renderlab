import type {
  CreativeOperation,
  GenerationRequest,
  OutputKind,
} from "@/lib/capabilities/generation";
import { resolveCreativeOperation } from "@/lib/capabilities/generation";
import { parseGenerationRequest } from "@/lib/api/generation-contract";
import { supabaseRest } from "@/server/data/supabase-rest";
import { generationImageInputsAvailable } from "@/server/generation/submit-generation";

export type GenerationRecipeJobRow = {
  id: string;
  status: string;
  operation: CreativeOperation;
  output_kind: OutputKind;
  prompt: string;
  inputs: unknown;
  parameters: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function loadGenerationRecipeJob(
  ownerId: string,
  jobId: string,
): Promise<GenerationRecipeJobRow | null> {
  const rows = await supabaseRest<GenerationRecipeJobRow[]>(
    `generation_jobs?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(jobId)}&select=id,status,operation,output_kind,prompt,inputs,parameters&limit=1`,
    { method: "GET" },
  );
  return rows?.[0] ?? null;
}

export function reconstructGenerationRecipeRequest(
  row: GenerationRecipeJobRow,
): GenerationRequest | null {
  if (!isRecord(row.parameters) || !isRecord(row.parameters.output)) return null;

  const output = { ...row.parameters.output };
  const rawAdvanced = row.parameters.advanced;
  let advanced: unknown = rawAdvanced;

  // Historical Video jobs may contain tuning fields that are no longer part of the
  // current product contract. Keep the same narrow compatibility already accepted
  // by failed-job Retry instead of replaying obsolete execution parameters.
  if (row.output_kind === "video" && isRecord(rawAdvanced)) {
    const compatibleAdvanced = { ...rawAdvanced };
    delete compatibleAdvanced.steps;
    delete compatibleAdvanced.guidance;
    advanced = compatibleAdvanced;
  }

  const parsed = parseGenerationRequest({
    prompt: row.prompt,
    output,
    inputs: row.inputs,
    ...(advanced === undefined ? {} : { advanced }),
  });
  if (!parsed.ok) return null;
  if (parsed.request.output.kind !== row.output_kind) return null;
  if (resolveCreativeOperation(parsed.request) !== row.operation) return null;
  return parsed.request;
}

export async function reconstructAvailableGenerationRecipeRequest(
  ownerId: string,
  row: GenerationRecipeJobRow,
): Promise<GenerationRequest | null> {
  const request = reconstructGenerationRecipeRequest(row);
  if (!request) return null;
  if (!(await generationImageInputsAvailable(ownerId, request))) return null;
  return request;
}
