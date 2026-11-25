"use client";

import dynamic from "next/dynamic";
import { createContext, useContext, useEffect, useRef, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import type { CreatePreviewMaskEditor } from "./create-preview-mask-editor";

type MaskProps = ComponentProps<typeof CreatePreviewMaskEditor>;
type PendingMask = Pick<MaskProps, "inline" | "onClose">;
const PendingMaskContext = createContext<PendingMask | null>(null);

function MaskEditorLoading({ error }: { error?: Error | null }) {
  const pending = useContext(PendingMaskContext);
  const root = useRef<HTMLElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const viewer = root.current;
    if (viewer instanceof HTMLDialogElement && !viewer.open) viewer.showModal();
    close.current?.focus({ preventScroll: true });
    return () => {
      if (viewer instanceof HTMLDialogElement && viewer.open) viewer.close();
    };
  }, []);
  if (!pending) return null;
  const Root = pending.inline ? "div" : "dialog";
  return <Root ref={(node: HTMLElement | null) => { root.current = node; }}
    className={pending.inline ? "create-preview-mask-inline" : "create-preview-mask-dialog"}
    role={pending.inline ? "group" : undefined} aria-label="Edit source mask"
    onCancel={(event) => { event.preventDefault(); pending.onClose(); }}
    onKeyDown={(event) => {
      if (event.key === "Escape" && !event.nativeEvent.isComposing) {
        event.preventDefault(); event.stopPropagation(); pending.onClose();
      }
    }}>
    <div className="flex min-h-24 flex-col items-center justify-center gap-3 p-4">
      {error ? <p role="alert">Could not load the mask editor. Close and try again after refreshing.</p>
        : <p role="status" aria-live="polite">Loading mask editor…</p>}
      <Button ref={close} type="button" variant="secondary" onClick={() => pending.onClose()}>Cancel</Button>
    </div>
  </Root>;
}

// The editor, canvas code and keyboard helper are fetched only when a mask opens.
// The ordinary result/source stage stays eager because it is needed at first paint.
const LazyMaskEditor = dynamic(
  () => import("./create-preview-mask-editor").then((module) => module.CreatePreviewMaskEditor),
  { ssr: false, loading: MaskEditorLoading },
);

export function DeferredMaskEditor(props: MaskProps) {
  return <PendingMaskContext.Provider value={{ inline: props.inline, onClose: props.onClose }}>
    <LazyMaskEditor {...props} />
  </PendingMaskContext.Provider>;
}
