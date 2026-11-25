import type { PublicGenerationActivity } from "@/lib/api/generation-activity-contract";
import type { GenerationJobStatus, PromptGenerationOperation } from "@/lib/capabilities/generation";
import type { CreateContinuationPlan } from "../create-continuation";
import type { HistoryAction, SessionResult } from "./history-state";

// Structural boundary matches #730 / #732 without importing unmerged server
// modules into the browser. The integration owner binds authenticated reads.
export type PromptCursor = { createdAt: string; id: string };
export type PromptItem = { id: string; prompt: string; status: GenerationJobStatus; operation: PromptGenerationOperation; createdAt: string };
export type PromptPage = { items: PromptItem[]; nextCursor: PromptCursor | null };
export type HistoryJob = PublicGenerationActivity & { canRetry: boolean; canReuse: boolean };
export type JobsPage = { items: HistoryJob[]; page: { offset: number; limit: number; hasMore: boolean }; hasActive: boolean };
export type HistoryTab = "jobs" | "session" | "prompts";
export type ReuseResult = { ok: true; draft: CreateContinuationPlan } | { ok: false; reason: string };
export type HistoryTransport = {
  readJobs: (offset: number, signal: AbortSignal) => Promise<JobsPage>;
  readPrompts: (query: { search: string; limit: number; cursor?: PromptCursor }, signal: AbortSignal) => Promise<PromptPage>;
  mutate: (action: Exclude<HistoryAction, "reuse">, jobId: string, signal: AbortSignal) => Promise<{ ok: boolean }>;
  reuse: (jobId: string, signal: AbortSignal) => Promise<ReuseResult>;
};
export type HistoryOptions = {
  accountKey: string | null;
  visible: boolean;
  transport: HistoryTransport;
  onReuseDraft: (draft: CreateContinuationPlan) => void;
  onPrompt: (prompt: string) => void;
  onSessionResult: (result: SessionResult) => void;
};
