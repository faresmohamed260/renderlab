"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CreateHistoryPanel, CreateHistorySheet } from "@/features/create/history/create-history-panel";
import { useCreateHistory } from "@/features/create/history/use-create-history";
import type { HistoryTransport, JobsReadResult, PromptPage } from "@/features/create/history/history-contract";
import { createHistoryTransport } from "@/features/create/history/history-transport";
import { postHistoryJobAction } from "@/features/create/history/history-job-actions";
import { activityIds } from "../../activity-fixtures";

export function HistoryFixture({ offset, fixtureState, phone }: { offset: number; fixtureState: string; phone: boolean }) {
  const [account, setAccount] = useState<string | null>(fixtureState === "private" ? null : "fixture-owner-A");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [selection, setSelection] = useState("");
  const race = fixtureState === "race" || fixtureState === "action-race";
  const [completedReads, setCompletedReads] = useState<string[]>([]);
  const [completedActions, setCompletedActions] = useState<string[]>([]);

  // These fixture action references stay in flight after their caller aborts,
  // like a server action whose work has already started.
  async function readRace<T>(parameters: Record<string, string>, key: string): Promise<T> {
    const params = new URLSearchParams({ state: fixtureState, owner: account ?? "none", ...parameters });
    const response = await fetch("/history/data?" + params, { cache: "no-store" });
    if (!response.ok) throw new Error(await response.text());
    const value = await response.json() as T;
    setCompletedReads(previous => [...previous, account + ":" + key]);
    return value;
  }

  const readActions = createHistoryTransport({
    readJobsAction: page => readRace<JobsReadResult>({ kind: "jobs", offset: String(page) }, "jobs:" + page),
    readPromptsAction: ({ search, cursor }) => readRace<PromptPage>(
      { kind: "prompts", search, ...(cursor && { cursor: cursor.id }) },
      "prompts:" + search + (cursor ? ":" + cursor.id : ""),
    ),
    reuseAction: async id => id === activityIds.failed || id === activityIds.succeeded ? { ok: true, draft: {
      mode: "generate", references: [], prompt: id === activityIds.failed ? "Editable fixture prompt" : "Editable succeeded prompt", vgl: "", seed: "42", randomize: false, steps: 4, negativePrompt: "", aspectRatio: "1:1",
    }} : { ok: false, reason: "input_unavailable" },
  });
  const transport: HistoryTransport = fixtureState === "action-race" ? readActions : race ? {
    ...readActions,
    // Exercise the hook's own guards even when a transport ignores abort.
    readJobs: page => readActions.readJobs(page, new AbortController().signal),
    readPrompts: query => readActions.readPrompts(query, new AbortController().signal),
    mutate: async (action, id) => {
      // Let the intercepted request complete even after the hook aborts it.
      const result = await postHistoryJobAction(action, id, new AbortController().signal);
      setCompletedActions(previous => [...previous, account + ":" + action + ":" + id]);
      return result;
    },
  } : {
    ...readActions,
    readJobs: async (page, signal) => {
      const params = new URLSearchParams({ offset: String(page), state: fixtureState });
      const response = await fetch("/history/data?" + params, { signal, cache: "no-store" });
      return response.json();
    },
    readPrompts: async () => ({ items: [], nextCursor: null }),
  };
  const state = useCreateHistory({ accountKey: account, visible: phone ? open : true, initialTab: phone ? "session" : "jobs", initialOffset: offset,
    transport, onReuseDraft: value => setDraft(value.prompt), onPrompt: setDraft, onSessionResult: result => setSelection(result.label) });
  function changeAccount(next: string | null) {
    setAccount(next);
    // The fixture's surrounding workspace owns its callback-driven selection.
    setSelection("");
  }

  const record = state.recordResult;
  useEffect(() => { if (phone && account === "fixture-owner-A") record({ id: "fixture-result", label: "Fixture result", createdAt: "2026-11-25T00:00:00Z" }); }, [phone, account, record]);
  return <>
    {phone ? <CreateHistorySheet state={state} open={open} onOpenChange={setOpen} trigger={<Button>Open History</Button>} /> :
      <CreateHistoryPanel state={state} jobsHref={page => "/history" + (page ? "?offset=" + page : "")} />}
    <Button data-testid="fixture-switch-account" onClick={() => changeAccount("fixture-owner-B")}>Switch fixture account</Button>
    {race && <>
      <Button data-testid="fixture-sign-out" onClick={() => changeAccount(null)}>Sign out fixture account</Button>
      <Button onClick={() => record({ id: "race-session", label: "Private session fixture", createdAt: "2026-11-25T00:00:00Z" })}>Record fixture result</Button>
      <output data-testid="race-completed-reads">{completedReads.join("|")}</output>
      <output data-testid="race-completed-actions">{completedActions.join("|")}</output>
      <output data-testid="race-selected-result">{state.selectedSessionResult?.label}</output>
      <output data-testid="race-session-count">{state.session.length}</output>
    </>}
    <output data-testid="fixture-draft">{draft}</output><output data-testid="fixture-selection">{selection}</output>
  </>;
}
