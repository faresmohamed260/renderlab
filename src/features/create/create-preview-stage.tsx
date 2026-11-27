"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type KeyboardEvent, type PointerEvent, type HTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { Download, Heart, Undo2, X, Columns2, RefreshCw, Ellipsis } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { registerCreateCommand } from "@/lib/create-commands";
import { previewImageSizes } from "./create-preview-sizes";
import stageStyles from "./create-stage-rebuild.module.css";
import { Button } from "@/components/ui/button";
import { buildImageBatchZip } from "./create-preview-batch-zip";
import pagerStyles from "./create-result-pager.module.css";

type StageResult = { assetId?: string; isFavorite?: boolean; image_data: string; aspect?: number; seed: number; filename?: string; source?: File; promptUsed?: string; width?: number; height?: number; run?: { mode: "edit" | "generate"; prompt?: string; steps?: number; sizeIndex?: number; editAspectRatio?: string } };
export type StageTurn<T> = { id: string; prompt: string; input?: File; images?: T[]; error?: string };

function ResultFavorite({ assetId, favorite, onChange, iconOnly = false }: { assetId: string; favorite: boolean; onChange: (id: string, favorite: boolean) => void; iconOnly?: boolean }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  async function toggle() {
    if (pending.current) return;
    pending.current = true;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/media/assets/" + encodeURIComponent(assetId) + "/favorite", { method: favorite ? "DELETE" : "PUT" });
      const payload = await response.json();
      if (!response.ok || payload.ok !== true || payload.asset?.id !== assetId || typeof payload.asset.isFavorite !== "boolean") throw Error("Could not update favorite.");
      onChange(assetId, payload.asset.isFavorite);
    } catch {
      setError("Could not update favorite.");
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }
  return <>
    <Button type="button" variant="secondary" size="sm" disabled={saving} aria-pressed={favorite}
      aria-label={favorite ? "Favorited" : "Favorite"} data-stage-favorite="" className={iconOnly ? stageStyles.iconAction : undefined} onClick={() => void toggle()}>
      <Heart aria-hidden="true" fill={favorite ? "currentColor" : "none"} />{!iconOnly && (favorite ? "Favorited" : "Favorite")}
    </Button>
    {error && <span role="alert">{error}</span>}
  </>;
}

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
  return <Button type="button" variant="ghost" className="create-preview-thread-image"
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
  historySelection?: { image: T };
  resultPosition?: { index: number; count: number };
  desktopArrows?: boolean;
  dropTarget?: Pick<HTMLAttributes<HTMLDivElement>, "onDragOver" | "onDragLeave" | "onDrop"> & { "data-drag-over"?: string };
  desktopResultActions?: HTMLElement | null;
  desktopActions?: boolean;
  onFavoriteChange?: (id: string, favorite: boolean) => void;
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
  browseUnavailableReason?: string;
  maskAction?: { mask?: File; blocked: boolean; open: () => void; clear: () => void };
  busy: boolean;
  cancelling?: boolean;
  liveFrame?: string;
  liveBlur?: number;
  renderRatio?: number;
  status: string;
  onBrowse: () => void;
  onUseSource: (result: StageResult) => void;
  onUseInput?: (file: File) => void;
};

export function CreatePreviewStage<T extends StageResult>({ historySelection, resultPosition, desktopArrows, dropTarget, desktopResultActions, onFavoriteChange, workflow, turns = [], inlineMask, result, source, batch, history, onRestore, onSaveEdit, savingEdit, onSelect, onReturnToProgress, expectedImages, input, inputLabel, browseDisabled, browseUnavailableReason, maskAction, busy, cancelling, liveFrame, liveBlur, renderRatio, status, onBrowse, onUseSource, onUseInput }: Props<T>) {
  const [before, setBefore] = useState<string>();
  const [split, setSplit] = useState(50);
  const [compared, setCompared] = useState<StageResult>();
  const [dimensions, setDimensions] = useState<{ url: string; ratio: number }>();
  const selection = useRef(0);
  const pendingImage = useRef<T | undefined>(undefined);
  const [inputDimensions, setInputDimensions] = useState<{ url: string; ratio: number }>();
  useEffect(() => {
    if (!input) { setInputDimensions(undefined); return; }
    let current = true;
    const image = new Image();
    image.src = input;
    void image.decode().then(() => {
      if (current && image.naturalHeight) setInputDimensions({ url: input, ratio: image.naturalWidth / image.naturalHeight });
    }, () => { if (current) setInputDimensions(undefined); });
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
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? batchRow.clientWidth : 1;
      const next = Math.max(0, Math.min(batchRow.scrollWidth - batchRow.clientWidth,
        batchRow.scrollLeft + event.deltaY * scale));
      if (next === batchRow.scrollLeft) return;
      event.preventDefault();
      batchRow.scrollLeft = next;
    };
    batchRow.addEventListener("scroll", update, { passive: true });
    batchRow.addEventListener("wheel", wheel, { passive: false });
    return () => {
      resize.disconnect();
      batchRow.removeEventListener("scroll", update);
      batchRow.removeEventListener("wheel", wheel);
    };
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
  const [threadOpen, setThreadOpen] = useState(false);
  const inThread = phone && threadOpen && turns.length > 0;
  useEffect(() => {
    const row = thread.current;
    if (row) row.scrollTop = row.scrollHeight;
  }, [inThread, turns]);
  function openViewer(inputUrl?: string) {
    if (!phone || !dialog.current || dialog.current.open) return;
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
        || (event.target instanceof Element && event.target.closest(".create-preview-stage-batch"))) return;
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
  const [decodedFrame, setDecodedFrame] = useState<{ url: string; blur?: number }>();
  useEffect(() => {
    if (!busy || !liveFrame) { setDecodedFrame(undefined); return; }
    let current = true;
    const image = new Image();
    image.src = liveFrame;
    void image.decode().then(() => { if (current) setDecodedFrame({ url: liveFrame, blur: liveBlur }); }, () => {});
    return () => { current = false; };
  }, [busy, liveFrame, liveBlur]);
  const pending = busy && !cancelling && batch.length < expectedImages;
  const showBatch = busy ? batch.length > 0 || pending : batch.length > 1;
  // An input URL can be available before the browser knows its dimensions.
  // Keep the last decoded input during replacement, and swap its URL and ratio together.
  const inputPending = !!input && inputDimensions?.url !== input;
  const decodedInput = input ? inputDimensions : undefined;
  const displayedResult = reviewing ? undefined : result;
  const shown = showingProgress ? undefined : displayedResult?.image_data ?? decodedInput?.url;
  const canCompare = !reviewing && !!source && result?.source === source && !!before && !busy;
  const compare = canCompare && compared === result;
  const ratio = showingProgress
    ? renderRatio ?? (source ? decodedInput?.ratio : undefined) ?? 0.75
    : displayedResult
      ? displayedResult.aspect ?? (dimensions?.url === shown ? dimensions?.ratio : undefined) ?? 0.75
      : decodedInput?.ratio ?? 0.75;
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
      <div className="create-preview-stage-media" style={{ "--stage-media-ratio": ratio, "--stage-split": split + "%" } as CSSProperties}>
        <img key={shown} src={shown} alt={result && !reviewing ? "Generated result" : inputLabel} draggable={false}
          onLoad={(event) => {
            const image = event.currentTarget;
            if (image.naturalHeight) setDimensions({ url: shown, ratio: image.naturalWidth / image.naturalHeight });
          }} />
        {reviewing && <div className="create-preview-stage-mask-overlay" role="img" aria-label="Selected region"
          style={{ maskImage: "url(" + overlay.url + ")" }} />}
        {compare && <div className="create-preview-stage-before"><img src={before} alt="Source image" draggable={false} /></div>}
        {compare && (
          <div className="create-preview-stage-divider" role="slider" tabIndex={0} aria-label="Source and result comparison"
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
      const url = URL.createObjectURL(buildImageBatchZip(batch));
      const link = document.createElement("a");
      link.href = url;
      link.download = "image-batch.zip";
      link.click();
      // Keep the URL alive until the browser has started reading the download.
      window.setTimeout(() => URL.revokeObjectURL(url), 15_000);
    } catch {
      setNotice("Could not download this batch.");
    }
  }

  const [toolbar, setToolbar] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!toolbar) return;
    const sync = () => highlight(toolbar);
    sync();
    const resize = new ResizeObserver(sync);
    resize.observe(toolbar);
    // A label or disabled-state change can move an action without resizing the bar.
    const changes = new MutationObserver(sync);
    changes.observe(toolbar, { subtree: true, childList: true, characterData: true, attributes: true,
      attributeFilter: ["disabled", "aria-pressed", "href"] });
    return () => { resize.disconnect(); changes.disconnect(); };
  }, [toolbar]);

  const toolEvents = {
    ref: setToolbar,
    onPointerOver: (event: PointerEvent<HTMLDivElement>) => highlight(event.currentTarget),
    onPointerLeave: (event: PointerEvent<HTMLDivElement>) => highlight(event.currentTarget),
    onFocus: (event: React.FocusEvent<HTMLDivElement>) => highlight(event.currentTarget),
    onBlur: (event: React.FocusEvent<HTMLDivElement>) => {
      const node = event.currentTarget;
      requestAnimationFrame(() => { if (node.isConnected) highlight(node); });
    },
  };

  function tools(detached = false) {
    if (maskAction && !result && !busy && !inputPending) return (
      <div className="create-preview-stage-tools" role="group" aria-label="Mask actions" {...toolEvents}>
        <Button type="button" variant="ghost" size="sm" aria-keyshortcuts="M" data-create-mask-trigger disabled={maskAction.blocked}
          aria-label={maskAction.mask ? "Edit mask" : "Paint mask"}
          title={maskAction.blocked ? "Remove references to use a mask" : "Paint a mask on the source image"}
          onClick={() => { if (viewerOpen) { restoring.current = true; dialog.current?.close(); } maskAction.open(); }}>{maskAction.mask ? "Edit mask" : "Mask"}</Button>
        {maskAction.blocked && <span className="create-preview-stage-mask-status">Remove references to use a mask</span>}
        {maskAction.mask && <>
          <span className="create-preview-stage-mask-status">Mask applied</span>
          <Button type="button" variant="ghost" size="sm" aria-pressed={reviewing}
            onClick={() => { setCompared(undefined); setHiddenMask(reviewing ? savedMask : undefined); }}>{reviewing ? "Hide overlay" : "Show overlay"}</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => { setHiddenMask(undefined); maskAction.clear(); }}>Clear mask</Button>
        </>}
      </div>
    );
    return result && (
      <div className={detached ? "create-preview-result-actions" : "create-preview-stage-tools"} role="group" aria-label={detached ? "Result actions" : "Stage tools"} {...(!detached ? toolEvents : {})}>
        {inspecting ? <Button type="button" variant="ghost" size="sm" onClick={returnToProgress}>Live preview</Button> : <>
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
        {detached && result.assetId && typeof result.isFavorite === "boolean" && onFavoriteChange && <ResultFavorite key={result.assetId} assetId={result.assetId} favorite={result.isFavorite} onChange={onFavoriteChange} />}
        {batch.length > 1 && <Button type="button" variant="ghost" size="sm" title="Download all batch images as a ZIP"
          onClick={downloadBatch}>Download batch</Button>}
        <a href={result.image_data} download={result.filename ?? "result.png"} aria-keyshortcuts="D" aria-label="Download image" title="Download image"><Download size={15} aria-hidden="true" /></a>
        </>}
      </div>
    );
  }

  const canReuseResult = !!result?.run && !busy && !reviewing;
  const canActOnResult = !!result && !busy && !reviewing && !inlineMask;
  const canFavorite = canActOnResult && !!result?.assetId && typeof result.isFavorite === "boolean" && !!onFavoriteChange;
  useEffect(() => {
    const act = (selector: string) => { frame.current?.querySelector<HTMLElement>(selector)?.click(); };
    const cleanup = [
      registerCreateCommand({id:"reuse-settings",label:"Reuse settings",keywords:["result","prompt"],group:"Create",enabled:canReuseResult,run:()=>{if(result)onRestore(result,false);}}),
      registerCreateCommand({id:"edit-this-image",label:"Edit this image",keywords:["source","reference"],group:"Create",enabled:canActOnResult,run:()=>{if(result)onUseSource(result);}}),
      registerCreateCommand({id:"favorite",label:result?.isFavorite ? "Remove favorite" : "Favorite",keywords:["heart","library"],group:"Create",enabled:canFavorite,run:()=>act("[data-stage-favorite]")}),
      registerCreateCommand({id:"download",label:"Download",keywords:["save","image"],group:"Create",enabled:canActOnResult,run:()=>{if(result){const link=document.createElement("a");link.href=result.image_data;link.download=result.filename ?? "result.png";link.click();}}}),
    ];
    return () => cleanup.forEach(fn=>fn());
  }, [result, canActOnResult, canReuseResult, canFavorite, onRestore, onUseSource]);
  function rebuiltActions() {
    if (!result || !canActOnResult || viewerOpen) return null;
    const favorite = canFavorite && result.assetId && typeof result.isFavorite === "boolean" && onFavoriteChange
      ? <ResultFavorite key={result.assetId} assetId={result.assetId} favorite={result.isFavorite} onChange={onFavoriteChange} iconOnly /> : null;
    const edit = () => onUseSource(result);
    const reuse = () => onRestore(result, false);
    const download = <Button asChild variant="ghost" className={stageStyles.iconAction}><a href={result.image_data} download={result.filename ?? "result.png"} aria-keyshortcuts="D" aria-label="Download image" title="Download image"><Download size={20} /></a></Button>;
    if (phone) return <div className={stageStyles.phoneActions} role="group" aria-label="Result actions">
      {canCompare && <Button type="button" variant="ghost" className={stageStyles.iconAction} aria-label="Compare with source" aria-keyshortcuts="C" aria-pressed={compare} onClick={()=>setCompared(compare?undefined:result)}><Columns2 size={19}/></Button>}
      {canReuseResult && <Button type="button" variant="ghost" className={stageStyles.iconAction} aria-label="Reuse settings" onClick={reuse}><RefreshCw size={19}/></Button>}
      {favorite}
      <Popover><PopoverTrigger asChild><Button type="button" variant="ghost" className={stageStyles.iconAction} aria-label="More actions"><Ellipsis size={19}/></Button></PopoverTrigger><PopoverContent className={stageStyles.more} aria-label="More result actions">
        <Button type="button" variant="ghost" aria-keyshortcuts="U" onClick={edit}>Edit this image</Button>
        <Button asChild variant="ghost"><a href={result.image_data} download={result.filename ?? "result.png"}>Download</a></Button>
        <Button type="button" variant="ghost" onClick={()=>openViewer()}>Open image viewer</Button>
        {turns.length > 0 && <Button type="button" variant="ghost" onClick={()=>setThreadOpen(true)}>Render conversation</Button>}
        {result.run?.mode === "edit" && <Button type="button" variant="ghost" onClick={()=>onRestore(result,true)}>Reopen edit</Button>}
        {result.run?.mode === "edit" && onSaveEdit && <Button type="button" variant="ghost" disabled={savingEdit} onClick={()=>onSaveEdit(result)}>Save on this device</Button>}
        {batch.length>1 && <Button type="button" variant="ghost" onClick={downloadBatch}>Download batch</Button>}
      </PopoverContent></Popover>
    </div>;
    return <div className={stageStyles.desktopActions} role="group" aria-label="Result actions">
      {canCompare && <Button type="button" variant="ghost" aria-keyshortcuts="C" aria-pressed={compare} onClick={()=>setCompared(compare?undefined:result)}>Compare</Button>}
      {canReuseResult && <Button type="button" variant="ghost" onClick={reuse}>Reuse settings</Button>}
      <Button type="button" variant="ghost" aria-keyshortcuts="U" onClick={edit}>Edit this image</Button>
      {favorite}{download}
      {resultPosition && <span className={stageStyles.desktopCount}>{resultPosition.index+1} of {resultPosition.count}</span>}
    </div>;
  }
  function resultMetadata() {
    if (!result || !canActOnResult || phone || viewerOpen) return null;
    const run = result.run;
    const preset = run?.sizeIndex === undefined ? undefined : previewImageSizes[run.sizeIndex]?.label.split(" · ")[0];
    const shape = run?.mode === "edit" && run.editAspectRatio ? run.editAspectRatio === "original" ? undefined : run.editAspectRatio : preset;
    const actualShape = result.width && result.height && result.width > 0 && result.height > 0 ? (()=>{let a=result.width,b=result.height;while(b){const c=a%b;a=b;b=c;}return result.width/a+":"+result.height/a;})() : undefined;
    const chips = [run?.mode === "edit" ? "Edit image" : run?.mode === "generate" ? "Text to image" : undefined,shape ?? actualShape,run?.steps !== undefined ? run.steps+" steps" : undefined,run && Number.isFinite(result.seed) ? "Seed "+result.seed : undefined].filter(Boolean);
    return <section className={stageStyles.promptCard} aria-label="Prompt used for this result"><h2>Prompt for this result</h2><p>{run?.prompt ?? result.promptUsed ?? "Prompt not available for this result."}</p>{chips.length>0 && <div className={stageStyles.chips}>{chips.map((chip,index)=><span key={index} title={chip === (shape ?? actualShape) && result.width && result.height ? result.width+" × "+result.height : undefined}>{chip}</span>)}</div>}</section>;
  }

  function returnToProgress() {
    selection.current++;
    pendingImage.current = undefined;
    onReturnToProgress();
    if (viewerOpen) dialog.current?.close();
    else batchRow?.focus({ preventScroll: true });
  }

  function runActions() {
    if (!result?.run || busy || reviewing) return null;
    const restore = (reopen: boolean) => {
      if (viewerOpen) { restoring.current = true; dialog.current?.close(); }
      onRestore(result, reopen);
    };
    return (
      <div className="create-preview-stage-run-actions" role="group" aria-label="Result settings">
        <Button type="button" variant="ghost" size="sm" onClick={() => restore(false)}>Reuse settings</Button>
        {result.run.mode === "edit" && <Button type="button" variant="ghost" size="sm" onClick={() => restore(true)}>Reopen edit</Button>}
        {result.run.mode === "edit" && onSaveEdit && <Button type="button" variant="ghost" size="sm" disabled={savingEdit}
          title="Keep the original images and settings in this browser" onClick={() => onSaveEdit(result)}>Save on this device</Button>}
      </div>
    );
  }

  function stageKeys(event: KeyboardEvent<HTMLElement> | globalThis.KeyboardEvent) {
    if (inlineMask || event.defaultPrevented || ("nativeEvent" in event ? event.nativeEvent.isComposing : event.isComposing) || event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return;
    const target = event.target;
    if (!(target instanceof Element) || target.closest("input, textarea, select, [contenteditable], [role=slider]")) return;
    const key = event.key.toLowerCase();
    // Native modal Escape closes the viewer, not its underlying comparison.
    if (key === "escape" && viewerOpen) return;
    const scope = viewerOpen ? dialog.current : frame.current;
    if ((key === "arrowleft" || key === "arrowright") && batch.length + Number(pending) > 1) {
      const chips = [...(scope?.querySelectorAll<HTMLButtonElement>(".create-preview-stage-batch button") ?? [])];
      if (!chips.length) return;
      const queued = pendingImage.current ? batch.indexOf(pendingImage.current) : -1;
      const current = queued >= 0 ? queued : chips.findIndex((chip) => chip.getAttribute("aria-current") === "true");
      const direction = key === "arrowleft" ? -1 : 1;
      const next = chips[current < 0 ? (direction > 0 ? 0 : chips.length - 1) : (current + direction + chips.length) % chips.length];
      event.preventDefault();
      next.focus({ preventScroll: true });
      next.click();
      return;
    }
    if (!busy && ["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key) && history.length) {
      const direction = key === "arrowup" || key === "arrowleft" ? -1 : 1;
      const selected = pendingImage.current ?? result;
      const index = selected ? history.findIndex((item) => item === selected || (batch.includes(selected) && batch.includes(item))) : -1;
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

  useEffect(() => {
    if (historySelection) void select(historySelection.image);
  }, [historySelection]);

  useEffect(() => {
    if (!desktopArrows) return;
    const keydown = (event: globalThis.KeyboardEvent) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
      if (event.target instanceof Element && event.target.closest("dialog, details[open], [data-create-history-image]")) return;
      if (document.querySelector("dialog[open]")) return;
      stageKeys(event);
    };
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  });

  function carousel() {
    return showBatch && (
      <div className="create-preview-stage-batch" role="group" aria-label="Batch results" tabIndex={0}
        aria-keyshortcuts="ArrowLeft ArrowRight"
        ref={setBatchRow}>
        {batch.map((image, index) => (
          <Button key={image.filename ?? index} type="button" variant="ghost"
            aria-label={"View batch image " + (index + 1)} aria-current={result === image}
            onClick={() => void select(image)}>
            <img src={image.image_data} alt="" draggable={false} />
          </Button>
        ))}
        {pending && <Button type="button" variant="ghost" className="create-preview-stage-pending"
          aria-label="View image in progress" aria-current={!inspecting} onClick={returnToProgress}>Rendering…</Button>}
      </div>
    );
  }

  // This is the workspace's ordered result scope, not the batch carousel.
  // The existing live announcement is the accessible equivalent.
  function resultPager(threadLayout = false) {
    if (!phone || !resultPosition || !displayedResult || busy || viewerOpen || inlineMask) return null;
    const { index, count } = resultPosition;
    return <div data-create-result-pager="" aria-hidden="true"
      className={pagerStyles.pager + (threadLayout ? " " + pagerStyles.thread : "")}>
      <span className={pagerStyles.count}>{index + 1} of {count}</span>
      <span className={pagerStyles.dots}>
        {Array.from({ length: count }, (_, i) => <span key={i} className={pagerStyles.dot}
          data-create-result-dot="" data-selected={i === index} />)}
      </span>
    </div>;
  }

  function stageDocument() {
    return (
        <div className={"create-preview-stage-document " + pagerStyles.document + " " + stageStyles.document} data-rebuilt-stage-document="">
        <div className={"create-preview-stage-surface " + stageStyles.surface} data-rebuilt-stage-surface="" {...dropTarget} data-empty={!shown && !busy} role="group" tabIndex={0}
          aria-label={label} aria-busy={busy || inputPending} data-portrait={ratio < 1}
          onClick={(event) => {
            if (event.target === event.currentTarget || event.target instanceof HTMLImageElement) {
              event.currentTarget.focus({ preventScroll: true });
            }
          }}>
          {inlineMask || (showingProgress ? <>
            <div className="create-preview-stage-backdrop" aria-hidden="true" />
            {liveFrame && decodedFrame && <img className="create-preview-stage-live" src={decodedFrame.url} style={decodedFrame.blur === undefined ? undefined : { filter: "blur(" + decodedFrame.blur + "px)" }} alt="" draggable={false} />}
            <div className="create-preview-stage-shimmer" aria-hidden="true" />
            <div className="create-preview-stage-notice" role="status"><span>{status || "Rendering…"}</span></div>
          </>
            : shown ? <>
              {!viewerOpen && media()}
              {!viewerOpen && (!canActOnResult || reviewing) && tools()}
              <Button ref={opener} type="button" className="create-preview-stage-open" variant="ghost" size="icon-sm"
                aria-label="Open image viewer" aria-haspopup="dialog" onClick={() => openViewer()} />
              {phone && rebuiltActions()}
            </> : browseUnavailableReason ? <p className="create-preview-caption mx-auto max-w-[24rem] px-4 text-center">{browseUnavailableReason}</p> : <Button type="button" variant="ghost" className="create-preview-canvas-upload"
              disabled={browseDisabled || inputPending} title={browseDisabled ? "Sign in to upload an image" : "Add " + inputLabel.toLowerCase()} onClick={onBrowse}>
              <svg className="create-preview-stage-empty-icon" width="25" height="25" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="16" rx="3" /><path d="m4 17 5-5 4 4 3-3 4 4" /><circle cx="16" cy="9" r="1.5" />
              </svg>
              <span>Drop an image or click to upload</span>
            </Button>)}
        </div>
        {!phone && rebuiltActions()}
        {phone && !inThread && !canActOnResult && turns.length > 0 && <Button type="button" variant="ghost" onClick={()=>setThreadOpen(true)}>Render conversation</Button>}
        {!inThread && resultPager()}
        {!viewerOpen && carousel()}
        {resultMetadata()}
        {!phone && !viewerOpen && canReuseResult && result?.run?.mode === "edit" && <div className={stageStyles.extraActions}><Button type="button" variant="ghost" onClick={()=>onRestore(result,true)}>Reopen edit</Button>{onSaveEdit && <Button type="button" variant="ghost" disabled={savingEdit} onClick={()=>onSaveEdit(result)}>Save on this device</Button>}</div>}
        {!phone && !viewerOpen && batch.length>1 && <Button type="button" variant="ghost" onClick={downloadBatch}>Download batch</Button>}
        </div>
    );
  }

  return (
    <>
      <div ref={frame} className={"create-preview-stage-frame " + stageStyles.frame} data-rebuilt-stage="" onKeyDown={stageKeys} data-batch={showBatch} data-pull-ready={phone && !busy && !viewerOpen}
        style={{ "--stage-media-ratio": ratio } as CSSProperties}>
        {pull >= 12 && <div className="create-preview-stage-pull" style={{ translate: "0 " + Math.min(32, (pull - 12) / 2) + "px" }}>
          {pull >= 76 ? "Release to refresh" : "Pull to refresh"}
        </div>}
        {inThread ? <div ref={thread} className="create-preview-thread" aria-label="Render conversation" tabIndex={0}>
          <Button type="button" variant="ghost" onClick={()=>setThreadOpen(false)}>Back to result</Button>
          {turns.map((turn, index) => (
            <article className="create-preview-thread-turn" key={turn.id}>
              <div className="create-preview-thread-sent">
                {turn.input && <TurnInput file={turn.input} busy={busy} onOpen={openViewer} onReuse={(file) => onUseInput?.(file)} />}
                {turn.prompt && <p>{turn.prompt}</p>}
              </div>
              <div className="create-preview-thread-reply">
                {turn.images?.map((image, itemIndex) =>
                  <TurnImage key={image.filename ?? itemIndex} url={image.image_data}
                    label={"View generated image " + (itemIndex + 1)} disabled={busy}
                    onOpen={() => void select(image, true)} onReuse={() => onUseSource(image)} />)}
                {turn.error && <p role="status">{turn.error}</p>}
              </div>
              {busy && index === turns.length - 1 && <div className="create-preview-thread-live">{stageDocument()}</div>}
            </article>
          ))}
          {!busy && input && (!result || reviewing) && <div className="create-preview-thread-live">{stageDocument()}</div>}
          {resultPager(true)}
        </div> : stageDocument()}
        {notice && !viewerOpen && <p className="create-preview-stage-notice" role="status">{notice}</p>}
      </div>
      {!viewerOpen && desktopResultActions && createPortal(runActions(), desktopResultActions)}
      <dialog ref={dialog} className="create-preview-stage-viewer" data-batch={batch.length > 1} aria-label="Image viewer" onKeyDown={submittedImage ? undefined : stageKeys}
        onClose={() => { setViewerOpen(false); setSubmittedImage(undefined); setCompared(undefined); if (!restoring.current) (viewerOrigin.current?.isConnected ? viewerOrigin.current : opener.current)?.focus({ preventScroll: true }); restoring.current = false; }}>
        {viewerOpen && <>
          <Button type="button" variant="ghost" size="icon-sm" className="create-preview-stage-close"
            aria-label="Close image viewer" onClick={() => dialog.current?.close()}><X aria-hidden="true" /></Button>
          {submittedImage ? <img className="create-preview-thread-viewer-input" src={submittedImage} alt="Submitted image" /> : <>
            {media()}
            {tools()}
            {carousel()}
            {runActions()}
          </>}
          {notice && <p className="create-preview-stage-notice" role="status">{notice}</p>}
        </>}
      </dialog>
    </>
  );
}
