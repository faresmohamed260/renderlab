"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createTabHistory, historyActions, type HistoryAction, type SessionResult } from "./history-state";
import type { HistoryOptions, HistoryTab, HistoryJob, JobsPage, PromptCursor, PromptPage } from "./history-contract";

const tabHistory = createTabHistory();
const emptySession: readonly SessionResult[] = [];
type ReadState<T> = { key: string; value?: T; error?: string; private?: boolean; pending: boolean };
const readError = "History could not be loaded. Try again.";
const actionError = "This action could not be completed. Your draft is unchanged.";
const pageSize = 20;
const refreshMs = 5_000;

export function useCreateHistory(options: HistoryOptions) {
  const { accountKey, visible, onPrompt, onSessionResult } = options;
  const [tab, setTab] = useState<HistoryTab>(options.initialTab ?? "session");
  const [offset, setOffset] = useState(options.initialOffset ?? 0);
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<PromptCursor>();
  const [priorCursors, setPriorCursors] = useState<(PromptCursor | undefined)[]>([]);
  const [jobs, setJobs] = useState<ReadState<JobsPage>>();
  const [prompts, setPrompts] = useState<ReadState<PromptPage>>();
  const [revision, setRevision] = useState(0);
  const [action, setAction] = useState<{ key: string; id: string; kind: HistoryAction; pending: boolean; error?: string; notice?: string }>();
  const activeAction = useRef<AbortController | null>(null);
  const liveAccount = useRef(accountKey);
  const previousAccount = useRef(accountKey);
  const callbacks = useRef(options);
  useLayoutEffect(() => { callbacks.current = options; liveAccount.current = accountKey; });
  useLayoutEffect(() => {
    tabHistory.setAccount(accountKey);
    if (previousAccount.current === accountKey) return;
    previousAccount.current = accountKey;
    activeAction.current?.abort();
    activeAction.current = null;
    setTab("session"); setOffset(0); setSearch(""); setCursor(undefined); setPriorCursors([]);
    setJobs(undefined); setPrompts(undefined); setAction(undefined);
  }, [accountKey]);
  const session = useSyncExternalStore(tabHistory.subscribe, () => tabHistory.snapshot(accountKey), () => emptySession);
  const recordResult = useCallback((result: SessionResult) => {
    if (accountKey && liveAccount.current === accountKey) tabHistory.record(accountKey, result);
  }, [accountKey]);
  const jobsKey = JSON.stringify([accountKey, offset]);
  const promptsKey = JSON.stringify([accountKey, search, cursor]);
  const jobsValue = jobs?.key === jobsKey ? jobs.value : undefined;
  const promptsValue = prompts?.key === promptsKey ? prompts.value : undefined;
  useEffect(() => {
    if (!accountKey || !visible || tab !== "jobs") return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function read() {
      setJobs(old => ({ key: jobsKey, value: old?.key === jobsKey ? old.value : undefined, pending: true }));
      try {
        const result = await callbacks.current.transport.readJobs(offset, controller.signal);
        if (controller.signal.aborted) return;
        if (result.state !== "ready") {
          setJobs({ key: jobsKey, pending: false, private: result.state === "private", error: result.state === "unavailable" ? readError : undefined });
          return;
        }
        setJobs({ key: jobsKey, value: result, pending: false });
        if (result.hasActive) timer = setTimeout(() => { void read(); }, refreshMs);
      } catch {
        if (!controller.signal.aborted) setJobs({ key: jobsKey, pending: false, error: readError });
      }
    }
    void read();
    return () => { controller.abort(); if (timer !== undefined) clearTimeout(timer); };
  }, [accountKey, visible, tab, offset, jobsKey, revision]);
  useEffect(() => {
    if (!accountKey || !visible || tab !== "prompts") return;
    const controller = new AbortController();
    setPrompts(old => ({ key: promptsKey, value: old?.key === promptsKey ? old.value : undefined, pending: true }));
    void callbacks.current.transport.readPrompts({ search, limit: pageSize, cursor }, controller.signal).then(result => {
      if (!controller.signal.aborted) setPrompts({ key: promptsKey, value: result, pending: false });
    }).catch(() => {
      if (!controller.signal.aborted) setPrompts(old => ({ key: promptsKey, value: old?.key === promptsKey ? old.value : undefined, pending: false, error: readError }));
    });
    return () => controller.abort();
  }, [accountKey, visible, tab, promptsKey, search, cursor, revision]);
  useEffect(() => () => { activeAction.current?.abort(); activeAction.current = null; }, []);

  const runAction = useCallback(async (job: HistoryJob, kind: HistoryAction) => {
    if (!accountKey || liveAccount.current !== accountKey || activeAction.current || !historyActions(job).includes(kind)) return;
    const controller = new AbortController();
    activeAction.current = controller;
    setAction({ key: accountKey, id: job.id, kind, pending: true });
    try {
      if (kind === "reuse") {
        const result = await callbacks.current.transport.reuse(job.id, controller.signal);
        if (controller.signal.aborted || liveAccount.current !== accountKey) return;
        if (!result.ok) { setAction({ key: accountKey, id: job.id, kind, pending: false, error: "These saved settings cannot be reused with the current inputs and capabilities." }); return; }
        await callbacks.current.onReuseDraft(result.draft, controller.signal);
        if (controller.signal.aborted || liveAccount.current !== accountKey) return;
        setAction({ key: accountKey, id: job.id, kind, pending: false, notice: "Settings loaded. Generate when ready." });
      } else {
        const result = await callbacks.current.transport.mutate(kind, job.id, controller.signal);
        if (controller.signal.aborted || liveAccount.current !== accountKey) return;
        if (!result.ok) { setAction({ key: accountKey, id: job.id, kind, pending: false, error: result.message }); return; }
        setAction({ key: accountKey, id: job.id, kind, pending: false, notice: kind === "cancel" ? "Cancellation requested." : "New attempt accepted." });
        if (kind !== "cancel") setOffset(0);
        setRevision(old => old + 1);
      }
    } catch {
      if (!controller.signal.aborted && liveAccount.current === accountKey) setAction({ key: accountKey, id: job.id, kind, pending: false, error: actionError });
    } finally { if (activeAction.current === controller) activeAction.current = null; }
  }, [accountKey]);
  return {
    accountAvailable: !!accountKey, tab, setTab, session, recordResult,
    jobs: jobsValue, jobsPrivate: jobs?.key === jobsKey && jobs.private === true, jobsPending: jobs?.key !== jobsKey || jobs.pending, jobsError: jobs?.key === jobsKey ? jobs.error : undefined,
    offset, olderJobs: () => { if (jobsValue?.page.hasMore) setOffset(offset + jobsValue.page.limit); },
    newerJobs: () => setOffset(Math.max(0, offset - (jobsValue?.page.limit ?? pageSize))),
    prompts: promptsValue, promptsPending: prompts?.key !== promptsKey || prompts.pending, promptsError: prompts?.key === promptsKey ? prompts.error : undefined,
    search, setSearch: (value: string) => { setSearch(value.trim()); setCursor(undefined); setPriorCursors([]); },
    olderPrompts: () => { if (promptsValue?.nextCursor) { setPriorCursors([...priorCursors, cursor]); setCursor(promptsValue.nextCursor); } },
    newerPrompts: () => { if (priorCursors.length) { setCursor(priorCursors.at(-1)); setPriorCursors(priorCursors.slice(0, -1)); } },
    hasNewerPrompts: priorCursors.length > 0,
    action: action?.key === accountKey ? action : undefined, runAction,
    refresh: () => setRevision(old => old + 1), onPrompt, onSessionResult,
  };
}
export type CreateHistoryState = ReturnType<typeof useCreateHistory>;
