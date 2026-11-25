import { cookies } from "next/headers";
import { ActivityView } from "@/features/activity/activity-view";
import { isActiveGenerationStatus, type PublicGenerationActivity } from "@/lib/api/generation-activity-contract";
import { activityFixtures, newAttempt, activityIds } from "../../activity-fixtures";

export default async function ActivityFixture({ searchParams }: { searchParams: Promise<{ offset?: string; state?: string }> }) {
  const query = await searchParams;
  const jar = await cookies();
  const offset = Math.max(0, Number(query.offset) || 0);
  const state = query.state;
  const accountAvailable = state !== "private";
  const available = state !== "unavailable";
  const items: PublicGenerationActivity[] = offset === 0 && state !== "empty"
    ? activityFixtures.map(item => item.id === activityIds.running && jar.get("fixture-activity-cancel")?.value
      ? { ...item, status: jar.get("fixture-activity-cancel")?.value === "terminal" ? "cancelled" : "cancelling", canCancel: false }
      : item)
    : [];
  if (offset === 0 && jar.get("fixture-activity-retry")?.value) items.unshift(newAttempt("retry"));
  if (offset === 0 && jar.get("fixture-activity-run-again")?.value) items.unshift(newAttempt("run-again"));
  return <ActivityView accountAvailable={accountAvailable} available={available}
    items={accountAvailable && available ? items : []} offset={offset} limit={20}
    hasMore={offset === 0 && state !== "empty"} hasActive={items.some(item => isActiveGenerationStatus(item.status))} />;
}
