"use client";

import { useSyncExternalStore } from "react";

/** UI-only action; its feature owner decides whether it is currently available. */
export type CreateCommand = Readonly<{
  id: string;
  label: string;
  keywords: readonly string[];
  shortcut?: string;
  group: string;
  enabled: boolean;
  /** Actual feature-owned disclosure state, if this command opens one. */
  expanded?: boolean;
  run: () => void | Promise<void>;
}>;

const entries = new Map<string, CreateCommand>();
const listeners = new Set<() => void>();
const empty: readonly CreateCommand[] = Object.freeze([]);
let snapshot: readonly CreateCommand[] = empty;

function publish() {
  snapshot = Object.freeze(Array.from(entries.values()));
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Register in a client effect, returning its cleanup. A stale cleanup cannot
 * remove a newer registration of the same stable id. Re-register when state
 * or the action callback changes; the snapshot is stable between writes. */
export function registerCreateCommand(command: CreateCommand): () => void {
  const entry = Object.freeze({ ...command, keywords: Object.freeze([...command.keywords]) });
  entries.set(entry.id, entry);
  publish();
  return () => {
    if (entries.get(entry.id) !== entry) return;
    entries.delete(entry.id);
    publish();
  };
}

export function useCreateCommands(): readonly CreateCommand[] {
  return useSyncExternalStore(subscribe, () => snapshot, () => empty);
}
