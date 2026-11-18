"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type KeyboardEvent, type PointerEvent } from "react";
import { Download, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildWandaBatchZip } from "./wanda-fibo-batch-zip";

type StageResult = { image_data: string; seed: number; filename?: string; source?: File; run?: { mode: "edit" | "generate" } };
export type StageTurn<T> = { id: string; prompt: string; input?: File; images?: T[]; error?: string };

function TurnImage({ url, label, disabled, onOpen, onReuse }: {
  url: string; label: string; disabled?: boolean; onOpen: () => void; onReuse: () => void;
}) {
  const drag = useRef<{ id: number; x: number; y: number; distance: number } | null>(null);
  const swiped = useRef(false);
  function finish(event: PointerEvent<HTMLButtonElement>) {
    if (drag.current?.id !== event.pointerId) return;
    const reuse = event.type === "pointerup" && drag.current.distance >= 58;
    drag.current = null;
    event.currentTarget.removeAttribute("data-swiping");
    event.currentTarget.style.removeProperty("--thread-swipe");
    if (reuse) onReuse();
  }
  return <Button type="button" variant="ghost" className="wanda-fibo-thread-image"
    aria-label={label} aria-haspopup="dialog" title={label + ". Swipe right to use as source."} disabled={disabled}
    onPointerDown={(event) => {
      if (!event.isPrimary || event.button !== 0) return;
      swiped.current = false;
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, distance: 0 };
    }}
    onPointerMove={(event) => {
      const start = drag.current;
      if (start?.id !== event.pointerId) return;
      const dx = event.clientX - start.x;
      if (!swiped.current && (dx < -10 || Math.abs(event.clientY - start.y) > Math.max(12, dx))) {
        drag.current = null;
        return;
      }
      if (dx < 12 && !swiped.current) return;
      if (!swiped.current) event.currentTarget.setPointerCapture(event.pointerId);
      swiped.current = true;
      start.distance = dx;
      event.currentTarget.setAttribute("data-swiping", "");
      event.currentTarget.style.setProperty("--thread-swipe", Math.max(0, Math.min(dx, 64)) + "px");
    }}
    onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish}
    onClick={(event) => { if (!swiped.current || event.detail === 0) onOpen(); }}>
    <img src={url} alt="" draggable={false} />
  </Button>;
}

function TurnInput({ file, busy, onOpen, onReuse }: { file: File; busy: boolean; onOpen: (url: string) => void; onReuse: (file: File) => void }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url && <TurnImage url={url} label="View submitted image" onOpen={() => onOpen(url)}
    onReuse={() => { if (!busy) onReuse(file); }} />;
}

type Props<T extends StageResult> = {
  workflow?: "edit" | "generate";
  turns?: StageTurn<T>[];
  inlineMask?: ReactNode;
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
  maskAction?: { mask?: File; blocked: boolean; open: () => void; clear: () => void };
  busy: boolean;
  liveFrame?: string;
  renderRatio?: number;
  status: string;
  onBrowse: () => void;
  onUseSource: (result: StageResult) => void;
  onUseInput?: (file: File) => void;
};

export function WandaFiboStage<T extends StageResult>({ workflow, turns = [], inlineMask, result, source, batch, history, onRestore, onSaveEdit, savingEdit, onSelect, onReturnToProgress, expectedImages, input, inputLabel, browseDisabled, maskAction, busy, liveFrame, renderRatio, status, onBrowse, onUseSource, onUseInput }: Props<T>) {
  const [before, setBefore] = useState<string>();
  const [split, setSplit] = useState(50);
  const [compared, setCompared] = useState<StageResult>();
  const [dimensions, setDimensions] = useState<{ url: string; ratio: number }>();
  const selection = useRef(0);
  const pendingImage = useRef<T | undefined>(undefined);
  const [inputDimensions, setInputDimensions] = useState<{ url: string; ratio: number }>();
  useEffect(() => {
    if (!input) return;
    let current = true;
    const image = new Image();
    image.src = input;
    void image.decode().then(() => {
      if (current && image.naturalHeight) setInputDimensions({ url: input, ratio: image.naturalWidth / image.naturalHeight });
    }, () => {});
    return () => { current = false; };
  }, [input]);

  const [batchRow, setBatchRow] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!batchRow) return;
    const update = () => {
      batchRow.toggleAttribute("data-overflow-start", batchRow.scrollLeft > 1);
      batchRow.toggleAttribute("data-overflow-end", batchRow.scrollWidth - batchRow.clientWidth - batchRow.scrollLeft > 1);
    };
    const selected = batchRow.querySelector('[aria-current="true"]');
    if (selected) {
      const row = batchRow.getBoundingClientRect(), chip = selected.getBoundingClientRect();
      if (chip.left < row.left) batchRow.scrollLeft += chip.left - row.left - 2;
      else if (chip.right > row.right) batchRow.scrollLeft += chip.right - row.right + 2;
    }
    update();
    const resize = new ResizeObserver(update);
    resize.observe(batchRow);
    batchRow.addEventListener("scroll", update, { passive: true });
    return () => { resize.disconnect(); batchRow.removeEventListener("scroll", update); };
  }, [batchRow, batch.length, result, busy]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const [phone, setPhone] = useState(false);
  const [submittedImage, setSubmittedImage] = useState<string>();
  const thread = useRef<HTMLDivElement>(null);
  const viewerOrigin = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const query = matchMedia("(max-width: 760px)");
    const update = () => {
      setPhone(query.matches);
      if (!query.matches && dialog.current?.open) dialog.current.close();
    };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const inThread = phone && turns.length > 0 && (busy || !result || turns.some((turn) => turn.images?.includes(result)));
  useEffect(() => {
    const row = thread.current;
    if (row) row.scrollTop = row.scrollHeight;
  }, [inThread, turns]);
  function openViewer(inputUrl?: string) {
    if (!dialog.current || dialog.current.open) return;
    viewerOrigin.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSubmittedImage(inputUrl);
    dialog.current.showModal();
    setViewerOpen(true);
  }
  const frame = useRef<HTMLDivElement>(null);
  const [pull, setPull] = useState(0);
  useEffect(() => {
    const region = inThread ? thread.current : frame.current;
    if (!phone || busy || viewerOpen || !region) return;
    let gesture: { x: number; y: number; distance: number } | undefined;
    let suppressClick = false;
    const start = (event: TouchEvent) => {
      suppressClick = false;
      gesture = undefined;
      if (event.touches.length !== 1 || (inThread && region.scrollTop > 1)
        || (event.target instanceof Element && event.target.closest(".wanda-fibo-stage-batch"))) return;
      const { clientX: x, clientY: y } = event.touches[0];
      gesture = { x, y, distance: 0 };
    };
    const move = (event: TouchEvent) => {
      if (!gesture) return;
      if (event.touches.length !== 1) { gesture = undefined; setPull(0); return; }
      const { clientX, clientY } = event.touches[0];
      const distance = clientY - gesture.y;
      if (!gesture.distance && (distance < -8 || Math.abs(clientX - gesture.x) > Math.max(12, distance))) {
        gesture = undefined;
        return;
      }
      if ((!gesture.distance && distance < 12) || !event.cancelable) return;
      event.preventDefault();
      gesture.distance = Math.max(0, distance);
      suppressClick = true;
      setPull(gesture.distance);
    };
    const end = (event: TouchEvent) => {
      const refresh = event.type === "touchend" && (gesture?.distance ?? 0) >= 76;
      gesture = undefined;
      setPull(0);
      if (refresh) window.location.reload();
    };
    const click = (event: MouseEvent) => {
      if (!suppressClick || !event.detail) return;
      suppressClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    region.addEventListener("touchstart", start, { passive: true });
    region.addEventListener("touchmove", move, { passive: false });
    region.addEventListener("touchend", end);
    region.addEventListener("touchcancel", end);
    region.addEventListener("click", click, true);
    return () => {
      region.removeEventListener("touchstart", start);
      region.removeEventListener("touchmove", move);
      region.removeEventListener("touchend", end);
      region.removeEventListener("touchcancel", end);
      region.removeEventListener("click", click, true);
      setPull(0);
    };
  }, [phone, busy, viewerOpen, inThread]);
  const restoring = useRef(false);
  const opener = useRef<HTMLButtonElement>(null);
  const inspecting = busy && !!result;
  const [hiddenMask, setHiddenMask] = useState<File>();
  const [overlay, setOverlay] = useState<{ mask: File; url: string }>();
  const savedMask = maskAction?.mask;
  useEffect(() => {
    if (!savedMask) { setOverlay(undefined); return; }
    const url = URL.createObjectURL(savedMask);
    setOverlay({ mask: savedMask, url });
    return () => URL.revokeObjectURL(url);
  }, [savedMask]);
  const reviewing = !busy && !!savedMask && savedMask !== hiddenMask && overlay?.mask === savedMask;
  const showingProgress = busy && !inspecting;
  const [decodedFrame, setDecodedFrame] = useState<string>();
  useEffect(() => {
    if (!busy || !liveFrame) { setDecodedFrame(undefined); return; }
    let current = true;
    const image = new Image();
    image.src = liveFrame;
    void image.decode().then(() => { if (current) setDecodedFrame(liveFrame); }, () => {});
    return () => { current = false; };
  }, [busy, liveFrame]);
  const pending = busy && batch.length < expectedImages;
  const showBatch = busy ? batch.length > 0 || expectedImages > 1 : batch.length > 1;
  const shown = showingProgress ? undefined : (reviewing ? input : result?.image_data ?? input);
  const canCompare = !reviewing && !!source && result?.source === source && !!before && !busy;
  const compare = canCompare && compared === result;
  const dimensionsUrl = showingProgress ? (source ? input : undefined) : shown;
  const ratio = (showingProgress && renderRatio) || (dimensionsUrl && dimensions?.url === dimensionsUrl ? dimensions.ratio
    : dimensionsUrl && inputDimensions?.url === dimensionsUrl ? inputDimensions.ratio : 0.75);
  const label = inlineMask ? "Mask canvas" : busy ? "Generating" : reviewing ? "Mask review" : result ? "Result" : input ? (source ? "Source preview" : "Inspiration") : "Canvas";

  useEffect(() => {
    selection.current++;
    pendingImage.current = undefined;
    setNotice("");
    setCompared(undefined);
    setSplit(50);
  }, [workflow, result, input, busy, canCompare]);

  async function select(image: T, open = false) {
    const version = ++selection.current;
    pendingImage.current = image;
    try {
      const decoded = new Image();
      decoded.src = image.image_data;
      await decoded.decode();
      if (selection.current !== version) return;
      setDimensions({ url: image.image_data, ratio: decoded.naturalWidth / decoded.naturalHeight });
      onSelect(image);
      if (open) openViewer();
    } catch {
      if (selection.current === version) setNotice("Could not open this image.");
    } finally {
      if (selection.current === version) pendingImage.current = undefined;
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
        <img key={shown} src={shown} alt={result && !reviewing ? "Generated result" : inputLabel} draggable={false}
          onLoad={(event) => {
            const image = event.currentTarget;
            if (image.naturalHeight) setDimensions({ url: shown, ratio: image.naturalWidth / image.naturalHeight });
          }} />
        {reviewing && <div className="wanda-fibo-stage-mask-overlay" role="img" aria-label="Selected region"
          style={{ maskImage: "url(" + overlay.url + ")" }} />}
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
    if (maskAction && !result && !busy) return (
      <div className="wanda-fibo-stage-tools" role="group" aria-label="Mask actions">
        <Button type="button" variant="ghost" size="sm" aria-keyshortcuts="M" disabled={maskAction.blocked}
          title={maskAction.blocked ? "Remove references to use a mask" : "Paint a mask on the source image"}
          onClick={() => { if (viewerOpen) dialog.current?.close(); maskAction.open(); }}>{maskAction.mask ? "Edit mask" : "Mask"}</Button>
        {maskAction.mask && <>
          <span className="wanda-fibo-stage-mask-status">Mask applied</span>
          <Button type="button" variant="ghost" size="sm" aria-pressed={reviewing}
            onClick={() => { setCompared(undefined); setHiddenMask(reviewing ? savedMask : undefined); }}>{reviewing ? "Hide overlay" : "Show overlay"}</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => { setHiddenMask(undefined); maskAction.clear(); }}>Clear mask</Button>
        </>}
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
    pendingImage.current = undefined;
    onReturnToProgress();
    if (viewerOpen) dialog.current?.close();
  }

  function runActions() {
    if (!result?.run || busy || reviewing) return null;
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
    if (inlineMask || event.defaultPrevented || event.nativeEvent.isComposing || event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return;
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
      const selected = pendingImage.current ?? result;
      const index = selected ? history.indexOf(selected) : -1;
      const next = index < 0 ? (direction === 1 ? 0 : history.length - 1) : (index + direction + history.length) % history.length;
      event.preventDefault();
      void select(history[next]);
      return;
    }
    if (busy || event.repeat) return;
    const shortcut = key === "escape" && compare ? "C" : key.toUpperCase();
    if (!["M", "C", "D", "U"].includes(shortcut)) return;
    const action = scope?.querySelector<HTMLElement>('[aria-keyshortcuts="' + shortcut + '"]');
    if (!action?.getClientRects().length || action.matches(":disabled")) return;
    event.preventDefault();
    action.click();
  }

  function carousel() {
    return showBatch && (
      <div className="wanda-fibo-stage-batch" role="group" aria-label="Batch results" tabIndex={0}
        aria-keyshortcuts="ArrowLeft ArrowRight"
        ref={setBatchRow}>
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

  function stageDocument() {
    return (
        <div className="wanda-fibo-stage-document">
        <div className="wanda-fibo-stage-surface" data-empty={!shown && !busy} role="group" tabIndex={0}
          aria-label={label} aria-busy={busy} data-portrait={ratio < 1}
          onClick={(event) => {
            if (event.target === event.currentTarget || event.target instanceof HTMLImageElement) {
              event.currentTarget.focus({ preventScroll: true });
            }
          }}>
          {inlineMask || (showingProgress ? <>
            <div className="wanda-fibo-stage-backdrop" aria-hidden="true" />
            {liveFrame && decodedFrame && <img className="wanda-fibo-stage-live" src={decodedFrame} alt="" draggable={false} />}
            <div className="wanda-fibo-stage-shimmer" aria-hidden="true" />
            <div className="wanda-fibo-stage-notice" role="status"><span>{status || "Rendering…"}</span></div>
          </>
            : shown ? <>
              {!viewerOpen && media()}
              {!viewerOpen && tools()}
              <Button ref={opener} type="button" className="wanda-fibo-stage-open" variant="ghost" size="icon-sm"
                aria-label="Open image viewer" aria-haspopup="dialog" onClick={() => openViewer()} />
            </> : <Button type="button" variant="ghost" className="wanda-fibo-canvas-upload"
              disabled={browseDisabled} title={browseDisabled ? "Sign in to upload an image" : "Add " + inputLabel.toLowerCase()} onClick={onBrowse}>
              <svg className="wanda-fibo-stage-empty-icon" width="25" height="25" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="16" rx="3" /><path d="m4 17 5-5 4 4 3-3 4 4" /><circle cx="16" cy="9" r="1.5" />
              </svg>
              <span>Drop an image or click to upload</span>
            </Button>)}
        </div>
        {!viewerOpen && carousel()}
        {!viewerOpen && runActions()}
        </div>
    );
  }

  return (
    <>
      <div ref={frame} className="wanda-fibo-stage-frame" onKeyDown={stageKeys} data-batch={showBatch} data-pull-ready={phone && !busy && !viewerOpen}
        style={{ "--stage-media-ratio": ratio } as CSSProperties}>
        {pull >= 12 && <div className="wanda-fibo-stage-pull" style={{ translate: "0 " + Math.min(32, (pull - 12) / 2) + "px" }}>
          {pull >= 76 ? "Release to refresh" : "Pull to refresh"}
        </div>}
        {inThread ? <div ref={thread} className="wanda-fibo-thread" aria-label="Render conversation" tabIndex={0}>
          {turns.map((turn, index) => (
            <article className="wanda-fibo-thread-turn" key={turn.id}>
              <div className="wanda-fibo-thread-sent">
                {turn.input && <TurnInput file={turn.input} busy={busy} onOpen={openViewer} onReuse={(file) => onUseInput?.(file)} />}
                {turn.prompt && <p>{turn.prompt}</p>}
              </div>
              <div className="wanda-fibo-thread-reply">
                {turn.images?.map((image, itemIndex) =>
                  <TurnImage key={image.filename ?? itemIndex} url={image.image_data}
                    label={"View generated image " + (itemIndex + 1)} disabled={busy}
                    onOpen={() => void select(image, true)} onReuse={() => onUseSource(image)} />)}
                {turn.error && <p role="status">{turn.error}</p>}
              </div>
              {busy && index === turns.length - 1 && <div className="wanda-fibo-thread-live">{stageDocument()}</div>}
            </article>
          ))}
          {!busy && input && (!result || reviewing) && <div className="wanda-fibo-thread-live">{stageDocument()}</div>}
        </div> : stageDocument()}
        {notice && !viewerOpen && <p className="wanda-fibo-stage-notice" role="status">{notice}</p>}
      </div>
      <dialog ref={dialog} className="wanda-fibo-stage-viewer" data-batch={batch.length > 1} aria-label="Image viewer" onKeyDown={submittedImage ? undefined : stageKeys}
        onClose={() => { setViewerOpen(false); setSubmittedImage(undefined); setCompared(undefined); if (!restoring.current) (viewerOrigin.current?.isConnected ? viewerOrigin.current : opener.current)?.focus({ preventScroll: true }); restoring.current = false; }}>
        {viewerOpen && <>
          <Button type="button" variant="ghost" size="icon-sm" className="wanda-fibo-stage-close"
            aria-label="Close image viewer" onClick={() => dialog.current?.close()}><X aria-hidden="true" /></Button>
          {submittedImage ? <img className="wanda-fibo-thread-viewer-input" src={submittedImage} alt="Submitted image" /> : <>
            {media()}
            {tools()}
            {carousel()}
            {runActions()}
          </>}
          {notice && <p className="wanda-fibo-stage-notice" role="status">{notice}</p>}
        </>}
      </dialog>
    </>
  );
}
