import { cookies } from "next/headers";
import { activityFixtures, newAttempt, activityIds } from "../../../activity-fixtures";
import { isActiveGenerationStatus } from "@/lib/api/generation-activity-contract";
import type { JobsReadResult } from "@/features/create/history/history-contract";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const state = query.get("state");
  const offset = Math.max(0, Number(query.get("offset")) || 0);
  const jar = await cookies();
  if (state === "private" || state === "unavailable") return Response.json({ state });
  const items = offset === 0 && state !== "empty" ? activityFixtures.map(item => {
    const cancel = item.id === activityIds.running ? jar.get("fixture-activity-cancel")?.value : undefined;
    const failed = item.id === activityIds.failed;
    return { ...item, ...(cancel ? { status: (cancel === "terminal" ? "cancelled" : "cancelling") as "cancelled" | "cancelling", canCancel: false } : {}), canRetry: failed, canReuse: failed || item.id === activityIds.succeeded };
  }) : [];
  if (offset === 0 && state !== "empty") {
    if (jar.get("fixture-activity-retry")?.value) items.unshift({ ...newAttempt("retry"), canRetry: false, canReuse: false });
    if (jar.get("fixture-activity-run-again")?.value) items.unshift({ ...newAttempt("run-again"), canRetry: false, canReuse: false });
  }
  const body: JobsReadResult = { state: "ready", items, page: { offset, limit: 20, hasMore: offset === 0 && state !== "empty" }, hasActive: items.some(item => isActiveGenerationStatus(item.status)) };
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}
