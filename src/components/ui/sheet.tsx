"use client";

import type { ComponentProps } from "react";
import { Dialog } from "radix-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;
export const SheetTitle = Dialog.Title;
export const SheetDescription = Dialog.Description;

const sides = {
  left: "inset-y-0 left-0 w-full max-w-sm rounded-r-[var(--rl-radius-sheet)]",
  right: "inset-y-0 right-0 w-full max-w-sm rounded-l-[var(--rl-radius-sheet)]",
  top: "inset-x-0 top-0 max-h-[100dvh] rounded-b-[var(--rl-radius-sheet)]",
  bottom: "inset-x-0 bottom-0 max-h-[100dvh] rounded-t-[var(--rl-radius-sheet)]",
} as const;

export function SheetContent({
  side = "right", className, children, showCloseButton = true, ...props
}: ComponentProps<typeof Dialog.Content> & {
  side?: keyof typeof sides; showCloseButton?: boolean;
}) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay data-slot="sheet-overlay" className="fixed inset-0 z-50 bg-[var(--rl-modal-scrim)]" />
      <Dialog.Content data-slot="sheet-content"
        className={cn("fixed z-50 flex min-w-0 flex-col gap-4 overflow-y-auto overscroll-contain border border-[color:var(--rl-border-subtle)] bg-[var(--rl-surface-overlay)] p-4 text-[color:var(--rl-text-primary)] shadow-[var(--rl-elevation-overlay)]", sides[side], className)}
        {...props}>
        {children}
        {showCloseButton ? <Dialog.Close asChild><Button variant="secondary" aria-label="Close sheet">Close</Button></Dialog.Close> : null}
      </Dialog.Content>
    </Dialog.Portal>
  );
}
