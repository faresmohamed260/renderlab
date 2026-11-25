"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CreateHistoryPanel, CreateHistorySheet } from "@/features/create/history/create-history-panel";
import { useCreateHistory } from "@/features/create/history/use-create-history";
import type { HistoryTransport, JobsReadResult } from "@/features/create/history/history-contract";
import { postHistoryJobAction } from "@/features/create/history/history-job-actions";
import { activityIds } from "../../activity-fixtures";

export function HistoryFixture({ offset, fixtureState, phone }: { offset: number; fixtureState: string; phone: boolean }) {
  const [account, setAccount] = useState<string | null>(fixtureState === "private" ? null : "fixture-owner-A");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [selection, setSelection] = useState("");
  const transport: HistoryTransport = {
    readJobs: async (page, signal) => {
      const response = await fetch("/history/data?" + new URLSearchParams({ offset: String(page), state: fixtureState }), { signal, cache: "no-store" });
      return await response.json() as JobsReadResult;
    },
    readPrompts: async () => ({ items: [], nextCursor: null }),
    mutate: postHistoryJobAction,
    reuse: async id => id === activityIds.failed || id === activityIds.succeeded ? { ok: true, draft: {
      mode: "generate", references: [], prompt: id === activityIds.failed ? "Editable fixture prompt" : "Editable succeeded prompt", vgl: "", seed: "42", randomize: false, steps: 4, negativePrompt: "", aspectRatio: "1:1",
    }} : { ok: false, reason: "input_unavailable" },
  };
  const state = useCreateHistory({ accountKey: account, visible: phone ? open : true, initialTab: phone ? "session" : "jobs", initialOffset: offset,
    transport, onReuseDraft: value => setDraft(value.prompt), onPrompt: setDraft, onSessionResult: result => setSelection(result.label) });
  const record = state.recordResult;
  useEffect(() => { if (phone && account === "fixture-owner-A") record({ id: "fixture-result", label: "Fixture result", createdAt: "2026-11-25T00:00:00Z" }); }, [phone, account, record]);
  return <>
    {phone ? <CreateHistorySheet state={state} open={open} onOpenChange={setOpen} trigger={<Button>Open History</Button>} /> :
      <CreateHistoryPanel state={state} jobsHref={page => "/history" + (page ? "?offset=" + page : "")} />}
    <button type="button" onClick={() => setAccount("fixture-owner-B")}>Switch fixture account</button>
    <output data-testid="fixture-draft">{draft}</output><output data-testid="fixture-selection">{selection}</output>
  </>;
}
