"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { Download, Maximize2, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type StageResult = { image_data: string; seed: number; filename?: string; source?: File };
type Props<T extends StageResult> = {
  result?: T;
  source?: File;
  batch: T[];
  onSelect: (image: T) => void;
  input?: string;
  inputLabel: string;
  busy: boolean;
  renderRatio?: number;
  status: string;
  onBrowse: () => void;
  onUseSource: (result: StageResult) => void;
};

export function WandaFiboStage<T extends StageResult>({ result, source, batch, onSelect, input, inputLabel, busy, renderRatio, status, onBrowse, onUseSource }: Props<T>) {
  const [before, setBefore] = useState<string>();
  const [split, setSplit] = useState(50);
  const [compared, setCompared] = useState<StageResult>();
  const [dimensions, setDimensions] = useState<{ url: string; ratio: number }>();
  const selection = useRef(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const shown = busy ? undefined : result?.image_data ?? input;
  const canCompare = !!source && result?.source === source && !!before && !busy;
  const compare = canCompare && compared === result;
  const dimensionsUrl = busy ? input : shown;
  const ratio = (busy && renderRatio) || (dimensionsUrl && dimensions?.url === dimensionsUrl ? dimensions.ratio : 0.75);

  useEffect(() => {
    selection.current++;
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
      // Leave the current preview in place if the candidate cannot be decoded.
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

  function tools() {
    return result && !busy && (
      <div className="wanda-fibo-stage-tools" role="group" aria-label="Stage tools"
        onPointerOver={(event) => highlight(event.currentTarget)}
        onPointerLeave={(event) => highlight(event.currentTarget)}
        onFocus={(event) => highlight(event.currentTarget)}
        onBlur={(event) => { const toolbar = event.currentTarget; requestAnimationFrame(() => highlight(toolbar)); }}>
        {canCompare && <Button type="button" variant="ghost" size="sm" aria-pressed={compare} title="Compare before and after"
          onClick={(event) => {
            const toolbar = event.currentTarget.parentElement as HTMLDivElement;
            setCompared(compare ? undefined : result);
            requestAnimationFrame(() => highlight(toolbar));
          }}>Before / After</Button>}
        <Button type="button" variant="ghost" size="sm" title="Send result back to the source slot" onClick={() => {
          if (viewerOpen) dialog.current?.close();
          onUseSource(result);
        }}><Undo2 aria-hidden="true" />Use as source</Button>
        <a href={result.image_data} download={result.filename ?? "fibo-result.png"} aria-label="Download image" title="Download image"><Download size={15} aria-hidden="true" /></a>
      </div>
    );
  }

  function carousel() {
    return batch.length > 1 && !busy && (
      <div className="wanda-fibo-stage-batch" role="group" aria-label="Batch results">
        {batch.map((image, index) => (
          <Button key={image.filename ?? index} type="button" variant="ghost"
            aria-label={"View batch image " + (index + 1)} aria-current={result === image}
            onClick={() => void select(image)}>
            <img src={image.image_data} alt="" draggable={false} />
          </Button>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="wanda-fibo-stage-frame" data-batch={batch.length > 1 && !busy}>
        <div className="wanda-fibo-stage-surface" data-empty={!shown && !busy} aria-busy={busy}
          style={{ "--stage-media-ratio": ratio } as CSSProperties}>
          {busy ? <>
            <div className="wanda-fibo-stage-backdrop" aria-hidden="true" />
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
                }}><Maximize2 aria-hidden="true" /></Button>
            </> : <Button type="button" variant="ghost" className="wanda-fibo-canvas-upload"
              title={"Add " + inputLabel.toLowerCase()} onClick={onBrowse}>
              Drop an image or click to upload
            </Button>}
        </div>
        {!viewerOpen && carousel()}
      </div>
      <dialog ref={dialog} className="wanda-fibo-stage-viewer" data-batch={batch.length > 1} aria-label="Image viewer"
        onClose={() => { setViewerOpen(false); setCompared(undefined); opener.current?.focus({ preventScroll: true }); }}>
        {viewerOpen && <>
          <Button type="button" variant="ghost" size="icon-sm" className="wanda-fibo-stage-close"
            aria-label="Close image viewer" onClick={() => dialog.current?.close()}><X aria-hidden="true" /></Button>
          {media()}
          {tools()}
          {carousel()}
        </>}
      </dialog>
    </>
  );
}
