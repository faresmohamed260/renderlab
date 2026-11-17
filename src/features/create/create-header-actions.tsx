"use client";

import Link from "next/link";
import { Keyboard, List } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

export function CreateHeaderActions({ activeStatus }: { activeStatus: string | null }) {
  const queueRef = useRef<HTMLElement>(null);
  const shortcutsRef = useRef<HTMLDialogElement>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const pressedOutside = useRef(false);

  function openShortcuts() {
    const dialog = shortcutsRef.current;
    if (!dialog || dialog.open) return;
    queueRef.current?.hidePopover();
    dialog.showModal();
    closeRef.current?.focus();
  }

  function isOutside(event: React.MouseEvent<HTMLDialogElement>) {
    if (event.target !== event.currentTarget) return false;
    const { left, right, top, bottom } = event.currentTarget.getBoundingClientRect();
    return event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom;
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || event.isComposing || event.getModifierState("AltGraph") || event.shiftKey
        || document.querySelector('dialog[open], [role="dialog"], [role="alertdialog"]')) return;
      const target = event.target;
      const editing = target instanceof Element && target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="slider"]');
      const prompt = document.getElementById("create-prompt");
      function activate(button: HTMLButtonElement | null, focus = false) {
        if (!button?.getClientRects().length || button.disabled || button.getAttribute("aria-disabled") === "true") return;
        event.preventDefault();
        button.click();
        if (focus) button.focus({ preventScroll: true });
      }
      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        switch (event.code) {
          case "Slash": activate(triggerRef.current); break;
          case "Digit1": activate(document.querySelector('.fibo-workflow-switch [data-workflow-key="generate"]'), true); break;
          case "Digit2": activate(document.querySelector('.fibo-workflow-switch [data-workflow-key="edit"]'), true); break;
          case "KeyP":
            if (prompt?.getClientRects().length) {
              event.preventDefault();
              prompt.focus();
            }
            break;
          case "KeyU": activate(document.querySelector(".fibo-create .clear-composer-reference-trigger")); break;
        }
        return;
      }
      if (event.altKey) return;
      if (event.ctrlKey || event.metaKey) {
        if (event.key === "Enter" && (!editing || editing === prompt)) {
          activate(document.querySelector(".fibo-create form[data-create-instrument] button[type=submit]"));
        }
        return;
      }
      if (!editing && event.key.toLowerCase() === "q") {
        const queue = queueRef.current;
        const openPanel = document.querySelector("[popover]:popover-open");
        if (!queue || (openPanel && openPanel !== queue) || document.querySelector('[role="menu"]')) return;
        event.preventDefault();
        queue.togglePopover();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="fibo-header-actions">
      <Button type="button" variant="ghost" size="sm" className="fibo-header-action" aria-label={activeStatus ? "Render queue, 1 active render" : "Render queue"} aria-keyshortcuts="Q" title="Render queue" popoverTarget="fibo-render-queue">
        <List aria-hidden="true" />
        <span className="fibo-queue-label">Queue</span>
        {activeStatus ? <span className="fibo-queue-count" aria-hidden="true">1</span> : null}
      </Button>
      <section ref={queueRef} id="fibo-render-queue" popover="auto" className="fibo-queue-popover" aria-labelledby="fibo-queue-title">
        <div className="fibo-queue-heading">
          <h2 id="fibo-queue-title">Render queue</h2>
          <Button type="button" variant="ghost" size="sm" popoverTarget="fibo-render-queue" popoverTargetAction="hide">Close</Button>
        </div>
        <p className="fibo-queue-status" role="status">{activeStatus ?? "No renders queued."}</p>
        <Button asChild variant="ghost" size="sm"><Link href="/activity">Open Activity</Link></Button>
      </section>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="fibo-header-action fibo-shortcuts-trigger"
        aria-haspopup="dialog"
        aria-controls="fibo-shortcuts-dialog"
        aria-keyshortcuts="Alt+/"
        title="Keyboard shortcuts (Alt+/)"
        ref={triggerRef}
        onClick={openShortcuts}
      >
        <Keyboard aria-hidden="true" />
        <span>Shortcuts</span>
      </Button>
      <dialog ref={shortcutsRef} id="fibo-shortcuts-dialog" className="fibo-shortcuts-dialog" aria-labelledby="fibo-shortcuts-title"
        onPointerDown={(event) => { pressedOutside.current = isOutside(event); }}
        onClick={(event) => {
          if (pressedOutside.current && isOutside(event)) event.currentTarget.close();
          pressedOutside.current = false;
        }}
      >
        <div className="fibo-shortcuts-heading">
          <h2 id="fibo-shortcuts-title">Keyboard shortcuts</h2>
          <form method="dialog">
            <Button ref={closeRef} type="submit" variant="ghost" size="sm">Close</Button>
          </form>
        </div>
        <div className="fibo-shortcuts-groups">
          <section aria-labelledby="fibo-shortcuts-studio">
            <h3 id="fibo-shortcuts-studio">Studio</h3>
            <dl>
              <div><dt>Generate</dt><dd><kbd>Ctrl / Cmd + Enter</kbd></dd></div>
              <div><dt>Text to Image / Image Editing</dt><dd><kbd>Alt + 1</kbd> <kbd>Alt + 2</kbd></dd></div>
              <div><dt>Focus prompt</dt><dd><kbd>Alt + P</kbd></dd></div>
              <div><dt>Upload a source or reference</dt><dd><kbd>Alt + U</kbd></dd></div>
              <div><dt>Open / close render queue menu</dt><dd><kbd>Q</kbd></dd></div>
              <div><dt>Open / close shortcuts</dt><dd><kbd>Alt + /</kbd> / <kbd>Esc</kbd></dd></div>
            </dl>
          </section>
          <section aria-labelledby="fibo-shortcuts-navigation">
            <h3 id="fibo-shortcuts-navigation">Keyboard navigation</h3>
            <dl>
              <div><dt>Move between controls</dt><dd><kbd>Tab</kbd> / <kbd>Shift + Tab</kbd></dd></div>
              <div><dt>Switch the focused workflow</dt><dd><kbd>←</kbd> <kbd>→</kbd></dd></div>
              <div><dt>Activate a focused button</dt><dd><kbd>Enter</kbd> / <kbd>Space</kbd></dd></div>
            </dl>
          </section>
        </div>
      </dialog>
    </div>
  );
}
