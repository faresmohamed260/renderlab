"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  source: string;
  mask?: File;
  enabled: boolean;
  onClose: () => void;
  onSave: (mask?: File) => void;
};

export function WandaFiboMaskEditor({ source, mask, enabled, onClose, onSave }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const undo = useRef<ImageData[]>([]);
  const redo = useRef<ImageData[]>([]);
  const sourcePixels = useRef<ImageData>(null);
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tool, setTool] = useState<"brush" | "eraser" | "fill" | "color">("brush");
  const [size, setSize] = useState(24);
  const [tolerance, setTolerance] = useState(20);
  const [overlay, setOverlay] = useState(52);
  const [square, setSquare] = useState(false);
  const [review, setReview] = useState(false);
  const [counts, setCounts] = useState([0, 0]);

  useEffect(() => {
    const viewer = dialog.current;
    viewer?.showModal();
    return () => { if (viewer?.open) viewer.close(); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const maskUrl = mask && URL.createObjectURL(mask);
    async function load() {
      const image = new Image();
      image.src = source;
      await image.decode();
      if (cancelled || !canvas.current) return;
      const c = canvas.current;
      const scale = Math.min(1, 768 / Math.max(image.naturalWidth, image.naturalHeight));
      c.width = Math.max(1, Math.round(image.naturalWidth * scale));
      c.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const sample = document.createElement("canvas");
      sample.width = c.width;
      sample.height = c.height;
      const sampleContext = sample.getContext("2d", { willReadFrequently: true })!;
      sampleContext.drawImage(image, 0, 0, c.width, c.height);
      sourcePixels.current = sampleContext.getImageData(0, 0, c.width, c.height);
      if (maskUrl) {
        const layer = new Image();
        layer.src = maskUrl;
        await layer.decode();
        if (cancelled) return;
        const ctx = c.getContext("2d", { willReadFrequently: true })!;
        ctx.drawImage(layer, 0, 0, c.width, c.height);
        const data = ctx.getImageData(0, 0, c.width, c.height);
        for (let i = 0; i < data.data.length; i += 4) {
          const selected = data.data[i] > 8;
          data.data.set([165, 180, 252, selected ? 255 : 0], i);
        }
        ctx.putImageData(data, 0, 0);
      }
      setReady(true);
    }
    void load().catch(() => { if (!cancelled) setError("Could not open the source or mask."); });
    return () => { cancelled = true; if (maskUrl) URL.revokeObjectURL(maskUrl); };
  }, [source, mask]);

  function context() { return canvas.current?.getContext("2d", { willReadFrequently: true }); }
  function snapshot(ctx: CanvasRenderingContext2D) { return ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height); }
  function record(ctx: CanvasRenderingContext2D) {
    undo.current = [...undo.current.slice(-11), snapshot(ctx)];
    redo.current = [];
    setCounts([undo.current.length, 0]);
  }
  function moveHistory(reversing: boolean) {
    const ctx = context();
    const from = reversing ? undo.current : redo.current;
    const to = reversing ? redo.current : undo.current;
    const previous = from.pop();
    if (!ctx || !previous) return;
    to.push(snapshot(ctx));
    ctx.putImageData(previous, 0, 0);
    setCounts([undo.current.length, redo.current.length]);
  }

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const c = event.currentTarget;
    const rect = c.getBoundingClientRect();
    return { id: event.pointerId, x: (event.clientX - rect.left) / rect.width * c.width, y: (event.clientY - rect.top) / rect.height * c.height };
  }
  function paint(ctx: CanvasRenderingContext2D, from: { x: number; y: number }, to: { x: number; y: number }) {
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    ctx.fillStyle = "#a5b4fc";
    const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / Math.max(1, size / 4)));
    for (let i = 1; i <= steps; i++) {
      const x = from.x + (to.x - from.x) * i / steps;
      const y = from.y + (to.y - from.y) * i / steps;
      if (square) ctx.fillRect(x - size / 2, y - size / 2, size, size);
      else { ctx.beginPath(); ctx.arc(x, y, size / 2, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.globalCompositeOperation = "source-over";
  }
  function selectColor(ctx: CanvasRenderingContext2D, at: { x: number; y: number }, connected: boolean) {
    const source = sourcePixels.current;
    if (!source) return;
    const { width, height, data } = source;
    const start = Math.min(height - 1, Math.max(0, Math.floor(at.y))) * width
      + Math.min(width - 1, Math.max(0, Math.floor(at.x)));
    const result = snapshot(ctx);
    const limit = tolerance * 2.55;
    function select(index: number) {
      const here = index * 4;
      const sample = start * 4;
      if (Math.max(Math.abs(data[here] - data[sample]), Math.abs(data[here + 1] - data[sample + 1]), Math.abs(data[here + 2] - data[sample + 2])) > limit) return false;
      result.data.set([165, 180, 252, 255], here);
      return true;
    }
    if (connected) {
      const seen = new Uint8Array(width * height);
      const queue = new Int32Array(width * height);
      let length = 0;
      function visit(index: number) {
        if (seen[index]) return;
        seen[index] = 1;
        if (select(index)) queue[length++] = index;
      }
      visit(start);
      for (let i = 0; i < length; i++) {
        const index = queue[i];
        if (index % width) visit(index - 1);
        if (index % width < width - 1) visit(index + 1);
        if (index >= width) visit(index - width);
        if (index + width < seen.length) visit(index + width);
      }
    } else {
      for (let i = 0; i < width * height; i++) select(i);
    }
    ctx.putImageData(result, 0, 0);
  }

  function finish() {
    const ctx = context();
    if (!ctx || saving) return;
    const pixels = snapshot(ctx);
    let any = false;
    for (let i = 0; i < pixels.data.length; i += 4) {
      const value = pixels.data[i + 3] > 8 ? 255 : 0;
      any ||= value === 255;
      pixels.data.set([value, value, value, 255], i);
    }
    if (!any) { onSave(); return; }
    const output = document.createElement("canvas");
    output.width = pixels.width;
    output.height = pixels.height;
    output.getContext("2d")!.putImageData(pixels, 0, 0);
    setSaving(true);
    output.toBlob((blob) => {
      if (blob) onSave(new File([blob], "fibo-mask.png", { type: "image/png" }));
      else { setSaving(false); setError("Could not save the mask."); }
    }, "image/png");
  }
  function modify(invert: boolean) {
    const ctx = context();
    if (!ctx) return;
    record(ctx);
    if (!invert) { ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); return; }
    const pixels = snapshot(ctx);
    for (let i = 0; i < pixels.data.length; i += 4) {
      pixels.data.set([165, 180, 252, pixels.data[i + 3] > 8 ? 0 : 255], i);
    }
    ctx.putImageData(pixels, 0, 0);
  }

  return (
    <dialog ref={dialog} className="wanda-fibo-mask-dialog" aria-label="Edit source mask"
      onCancel={(event) => { event.preventDefault(); if (!saving) onClose(); }}
      onKeyDown={(event) => {
        if (event.target instanceof HTMLInputElement || drawing || saving || !ready) return;
        const key = event.key.toLowerCase();
        if ((event.ctrlKey || event.metaKey) && (key === "z" || key === "y")) {
          event.preventDefault();
          moveHistory(key === "z" && !event.shiftKey);
        } else if (!event.altKey && !event.ctrlKey && !event.metaKey) {
          if (key === "b") setTool("brush");
          if (key === "e") setTool("eraser");
          if (key === "f") setTool("fill");
          if (key === "i") setTool("color");
        }
      }}>
      <div className="wanda-fibo-mask-toolbar" role="group" aria-label="Mask tools">
        <Button type="button" size="sm" variant="ghost" aria-pressed={tool === "brush"} onClick={() => { setReview(false); setTool("brush"); }}>Brush</Button>
        <Button type="button" size="sm" variant="ghost" aria-pressed={tool === "eraser"} onClick={() => { setReview(false); setTool("eraser"); }}>Eraser</Button>
        <Button type="button" size="sm" variant="ghost" aria-pressed={tool === "fill"} onClick={() => { setReview(false); setTool("fill"); }}>Fill</Button>
        <Button type="button" size="sm" variant="ghost" aria-pressed={tool === "color"} onClick={() => { setReview(false); setTool("color"); }}>Select color</Button>
        {(tool === "fill" || tool === "color") && (
          <label>Tolerance <Input type="range" min={0} max={100} value={tolerance} onChange={(event) => setTolerance(event.target.valueAsNumber)} /><output>{tolerance}</output></label>
        )}
        <label>Size <Input type="range" min={4} max={250} value={size} onChange={(event) => setSize(event.target.valueAsNumber)} /><output>{size}</output></label>
        <Button type="button" size="sm" variant="ghost" onClick={() => setSquare(!square)}>{square ? "Square" : "Round"}</Button>
        <label>Overlay <Input type="range" min={10} max={90} value={overlay} onChange={(event) => setOverlay(event.target.valueAsNumber)} /><output>{overlay}%</output></label>
        <Button type="button" size="sm" variant="ghost" disabled={!counts[0] || drawing || saving} onClick={() => moveHistory(true)}>Undo</Button>
        <Button type="button" size="sm" variant="ghost" disabled={!counts[1] || drawing || saving} onClick={() => moveHistory(false)}>Redo</Button>
        <Button type="button" size="sm" variant="ghost" disabled={!ready || drawing || saving} onClick={() => modify(true)}>Invert</Button>
        <Button type="button" size="sm" variant="ghost" disabled={!ready || drawing || saving} onClick={() => modify(false)}>Clear</Button>
        <Button type="button" size="sm" variant="ghost" aria-pressed={review} onClick={() => setReview(!review)}>{review ? "Show overlay" : "Hide overlay"}</Button>
      </div>
      <div className="wanda-fibo-mask-plane">
        <img src={source} alt="Source image" draggable={false} />
        <canvas ref={canvas} aria-label="Paint the selected region" style={{ opacity: review ? 0 : overlay / 100 }}
          onPointerDown={(event) => {
            if (!ready || saving || review || pointer.current || event.button !== 0) return;
            const ctx = context();
            if (!ctx) return;
            const at = point(event);
            record(ctx);
            if (tool === "fill" || tool === "color") {
              selectColor(ctx, at, tool === "fill");
              return;
            }
            event.currentTarget.setPointerCapture(event.pointerId);
            pointer.current = at;
            paint(ctx, at, at);
            setDrawing(true);
          }}
          onPointerMove={(event) => {
            const from = pointer.current;
            const ctx = context();
            if (!ctx || from?.id !== event.pointerId) return;
            const to = point(event);
            paint(ctx, from, to);
            pointer.current = to;
          }}
          onLostPointerCapture={(event) => {
            if (pointer.current?.id !== event.pointerId) return;
            pointer.current = null;
            setDrawing(false);
          }} />
      </div>
      {!enabled && <p>Mask editing is available here. Rendering a masked edit requires the private worker update.</p>}
      {error && <p role="alert">{error}</p>}
      <div className="wanda-fibo-mask-toolbar">
        <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={onClose}>Cancel</Button>
        <Button type="button" size="sm" disabled={!ready || drawing || saving} onClick={finish}>Done masking</Button>
      </div>
    </dialog>
  );
}
