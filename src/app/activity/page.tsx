import { ActivityView } from "@/features/activity/activity-view";
import type { PublicGenerationActivity } from "@/lib/api/generation-activity-contract";
import { getCurrentRenderLabAccount } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/server/data/supabase-rest";
import { listGenerationActivity } from "@/server/generation/generation-activity";

export const dynamic = "force-dynamic";

const pageSize = 20;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseOffset(value: string | string[] | undefined) {
  const parsed = Number(firstParam(value) || 0);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const account = await getCurrentRenderLabAccount();
  const offset = parseOffset(params.offset);
  let available = isSupabaseConfigured();
  let items: PublicGenerationActivity[] = [];
  let hasMore = false;
  let hasActive = false;

  if (account && available) {
    try {
      const result = await listGenerationActivity({ ownerId: account.id, limit: pageSize, offset });
      items = result.items;
      hasMore = result.page.hasMore;
      hasActive = result.hasActive;
    } catch {
      available = false;
    }
  }

  return (
    <ActivityView
      accountAvailable={Boolean(account)}
      available={available}
      items={items}
      offset={offset}
      limit={pageSize}
      hasMore={hasMore}
      hasActive={hasActive}
    />
  );
}
