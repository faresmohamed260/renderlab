"use server";

import { headers } from "next/headers";
import { isHistoryActionSameOrigin } from "./history-action-origin";
import { resolveCreateContinuation } from "@/features/create/create-continuation";
import { loadInitialGenerationRecipe } from "@/server/generation/generation-recipe";
import { getCurrentRenderLabAccount } from "@/lib/supabase/server";
import { readHistoryActivity } from "./history-activity";
import { listPromptHistory } from "./prompt-history";
import { loadFailedReuseDraft } from "./failed-reuse";
import type { PromptHistoryQuery } from "./prompt-history-model";

export async function readCreateHistoryJobs(offset: number) {
  if (!isHistoryActionSameOrigin(await headers())) return { state: "private" as const };
  return readHistoryActivity({ offset });
}

export async function readCreateHistoryPrompts(query: PromptHistoryQuery) {
  if (!isHistoryActionSameOrigin(await headers())) throw new Error("Private history unavailable.");
  const result = await listPromptHistory(query);
  if (!result) throw new Error("Private history unavailable.");
  return result;
}

export async function loadCreateHistoryReuse(jobId: string) {
  if (!isHistoryActionSameOrigin(await headers())) return { ok: false as const, reason: "unavailable" as const };
  const account = await getCurrentRenderLabAccount();
  if (!account) return { ok: false as const, reason: "unavailable" as const };
  const failed = await loadFailedReuseDraft(account.id, jobId);
  if (failed.ok || failed.reason !== "not_failed") return failed;

  const { plan } = await resolveCreateContinuation({ recipe: jobId }, account.id, true, {
    loadAsset: async () => null,
    loadRecipe: loadInitialGenerationRecipe,
  });
  return plan ? { ok: true as const, draft: plan } : { ok: false as const, reason: "unavailable" as const };
}
