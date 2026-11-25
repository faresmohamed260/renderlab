"use client";
import { postHistoryJobAction } from "./history-job-actions";
import type { HistoryTransport, JobsReadResult, PromptPage, PromptCursor, ReuseResult } from "./history-contract";

// A server component binds the three authenticated server-action references
// through its client boundary. The browser never imports the server module.
// AbortSignal prevents stale results from being applied; it cannot cancel
// already-started server recovery.
export type HistoryReadActions = {
  readJobsAction(offset: number): Promise<JobsReadResult>;
  readPromptsAction(query: { search: string; limit: number; cursor?: PromptCursor }): Promise<PromptPage>;
  reuseAction(id: string): Promise<ReuseResult>;
};

export function createHistoryTransport(actions: HistoryReadActions): HistoryTransport {
  return {
    async readJobs(offset, signal) { signal.throwIfAborted(); const result = await actions.readJobsAction(offset); signal.throwIfAborted(); return result; },
    async readPrompts(query, signal) { signal.throwIfAborted(); const result = await actions.readPromptsAction(query); signal.throwIfAborted(); return result; },
    mutate: postHistoryJobAction,
    async reuse(id, signal) { signal.throwIfAborted(); const result = await actions.reuseAction(id); signal.throwIfAborted(); return result; },
  };
}
