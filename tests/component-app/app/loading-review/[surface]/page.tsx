import { Suspense } from "react";
import { RouteLoading } from "@/components/shell/route-loading";
import { CreateLoading } from "@/features/create/create-loading";
import { ActivityView } from "@/features/activity/activity-view";
import { CreatePreviewWorkspace } from "@/features/create/create-preview-workspace";
import type { PublicGenerationActivity } from "@/lib/api/generation-activity-contract";
import { createProps, fixtureJobId } from "../../../fixtures";

const item: PublicGenerationActivity = {
  id: fixtureJobId, status: "succeeded", operation: "create-image", outputKind: "image",
  prompt: "Fixture completed", summary: "Fixture completed", outputAssetIds: [],
  canCancel: false, canRunAgain: false, error: null,
  createdAt: "2026-11-25T00:00:00Z", updatedAt: "2026-11-25T00:00:00Z",
  startedAt: "2026-11-25T00:00:00Z", completedAt: "2026-11-25T00:00:00Z",
};

async function Content({ surface, outcome }: { surface: "create" | "activity"; outcome: string }) {
  await new Promise(resolve => setTimeout(resolve, 1800));
  if (surface === "create") return <CreatePreviewWorkspace {...createProps} />;
  return <ActivityView accountAvailable available={outcome !== "error"} items={outcome === "loaded" ? [item] : []}
    offset={0} limit={20} hasMore={false} hasActive={false} />;
}

// Fixture only: use the production fallback and real feature views, no provider/data access.
export default async function LoadingReview({ params, searchParams }: {
  params: Promise<{ surface: string }>; searchParams: Promise<{ outcome?: string }>;
}) {
  const surface = (await params).surface === "create" ? "create" : "activity";
  const outcome = (await searchParams).outcome ?? "loaded";
  return <Suspense fallback={surface === "create" ? <CreateLoading /> : <RouteLoading surface="activity" />}><Content surface={surface} outcome={outcome} /></Suspense>;
}
