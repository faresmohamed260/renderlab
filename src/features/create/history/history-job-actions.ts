import type { GenerationJobStatus } from "../../../lib/capabilities/generation.ts";

export type HistoryMutation = "cancel" | "retry" | "runAgain";
export type HistoryMutationResult = { ok: true; job: { id: string; status: GenerationJobStatus } }
  | { ok: false; message: string };
const suffixes: Record<HistoryMutation, string> = { cancel: "cancel", retry: "retry", runAgain: "run-again" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const statuses = new Set<GenerationJobStatus>(["queued", "preparing", "running", "cancelling", "persisting", "succeeded", "failed", "cancelled"]);
const genericFailure = "This action could not be completed. Your draft is unchanged.";
const fail = (message = genericFailure): HistoryMutationResult => ({ ok: false, message });
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);

/** Explicit user action only; the current same-origin endpoints own auth,
 * cancellation claims, source validation, admission and dispatch. Never retry
 * an ambiguous acceptance, construct a generation request or send an owner ID. */
export async function postHistoryJobAction(action: HistoryMutation, id: string, signal: AbortSignal, request: typeof fetch = fetch): Promise<HistoryMutationResult> {
  if (!uuid.test(id) || !Object.hasOwn(suffixes, action) || signal.aborted) return fail();
  try {
    const response = await request("/api/generation/jobs/" + encodeURIComponent(id) + "/" + suffixes[action], {
      method: "POST", credentials: "same-origin", headers: { accept: "application/json" }, signal,
    });
    if (signal.aborted) return fail();
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok || !record(payload) || payload.ok !== true) {
      if (action === "cancel" && response.status === 409) return fail("Cancellation is no longer available.");
      if (response.status === 401) return fail("Sign in to manage your generation jobs.");
      if (response.status === 429) return fail("Generation limit reached. Try again when another attempt finishes or the limit resets.");
      return fail();
    }
    const job = payload.job;
    if (!record(job) || typeof job.id !== "string" || !uuid.test(job.id)
      || typeof job.status !== "string" || !statuses.has(job.status as GenerationJobStatus)) return fail();
    if (action === "cancel" ? (job.id !== id || (job.status !== "cancelling" && job.status !== "cancelled")) : job.id === id) return fail();
    return { ok: true, job: { id: job.id, status: job.status as GenerationJobStatus } };
  } catch {
    return fail();
  }
}
