import "server-only";
import { getCurrentRenderLabAccount } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/server/data/supabase-rest";
import { listGenerationActivity } from "@/server/generation/generation-activity";
import { settleOwnerGenerationWithinResponse } from "@/server/generation/owner-generation-settlement";
import type { PublicGenerationActivity } from "@/lib/api/generation-activity-contract";

type HistoryActivityItem = PublicGenerationActivity & { canRetry: boolean; canReuse: boolean };
type HistoryActivityResult = { state: "private" } | { state: "unavailable" } | {
  state: "ready";
  items: HistoryActivityItem[];
  page: { offset: number; limit: number; hasMore: boolean };
  hasActive: boolean;
};
const pageSize = 20;

/** History must preserve the Activity recovery lane, including its bounded
 * cancelling/stale-dispatch candidate selection and response budget. Do not
 * fork settlement, job projection, output filtering, or lifecycle claims.
 * Retry display preserves Activity's failed-image rule; the existing owner
 * endpoint still revalidates every recipe, input and admission at action time. */
export async function readHistoryActivity(query: { offset?: number } = {}): Promise<HistoryActivityResult> {
  try {
    const account = await getCurrentRenderLabAccount();
    if (!account) return { state: "private" };
    if (!isSupabaseConfigured()) return { state: "unavailable" };
    const offset = Number.isSafeInteger(query.offset) && query.offset! >= 0 ? query.offset! : 0;
    await settleOwnerGenerationWithinResponse(account.id, "activity");
    const result = await listGenerationActivity({ ownerId: account.id, limit: pageSize, offset });
    return {
      state: "ready",
      ...result,
      items: result.items.map(item => {
        const image = item.operation === "create-image" || item.operation === "edit-image";
        return {
          ...item,
          // The shared projection sanitizes message text but carries persisted
          // operational codes. History's public boundary needs only the two
          // existing user-facing failure categories, never provider codes.
          error: item.error ? {
            code: item.error.code === "generation_submission_failed" ? "generation_submission_failed" : "generation_failed",
            message: item.error.message,
          } : null,
          canRetry: image && item.status === "failed",
          // Candidates only. Both draft loaders revalidate saved settings and inputs.
          canReuse: image && (item.status === "failed" || (item.status === "succeeded" && item.canRunAgain)),
        };
      }),
    };
  } catch {
    return { state: "unavailable" };
  }
}
