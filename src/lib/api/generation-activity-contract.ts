import type { CreativeOperation, GenerationJobStatus, OutputKind } from "@/lib/capabilities/generation";

export type PublicGenerationActivity = {
  id: string;
  status: GenerationJobStatus;
  operation: CreativeOperation;
  outputKind: OutputKind;
  prompt: string;
  outputAssetIds: string[];
  error: { code: string; message: string } | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

export const activeGenerationStatuses = new Set<GenerationJobStatus>([
  "queued",
  "preparing",
  "running",
  "persisting",
]);

export function isActiveGenerationStatus(status: GenerationJobStatus) {
  return activeGenerationStatuses.has(status);
}
