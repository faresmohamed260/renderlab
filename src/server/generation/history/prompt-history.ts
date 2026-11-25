import "server-only";
import { getCurrentRenderLabAccount } from "@/lib/supabase/server";
import { supabaseRest } from "@/server/data/supabase-rest";
import { readPromptHistory, type PromptHistoryQuery } from "./prompt-history-model.ts";

/** Read-only history; derive identity from the fresh admitted session here,
 * never accept an owner identifier as a public argument. */
export async function listPromptHistory(query: PromptHistoryQuery = {}) {
  const account = await getCurrentRenderLabAccount();
  if (!account) return null;
  return readPromptHistory(account.id, query, (params) => {
    params.set("owner_id", "eq." + account.id);
    return supabaseRest(`generation_jobs?${params.toString()}`, { method: "GET" });
  });
}
