import { parseHistoryEntry, type HistoryEntryParams } from "@/features/create/history/history-entry";
import { cookies } from "next/headers";
import { activityFixtures, activityIds, newAttempt } from "../../activity-fixtures";
import { isActiveGenerationStatus } from "@/lib/api/generation-activity-contract";
import { CreatePreviewWorkspace } from "@/features/create/create-preview-workspace";
import type { HistoryReadActions } from "@/features/create/history/history-transport";
import { createProps, fixtureJobId } from "../../fixtures";

export default async function FixtureHistoryMount({ searchParams }: { searchParams: Promise<HistoryEntryParams> }) {
  const query = await searchParams;
  const account = query.account === "guest" ? null : query.account === "other" ? "fixture-other" : "fixture-owner";
  const matrix = query.matrix === "1";
  async function readJobsAction(offset: number): ReturnType<HistoryReadActions["readJobsAction"]> {
      "use server";
      if (!account) return { state: "private" };
      if (matrix) {
        const jar = await cookies();
        const items = account === "fixture-owner" && offset === 0 ? activityFixtures.map(item => {
          const cancel = item.id === activityIds.running ? jar.get("fixture-activity-cancel")?.value : undefined;
          const failed = item.id === activityIds.failed;
          return { ...item, ...(cancel ? { status: (cancel === "terminal" ? "cancelled" : "cancelling") as "cancelled" | "cancelling", canCancel: false } : {}), canRetry: failed, canReuse: failed || item.id === activityIds.succeeded };
        }) : [];
        if (account === "fixture-owner" && offset === 0) {
          if (jar.get("fixture-activity-retry")?.value) items.unshift({ ...newAttempt("retry"), canRetry: false, canReuse: false });
          if (jar.get("fixture-activity-run-again")?.value) items.unshift({ ...newAttempt("run-again"), canRetry: false, canReuse: false });
        }
        return { state: "ready", items, page: { offset, limit: 20, hasMore: offset === 0 && account === "fixture-owner" }, hasActive: items.some(item => isActiveGenerationStatus(item.status)) };
      }
      return { state: "ready", items: [{
        id: fixtureJobId, status: "failed", operation: "create-image", outputKind: "image", prompt: "Fixture failed job", summary: "Fixture failed job",
        outputAssetIds: [], canCancel: false, canRetry: true, canRunAgain: false, canReuse: true, error: null,
        createdAt: "2026-11-24T00:00:00Z", updatedAt: "2026-11-24T00:00:00Z", startedAt: null, completedAt: null,
      }], page: { offset, limit: 20, hasMore: false }, hasActive: false };
  }
  async function readPromptsAction(): ReturnType<HistoryReadActions["readPromptsAction"]> {
      "use server";
      return { items: account ? [{ id: fixtureJobId, prompt: "Fixture saved prompt", status: "failed", operation: "create-image", createdAt: "2026-11-24T00:00:00Z" }] : [], nextCursor: null };
  }
  async function reuseAction(id: string): ReturnType<HistoryReadActions["reuseAction"]> {
      "use server";
      if (!account || (matrix ? account !== "fixture-owner" || ![activityIds.failed, activityIds.succeeded].includes(id) : id !== fixtureJobId)) return { ok: false, reason: "unavailable" };
      return { ok: true, draft: { mode: "generate", references: [], prompt: "Fixture editable draft", vgl: "", seed: "42", randomize: false, steps: 4, negativePrompt: "", aspectRatio: "1:1" } };
  }
  const entry = parseHistoryEntry(query);
  const actions: HistoryReadActions = { readJobsAction, readPromptsAction, reuseAction };
  return <CreatePreviewWorkspace {...createProps} key={(account ?? "guest") + ":" + (entry.open ? entry.offset : "session")} initialHistory={entry} admitted={!!account} hostedAccountKey={account ?? undefined} hostedModel={account ? createProps.hostedModel : undefined} historyActions={actions} />;
}
