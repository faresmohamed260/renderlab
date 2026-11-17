"use client";

import Link from "next/link";
import { Keyboard, ListOrdered } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type HeaderPanel = "queue" | "shortcuts";

export function CreateHeaderActions({ activeStatus }: { activeStatus: string | null }) {
  const [panel, setPanel] = useState<HeaderPanel | null>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || event.isComposing || event.ctrlKey || event.metaKey || event.shiftKey
        || document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      const target = event.target;
      if (target instanceof Element && target.closest('input, textarea, select, [contenteditable], [role="textbox"]')) return;
      const next = !event.altKey && event.key.toLowerCase() === "q" ? "queue"
        : event.altKey && event.code === "Slash" ? "shortcuts" : null;
      if (!next) return;
      event.preventDefault();
      setPanel((current) => current === next ? null : next);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="fibo-header-actions">
      <DropdownMenu open={panel === "queue"} onOpenChange={(open) => setPanel((current) => open ? "queue" : current === "queue" ? null : current)} modal={false}>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="fibo-header-action" aria-label="Render queue" aria-keyshortcuts="Q" title="Render queue (Q)">
            <ListOrdered aria-hidden="true" />
            <span>Render queue</span>
            {activeStatus ? <span className="fibo-queue-dot" aria-hidden="true" /> : null}
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
      <DropdownMenu open={panel === "shortcuts"} onOpenChange={(open) => setPanel((current) => open ? "shortcuts" : current === "shortcuts" ? null : current)} modal={false}>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="fibo-header-action" aria-label="Keyboard shortcuts" aria-keyshortcuts="Alt+/" title="Keyboard shortcuts (Alt+/)">
            <Keyboard aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="fibo-header-panel"
          onInteractOutside={(event) => {
            if (event.target instanceof Element && event.target.closest(".fibo-header-actions")) event.preventDefault();
          }}
        >
          <DropdownMenuLabel>Keyboard shortcuts</DropdownMenuLabel>
          <dl className="fibo-shortcut-list">
            <dt>Toggle render queue</dt><dd><kbd>Q</kbd></dd>
            <dt>Toggle shortcuts</dt><dd><kbd>Alt + /</kbd></dd>
            <dt>Close menu</dt><dd><kbd>Esc</kbd></dd>
          </dl>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setPanel(null)}>Close</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
