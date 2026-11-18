"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { Download, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildWandaBatchZip } from "./wanda-fibo-batch-zip";

type StageResult = { image_data: string; seed: number; filename?: string; source?: File; run?: { mode: "edit" | "generate" } };
type Props<T extends StageResult> = {
  result?: T;
  source?: File;
  batch: T[];
  history: T[];
  onRestore: (image: T, reopen: boolean) => void;
  onSaveEdit?: (image: T) => void;
  savingEdit?: boolean;
  onSelect: (image: T) => void;
  onReturnToProgress: () => void;
  expectedImages: number;
  input?: string;
  inputLabel: string;
  browseDisabled?: boolean;
  maskAction?: { applied: boolean; blocked: boolean; open: () => void; clear: () => void };
  busy: boolean;
  liveFrame?: string;
  renderRatio?: number;
  status: string;
  onBrowse: () => void;
  onUseSource: (result: StageResult) => void;
};

export function WandaFiboStage<T extends StageResult>({ result, source, batch, history, onRestore, onSaveEdit, savingEdit, onSelect, onReturnToProgress, expectedImages, input, inputLabel, browseDisabled, maskAction, busy, liveFrame, renderRatio, status, onBrowse, onUseSource }: Props<T>) {
  const [before, setBefore] = useState<string>();
  const [split, setSplit] = useState(50);
  const [compared, setCompared] = useState<StageResult>();
  const [dimensions, setDimensions] = useState<{ url: string; ratio: number }>();
  const selection = useRef(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const restoring = useRef(false);
  const opener = useRef<HTMLButtonElement>(null);
  const inspecting = busy && !!result;
  const showingProgress = busy && !inspecting;
  const pending = busy && batch.length < expectedImages;
  const showBatch = busy ? batch.length > 0 || expectedImages > 1 : batch.length > 1;
  const shown = showingProgress ? undefined : result?.image_data ?? input;
  const canCompare = !!source && result?.source === source && !!before && !busy;
  const compare = canCompare && compared === result;
  const dimensionsUrl = showingProgress ? input : shown;
  const ratio = (showingProgress && renderRatio) || (dimensionsUrl && dimensions?.url === dimensionsUrl ? dimensions.ratio : 0.75);

  useEffect(() => {
    selection.current++;
    setNotice("");
    if (!canCompare) setCompared(undefined);
  }, [result, input, busy, canCompare]);

  async function select(image: T) {
    const version = ++selection.current;
    try {
      const decoded = new Image();
      decoded.src = image.image_data;
      await decoded.decode();
      if (selection.current !== version) return;
      setDimensions({ url: image.image_data, ratio: decoded.naturalWidth / decoded.naturalHeight });
      onSelect(image);
    } catch {
      if (selection.current === version) setNotice("Could not open this image.");
    }
  }
  useEffect(() => {
    if (!source) { setBefore(undefined); return; }
    const url = URL.createObjectURL(source);
    setBefore(url);
    return () => URL.revokeObjectURL(url);
  }, [source]);

  function drag(event: PointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.parentElement?.getBoundingClientRect();
    if (box?.width) setSplit(Math.round(Math.max(3, Math.min(97, (event.clientX - box.left) / box.width * 100))));
  }

  function nudge(event: KeyboardEvent<HTMLDivElement>) {
    const values: Record<string, number> = { ArrowLeft: split - 5, ArrowRight: split + 5, Home: 3, End: 97 };
    if (!(event.key in values)) return;
    event.preventDefault();
    setSplit(Math.max(3, Math.min(97, values[event.key])));
  }

  function media() {
    return shown && (
      <div className="wanda-fibo-stage-media" style={{ "--stage-media-ratio": ratio, "--stage-split": split + "%" } as CSSProperties}>
        <img key={shown} src={shown} alt={result ? "Generated result" : inputLabel} draggable={false}
          onLoad={(event) => {
            const image = event.currentTarget;
            if (image.naturalHeight) setDimensions({ url: shown, ratio: image.naturalWidth / image.naturalHeight });
          }} />
        {compare && <div className="wanda-fibo-stage-before"><img src={before} alt="Source image" draggable={false} /></div>}
        {compare && (
          <div className="wanda-fibo-stage-divider" role="slider" tabIndex={0} aria-label="Source and result comparison"
            aria-valuemin={3} aria-valuemax={97} aria-valuenow={Math.round(split)}
            onKeyDown={nudge}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) drag(event); }} />
        )}
      </div>
    );
  }

  function highlight(toolbar: HTMLDivElement) {
    const actions = [...toolbar.querySelectorAll<HTMLElement>("button:not(:disabled), a[href]")];
    const target = (matchMedia("(any-hover: hover)").matches ? actions.find((item) => item.matches(":hover")) : undefined)
      ?? actions.find((item) => item.matches(":focus-visible"))
      ?? actions.find((item) => item.getAttribute("aria-pressed") === "true");
    toolbar.toggleAttribute("data-highlight", !!target);
    if (!target) return;
    const box = toolbar.getBoundingClientRect();
    const item = target.getBoundingClientRect();
    for (const [key, value] of Object.entries({ x: item.left - box.left, y: item.top - box.top, w: item.width, h: item.height })) {
      toolbar.style.setProperty("--stage-highlight-" + key, value + "px");
    }
  }

  function downloadBatch() {
    try {
      const url = URL.createObjectURL(buildWandaBatchZip(batch));
      const link = document.createElement("a");
      link.href = url;
      link.download = "fibo-batch.zip";
      link.click();
      // Keep the URL alive until the browser has started reading the download.
      window.setTimeout(() => URL.revokeObjectURL(url), 15_000);
    } catch {
      setNotice("Could not download this batch.");
    }
  }

  function tools() {
    if (!result && maskAction && !busy) return (
      <div className="wanda-fibo-stage-tools" role="group" aria-label="Mask actions">
        <Button type="button" variant="ghost" size="sm" disabled={maskAction.blocked}
          title={maskAction.blocked ? "Remove references to use a mask" : "Paint a mask on the source image"}
          onClick={() => { if (viewerOpen) dialog.current?.close(); maskAction.open(); }}>{maskAction.applied ? "Edit mask" : "Mask"}</Button>
        {maskAction.applied && <Button type="button" variant="ghost" size="sm" onClick={maskAction.clear}>Clear mask</Button>}
      </div>
    );
    return result && (
      <div className="wanda-fibo-stage-tools" role="group" aria-label="Stage tools"
        onPointerOver={(event) => highlight(event.currentTarget)}
        onPointerLeave={(event) => highlight(event.currentTarget)}
        onFocus={(event) => highlight(event.currentTarget)}
        onBlur={(event) => { const toolbar = event.currentTarget; requestAnimationFrame(() => highlight(toolbar)); }}>
        {inspecting ? <Button type="button" variant="ghost" size="sm" onClick={returnToProgress}>{liveFrame ? "Live preview" : "Return to render"}</Button> : <>
        {canCompare && <Button type="button" variant="ghost" size="sm" aria-keyshortcuts="C" aria-pressed={compare} title="Compare before and after"
          onClick={(event) => {
            const toolbar = event.currentTarget.parentElement as HTMLDivElement;
            setCompared(compare ? undefined : result);
            requestAnimationFrame(() => highlight(toolbar));
          }}>Before / After</Button>}
        <Button type="button" variant="ghost" size="sm" aria-keyshortcuts="U" title="Send result back to the source slot" onClick={() => {
          if (viewerOpen) dialog.current?.close();
          onUseSource(result);
        }}><Undo2 aria-hidden="true" />Use as source</Button>
        {batch.length > 1 && <Button type="button" variant="ghost" size="sm" title="Download all batch images as a ZIP"
          onClick={downloadBatch}>Download batch</Button>}
        <a href={result.image_data} download={result.filename ?? "fibo-result.png"} aria-keyshortcuts="D" aria-label="Download image" title="Download image"><Download size={15} aria-hidden="true" /></a>
        </>}
      </div>
    );
  }

  function returnToProgress() {
    selection.current++;
    onReturnToProgress();
    if (viewerOpen) dialog.current?.close();
  }

  function runActions() {
    if (!result?.run || busy) return null;
    const restore = (reopen: boolean) => {
      if (viewerOpen) { restoring.current = true; dialog.current?.close(); }
      onRestore(result, reopen);
    };
    return (
      <div className="wanda-fibo-stage-run-actions" role="group" aria-label="Result settings">
        <Button type="button" variant="ghost" size="sm" onClick={() => restore(false)}>Reuse settings</Button>
        {result.run.mode === "edit" && <Button type="button" variant="ghost" size="sm" onClick={() => restore(true)}>Reopen edit</Button>}
        {result.run.mode === "edit" && onSaveEdit && <Button type="button" variant="ghost" size="sm" disabled={savingEdit}
          title="Keep the original images and settings in this browser" onClick={() => onSaveEdit(result)}>Save on this device</Button>}
      </div>
    );
  }

  function stageKeys(event: KeyboardEvent<HTMLElement>) {
    if (event.defaultPrevented || event.nativeEvent.isComposing || event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return;
    const target = event.target;
    if (!(target instanceof Element) || target.closest("input, textarea, select, [contenteditable], [role=slider]")) return;
    const key = event.key.toLowerCase();
    const scope = viewerOpen ? dialog.current : frame.current;
    if ((key === "arrowleft" || key === "arrowright") && showBatch) {
      const chips = [...(scope?.querySelectorAll<HTMLButtonElement>(".wanda-fibo-stage-batch button") ?? [])];
      if (!chips.length) return;
      const focused = chips.indexOf(document.activeElement as HTMLButtonElement);
      const current = focused >= 0 ? focused : chips.findIndex((chip) => chip.getAttribute("aria-current") === "true");
      const next = chips[(Math.max(0, current) + (key === "arrowleft" ? -1 : 1) + chips.length) % chips.length];
      event.preventDefault();
      next.focus({ preventScroll: true });
      next.scrollIntoView({ block: "nearest", inline: "nearest" });
      next.click();
      return;
    }
    if (!busy && ["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key) && history.length) {
      const direction = key === "arrowup" || key === "arrowleft" ? -1 : 1;
      const index = result ? history.indexOf(result) : -1;
      const next = index < 0 ? (direction === 1 ? 0 : history.length - 1) : (index + direction + history.length) % history.length;
      event.preventDefault();
      void select(history[next]);
      return;
    }
    if (busy || event.repeat) return;
    const shortcut = key === "escape" && compare ? "C" : key.toUpperCase();
    if (!["C", "D", "U"].includes(shortcut)) return;
    const action = scope?.querySelector<HTMLElement>('[aria-keyshortcuts="' + shortcut + '"]');
    if (!action?.getClientRects().length) return;
    event.preventDefault();
    action.click();
  }

  function carousel() {
    return showBatch && (
      <div className="wanda-fibo-stage-batch" role="group" aria-label="Batch results" tabIndex={0}
        aria-keyshortcuts="ArrowLeft ArrowRight"
        onScroll={(event) => {
          const row = event.currentTarget;
          row.toggleAttribute("data-overflow-start", row.scrollLeft > 1);
          row.toggleAttribute("data-overflow-end", row.scrollWidth - row.clientWidth - row.scrollLeft > 1);
        }}>
        {batch.map((image, index) => (
          <Button key={image.filename ?? index} type="button" variant="ghost"
            aria-label={"View batch image " + (index + 1)} aria-current={result === image}
            onClick={() => void select(image)}>
            <img src={image.image_data} alt="" draggable={false} />
          </Button>
        ))}
        {pending && <Button type="button" variant="ghost" className="wanda-fibo-stage-pending"
          aria-label="View image in progress" aria-current={!inspecting} onClick={returnToProgress}>Rendering…</Button>}
      </div>
    );
  }

  return (
    <>
      <div ref={frame} className="wanda-fibo-stage-frame" onKeyDown={stageKeys} data-batch={showBatch}>
        <div className="wanda-fibo-stage-surface" data-empty={!shown && !busy} role="group" tabIndex={0}
          aria-label={showingProgress ? "Generating" : result ? "Result" : input ? inputLabel : "Canvas"} aria-busy={showingProgress}
          onClick={(event) => {
            if (event.target === event.currentTarget || event.target instanceof HTMLImageElement) {
              event.currentTarget.focus({ preventScroll: true });
            }
          }}
          style={{ "--stage-media-ratio": ratio } as CSSProperties}>
          {showingProgress ? <>
            <div className="wanda-fibo-stage-backdrop" aria-hidden="true" />
            {liveFrame && <img className="wanda-fibo-stage-live" src={liveFrame} alt="" draggable={false} />}
            <div className="wanda-fibo-stage-shimmer" aria-hidden="true" />
            <div className="wanda-fibo-stage-notice" role="status">{status || "Rendering…"}</div>
          </>
            : shown ? <>
              {!viewerOpen && media()}
              {!viewerOpen && tools()}
              <Button ref={opener} type="button" className="wanda-fibo-stage-open" variant="ghost" size="icon-sm"
                aria-label="Open image viewer" aria-haspopup="dialog" onClick={() => {
                  dialog.current?.showModal();
                  setViewerOpen(true);
                }} />
            </> : <Button type="button" variant="ghost" className="wanda-fibo-canvas-upload"
              disabled={browseDisabled} title={browseDisabled ? "Sign in to upload an image" : "Add " + inputLabel.toLowerCase()} onClick={onBrowse}>
              <svg className="wanda-fibo-stage-empty-icon" width="25" height="25" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="16" rx="3" /><path d="m4 17 5-5 4 4 3-3 4 4" /><circle cx="16" cy="9" r="1.5" />
              </svg>
              <span>Drop an image or click to upload</span>
            </Button>}
        </div>
        {!viewerOpen && carousel()}
        {!viewerOpen && runActions()}
        {notice && !viewerOpen && <p className="wanda-fibo-stage-notice" role="status">{notice}</p>}
      </div>
      <dialog ref={dialog} className="wanda-fibo-stage-viewer" data-batch={batch.length > 1} aria-label="Image viewer" onKeyDown={stageKeys}
        onClose={() => { setViewerOpen(false); setCompared(undefined); if (!restoring.current) opener.current?.focus({ preventScroll: true }); restoring.current = false; }}>
        {viewerOpen && <>
          <Button type="button" variant="ghost" size="icon-sm" className="wanda-fibo-stage-close"
            aria-label="Close image viewer" onClick={() => dialog.current?.close()}><X aria-hidden="true" /></Button>
          {media()}
          {tools()}
          {carousel()}
          {runActions()}
          {notice && <p className="wanda-fibo-stage-notice" role="status">{notice}</p>}
        </>}
      </dialog>
    </>
  );
}
