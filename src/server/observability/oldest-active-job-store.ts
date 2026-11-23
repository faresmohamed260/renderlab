import "server-only";

import { supabaseRest } from "@/server/data/supabase-rest";
import {
  monitoredActiveStatuses,
  oldestActiveJobHeadQuery,
  summarizeOldestActiveJobHeads,
} from "@/server/observability/oldest-active-job";

/**
 * Four index-backed, one-row PostgREST reads (one for each exact status).
 * The existing (status, created_at DESC) index supports the reverse oldest-first
 * scan. The owner filter is used exclusively by isolated Admin fixture runs.
 */
export async function readOldestActiveJobAge(ownerId?: string, nowMs: number = Date.now()) {
  const heads = await Promise.all(monitoredActiveStatuses.map(async (status) => {
    const rows = await supabaseRest<Array<{ created_at: string }>>(
      oldestActiveJobHeadQuery(status, ownerId),
    );
    return { status, created_at: rows[0]?.created_at ?? null };
  }));
  return summarizeOldestActiveJobHeads(heads, nowMs);
}
