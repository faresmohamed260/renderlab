import { Suspense } from "react";
import { RouteLoading } from "@/components/shell/route-loading";
import { ActivityView } from "@/features/activity/activity-view";
import type { PublicGenerationActivity } from "@/lib/api/generation-activity-contract";
import { getCurrentRenderLabAccount } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/server/data/supabase-rest";
import { listGenerationActivity } from "@/server/generation/generation-activity";
import { settleOwnerGenerationWithinResponse } from "@/server/generation/owner-generation-settlement";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

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
  const available = isSupabaseConfigured();
  // Preserve the existing signed-out/unavailable response without streaming a fallback.
  if (!account || !available) return <ActivityView accountAvailable={Boolean(account)} available={available}
    items={[]} offset={offset} limit={pageSize} hasMore={false} hasActive={false} />;
  return <Suspense fallback={<RouteLoading surface="activity" />}>
    <AdmittedActivity account={account} offset={offset} />
  </Suspense>;
}

async function AdmittedActivity({ account, offset }: { account: NonNullable<Awaited<ReturnType<typeof getCurrentRenderLabAccount>>>; offset: number }) {
  let available = true;
  let items: PublicGenerationActivity[] = [];
  let hasMore = false;
  let hasActive = false;

  await settleOwnerGenerationWithinResponse(account.id, "activity");
  try {
    const result = await listGenerationActivity({ ownerId: account.id, limit: pageSize, offset });
    items = result.items;
    hasMore = result.page.hasMore;
    hasActive = result.hasActive;
  } catch {
    available = false;
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
