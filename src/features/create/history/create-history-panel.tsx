"use client";
import { useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { historyActions, type HistoryAction } from "./history-state";
import type { HistoryJob, HistoryTab } from "./history-contract";
import type { CreateHistoryState } from "./use-create-history";

const tabs: { id: HistoryTab; label: string }[] = [
  { id: "jobs", label: "Jobs" }, { id: "session", label: "This session" }, { id: "prompts", label: "Prompt history" },
];
const labels: Record<HistoryAction, string> = { cancel: "Cancel", retry: "Retry", reuse: "Reuse", runAgain: "Run again" };
const statusLabel: Record<HistoryJob["status"], string> = {
  queued: "Queued", preparing: "Preparing", running: "Running", cancelling: "Cancelling",
  persisting: "Saving result", succeeded: "Succeeded", failed: "Failed", cancelled: "Cancelled",
};
function Loading() {
  return <div role="status" aria-label="Loading history" className="space-y-2">
    <span className="sr-only">Loading history…</span>
    {[0, 1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}
  </div>;
}
function JobAction({ job, kind, state }: { job: HistoryJob; kind: HistoryAction; state: CreateHistoryState }) {
  const pending = !!state.action?.pending;
  if (kind === "cancel") return <AlertDialog>
    <AlertDialogTrigger asChild><Button type="button" size="sm" variant="outline" disabled={pending}>Cancel</Button></AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogTitle>Cancel this generation?</AlertDialogTitle>
      <AlertDialogDescription>This attempt cannot be resumed. Cancellation is subject to server confirmation.</AlertDialogDescription>
      <AlertDialogFooter>
        <AlertDialogCancel>Keep running</AlertDialogCancel>
        <AlertDialogAction disabled={pending} onClick={() => void state.runAction(job, "cancel")}>Cancel generation</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
  return <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => void state.runAction(job, kind)}>{labels[kind]}</Button>;
}
function Jobs({ state }: { state: CreateHistoryState }) {
  if (!state.jobs && state.jobsPending) return <Loading />;
  return <div className="space-y-3">
    {state.jobsError && <div role="alert">{state.jobsError} <Button type="button" size="sm" variant="outline" onClick={state.refresh}>Try again</Button></div>}
    {state.jobs && !state.jobs.items.length && <p>No jobs on this page.</p>}
    {state.jobs?.items.map(job => <article key={job.id} className="min-w-0 space-y-2 rounded-[var(--rl-radius-control)] border border-[color:var(--rl-border-subtle)] bg-[var(--rl-surface-raised)] p-3">
      <p className="font-medium break-words">{job.summary}</p>
      <p className="text-xs text-[color:var(--rl-text-quiet)]">{statusLabel[job.status]} · <time dateTime={job.createdAt}>{job.createdAt.slice(0, 16).replace("T", " ")} UTC</time></p>
      {job.error && <p role="status" className="text-[color:var(--rl-danger)]">{job.error.message}</p>}
      <div className="flex flex-wrap gap-2">{historyActions(job).map(kind => <JobAction key={kind} kind={kind} job={job} state={state} />)}
        {job.outputAssetIds[0] && <Button asChild size="sm" variant="link"><Link href={"/library/" + encodeURIComponent(job.outputAssetIds[0])}>View result</Link></Button>}
      </div>
      {state.action?.id === job.id && <p role={state.action.error ? "alert" : "status"}>{state.action.pending ? "Working…" : state.action.error ?? state.action.notice}</p>}
    </article>)}
    <div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" disabled={!state.offset || state.jobsPending} onClick={state.newerJobs}>Newer</Button>
      <Button type="button" size="sm" variant="outline" disabled={!state.jobs?.page.hasMore || state.jobsPending} onClick={state.olderJobs}>Older</Button></div>
  </div>;
}
function Prompts({ state }: { state: CreateHistoryState }) {
  const id = useId();
  const [draft, setDraft] = useState(state.search);
  return <div className="min-w-0 space-y-3">
    <form className="flex min-w-0 flex-wrap gap-2" onSubmit={event => { event.preventDefault(); state.setSearch(draft); }}>
      <label htmlFor={id} className="sr-only">Search prompt history</label>
      <Input id={id} value={draft} onChange={event => setDraft(event.target.value)} maxLength={128} placeholder="Search prompts" className="min-w-0 flex-1" />
      <Button type="submit" size="sm" variant="outline">Search</Button>
    </form>
    {!state.prompts && state.promptsPending ? <Loading /> : <>
      {state.promptsError && <div role="alert">{state.promptsError} <Button type="button" size="sm" variant="outline" onClick={state.refresh}>Try again</Button></div>}
      {state.prompts && !state.prompts.items.length && <p>No matching prompts.</p>}
      {state.prompts?.items.map(item => <article key={item.id} className="min-w-0 space-y-2 rounded-[var(--rl-radius-control)] border border-[color:var(--rl-border-subtle)] bg-[var(--rl-surface-raised)] p-3">
        <p className="whitespace-pre-wrap break-words">{item.prompt}</p>
        <p className="text-xs text-[color:var(--rl-text-quiet)]">{statusLabel[item.status]}</p>
        <Button type="button" size="sm" variant="outline" onClick={() => state.onPrompt(item.prompt)}>Use prompt</Button>
      </article>)}
      <div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" disabled={!state.hasNewerPrompts || state.promptsPending} onClick={state.newerPrompts}>Newer</Button>
        <Button type="button" size="sm" variant="outline" disabled={!state.prompts?.nextCursor || state.promptsPending} onClick={state.olderPrompts}>Older</Button></div>
    </>}
  </div>;
}
export function CreateHistoryPanel({ state }: { state: CreateHistoryState }) {
  return <section aria-label="Create history" className="min-w-0 space-y-3 text-[color:var(--rl-text-primary)]">
    <div role="group" aria-label="History view" className="flex flex-wrap gap-2">{tabs.map(tab => <Button key={tab.id} type="button" size="sm" variant="secondary" aria-pressed={state.tab === tab.id} onClick={() => state.setTab(tab.id)}>{tab.label}</Button>)}</div>
    {!state.accountAvailable ? <p>Sign in to view private history.</p> : state.tab === "jobs" ? <Jobs state={state} /> : state.tab === "prompts" ? <Prompts key={state.search} state={state} /> :
      <div className="space-y-2">{!state.session.length && <p>No results in this tab yet.</p>}
        {state.session.map(result => <Button key={result.id} type="button" variant="outline" className="w-full min-w-0 justify-start whitespace-normal break-words" onClick={() => state.onSessionResult(result)}>{result.label}</Button>)}
      </div>}
  </section>;
}
export function CreateHistorySheet({ state, open, onOpenChange, trigger }: { state: CreateHistoryState; open: boolean; onOpenChange: (open: boolean) => void; trigger: ReactNode }) {
  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetTrigger asChild>{trigger}</SheetTrigger>
    <SheetContent side="bottom" className="max-h-[85dvh]">
      <SheetTitle>History</SheetTitle>
      <SheetDescription>Jobs, results from this tab, and saved prompts.</SheetDescription>
      <CreateHistoryPanel state={state} />
    </SheetContent>
  </Sheet>;
}
