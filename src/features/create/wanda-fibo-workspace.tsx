"use client";

import { animated, useSpring } from "@react-spring/web";
import Link from "next/link";
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { Clock, Dice5, ImagePlus, Keyboard, Pencil, ListOrdered, Plus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

import { WandaFiboMaskEditor } from "./wanda-fibo-mask-editor";
import { clearWandaEdits, readWandaEdits, saveWandaEdits } from "./wanda-fibo-saved-edits";
import { WandaFiboStage, type StageTurn } from "./wanda-fibo-stage";
import { wandaFiboSizes } from "./wanda-fibo-sizes";

const api = "/wanda-fibo/";
const slots = ["Source", "Reference 2", "Reference 3", "Reference 4"];
type Result = { image_data: string; aspect?: number; seed: number; filename?: string; json_instruction?: string; source?: File; batchId?: string; run?: RunSettings };
type Workflow = "edit" | "generate";
type StageBookmark = { id: string; mode: Workflow; count: number; aspect?: number; expires: number };
type QueuedRender = { bookmark: StageBookmark; run: RunSettings };
type Poll = { state?: "pending" | "running" | "finished"; finished: boolean; images: Result[]; preview?: string; previewBlur?: number; caption?: string; error?: string };

function readStageBookmark(key: string): StageBookmark | undefined {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) ?? "null");
    if (value && typeof value.id === "string" && /^[a-f0-9]{32}$/.test(value.id)
      && (value.mode === "edit" || value.mode === "generate") && Number.isInteger(value.count)
      && value.count >= 1 && value.count <= 4 && Number.isFinite(value.expires) && value.expires > Date.now()) {
      const aspect = Number.isFinite(value.aspect) && value.aspect > 0 ? Number(value.aspect) : undefined;
      return { id: value.id, mode: value.mode, count: value.count, aspect, expires: value.expires };
    }
  } catch { /* Session storage is optional. */ }
}

function writeStageBookmark(key: string | undefined, value?: StageBookmark) {
  if (!key) return;
  try {
    if (value) sessionStorage.setItem(key, JSON.stringify(value));
    else sessionStorage.removeItem(key);
  } catch { /* Session storage is optional. */ }
}

async function decodeAspect(url: string) {
  const image = new Image();
  image.src = url;
  await image.decode();
  if (!image.naturalWidth || !image.naturalHeight) throw new Error("Could not open this image.");
  return image.naturalWidth / image.naturalHeight;
}
type RunSettings = {
  mode: Workflow;
  prompt: string;
  negativePrompt: string;
  vgl: string;
  steps: number;
  imageCount: string;
  sizeIndex: number;
  inputs: (File | undefined)[];
  mask?: File;
};
type PromptDraft = {
  prompt: string;
  negativePrompt: string;
  vgl: string;
  generatedVgl: boolean;
  negativeOpen: boolean;
  vglOpen: boolean;
  seed: string;
  randomize: boolean;
  imageCount: string;
};
const emptyDraft: PromptDraft = {
  prompt: "", negativePrompt: "", vgl: "", generatedVgl: false, negativeOpen: false, vglOpen: false,
  seed: "42", randomize: true, imageCount: "1",
};
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(api + path, { cache: "no-store", ...init });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Request failed.");
  return data as T;
}

export function WandaFiboWorkspace({ admitted, extendedSetup, variableSteps, advancedPrompt, masksEnabled = false, savedEditsAccount }: { admitted: boolean; savedEditsAccount?: string; masksEnabled?: boolean; advancedPrompt: boolean; extendedSetup: boolean; variableSteps: boolean }) {
  const [mode, setMode] = useState<Workflow>("edit");
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const modeSpring = useSpring({
    position: mode === "edit" ? 1 : 0,
    config: { mass: 1, tension: 220, friction: 22 },
    immediate: reducedMotion,
  });
  const [selection, setSelection] = useState<{ source: File; mask: File }>();
  const [maskEditor, setMaskEditor] = useState<"inline" | "dialog">();
  const [files, setFiles] = useState<(File | undefined)[]>([]);
  const mask = mode === "edit" && selection?.source === files[0] ? selection?.mask : undefined;
  const [drafts, setDrafts] = useState<Record<Workflow, PromptDraft>>({ edit: emptyDraft, generate: emptyDraft });
  const { prompt, negativePrompt, vgl, generatedVgl, negativeOpen, vglOpen, seed, randomize, imageCount } = drafts[mode];
  // Legacy workers can return VGL, but cannot accept it back as a manual instruction.
  const manualVgl = !advancedPrompt && generatedVgl ? "" : vgl.trim();

  function updateDraft(workflow: Workflow, patch: Partial<PromptDraft>) {
    setDrafts((previous) => ({ ...previous, [workflow]: { ...previous[workflow], ...patch } }));
  }

  function setPrompt(value: string) {
    updateDraft(mode, { prompt: value, vgl: "", generatedVgl: false });
  }

  function setReference(file?: File) {
    setInspiration(file);
    updateDraft("generate", { vgl: "", generatedVgl: false });
  }
  const [steps, setSteps] = useState(4);
  const [previews, setPreviews] = useState<(string | undefined)[]>([]);
  const [resultActions, setResultActions] = useState<HTMLDivElement | null>(null);
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const query = matchMedia("(min-width: 1025px)");
    const update = () => setDesktop(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const [busy, setBusy] = useState(false);
  const queue = useRef<HTMLDetailsElement>(null);
  const preparing = useRef<AbortController | null>(null);
  const [enqueueing, setEnqueueing] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [waiting, setWaiting] = useState<QueuedRender[]>([]);
  const [queueNotice, setQueueNotice] = useState("");
  const queueCount = Number(busy) + waiting.length;
  const [historySelection, setHistorySelection] = useState<{ image: Result }>();
  const [historyRail, setHistoryRail] = useState<HTMLDivElement | null>(null);
  const [result, setResult] = useState<Result>();
  const [turns, setTurns] = useState<Record<Workflow, StageTurn<Result>[]>>({ edit: [], generate: [] });
  const [liveFrame, setLiveFrame] = useState<string>();
  const [liveBlur, setLiveBlur] = useState<number>();
  const [liveCaption, setLiveCaption] = useState<string>();
  const [runningBatch, setRunningBatch] = useState<Result[]>([]);
  const [inspected, setInspected] = useState<Result>();
  const [sessionHistory, setHistory] = useState<Result[]>([]);
  const [savedEdits, setSavedEdits] = useState<Result[]>([]);
  const [savingEdits, setSavingEdits] = useState(false);
  const [savedStatus, setSavedStatus] = useState("");
  const history = [...sessionHistory, ...savedEdits.filter((item) =>
    !sessionHistory.some((image) => image.batchId === item.batchId && image.filename === item.filename))];
  const batches = new Map<string | Result, Result[]>();
  for (const image of history) {
    const key = image.batchId ?? image;
    const group = batches.get(key);
    if (group) group.push(image);
    else batches.set(key, [image]);
  }
  const historyGroups = [...batches.values()].slice(0, 8);

  useEffect(() => {
    if (!historyRail) return;
    const fade = () => {
      historyRail.toggleAttribute("data-fade-top", historyRail.scrollTop > 1);
      historyRail.toggleAttribute("data-fade-bottom", historyRail.scrollHeight - historyRail.scrollTop - historyRail.clientHeight > 1);
    };
    fade();
    const observer = new ResizeObserver(fade);
    observer.observe(historyRail);
    historyRail.addEventListener("scroll", fade, { passive: true });
    return () => { observer.disconnect(); historyRail.removeEventListener("scroll", fade); };
  }, [historyRail, historyGroups.length, busy]);

  useEffect(() => {
    if (!admitted || !savedEditsAccount) return;
    let current = true;
    void readWandaEdits<Result>(savedEditsAccount).then((rows) => {
      if (current) setSavedEdits(rows);
    }).catch(() => { if (current) setSavedStatus("Saved edits could not be opened."); });
    return () => { current = false; };
  }, [admitted, savedEditsAccount]);

  async function saveEdit(image?: Result) {
    if (!admitted || !savedEditsAccount || savingEdits || image && image.run?.mode !== "edit") return;
    if (!image && !window.confirm("Remove this account's saved edits from this browser? Current session results will stay until you leave.")) return;
    setSavingEdits(true);
    try {
      if (image) {
        const batch = image.batchId ? history.filter((item) => item.batchId === image.batchId) : [];
        setSavedEdits(await saveWandaEdits(savedEditsAccount, batch.length ? batch : [image]));
        setSavedStatus("Edit saved in this browser.");
      } else {
        await clearWandaEdits(savedEditsAccount);
        setResult((previous) => previous && !sessionHistory.includes(previous) ? undefined : previous);
        setSavedEdits([]);
        setSavedStatus("Saved edits cleared from this browser.");
      }
    } catch {
      setSavedStatus("Could not update saved edits. Check available browser storage.");
    } finally { setSavingEdits(false); }
  }
  const [recent, setRecent] = useState<string[]>([]);
  const [sizeIndex, setSizeIndex] = useState(0);
  const [inspiration, setInspiration] = useState<File>();
  const [inspirationPreview, setInspirationPreview] = useState<string>();
  const size = wandaFiboSizes[sizeIndex] ?? wandaFiboSizes[0];
  const needsUpgrade = mode === "generate" && !extendedSetup && (sizeIndex !== 0 || (!!inspiration && !manualVgl));
  useEffect(() => {
    if (!inspiration) { setInspirationPreview(undefined); return; }
    const url = URL.createObjectURL(inspiration);
    setInspirationPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [inspiration]);
  const sourceButton = useRef<HTMLButtonElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const slot = useRef(0);
  const [dragTarget, setDragTarget] = useState<number | "canvas">();
  const [status, setStatus] = useState("");
  const active = useRef<AbortController | null>(null);
  const bookmarkKey = admitted && savedEditsAccount ? "renderlab:wf-stage:" + savedEditsAccount : undefined;
  const [stageReady, setStageReady] = useState(!bookmarkKey);
  const [resuming, setResuming] = useState<StageBookmark>();
  useEffect(() => () => {
    preparing.current?.abort();
    active.current?.abort();
    active.current = null;
  }, []);
  useEffect(() => {
    const urls = files.map((file) => file ? URL.createObjectURL(file) : undefined);
    setPreviews(urls);
    return () => urls.forEach((url) => { if (url) URL.revokeObjectURL(url); });
  }, [files]);

  function resultFile(image: { image_data: string; filename?: string }) {
    const bytes = Uint8Array.from(atob(image.image_data.split(",")[1]), (ch) => ch.charCodeAt(0));
    return new File([bytes], image.filename ?? "fibo-result.png", { type: "image/png" });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || preparing.current || (!desktop && active.current)) return;
    const background = !!active.current || waiting.length > 0;
    const controller = new AbortController();
    const { signal } = controller;
    if (background) {
      preparing.current = controller;
      setEnqueueing(true);
      setQueueNotice("");
    } else active.current = controller;
    const editInputs = [...files];
    const stageSource = mode === "edit" && !editInputs[0] ? result : undefined;
    if (stageSource) {
      try {
        editInputs[0] = resultFile(stageSource);
      } catch {
        if (background) {
          preparing.current = null;
          setEnqueueing(false);
          setQueueNotice("Could not read the result in view.");
        } else {
          active.current = null;
          setStatus("Could not read the result in view.");
        }
        return;
      }
    }
    const job = crypto.randomUUID().replaceAll("-", "");
    const threaded = matchMedia("(max-width: 760px)").matches;
    if (threaded) setTurns((previous) => ({
      ...previous,
      [mode]: [...previous[mode], { id: job, prompt: prompt.trim() || (manualVgl ? "VGL JSON" : ""),
        input: mode === "edit" ? editInputs[0] : manualVgl ? undefined : inspiration }].slice(-8),
    }));
    function finishTurn(images: Result[], error?: string) {
      if (threaded) setTurns((previous) => ({
        ...previous, [mode]: previous[mode].map((turn) => turn.id === job ? { ...turn, images, error } : turn),
      }));
    }
    if (!background) {
      setLiveFrame(undefined);
      setLiveBlur(undefined);
      setLiveCaption(undefined);
      setRunningBatch([]);
      setInspected(undefined);
      setBusy(true);
      setStatus(mode === "edit" ? "Uploading images..." : "Submitting render...");
    }
    try {
      const uploads: Record<string, string> = {};
      if (mode === "edit") {
        for (const [index, file] of editInputs.entries()) {
          if (!file) continue;
          const form = new FormData();
          form.set("files", file);
          const [id] = await request<string[]>("gradio_api/upload", { method: "POST", body: form, signal });
          uploads[["source", "ref2", "ref3", "ref4"][index]] = id;
          if (index === 0 && stageSource && !background) {
            setFiles(editInputs);
            setSelection(undefined);
            setResult(undefined);
          }
        }
      }
      if (mode === "generate" && inspiration && !manualVgl) {
        const form = new FormData();
        form.set("files", inspiration);
        const [id] = await request<string[]>("gradio_api/upload", { method: "POST", body: form, signal });
        uploads.inspiration = id;
      }
      if (mask) {
        const form = new FormData();
        form.set("files", mask);
        const [id] = await request<string[]>("gradio_api/upload", { method: "POST", body: form, signal });
        uploads.mask = id;
      }
      const run: RunSettings = {
        mask,
        mode, prompt: prompt.trim(), negativePrompt: negativePrompt.trim(), vgl: manualVgl, steps, imageCount, sizeIndex,
        inputs: mode === "edit" ? editInputs : [],
      };
      await request("local/" + mode, { method: "POST", signal, headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...uploads, job_id: job, instruction: prompt.trim(), negative_prompt: negativePrompt.trim(), json_instruction: manualVgl,
          seed: Number(seed), randomize, steps, image_count: Number(imageCount), width: size.width, height: size.height }) });
      if (!background) setStatus("Rendering on Modal...");
      const aspect = mode === "generate" ? size.width / size.height
        : previews[0] ? await decodeAspect(previews[0]).catch(() => undefined) : stageSource?.aspect;
      const bookmark: StageBookmark = { id: job, mode, count: Number(imageCount), aspect, expires: Date.now() + 55 * 60_000 };
      if (signal.aborted) return;
      if (background) {
        setWaiting((items) => [...items, { bookmark, run }]);
        setQueueNotice("Added to Queue.");
        return;
      }
      setAccepted(true);
      if (desktop) writeStageBookmark(bookmarkKey, bookmark);
      const { images, error } = await watchRender(bookmark, signal, run);
      if (signal.aborted) return;
      finishTurn(images, error);
      const image = images[0];
      if (typeof image.json_instruction === "string" && image.json_instruction.trim()) {
        updateDraft(mode, { vgl: image.json_instruction, generatedVgl: true });
      }
      if (prompt.trim()) setRecent((items) => [prompt.trim(), ...items.filter((item) => item !== prompt.trim())].slice(0, 5));
    } catch (cause) {
      if (!signal.aborted) {
        const message = cause instanceof Error ? cause.message : "Render failed.";
        if (background) setQueueNotice(message);
        else {
          finishTurn([], message);
          if (desktop) writeStageBookmark(bookmarkKey);
          setStatus(message);
        }
      }
    } finally {
      if (background) {
        if (preparing.current === controller) preparing.current = null;
        if (!signal.aborted) setEnqueueing(false);
      } else if (active.current === controller) {
        active.current = null;
        if (!signal.aborted) { setAccepted(false); setBusy(false); }
      }
    }
  }

  async function watchRender(bookmark: StageBookmark, signal: AbortSignal, run?: RunSettings, restoring = false) {
    const end = Date.now() + 24 * 60_000;
    let images: Result[] = [];
    while (!signal.aborted && Date.now() < end) {
      const update = await request<Poll>("local/render/" + bookmark.id, { signal });
      if (signal.aborted) throw new Error("Render polling stopped.");
      if (!update.finished) {
        if (update.state === "pending") setStatus("Waiting in Queue…");
        else if (update.state === "running") setStatus("Rendering on Modal...");
        setLiveFrame(update.preview);
        setLiveBlur(update.previewBlur);
        setLiveCaption(update.caption);
      }
      if (update.images.length > images.length) {
        images = [...images, ...update.images.slice(images.length).map((image) => ({
          ...image, batchId: bookmark.id, run, source: run?.inputs[0],
        }))];
        setRunningBatch(images);
      }
      if (update.finished) {
        if (!images[0]) throw new Error(update.error ?? "No image returned.");
        // Keep progress (or the existing inspected image) until the final cover can display at its real aspect.
        const first = images[0];
        const cover = { ...first, aspect: await decodeAspect(first.image_data) };
        if (signal.aborted) throw new Error("Render polling stopped.");
        images = [cover, ...images.slice(1)];
        setResult((previous) => previous?.batchId === bookmark.id && previous !== first ? previous : cover);
        setLiveFrame(undefined);
        setLiveBlur(undefined);
        setLiveCaption(undefined);
        setHistory((items) => {
          const merged = [...images, ...items.filter((item) => item.batchId !== bookmark.id)];
          const ids = new Set<Result["batchId"]>();
          return merged.filter((item) => {
            if (ids.has(item.batchId)) return true;
            if (ids.size >= 8) return false;
            ids.add(item.batchId);
            return true;
          });
        });
        setStatus(update.error ?? (images.length === 1 ? "Render complete." : images.length + " images ready in History."));
        if (restoring) setStageReady(true);
        return { images, error: update.error };
      }
      if (restoring) setStageReady(true);
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    throw new Error("Render status did not return before the local timeout.");
  }

  useEffect(() => {
    if (!bookmarkKey || !matchMedia("(min-width: 1025px)").matches) {
      setStageReady(true);
      return;
    }
    const bookmark = readStageBookmark(bookmarkKey);
    if (!bookmark) {
      setStageReady(true);
      return;
    }
    const controller = new AbortController();
    active.current = controller;
    setMode(bookmark.mode);
    setBusy(true);
    setResuming(bookmark);
    setAccepted(true);
    setStatus("Restoring render…");
    void watchRender(bookmark, controller.signal, undefined, true).catch(() => {
      if (!controller.signal.aborted) {
        writeStageBookmark(bookmarkKey);
        setStatus("The previous render is no longer available.");
      }
    }).finally(() => {
      if (active.current !== controller) return;
      active.current = null;
      setBusy(false);
      setAccepted(false);
      setResuming(undefined);
      setStageReady(true);
    });
    return () => {
      controller.abort();
      if (active.current === controller) active.current = null;
    };
  }, [bookmarkKey]);

  useEffect(() => {
    if (!stageReady || busy || active.current || !waiting.length) return;
    const next = waiting[0];
    const controller = new AbortController();
    active.current = controller;
    setWaiting((items) => items.filter((item) => item !== next));
    setBusy(true);
    setInspected(undefined);
    setRunningBatch([]);
    setLiveFrame(undefined);
    setLiveBlur(undefined);
    setLiveCaption(undefined);
    setResuming(next.bookmark);
    setAccepted(true);
    setStatus("Waiting in Queue…");
    writeStageBookmark(bookmarkKey, next.bookmark);
    void watchRender(next.bookmark, controller.signal, next.run).catch((cause: unknown) => {
      if (controller.signal.aborted) return;
      writeStageBookmark(bookmarkKey);
      setStatus(cause instanceof Error ? cause.message : "Could not open queued render.");
    }).finally(() => {
      if (active.current !== controller) return;
      active.current = null;
      setBusy(false);
      setAccepted(false);
      setResuming(undefined);
    });
  }, [stageReady, busy, waiting, bookmarkKey]);

  async function removeWaiting(id: string) {
    try {
      await request("local/queue/" + id + "/cancel", { method: "POST" });
      setWaiting((items) => items.filter((item) => item.bookmark.id !== id));
      setQueueNotice("Removed from Queue.");
    } catch (cause) {
      setQueueNotice(cause instanceof Error ? cause.message : "Could not remove this render.");
    }
  }

  function restoreRun(image: Result, reopen: boolean) {
    const run = image.run;
    if (!admitted || busy || !run || (reopen && run.mode !== "edit")) return;
    setMaskEditor(undefined);
    setMode(run.mode);
    if (reopen) {
      setFiles([...run.inputs]);
      setSelection(run.mask && run.inputs[0] ? { source: run.inputs[0], mask: run.mask } : undefined);
    }
    if (run.mode === "generate") setSizeIndex(run.sizeIndex);
    setSteps(run.steps);
    updateDraft(run.mode, {
      prompt: run.prompt, negativePrompt: run.negativePrompt, vgl: run.vgl,
      generatedVgl: false, seed: String(image.seed), randomize: false, imageCount: run.imageCount,
    });
    requestAnimationFrame(() => document.getElementById("wanda-fibo-prompt")?.focus({ preventScroll: true }));
  }

  function chooseImage(index: number) {
    if (!admitted || busy) return;
    slot.current = index;
    picker.current?.click();
  }

  function attachImage(file: File, index: number) {
    if (!admitted || busy) return;
    setMaskEditor(undefined);
    if (index === 0) { setSelection(undefined); setMode("edit"); setResult(undefined); }
    updateDraft("edit", { vgl: "", generatedVgl: false });
    setFiles((previous) => { const next = [...previous]; next[index] = file; return next; });
  }

  function uploadDropTarget(target: number | "canvas") {
    return {
      "data-drag-over": admitted && !busy && dragTarget === target ? "true" : undefined,
      onDragOver(event: DragEvent<HTMLElement>) {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = admitted && !busy ? "copy" : "none";
        if (admitted && !busy) setDragTarget(target);
      },
      onDragLeave(event: DragEvent<HTMLElement>) {
        if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
        setDragTarget((current) => current === target ? undefined : current);
      },
      onDrop(event: DragEvent<HTMLElement>) {
        event.preventDefault();
        setDragTarget(undefined);
        const file = event.dataTransfer.files[0];
        if (!admitted || busy || !file?.type.startsWith("image/")) return;
        if (target === 4 || (target === "canvas" && mode === "generate")) {
          setReference(file);
        }
        else attachImage(file, target === "canvas" ? 0 : target);
      },
    };
  }

  const seedValid = randomize || (/^\d+$/.test(seed) && Number(seed) <= 2147483647);
  const vglValid = (() => {
    if (!manualVgl) return true;
    try {
      const value: unknown = JSON.parse(manualVgl);
      return value !== null && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0;
    } catch { return false; }
  })();
  const blocker = !admitted ? "Sign in with an account that has Create access."
    : needsUpgrade ? "Reference images and non-square renders need the private worker update."
    : !variableSteps && steps !== 4 ? "The current worker supports 4 steps. Select 4 to generate."
    : mode === "edit" && !files[0] && !result ? "Add a source image to edit."
    : mask && files.slice(1).some(Boolean) ? "Remove references to use a mask."
    : mask && !masksEnabled ? "Masked edits need the private worker update."
    : !vglValid ? "Enter a non-empty VGL JSON object."
    : !advancedPrompt && (manualVgl || negativePrompt.trim()) ? "Advanced prompts need the private worker update."
    : !manualVgl && !prompt.trim() ? "Enter a prompt or VGL JSON to generate."
    : !/^[1-4]$/.test(imageCount) ? "Choose 1 to 4 images."
    : !seedValid ? "Enter a seed from 0 to 2147483647."
    : "";
  const canSubmit = stageReady && !enqueueing && (!busy || desktop && accepted && queueCount < 3) && !maskEditor && !blocker;
  const maskEditorNode = maskEditor && mode === "edit" && files[0] && previews[0] && (
    <WandaFiboMaskEditor source={previews[0]} mask={mask} enabled={masksEnabled} inline={maskEditor === "inline"} onClose={() => setMaskEditor(undefined)}
      onSave={(region) => {
        setSelection(region ? { source: files[0]!, mask: region } : undefined);
        if (region) requestAnimationFrame(() => document.getElementById("wanda-fibo-prompt")?.focus({ preventScroll: true }));
        updateDraft("edit", { vgl: "", generatedVgl: false });
        setMaskEditor(undefined);
      }} />
  );

  return (
    <section className="wanda-fibo-workspace mx-auto w-full" aria-label="Create with FIBO">
      <div className="wanda-fibo-toolbar">
        <div className="wanda-fibo-tools">
          <details ref={queue} className="wanda-fibo-queue">
                        <summary><ListOrdered size={16} aria-hidden="true" /> Queue{queueCount > 0 && <span>{queueCount}</span>}</summary>
            <div className="wanda-fibo-queue-jobs">
              <div role="status">{queueNotice || (busy ? status : "No active render in this workspace.")}</div>
              {waiting.map(({ bookmark, run }) => (
                <div className="wanda-fibo-queue-entry" key={bookmark.id}>
                  <span>{run.prompt || "VGL edit"}</span>
                  <Button type="button" variant="ghost" size="sm"
                    onClick={() => void removeWaiting(bookmark.id)}>Remove waiting render</Button>
                </div>
              ))}
            </div>
          </details>
          <details className="wanda-fibo-queue">
            <summary><Keyboard size={16} aria-hidden="true" /> Shortcuts</summary>
            <p>Ctrl + Enter to generate when the form is ready.</p>
          </details>
        </div>
      </div>
      <div className="wanda-fibo-grid">
        <form className="wanda-fibo-controls" noValidate onSubmit={submit}
          onKeyDown={(event) => {
            if (event.key === "Enter" && event.ctrlKey && !event.nativeEvent.isComposing && canSubmit) {
              event.preventDefault();
              event.currentTarget.requestSubmit();
            }
          }}>
          <div className="wanda-fibo-fields">
            <div className="wanda-fibo-modes" role="group" aria-label="Workflow">
              <animated.span className="wanda-fibo-mode-highlight" aria-hidden="true"
                style={{ transform: modeSpring.position.to((position) => "translateX(" + (position * 44) + "px)") }} />
              <Button type="button" variant="ghost" aria-label="Text to Image" title="Text to Image"
                aria-pressed={mode === "generate"} disabled={busy}
                onClick={() => { setMaskEditor(undefined); setMode("generate"); }}>
                <ImagePlus aria-hidden="true" />
              </Button>
              <Button type="button" variant="ghost" aria-label="Image Editing" title="Image Editing"
                aria-pressed={mode === "edit"} disabled={busy}
                onClick={() => { setMode("edit"); }}>
                <Pencil aria-hidden="true" />
              </Button>
            </div>
            <section aria-labelledby="wanda-fibo-setup">
              <h2 id="wanda-fibo-setup">Image setup</h2>
              <div className="wanda-fibo-setup-slot">
                <div className="wanda-fibo-tiles" inert={mode !== "edit"}>
                  {slots.map((label, index) => (
                    <div className="wanda-fibo-tile" key={label} {...uploadDropTarget(index)}>
                      <Button ref={index === 0 ? sourceButton : undefined} type="button" variant="outline" aria-label={"Choose " + label.toLowerCase() + " image"}
                        title={files[index]?.name ?? label} disabled={!admitted || busy}
                        onClick={() => chooseImage(index)}>
                        {previews[index] ? <img src={previews[index]} alt="" draggable={false} /> : <Plus size={14} aria-hidden="true" />}<span>{label}</span>
                      </Button>
                      {files[index] && <Button type="button" variant="secondary" size="icon-sm"
                        className="wanda-fibo-remove" aria-label={"Remove " + label.toLowerCase() + " image"} disabled={busy}
                        onClick={() => {
                          updateDraft("edit", { vgl: "", generatedVgl: false });
                          if (index === 0) setSelection(undefined);
                          setMaskEditor(undefined);
                          setFiles((previous) => previous.map((file, i) => i === index ? undefined : file));
                        }}><X /></Button>}
                    </div>
                  ))}
                </div>
                <div className="wanda-fibo-size" inert={mode !== "generate"}>
                  <div className="wanda-fibo-tile" {...uploadDropTarget(4)}>
                    <Button type="button" variant="outline" disabled={!admitted || busy}
                      aria-label="Choose reference image" onClick={() => chooseImage(4)}>
                      {inspirationPreview ? <img src={inspirationPreview} alt="" draggable={false} /> : <Plus size={14} aria-hidden="true" />}
                      <span>Reference</span>
                    </Button>
                    {inspiration && <Button type="button" variant="secondary" size="icon-sm" className="wanda-fibo-remove"
                      aria-label="Remove reference image" disabled={busy} onClick={() => setReference()}><X /></Button>}
                  </div>
                  <label className="wanda-fibo-aspect">Aspect ratio
                    <NativeSelect size="sm" value={sizeIndex} disabled={busy} onChange={(event) => setSizeIndex(Number(event.target.value))}>
                      {wandaFiboSizes.map(({ label, width, height }, index) => (
                        <NativeSelectOption key={label} value={index}>{label} · {width} × {height}</NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </label>
                </div>
              </div>
              <input ref={picker} type="file" accept="image/*" hidden onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (file && admitted && !busy) {
                  if (slot.current === 4) setReference(file);
                  else attachImage(file, slot.current);
                }
                event.currentTarget.value = "";
              }} />
            </section>
            <div className="wanda-fibo-prompt-heading">
              <label htmlFor="wanda-fibo-prompt">Prompt</label>
              <details className="wanda-fibo-recents">
                <summary aria-label="Recent prompts" title="Recent prompts"><Clock size={16} aria-hidden="true" /></summary>
                <div>
                  {recent.length ? recent.map((value) => <Button key={value} type="button" variant="ghost" disabled={busy}
                    onClick={(event) => { setPrompt(value); event.currentTarget.closest("details")?.removeAttribute("open"); }}>{value}</Button>)
                    : <p>No recent prompts in this session.</p>}
                </div>
              </details>
            </div>
            <Textarea id="wanda-fibo-prompt" required spellCheck autoCorrect="on" value={prompt} disabled={!admitted || (busy && !desktop)} maxLength={4000}
              placeholder={mask ? "Describe what to change in the masked area…" : "Describe the result you want…"}
              onChange={(event) => setPrompt(event.target.value)} />
            <div className="wanda-fibo-extra" key={mode}>
              <details open={negativeOpen} onToggle={(event) => {
                if (event.currentTarget.open !== negativeOpen) updateDraft(mode, { negativeOpen: event.currentTarget.open });
              }}>
                <summary id="wanda-fibo-negative-label">Negative prompt</summary>
                <Textarea aria-labelledby="wanda-fibo-negative-label" rows={3} maxLength={4000} spellCheck autoCorrect="on"
                  placeholder="What should the image avoid?" value={negativePrompt} disabled={busy}
                  onChange={(event) => updateDraft(mode, { negativePrompt: event.target.value })} />
              </details>
              <details open={vglOpen} onToggle={(event) => {
                if (event.currentTarget.open !== vglOpen) updateDraft(mode, { vglOpen: event.currentTarget.open });
              }}>
                <summary id="wanda-fibo-vgl-label">VGL JSON</summary>
                <Textarea aria-labelledby="wanda-fibo-vgl-label" className="wanda-fibo-vgl" rows={5} maxLength={8192} spellCheck={false} autoCorrect="off" autoCapitalize="off"
                  placeholder="Enter VGL JSON…" value={vgl} disabled={busy} aria-invalid={!vglValid}
                  title={!vglValid ? "Enter a non-empty JSON object." : undefined}
                  aria-describedby={!vglValid ? "wanda-fibo-vgl-invalid" : undefined}
                  onChange={(event) => updateDraft(mode, { vgl: event.target.value, generatedVgl: false })} />
                {!vglValid && <span id="wanda-fibo-vgl-invalid" className="sr-only">Enter a non-empty JSON object.</span>}
              </details>
            </div>
          </div>
          <div className="wanda-fibo-dock">
            <div className="wanda-fibo-settings">
              <div className="wanda-fibo-render-field">
                <label htmlFor="wanda-fibo-seed">Seed</label>
                <div className="wanda-fibo-seed">
                  <Input id="wanda-fibo-seed" type="text" inputMode="numeric" spellCheck={false} autoCorrect="off" autoCapitalize="off" maxLength={10}
                    required={!randomize} value={seed} disabled={busy || randomize} onChange={(event) => updateDraft(mode, { seed: event.target.value })} />
                  <label className="wanda-fibo-seed-dice" title="Randomize seed each time">
                    <Input type="checkbox" aria-label="Randomize seed each time" checked={randomize} disabled={busy}
                      onChange={(event) => updateDraft(mode, { randomize: event.target.checked })} />
                    <Dice5 aria-hidden="true" />
                  </label>
                </div>
              </div>
              <label className="wanda-fibo-render-field" htmlFor="wanda-fibo-count">Images
                <Input id="wanda-fibo-count" type="number" min={1} max={4} step={1} required value={imageCount}
                  disabled={busy} onChange={(event) => updateDraft(mode, { imageCount: event.target.value })} />
              </label>
              <label className="wanda-fibo-steps" htmlFor="wanda-fibo-steps">
                <span>Steps <output htmlFor="wanda-fibo-steps">{steps}</output></span>
                <Input id="wanda-fibo-steps" type="range" min={1} max={8} step={1} value={steps}
                  disabled={busy}
                  title={variableSteps ? undefined : "The current worker renders at 4 steps"}
                  onChange={(event) => setSteps(event.target.valueAsNumber)} />
              </label>
            </div>
            <p className="wanda-fibo-caption wanda-fibo-worker-note" role="status">{status}</p>
            <span id="wanda-fibo-blocker" className="sr-only">{blocker}</span>
            <Button type="submit" className="wanda-fibo-generate" disabled={!canSubmit}
              title={blocker || undefined} aria-describedby={blocker ? "wanda-fibo-blocker" : undefined}>
              <Sparkles aria-hidden="true" />{enqueueing ? "Adding…" : busy ? desktop ? "Queue render" : "Rendering…" : "Generate"}<kbd aria-hidden="true">Ctrl + Enter</kbd>
            </Button>
          </div>
        </form>
        <section className="wanda-fibo-canvas" aria-label="Canvas" {...uploadDropTarget("canvas")}>
            {stageReady && <WandaFiboStage
              desktopResultActions={desktop ? resultActions : undefined}
              workflow={mode}
              turns={turns[mode]}
              inlineMask={maskEditor === "inline" ? maskEditorNode : undefined}
              browseDisabled={!admitted}
              maskAction={admitted && mode === "edit" && files[0] && !result && !busy ? {
                mask, blocked: files.slice(1).some(Boolean), open: () => setMaskEditor(matchMedia("(min-width: 1025px)").matches ? "inline" : "dialog"),
                clear: () => { setSelection(undefined); updateDraft("edit", { vgl: "", generatedVgl: false }); },
              } : undefined}
              result={busy ? inspected : result}
              history={historyGroups.map((group) => group[0])}
              historySelection={historySelection}
              desktopArrows={desktop && !maskEditor}
              onRestore={restoreRun}
              onSaveEdit={savedEditsAccount ? (image) => void saveEdit(image) : undefined}
              savingEdit={savingEdits}
              source={mode === "edit" ? files[0] : undefined}
              batch={busy ? runningBatch : result?.batchId ? history.filter((image) => image.batchId === result.batchId) : []}
              onSelect={(image) => {
                if (busy) setInspected(image);
                setResult(image);
              }}
              onReturnToProgress={() => { setInspected(undefined); setResult(undefined); }}
              expectedImages={resuming?.count ?? Number(imageCount)}
              input={mode === "edit" ? previews[0] : inspirationPreview}
              inputLabel={mode === "edit" ? "Source image" : "Reference image"}
              busy={busy}
              liveFrame={liveFrame}
              liveBlur={liveBlur}
              renderRatio={resuming ? resuming.aspect : mode === "generate" ? size.width / size.height : undefined}
              status={liveCaption ?? status}
              onBrowse={() => chooseImage(mode === "edit" ? 0 : 4)}
              onUseInput={(file) => attachImage(file, 0)}
              onUseSource={(image) => {
                try {
                  attachImage(resultFile(image), 0);
                  requestAnimationFrame(() => {
                    const button = sourceButton.current;
                    button?.focus({ preventScroll: true });
                    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
                      button?.animate([
                        { boxShadow: "0 0 0 2px #a5b4fc, 0 0 16px #9b7cff73", offset: 0 },
                        { boxShadow: "0 0 0 2px #a5b4fc, 0 0 16px #9b7cff73", offset: .3 },
                        { boxShadow: "0 0 0 2px transparent, 0 0 16px transparent", offset: 1 },
                      ], { duration: 900, easing: "ease-out" });
                    }
                  });
                } catch { setStatus("Could not use this result as the source."); }
              }}
            />}
            {maskEditor === "dialog" && maskEditorNode}
            {!admitted && <Link href="/settings" className="wanda-fibo-stage-sign-in">Sign in to upload</Link>}
        </section>
        <aside className="wanda-fibo-history" aria-labelledby="wanda-fibo-history-title"
          onKeyDown={(event) => {
            if (busy || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
            const direction = ["ArrowUp", "ArrowLeft"].includes(event.key) ? -1 : ["ArrowDown", "ArrowRight"].includes(event.key) ? 1 : 0;
            const chips = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("[data-wanda-history-image]:not(:disabled)")];
            const from = chips.indexOf(document.activeElement as HTMLButtonElement);
            if (!direction || from < 0) return;
            event.preventDefault();
            const next = chips[(from + direction + chips.length) % chips.length];
            next.focus();
            next.click();
          }}>
          <h2 id="wanda-fibo-history-title">History</h2>
          <div ref={setResultActions} className="wanda-fibo-history-result-actions" />
          {!!savedEdits.length && <Button type="button" variant="ghost" size="sm" disabled={savingEdits || busy}
            onClick={() => void saveEdit()}>Clear saved edits</Button>}
          {savedStatus && <p className="wanda-fibo-caption" role="status">{savedStatus}</p>}
          <div ref={setHistoryRail} className="wanda-fibo-history-rail">
            {queueCount > 0 && <Button type="button" variant="ghost" className="wanda-fibo-history-progress"
              aria-label={"Open Queue, " + queueCount + (queueCount === 1 ? " active render" : " renders")} onClick={() => {
                if (queue.current) {
                  queue.current.open = true;
                  queue.current.querySelector("summary")?.focus({ preventScroll: true });
                }
              }}>
              <span>Rendering</span><span>{queueCount} in Queue</span>
            </Button>}
            {historyGroups.length ? historyGroups.map((group, index) => {
              const image = group[0];
              return <Button key={image.batchId ?? image.filename ?? index} data-wanda-history-image type="button" variant="ghost"
                className="wanda-fibo-history-cover" disabled={busy} aria-current={!!result && group.includes(result)}
                aria-label={"Open render " + (historyGroups.length - index) + ", seed " + image.seed + ", " + group.length + (group.length === 1 ? " image" : " images")}
                onClick={() => { setMaskEditor(undefined); setHistorySelection({ image }); }}>
                <img src={image.image_data} alt="" draggable={false} loading="lazy" />
                {group.length > 1 && <span className="wanda-fibo-history-stack" aria-hidden="true">▱ {group.length}</span>}
              </Button>;
            }) : !busy && <p className="wanda-fibo-caption">Finished images will appear here.</p>}
          </div>
        </aside>
      </div>
    </section>
  );
}
