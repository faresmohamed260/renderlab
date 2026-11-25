import "server-only";
import { supabaseRest } from "@/server/data/supabase-rest";
import { readPromptHistory, type PromptHistoryQuery } from "./prompt-history-model";

/** Owner identity must originate from the verified server session, not client input.
 * Durable job ledger read only; no settlement, mutation, cache or asset join. */
export function listPromptHistory(ownerId: string, query: PromptHistoryQuery = {}) {
  return readPromptHistory(ownerId, query, (path, init) => supabaseRest(path, init));
}
