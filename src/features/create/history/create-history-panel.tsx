"use client";
import { useId, useState, type ReactNode } from "react";
import { Search, X, Trash2, Image as ImageIcon, AlertCircle } from "lucide-react";
import styles from "./create-history-rebuild.module.css";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { historyActions, type HistoryAction } from "./history-state";
import type { HistoryJob } from "./history-contract";
import type { CreateHistoryState } from "./use-create-history";

const labels: Record<HistoryAction, string> = { cancel: "Cancel", retry: "Retry", reuse: "Reuse", runAgain: "Run again" };
const pendingLabel: Record<HistoryAction, string> = { cancel: "Cancelling…", retry: "Retrying…", reuse: "Loading settings…", runAgain: "Running again…" };
const operationLabel: Record<HistoryJob["operation"], string> = {
  "create-image": "Create image",
  "edit-image": "Edit image",
  "create-video": "Video generation",
  "animate-image": "Image animation",
  "upscale-image": "Image upscale",
};
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
  const [open, setOpen] = useState(false);
  const submitting = pending && state.action?.id === job.id && state.action.kind === kind;
  if (kind === "cancel") return <AlertDialog open={open} onOpenChange={next => { if (!submitting) setOpen(next); }}>
    <AlertDialogTrigger asChild><Button type="button" size="sm" variant="ghost" disabled={pending}>Cancel</Button></AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogTitle>Cancel this generation?</AlertDialogTitle>
      <AlertDialogDescription>This attempt cannot be resumed. Cancellation is subject to server confirmation.</AlertDialogDescription>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={submitting}>Keep running</AlertDialogCancel>
        <AlertDialogAction disabled={pending} onClick={event => { event.preventDefault(); void state.runAction(job, "cancel").finally(() => setOpen(false)); }}>{submitting ? "Cancelling…" : "Cancel generation"}</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
  return <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => void state.runAction(job, kind)}>{submitting ? pendingLabel[kind] : kind === "reuse" && job.status === "succeeded" ? "Reuse settings" : labels[kind]}</Button>;
}
function PrivateHistory() {
  return <div className="space-y-2">
    <h2>Sign in to view History</h2>
    <p>Generation history is private to your RenderLab account.</p>
    <Button asChild size="sm" variant="outline"><Link href="/settings">Open Settings</Link></Button>
  </div>;
}
export function Jobs({ state, jobsHref }: { state: CreateHistoryState; jobsHref?: (offset: number) => string }) {
  if (!state.jobs && state.jobsPending) return <Loading />;
  if (state.jobsPrivate) return <PrivateHistory />;
  const limit = state.jobs?.page.limit ?? 20;
  const newer = Math.max(0, state.offset - limit);
  const older = state.offset + limit;
  return <div className={styles.jobs}>
    {state.jobs?.hasActive && <p className="sr-only" role="status" data-activity-live="true">Refreshing active jobs</p>}
    {state.jobsError && <div role="alert"><h2>History is temporarily unavailable</h2>{state.jobsError} <Button type="button" size="sm" variant="outline" onClick={state.refresh}>Try again</Button></div>}
    {state.jobs && !state.jobs.items.length && <div className="space-y-2">
      <h2>{state.offset || state.jobs.page.hasMore ? "No visible jobs on this page" : "No jobs yet"}</h2>
      <p>{state.offset ? "Go back to more recent work." : state.jobs.page.hasMore
        ? "Continue to older jobs. Deleted results are omitted automatically."
        : "Your generation history will appear here after you start a render."}</p>
    </div>}
    {state.jobs?.items.map(job => <article key={job.id} data-activity-status={job.status} className={styles.job}>
      <span className={styles.jobIcon} data-failed={job.status === "failed"} aria-hidden="true">{job.status === "failed" ? <AlertCircle size={18} /> : <span />}</span>
      <div className={styles.jobText}>
        <p title={job.summary}>{job.status === "failed" ? "Didn't finish" : statusLabel[job.status]}</p>
        <p className={styles.quiet} title={operationLabel[job.operation]}>{job.error ? job.error.message + " · " : job.status === "running" ? "Started " : ""}<time dateTime={job.startedAt ?? job.createdAt}>{relativeTime(job.startedAt ?? job.createdAt)}</time></p>
      </div>
      <div className={styles.jobActions}>{historyActions(job).map(kind => <JobAction key={kind} kind={kind} job={job} state={state} />)}
        {job.status === "succeeded" && job.outputAssetIds[0] && <Button asChild size="sm" variant="link"><Link href={"/library/" + encodeURIComponent(job.outputAssetIds[0])}>View result</Link></Button>}
      </div>
      {state.action?.id === job.id && <p role={state.action.error ? "alert" : "status"}>{state.action.pending ? "Working…" : state.action.error ?? state.action.notice}</p>}
    </article>)}
    {(state.offset > 0 || state.jobs?.page.hasMore) && <nav aria-label="Jobs pagination" className="flex flex-wrap items-center gap-2">
      {state.offset > 0 && (jobsHref
        ? <Button asChild size="sm" variant="outline"><Link href={jobsHref(newer)} aria-label="Newer jobs">Newer</Link></Button>
        : <Button type="button" size="sm" variant="outline" disabled={state.jobsPending} onClick={state.newerJobs} aria-label="Newer jobs">Newer</Button>)}
      <span>Page {Math.floor(state.offset / limit) + 1}</span>
      {state.jobs?.page.hasMore && (jobsHref
        ? <Button asChild size="sm" variant="outline"><Link href={jobsHref(older)}>Older</Link></Button>
        : <Button type="button" size="sm" variant="outline" disabled={state.jobsPending} onClick={state.olderJobs}>Older</Button>)}
    </nav>}
  </div>;
}
function relativeTime(value?: string) {
  if (!value) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 60000));
  if (!Number.isFinite(minutes)) return "";
  if (minutes < 1) return "Just now";
  if (minutes < 60) return minutes + " min ago";
  if (minutes < 1440) return Math.floor(minutes / 60) + " hr ago";
  return Math.floor(minutes / 1440) + " d ago";
}
export type RailResult = { id: string; label: string; image?: string; createdAt?: string; edit?: boolean; current: boolean; onSelect: () => void };
export type RailProps = { state: CreateHistoryState; results: RailResult[]; recent: readonly string[]; disabled?: boolean; onReusePrompt: (value: string) => void; onRemovePrompt: (value: string) => void; onClearPrompts: () => void; shortcutsEnabled?: boolean; children?: ReactNode };
function Heading({ label, hint }: { label: string; hint: string }) {
  return <div className={styles.heading}><h2>{label}</h2><span>{hint}</span></div>;
}
function Results({ results, disabled }: Pick<RailProps, "results" | "disabled">) {
  return <><Heading label="This session" hint={results.length + (results.length === 1 ? " result" : " results")} />
    <div className={styles.results}>
      {results.map(result => <Button type="button" variant="ghost" key={result.id} data-create-history-image="" disabled={disabled} aria-current={result.current} aria-label={[result.label, relativeTime(result.createdAt), result.edit ? "Edit" : ""].filter(Boolean).join(", ")} className={styles.result} onClick={result.onSelect}>
        <span className={styles.thumbnail}>{result.image ? <img src={result.image} alt="" draggable={false} loading="lazy" /> : <ImageIcon aria-hidden="true" size={20} />}</span>
        <span className={styles.resultText}><span>{result.label}</span><span>{[relativeTime(result.createdAt), result.edit ? "Edit" : ""].filter(Boolean).join(" · ")}</span></span>
      </Button>)}
      {!results.length && <p className={styles.quiet}>Finished images will appear here.</p>}
    </div></>;
}
function Prompts({ state, recent, disabled, onReusePrompt, onRemovePrompt, onClearPrompts }: RailProps) {
  const id = useId();
  const [draft, setDraft] = useState(state.search);
  const local = recent.filter(value => value.toLowerCase().includes(draft.trim().toLowerCase()));
  const saved = state.prompts?.items.filter(item => !recent.includes(item.prompt)) ?? [];
  return <div className={styles.promptSection}>
    <div className={styles.heading}><h2>Prompt history</h2><span className={styles.reuseHint}>Click to reuse</span>{recent.length > 0 && <Button type="button" variant="ghost" size="icon-sm" className={styles.quietIcon} disabled={disabled} aria-label="Clear recent prompts" onClick={onClearPrompts}><Trash2 size={14} /></Button>}</div>
    <form className={styles.search} onSubmit={event => { event.preventDefault(); state.setSearch(draft); }}>
      <Search size={16} aria-hidden="true" /><label htmlFor={id} className="sr-only">Search prompts</label>
      <Input id={id} value={draft} onChange={event => { const value = event.target.value; setDraft(value); state.setSearch(value); }} maxLength={128} placeholder="Search prompts" />
    </form>
    <div className={styles.prompts}>
      {local.map(value => <div className={styles.promptRow} key={value}><Button type="button" variant="ghost" disabled={disabled} className={styles.prompt} onClick={() => onReusePrompt(value)}><span>{value}</span></Button><Button type="button" variant="ghost" size="icon-sm" disabled={disabled} className={styles.quietIcon} aria-label={"Remove recent prompt: " + value} onClick={() => onRemovePrompt(value)}><X size={14} /></Button></div>)}
      {saved.map(item => <Button key={item.id} type="button" variant="ghost" disabled={disabled} className={styles.prompt} onClick={() => onReusePrompt(item.prompt)}><span>{item.prompt}</span></Button>)}
      {state.accountAvailable && !state.prompts && state.promptsPending && <Loading />}
      {state.promptsError && <div role="alert">{state.promptsError} <Button type="button" size="sm" variant="ghost" onClick={state.refresh}>Try again</Button></div>}
      {!local.length && !saved.length && (!state.accountAvailable || !state.promptsPending) && <p className={styles.quiet}>No matching prompts.</p>}
      {(state.hasNewerPrompts || state.prompts?.nextCursor) && <nav aria-label="Prompt pages" className="flex gap-2"><Button type="button" size="sm" variant="ghost" disabled={!state.hasNewerPrompts || state.promptsPending} onClick={state.newerPrompts}>Newer</Button><Button type="button" size="sm" variant="ghost" disabled={!state.prompts?.nextCursor || state.promptsPending} onClick={state.olderPrompts}>Older</Button></nav>}
    </div>
  </div>;
}
export function CreateHistoryPanel(props: RailProps) {
  return <section aria-label="Create history" data-activity-system="history" className={styles.rail}>
    <Results {...props} /><div className={styles.divider} /><Prompts {...props} />
    {props.children}
    {props.shortcutsEnabled && <div className={styles.hints}><kbd>[</kbd><kbd>]</kbd> step through results</div>}
  </section>;
}
export function CreateHistorySheet({ open, onOpenChange, trigger, ...props }: RailProps & { open: boolean; onOpenChange: (open: boolean) => void; trigger?: ReactNode }) {
  return <Sheet open={open} onOpenChange={onOpenChange}>
    {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
    <SheetContent side="bottom" showCloseButton={false} className={styles.sheet} data-create-shortcut-overlay="">
      <div className={styles.handle} aria-hidden="true" />
      <div className={styles.sheetTitle}><SheetTitle>History</SheetTitle><SheetClose asChild><Button type="button" variant="ghost">Done</Button></SheetClose></div>
      <SheetDescription className="sr-only">Jobs, results from this tab, and saved prompts.</SheetDescription>
      <div className={styles.sheetBody}><div><Heading label="Jobs" hint="Status, retry and settings" /><Jobs state={props.state} /></div><div><Results {...props} /></div><Prompts {...props} />{props.children}</div>
    </SheetContent>
  </Sheet>;
}
