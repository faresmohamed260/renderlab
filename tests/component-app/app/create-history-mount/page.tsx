import { CreatePreviewWorkspace } from "@/features/create/create-preview-workspace";
import type { HistoryReadActions } from "@/features/create/history/history-transport";
import { createProps, fixtureJobId } from "../../fixtures";

export default async function FixtureHistoryMount({ searchParams }: { searchParams: Promise<{ account?: string }> }) {
  const account = (await searchParams).account === "guest" ? null : "fixture-owner";
  async function readJobsAction(offset: number): ReturnType<HistoryReadActions["readJobsAction"]> {
      "use server";
      if (!account) return { state: "private" };
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
      if (!account || id !== fixtureJobId) return { ok: false, reason: "unavailable" };
      return { ok: true, draft: { mode: "generate", references: [], prompt: "Fixture editable draft", vgl: "", seed: "42", randomize: false, steps: 4, negativePrompt: "", aspectRatio: "1:1" } };
  }
  const actions: HistoryReadActions = { readJobsAction, readPromptsAction, reuseAction };
  return <CreatePreviewWorkspace {...createProps} key={account ?? "guest"} admitted={!!account} hostedAccountKey={account ?? undefined} hostedModel={account ? createProps.hostedModel : undefined} historyActions={actions} />;
}
