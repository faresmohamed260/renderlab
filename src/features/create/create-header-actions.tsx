"use client";

import Link from "next/link";
import { Keyboard, List, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function CreateHeaderActions({ activeStatus }: { activeStatus: string | null }) {
  const [queueOpen, setQueueOpen] = useState(false);
  const shortcutsRef = useRef<HTMLDialogElement>(null);

  function toggleShortcuts() {
    const dialog = shortcutsRef.current;
    if (!dialog) return;
    if (dialog.open) dialog.close();
    else {
      setQueueOpen(false);
      dialog.showModal();
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || event.isComposing || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target;
      if (target instanceof Element && target.closest('input, textarea, select, [contenteditable], [role="textbox"]')) return;
      const otherDialog = document.querySelector('dialog[open], [role="dialog"], [role="alertdialog"]');
      if (otherDialog && otherDialog !== shortcutsRef.current) return;
      if (event.altKey && event.code === "Slash") {
        event.preventDefault();
        toggleShortcuts();
      } else if (!event.altKey && event.key.toLowerCase() === "q" && !shortcutsRef.current?.open) {
        event.preventDefault();
        setQueueOpen((open) => !open);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="fibo-header-actions">
      <DropdownMenu open={queueOpen} onOpenChange={setQueueOpen} modal={false}>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="fibo-header-action" aria-label="Render queue" aria-keyshortcuts="Q" title="Render queue (Q)">
            <List aria-hidden="true" />
            <span className="fibo-queue-label">Queue</span>
            {activeStatus ? <span className="fibo-queue-count" aria-label="1 active render">1</span> : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="fibo-header-panel"
          onInteractOutside={(event) => {
            if (event.target instanceof Element && event.target.closest(".fibo-header-actions")) event.preventDefault();
          }}
        >
          <DropdownMenuLabel>Render queue</DropdownMenuLabel>
          <p className="fibo-header-panel-copy" role="status">{activeStatus ?? "No active renders in this workspace."}</p>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild><Link href="/activity">Open Activity</Link></DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="fibo-header-action fibo-shortcuts-trigger"
        aria-haspopup="dialog"
        aria-controls="fibo-shortcuts-dialog"
        aria-keyshortcuts="Alt+/"
        title="Keyboard shortcuts (Alt+/)"
        onClick={toggleShortcuts}
      >
        <Keyboard aria-hidden="true" />
        <span>Shortcuts</span>
      </Button>
      <dialog ref={shortcutsRef} id="fibo-shortcuts-dialog" className="fibo-shortcuts-dialog" aria-labelledby="fibo-shortcuts-title">
        <div className="fibo-shortcuts-heading">
          <h2 id="fibo-shortcuts-title">Keyboard shortcuts</h2>
          <form method="dialog">
            <Button type="submit" variant="ghost" size="icon" aria-label="Close keyboard shortcuts"><X aria-hidden="true" /></Button>
          </form>
        </div>
        <div className="fibo-shortcuts-group">
          <h3>Studio</h3>
          <dl className="fibo-shortcut-list">
            <dt>Open / close render queue</dt><dd><kbd>Q</kbd></dd>
            <dt>Open / close shortcuts</dt><dd><kbd>Alt + /</kbd></dd>
            <dt>Close queue or shortcuts</dt><dd><kbd>Esc</kbd></dd>
          </dl>
        </div>
      </dialog>
    </div>
  );
}
