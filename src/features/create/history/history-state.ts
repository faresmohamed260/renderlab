import type { GenerationJobStatus } from "../../../lib/capabilities/generation.ts";

export type SessionResult = { id: string; label: string; createdAt: string };
export type HistoryAction = "cancel" | "retry" | "reuse" | "runAgain";
export type JobEligibility = { status: GenerationJobStatus; canCancel: boolean; canRetry: boolean; canReuse: boolean; canRunAgain: boolean };
export function historyActions(job: JobEligibility): HistoryAction[] {
  if (job.status === "queued" || job.status === "preparing" || job.status === "running") return job.canCancel ? ["cancel"] : [];
  if (job.status === "failed") return [...(job.canRetry ? ["retry" as const] : []), ...(job.canReuse ? ["reuse" as const] : [])];
  return job.status === "succeeded" && job.canRunAgain ? ["runAgain"] : [];
}
const empty: readonly SessionResult[] = [];

/** Memory only: a new JS document/tab starts empty. Never persist prompts or
 * results to localStorage/sessionStorage (duplicated tabs copy sessionStorage). */
export function createTabHistory() {
  let owner: string | null = null;
  let results: readonly SessionResult[] = empty;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach(listener => listener());
  return {
    snapshot: (account: string | null) => account && account === owner ? results : empty,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    setAccount(account: string | null) {
      if (owner === account) return;
      owner = account; results = empty; emit();
    },
    record(account: string, result: SessionResult) {
      if (owner !== account || results.some(item => item.id === result.id)) return;
      results = [result, ...results]; emit();
    },
  };
}
