"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";

type KeyInput = Pick<globalThis.KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey" | "repeat" | "isComposing" | "defaultPrevented">;
type ShortcutContext = { enabled: boolean; focused: boolean; editable: boolean; prompt: boolean; overlay: boolean; canGenerate: boolean; canStep: boolean };
type Shortcut = "prompt" | "generate" | "previous" | "next";

export function resolveCreateShortcut(event: KeyInput, context: ShortcutContext): Shortcut | null {
  if (!context.enabled || !context.focused || context.overlay || event.defaultPrevented || event.repeat || event.isComposing || event.altKey || event.shiftKey) return null;
  if (event.key === "Enter" && event.ctrlKey !== event.metaKey) {
    return context.canGenerate && (!context.editable || context.prompt) ? "generate" : null;
  }
  if (event.ctrlKey || event.metaKey || context.editable) return null;
  if (event.key === "/") return "prompt";
  if (event.key === "[" && context.canStep) return "previous";
  if (event.key === "]" && context.canStep) return "next";
  return null;
}

export function nextResultIndex(current: number, direction: -1 | 1, count: number): number {
  if (count < 2) return -1;
  if (current < 0) return direction > 0 ? 0 : count - 1;
  return (current + direction + count) % count;
}

const storageKey = "renderlab:create-keyboard-shortcuts";
type Options = {
  root: RefObject<HTMLElement | null>;
  overlay: boolean;
  canGenerate: boolean;
  canStep: boolean;
  step: (direction: -1 | 1) => void;
};

export function useCreateShortcuts({ root, overlay, canGenerate, canStep, step }: Options) {
  const [enabled, setEnabled] = useState(true);
  const [modifierHint, setModifierHint] = useState("Ctrl");
  const escapeHeld = useRef(false);
  useEffect(() => {
    try { setEnabled(localStorage.getItem(storageKey) !== "off"); } catch { /* Storage may be unavailable. */ }
    setModifierHint(/Mac|iPhone|iPad|iPod/i.test(navigator.platform) ? "⌘" : "Ctrl");
  }, []);
  function changeEnabled(next: boolean) {
    setEnabled(next);
    try { localStorage.setItem(storageKey, next ? "on" : "off"); } catch { /* In-memory preference still works. */ }
  }

  // The maintained Sheet/Popover and native viewer own Escape and focus return.
  // Prevent auto-repeat from dismissing the next layer after the first closes.
  // The first event is never consumed: existing confirmation/cancel holds remain authoritative.
  useEffect(() => {
    const down = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const region = root.current;
      if (!region?.isConnected) return;
      const target = event.target;
      const ownedPortal = target instanceof Element && !!target.closest('[data-create-shortcut-overlay]');
      const inside = target instanceof Node && region.contains(target);
      if (!inside && !ownedPortal) { escapeHeld.current = false; return; }
      if (event.repeat) {
        if (escapeHeld.current) { event.preventDefault(); event.stopImmediatePropagation(); }
        return;
      }
      escapeHeld.current = overlay || !!region.querySelector("dialog[open]");
    };
    const up = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") escapeHeld.current = false; };
    const blur = () => { escapeHeld.current = false; };
    window.addEventListener("keydown", down, true);
    window.addEventListener("keyup", up, true);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down, true);
      window.removeEventListener("keyup", up, true);
      window.removeEventListener("blur", blur);
    };
  }, [root, overlay]);

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    const region = root.current;
    const target = event.target;
    if (!region || !(target instanceof Element)) return;
    const prompt = region.querySelector<HTMLElement>("#create-preview-prompt");
    const isPrompt = !!prompt?.contains(target);
    const editable = isPrompt || !!target.closest("input, textarea, select, [contenteditable]:not([contenteditable=false]), [role=textbox], [role=combobox], [role=slider], [role=spinbutton]") || (target instanceof HTMLElement && target.isContentEditable);
    const action = resolveCreateShortcut(event.nativeEvent, {
      enabled, focused: region.contains(document.activeElement) && region.contains(target),
      editable, prompt: isPrompt, overlay: overlay || !!region.querySelector("dialog[open]") || !!document.querySelector('[role="dialog"][aria-modal="true"], [role="alertdialog"]'),
      canGenerate, canStep,
    });
    if (!action || event.defaultPrevented) return;
    if (action === "prompt") {
      if (!prompt || prompt.matches(':disabled, [aria-disabled="true"]') || prompt.closest("[inert]") || !prompt.getClientRects().length) return;
      event.preventDefault();
      prompt.focus();
    } else if (action === "generate") {
      const button = region.querySelector<HTMLButtonElement>(".create-preview-generate");
      if (!button || button.disabled || button.closest("[inert]") || !button.form) return;
      event.preventDefault();
      button.form.requestSubmit(button);
    } else {
      event.preventDefault();
      step(action === "previous" ? -1 : 1);
    }
  }
  return { enabled, changeEnabled, modifierHint, onKeyDown };
}
