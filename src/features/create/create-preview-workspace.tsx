"use client";

import { animated, useSpring } from "@react-spring/web";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type DragEvent, type FormEvent } from "react";
import { Clock, Dice5, ImagePlus, Keyboard, Pencil, ListOrdered, Plus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger, SheetContent, SheetClose, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import phoneStyles from "./create-phone-composer.module.css";
import { springOptions } from "@/lib/ui/spring-roles";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { nextCreateToolbarPopover, type CreateToolbarPopover } from "./create-toolbar-popover-state";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

import { DeferredMaskEditor as CreatePreviewMaskEditor } from "./create-preview-deferred-mask-editor";
import { clearSavedEdits, readSavedEdits, saveEdits } from "./create-preview-saved-edits";
import { CreatePreviewStage, type StageTurn } from "./create-preview-stage";
import { previewImageSizes } from "./create-preview-sizes";
import { loadCreateResultSource } from "./create-result-source";
import { fetchHostedCreateCapabilities, rejectUnavailableInspirationDrop, type HostedCreateCapabilities } from "./create-hosted-capabilities";
import { loadContinuationFiles, type CreateContinuationPlan } from "./create-continuation";

import { fiboImageAspectRatios, type AspectRatio, type PresetAspectRatio, type GenerationModel, type GenerationInput, type GenerationJob } from "@/lib/capabilities/generation";
import { isMediaUploadMimeType } from "@/lib/api/media-upload-contract";
import type { PublicMediaAsset } from "@/lib/api/media-assets-contract";
import { uploadFiboMaskFile } from "@/lib/browser/fibo-mask-upload-client";
import { normalizeFiboVgl, resolveFiboVglReferences } from "@/lib/capabilities/fibo-vgl";
import { uploadPersistentImageFile } from "@/lib/browser/media-upload-client";

const hostedJobId = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const hostedRatios = fiboImageAspectRatios;

async function hostedRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, cache: "no-store" });
  const data = await response.json();
  if (!response.ok || data.ok !== true) throw new Error(data.error?.message ?? "Hosted request failed.");
  return data as T;
}

function hostedResult(asset: PublicMediaAsset): Result {
  return { image_data: "/api/media/assets/" + asset.id + "/content", assetId: asset.id,
    filename: asset.originalFilename ?? "result.png", seed: 0, batchId: asset.generationJobId ?? asset.id,
    aspect: asset.width && asset.height ? asset.width / asset.height : undefined };
}

const api = "/create-preview/";
const slotMarker = (index: number) => "\uE000" + index + "\uE001";
const slotMarkers = /\uE000([0-3])\uE001/g;
const slots = ["Source", "Reference 2", "Reference 3", "Reference 4"];
type Result = { assetId?: string; image_data: string; aspect?: number; seed: number; filename?: string; json_instruction?: string; source?: File; batchId?: string; run?: RunSettings };
type Workflow = "edit" | "generate";
type StageBookmark = { id: string; mode: Workflow; count: number; aspect?: number; expires: number; filename?: string };
type QueuedRender = { bookmark: StageBookmark; run?: RunSettings };
type Poll = { canCancel?: boolean; cancelling?: boolean; state?: "pending" | "running" | "finished"; finished: boolean; images: Result[]; imageOffset?: number; preview?: string; previewBlur?: number; caption?: string; error?: string };

function parseStageBookmark(raw: unknown): StageBookmark | undefined {
  if (!raw || typeof raw !== "object") return;
  const value = raw as Partial<StageBookmark>;
  if (typeof value.id !== "string" || !(/^[a-f0-9]{32}$/.test(value.id) || hostedJobId.test(value.id))
    || (value.mode !== "edit" && value.mode !== "generate") || typeof value.count !== "number"
    || !Number.isInteger(value.count) || value.count < 1 || value.count > 4
    || typeof value.expires !== "number" || !Number.isFinite(value.expires) || value.expires <= Date.now()) return;
  const aspect = typeof value.aspect === "number" && Number.isFinite(value.aspect) && value.aspect > 0
    ? value.aspect : undefined;
  const filename = typeof value.filename === "string" && value.filename.length <= 100 ? value.filename : undefined;
  return { id: value.id, mode: value.mode, count: value.count, aspect, expires: value.expires, filename };
}

function readStageBookmark(key: string): StageBookmark | undefined {
  try { return parseStageBookmark(JSON.parse(sessionStorage.getItem(key) ?? "null")); }
  catch { /* Session storage is optional. */ }
}

function readWaiting(key: string, activeId?: string): QueuedRender[] {
  try {
    const stored: unknown = JSON.parse(sessionStorage.getItem(key + ":waiting") ?? "[]");
    if (!Array.isArray(stored)) return [];
    const entries: QueuedRender[] = [];
    for (const value of stored.slice(0, 2)) {
      const bookmark = parseStageBookmark(value);
      if (bookmark && bookmark.id !== activeId && !entries.some((item) => item.bookmark.id === bookmark.id)) entries.push({ bookmark });
    }
    return entries;
  } catch { return []; }
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
  editAspectRatio?: AspectRatio;
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

export function CreatePreviewWorkspace({ admitted, extendedSetup, variableSteps, advancedPrompt, masksEnabled: configuredMasksEnabled = false, hostedOnly = false, hostedModel, hostedAccountKey, savedEditsAccount, initialAspectRatio = "1:1", initialContinuation = null, initialContinuationError = null }: { initialContinuation?: CreateContinuationPlan | null; initialContinuationError?: string | null; admitted: boolean; hostedOnly?: boolean; hostedModel?: { id: GenerationModel; label: string }; hostedAccountKey?: string; savedEditsAccount?: string; initialAspectRatio?: PresetAspectRatio; masksEnabled?: boolean; advancedPrompt: boolean; extendedSetup: boolean; variableSteps: boolean }) {
  const hosted = hostedOnly || !!hostedModel;
  const [hostedCapabilities, setHostedCapabilities] = useState<HostedCreateCapabilities>();
  const [capabilityReadFailed, setCapabilityReadFailed] = useState(false);
  useEffect(() => {
    if (!hosted) return;
    const controller = new AbortController();
    void fetchHostedCreateCapabilities(controller.signal).then((capabilities) => {
      if (!controller.signal.aborted) setHostedCapabilities(capabilities);
    }).catch(() => {
      if (!controller.signal.aborted) setCapabilityReadFailed(true);
    });
    return () => controller.abort();
  }, [hosted]);
  // Private preview controls are not evidence of deployed capabilities.
  const inspirationEnabled = !hosted || hostedCapabilities?.inspiration === true;
  const multiOutputEnabled = !hosted || hostedCapabilities?.multiOutput === true;
  const negativeConditioningEnabled = !hosted || hostedCapabilities?.negativeConditioning === true;
  const masksEnabled = configuredMasksEnabled && (!hosted || hostedCapabilities?.mask === true);
  const generatedVglNotice = hostedCapabilities?.generatedVglNotice ?? "Generated VGL availability is not confirmed. Manual VGL JSON is the supported workspace input.";
  const inspirationNotice = "Text-to-image inspiration is unavailable. Use Image Editing to attach images.";
  const bookmarkKey = hostedModel && hostedAccountKey ? "renderlab:hosted-fibo-stage:" + hostedAccountKey
    : admitted && savedEditsAccount ? "renderlab:wf-stage:" + savedEditsAccount : undefined;
  const [stageReady, setStageReady] = useState(!bookmarkKey);
  const [mode, setMode] = useState<Workflow>("edit");
  const [editAspectRatio, setEditAspectRatio] = useState<AspectRatio>("original");
  const [continuationPending, setContinuationPending] = useState(!!initialContinuation);
  const [continuationError, setContinuationError] = useState(initialContinuationError);
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
  const workspaceRoot = useRef<HTMLElement>(null);
  const maskWasOpen = useRef(false);
  const restoreMaskFocus = useRef(false);
  const [maskAnnouncement, setMaskAnnouncement] = useState("");
  const [files, setFiles] = useState<(File | undefined)[]>([]);
  const mask = mode === "edit" && selection?.source === files[0] ? selection?.mask : undefined;
  const [drafts, setDrafts] = useState<Record<Workflow, PromptDraft>>({ edit: emptyDraft, generate: emptyDraft });
  const { prompt: promptDraft, negativePrompt, vgl, generatedVgl, negativeOpen, vglOpen, seed, randomize, imageCount: draftImageCount } = drafts[mode];
  const imageCount = multiOutputEnabled ? draftImageCount : "1";
  let missingPromptImage = false;
  const prompt = promptDraft.replace(slotMarkers, (_, slot: string) => {
    const index = Number(slot);
    if (!files[index]) missingPromptImage = true;
    return imageTag(index);
  });
  // Legacy workers can return VGL, but cannot accept it back as a manual instruction.
  const manualVgl = (hosted || !advancedPrompt) && generatedVgl ? "" : vgl.trim();

  function updateDraft(workflow: Workflow, patch: Partial<PromptDraft>) {
    setDrafts((previous) => ({ ...previous, [workflow]: { ...previous[workflow], ...patch } }));
  }

  function setPrompt(value: string) {
    updateDraft(mode, { prompt: value, vgl: "", generatedVgl: false });
  }

  function setReference(file?: File) {
    if (file && !inspirationEnabled) return;
    setInspiration(file);
    updateDraft("generate", { vgl: "", generatedVgl: false });
  }
  const [steps, setSteps] = useState(4);
  const [previews, setPreviews] = useState<(string | undefined)[]>([]);
  const [resultActions, setResultActions] = useState<HTMLDivElement | null>(null);
  const [desktop, setDesktop] = useState(false);
  const [advancedSheetOpen, setAdvancedSheetOpen] = useState(false);
  const [advancedOffset, setAdvancedOffset] = useState(0);
  const advancedClosing = useRef(false);
  const [, advancedSpring] = useSpring(() => ({ offset: 0 }), []);
  function changeAdvancedOpen(next: boolean) {
    if (next) {
      advancedClosing.current = false;
      advancedSpring.stop();
      setAdvancedOffset(reducedMotion ? 0 : 100);
      setAdvancedSheetOpen(true);
    } else if (reducedMotion) {
      advancedSpring.stop();
      advancedClosing.current = false;
      setAdvancedOffset(0);
      setAdvancedSheetOpen(false);
    } else if (!advancedClosing.current) {
      advancedClosing.current = true;
      void advancedSpring.start({ to: { offset: 100 }, ...springOptions("smooth", false),
        onChange: result => setAdvancedOffset(result.value.offset),
        onRest: result => {
          if (result.finished && advancedClosing.current) {
            advancedClosing.current = false;
            setAdvancedSheetOpen(false);
          }
        } });
    }
  }
  // Start after the open state has committed. Drive the actual Sheet's style
  // declaratively so a delayed portal/ref mount cannot leave it offscreen.
  useEffect(() => {
    if (!advancedSheetOpen) return;
    if (reducedMotion) {
      advancedSpring.stop();
      advancedSpring.set({ offset: 0 });
      setAdvancedOffset(0);
      if (advancedClosing.current) {
        advancedClosing.current = false;
        setAdvancedSheetOpen(false);
      }
      return;
    }
    void advancedSpring.start({ from: { offset: 100 }, to: { offset: 0 }, reset: true,
      ...springOptions("smooth", false),
      onChange: result => setAdvancedOffset(result.value.offset),
      onRest: result => { if (result.finished && !advancedClosing.current) setAdvancedOffset(0); } });
    return () => { advancedSpring.stop(); };
  }, [advancedSheetOpen, reducedMotion, advancedSpring]);
  useEffect(() => {
    const query = matchMedia("(min-width: 701px)");
    const closeOnWide = () => {
      if (!query.matches) return;
      advancedSpring.stop();
      advancedClosing.current = false;
      setAdvancedOffset(0);
      setAdvancedSheetOpen(false);
    };
    query.addEventListener("change", closeOnWide);
    return () => query.removeEventListener("change", closeOnWide);
  }, [advancedSpring]);
  useEffect(() => {
    const query = matchMedia("(min-width: 1025px)");
    const update = () => setDesktop(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const [busy, setBusy] = useState(false);
  const queue = useRef<HTMLButtonElement>(null);
  const [toolbarPopover, setToolbarPopover] = useState<CreateToolbarPopover>(null);
  const preparing = useRef<AbortController | null>(null);
  const [enqueueing, setEnqueueing] = useState(false);
  const [activeCancel, setActiveCancel] = useState<{ id: string; pending: boolean }>();
  const [sendingCancel, setSendingCancel] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [waiting, setWaiting] = useState<QueuedRender[]>([]);
  const [waitingReady, setWaitingReady] = useState(false);
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
  const matchesImage = (image: Result, item: Result) => image.batchId === item.batchId && image.filename === item.filename;
  const history = [...sessionHistory.map((image) => image.run ? image : savedEdits.find((item) => matchesImage(image, item)) ?? image),
    ...savedEdits.filter((item) => !sessionHistory.some((image) => matchesImage(image, item)))];
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
    void readSavedEdits<Result>(savedEditsAccount).then((rows) => {
      if (current) setSavedEdits(rows);
    }).catch(() => { if (current) setSavedStatus("Saved edits could not be opened."); });
    return () => { current = false; };
  }, [admitted, savedEditsAccount]);

  useEffect(() => {
    if (!admitted || !savedEditsAccount || !stageReady) return;
    const controller = new AbortController();
    // Restoring the selected stage takes priority over parsing the full archive.
    const loadHistory = () => {
      void request<{ id: string; images: Result[] }[]>("local/history", { signal: controller.signal })
        .then((runs) => {
          if (controller.signal.aborted || !Array.isArray(runs)) return;
          setHistory((current) => {
            const present = new Set(current.map((item) => item.batchId));
            return [...current, ...runs.flatMap(({ id, images }) => present.has(id) ? []
              : images.map((image) => ({ ...image, batchId: id })))];
          });
        }).catch(() => {
          if (!controller.signal.aborted) setSavedStatus("Local History could not be opened.");
        });
    };
    const useIdle = typeof window.requestIdleCallback === "function";
    const task = useIdle ? window.requestIdleCallback(loadHistory, { timeout: 750 }) : window.setTimeout(loadHistory, 0);
    return () => {
      if (useIdle) window.cancelIdleCallback(task);
      else window.clearTimeout(task);
      controller.abort();
    };
  }, [admitted, savedEditsAccount, stageReady]);

  useEffect(() => {
    if (!hostedModel) return;
    const controller = new AbortController();
    void hostedRequest<{ items: PublicMediaAsset[] }>("/api/media/assets?kind=image&origin=generated&limit=48", { signal: controller.signal })
      .then(({ items }) => {
        if (controller.signal.aborted) return;
        const rows = items.filter((asset) => asset.model === hostedModel.label).map(hostedResult);
        setHistory((current) => [...current, ...rows.filter((row) => !current.some((item) => item.assetId === row.assetId))].slice(0, 8));
      })
      .catch(() => { if (!controller.signal.aborted) setSavedStatus("Hosted History could not be loaded."); });
    return () => controller.abort();
  }, [hostedModel]);

  async function saveEdit(image?: Result) {
    if (!admitted || !savedEditsAccount || savingEdits || image && image.run?.mode !== "edit") return;
    if (!image && !window.confirm("Remove this account's saved edits from this browser? Current session results will stay until you leave.")) return;
    setSavingEdits(true);
    try {
      if (image) {
        const batch = image.batchId ? history.filter((item) => item.batchId === image.batchId) : [];
        setSavedEdits(await saveEdits(savedEditsAccount, batch.length ? batch : [image]));
        setSavedStatus("Edit saved in this browser.");
      } else {
        await clearSavedEdits(savedEditsAccount);
        setResult((previous) => previous && !sessionHistory.includes(previous) ? undefined : previous);
        setSavedEdits([]);
        setSavedStatus("Saved edits cleared from this browser.");
      }
    } catch {
      setSavedStatus("Could not update saved edits. Check available browser storage.");
    } finally { setSavingEdits(false); }
  }
  const [recent, setRecent] = useState<string[]>([]);
  const [sizeIndex, setSizeIndex] = useState(() => Math.max(0, hostedRatios.indexOf(initialAspectRatio)));
  const [inspiration, setInspiration] = useState<File>();
  const [inspirationPreview, setInspirationPreview] = useState<string>();
  const size = previewImageSizes[sizeIndex] ?? previewImageSizes[0];
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
  const sourceLoad = useRef<AbortController | null>(null);
  const sourceAssets = useRef(new WeakMap<File, GenerationInput["source"]>());

  const [resuming, setResuming] = useState<StageBookmark>();
  useEffect(() => () => {
    preparing.current?.abort();
    sourceLoad.current?.abort();
    active.current?.abort();
    active.current = null;
  }, []);
  useEffect(() => {
    const urls = files.map((file) => file ? URL.createObjectURL(file) : undefined);
    setPreviews(urls);
    return () => urls.forEach((url) => { if (url) URL.revokeObjectURL(url); });
  }, [files]);

  // Explicit navigation waits for any bookmarked in-flight render to settle.
  // Do not let a restored result overwrite the requested draft or re-upload owned files.
  useEffect(() => {
    if (!initialContinuation || !continuationPending || !stageReady || busy) return;
    const controller = new AbortController();
    void loadContinuationFiles(initialContinuation, controller.signal, async (reference, signal) => {
      if (reference.source.type === "media-asset") {
        return loadCreateResultSource({ assetId: reference.source.id, image_data: "", filename: reference.label }, signal, isMediaUploadMimeType);
      }
      const response = await fetch("/api/assets/reference/" + encodeURIComponent(reference.source.id) + "/content?source=1", { signal, cache: "no-store" });
      if (!response.ok) throw new Error("Reference is unavailable.");
      const blob = await response.blob();
      if (!blob.size || !isMediaUploadMimeType(blob.type)) throw new Error("Invalid reference image.");
      return new File([blob], reference.label, { type: blob.type });
    }).then((loaded) => {
      if (controller.signal.aborted) return;
      for (const { source, file } of loaded) sourceAssets.current.set(file, source);
      setFiles(loaded.map(({ file }) => file));
      setResult(undefined);
      setSelection(undefined);
      setMode(initialContinuation.mode);
      setEditAspectRatio(initialContinuation.mode === "edit" ? initialContinuation.aspectRatio : "original");
      if (initialContinuation.aspectRatio !== "original") setSizeIndex(Math.max(0, hostedRatios.indexOf(initialContinuation.aspectRatio)));
      setSteps(initialContinuation.steps);
      updateDraft(initialContinuation.mode, {
        prompt: initialContinuation.prompt, seed: initialContinuation.seed, randomize: initialContinuation.randomize,
        negativePrompt: initialContinuation.negativePrompt, negativeOpen: !!initialContinuation.negativePrompt,
        vgl: initialContinuation.vgl, vglOpen: !!initialContinuation.vgl, generatedVgl: false, imageCount: "1",
      });
      setStatus(initialContinuation.references.length ? "Source image attached." : "Saved settings loaded.");
      setContinuationPending(false);
    }).catch(() => {
      if (controller.signal.aborted) return;
      setContinuationError("Saved source images could not be opened. Return to Library or start a new creation.");
      setContinuationPending(false);
    });
    return () => controller.abort();
  }, [initialContinuation, continuationPending, stageReady, busy]);

  function resultFile(image: { image_data: string; filename?: string }) {
    const bytes = Uint8Array.from(atob(image.image_data.split(",")[1]), (ch) => ch.charCodeAt(0));
    return new File([bytes], image.filename ?? "result.png", { type: "image/png" });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || sourceLoad.current || preparing.current || (!desktop && active.current)) return;
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
    if (stageSource && !stageSource.assetId) {
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
      let acceptedId = job;
      const uploads: Record<string, string> = {};
      if (hostedModel) {
        const inputs: GenerationInput[] = [];
        const aliases = new Map<number, string>();
        if (mode === "edit") {
          for (const [index, file] of editInputs.entries()) {
            const existing = file ? sourceAssets.current.get(file) : index === 0 && stageSource?.assetId ? { type: "media-asset" as const, id: stageSource.assetId } : undefined;
            if (!existing && !file) continue;
            let source = existing;
            if (!source && file) {
              if (!isMediaUploadMimeType(file.type)) throw new Error("Use a PNG, JPEG or WebP image.");
              source = { type: "media-asset", id: (await uploadPersistentImageFile(file, file.type, signal)).id };
            }
            if (!source) throw new Error("Source image could not be attached.");
            const alias = ("image" + (inputs.length + 1)) as GenerationInput["alias"];
            aliases.set(index + 1, alias);
            inputs.push({ alias, role: inputs.length === 0 ? "primary-image" : "reference", source });
          }
        }
        const hostedPrompt = prompt.trim().replace(/@image(\d+)/g, (original, index: string) => {
          const alias = aliases.get(Number(index));
          return alias ? "@" + alias : original;
        });
        let hostedVgl: string | undefined;
        if (manualVgl) {
          const slotAliases = [...aliases.keys()].map((index) => "image" + index);
          const normalized = normalizeFiboVgl(manualVgl, slotAliases);
          if (!normalized) throw new Error("Enter valid VGL JSON using only attached image references.");
          // Resolve named source-slot tags before the API compacts the inputs.
          hostedVgl = [...aliases].some(([index, alias]) => alias !== "image" + index)
            ? resolveFiboVglReferences(normalized, slotAliases) : normalized;
        }
        const hostedMask = mode === "edit" && mask ? await uploadFiboMaskFile(mask, signal) : undefined;
        const response = await hostedRequest<{ job: GenerationJob }>("/api/generation/jobs", {
          method: "POST", signal, headers: { "content-type": "application/json" },
          body: JSON.stringify({ model: hostedModel.id, prompt: hostedPrompt, inputs,
            ...(hostedVgl ? { vgl: hostedVgl } : {}),
            ...(hostedMask ? { mask: hostedMask } : {}),
            output: { kind: "image", aspectRatio: mode === "edit" ? editAspectRatio : hostedRatios[sizeIndex] },
            advanced: { steps, negativePrompt: negativeConditioningEnabled ? negativePrompt.trim() : "",
              seed: randomize ? (crypto.getRandomValues(new Uint32Array(1))[0]! & 0x7fffffff) : Number(seed) } }),
        });
        if (!hostedJobId.test(response.job.id)) throw new Error("Hosted job ID was invalid.");
        acceptedId = response.job.id;
      } else {
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
      }
      const run: RunSettings = {
        mask,
        mode, prompt: prompt.trim(), negativePrompt: negativePrompt.trim(), vgl: manualVgl, steps, imageCount, sizeIndex, editAspectRatio,
        inputs: mode === "edit" ? editInputs : [],
      };
      if (!hostedModel) await request("local/" + mode, { method: "POST", signal, headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...uploads, job_id: job, instruction: prompt.trim(), negative_prompt: negativePrompt.trim(), json_instruction: manualVgl,
          seed: Number(seed), randomize, steps, image_count: Number(imageCount), width: size.width, height: size.height }) });
      if (!background) setStatus("Rendering on Modal...");
      const aspect = mode === "generate" || editAspectRatio !== "original" ? size.width / size.height
        : previews[0] ? await decodeAspect(previews[0]).catch(() => undefined) : stageSource?.aspect;
      const bookmark: StageBookmark = { id: acceptedId, mode, count: Number(imageCount), aspect, expires: Date.now() + 55 * 60_000 };
      if (signal.aborted) return;
      if (background) {
        setWaiting((items) => [...items, { bookmark, run }]);
        setQueueNotice("Added to Queue.");
        return;
      }
      setAccepted(true);
      if (desktop || hostedModel) writeStageBookmark(bookmarkKey, bookmark);
      const { images, error } = await watchRender(bookmark, signal, run);
      if (signal.aborted) return;
      finishTurn(images, error);
      const image = images[0];
      if (!hosted && typeof image.json_instruction === "string" && image.json_instruction.trim()) {
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

  async function pollHostedRender(id: string, signal: AbortSignal): Promise<Poll> {
    if (!hostedJobId.test(id)) throw new Error("Hosted job ID was invalid.");
    const { job } = await hostedRequest<{ job: GenerationJob }>("/api/generation/jobs/" + id, { signal });
    if (job.status === "succeeded") {
      const assets = await Promise.all(job.outputAssetIds.map(async (assetId) => {
        const { asset } = await hostedRequest<{ asset: PublicMediaAsset }>("/api/media/assets/" + assetId, { signal });
        return hostedResult(asset);
      }));
      return { finished: true, images: assets };
    }
    if (job.status === "failed" || job.status === "cancelled") {
      return { finished: true, images: [], error: job.error?.message ?? (job.status === "cancelled" ? "Render cancelled." : "Render failed.") };
    }
    return { finished: false, images: [], state: job.status === "queued" ? "pending" : "running",
      cancelling: job.status === "cancelling", canCancel: ["queued", "preparing", "running", "cancelling"].includes(job.status) };
  }

  async function watchRender(bookmark: StageBookmark, signal: AbortSignal, run?: RunSettings, restoring = false) {
    setActiveCancel(undefined);
    setCancelError("");
    const end = Date.now() + 24 * 60_000;
    let images: Result[] = [];
    let recoveringInspection = restoring && !!bookmark.filename;
    try {
      while (!signal.aborted && Date.now() < end) {
        const update = hostedModel
          ? await pollHostedRender(bookmark.id, signal)
          : await request<Poll>("local/render/" + bookmark.id + "?afterImages=" + images.length, { signal });
        if (signal.aborted) throw new Error("Render polling stopped.");
        setActiveCancel(!update.finished && update.canCancel ? { id: bookmark.id, pending: !!update.cancelling } : undefined);
        if (!update.finished) {
          if (update.state === "pending") setStatus("Waiting in Queue…");
          else if (update.state === "running") setStatus("Rendering on Modal...");
          setLiveFrame(update.preview);
          setLiveBlur(update.previewBlur);
          setLiveCaption(update.cancelling ? "Cancelling…" : update.caption);
        }
        const newImages = update.images.slice(Math.max(0, images.length - (update.imageOffset ?? 0)));
        if (newImages.length) {
          images = [...images, ...newImages.map((image) => ({
            ...image, batchId: bookmark.id, run, source: run?.inputs[0],
          }))];
          setRunningBatch(images);
        }
        if (update.finished) {
          setCancelError("");
          if (!images[0]) throw new Error(update.error ?? "No image returned.");
          // Decode the bookmarked image before replacing the live/previous view or changing its aspect.
          const remembered = bookmarkKey ? readStageBookmark(bookmarkKey) : bookmark;
          const filename = remembered?.id === bookmark.id ? remembered.filename : undefined;
          const selected = images.find((image) => filename && image.filename === filename) ?? images[0];
          const displayed = { ...selected, aspect: await decodeAspect(selected.image_data) };
          if (signal.aborted) throw new Error("Render polling stopped.");
          images = images.map((image) => image === selected ? displayed : image);
          setResult((previous) => previous?.batchId === bookmark.id && previous !== selected ? previous : displayed);
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
        if (recoveringInspection) {
          recoveringInspection = false;
          const previous = images.find((image) => image.filename === bookmark.filename);
          if (previous) {
            const aspect = await decodeAspect(previous.image_data).catch(() => undefined);
            if (signal.aborted) throw new Error("Render polling stopped.");
            if (aspect) {
              const restored = { ...previous, aspect };
              images = images.map((image) => image === previous ? restored : image);
              setRunningBatch(images);
              setInspected(restored);
              setResult(restored);
            }
          }
        }
        if (restoring) setStageReady(true);
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      throw new Error("Render status did not return before the local timeout.");
    } finally {
      if (!signal.aborted) {
        setActiveCancel(undefined);
        setLiveFrame(undefined);
        setLiveBlur(undefined);
        setLiveCaption(undefined);
      }
    }
  }

  useEffect(() => {
    if (!bookmarkKey || (!hostedModel && !matchMedia("(min-width: 1025px)").matches)) {
      setStageReady(true);
      return;
    }
    const bookmark = readStageBookmark(bookmarkKey);
    setWaiting(readWaiting(bookmarkKey, bookmark?.id));
    setWaitingReady(true);
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
    void watchRender(bookmark, controller.signal, undefined, true).catch((cause: unknown) => {
      if (!controller.signal.aborted) {
        writeStageBookmark(bookmarkKey);
        setStatus(cause instanceof Error && cause.message !== "Job not found."
          ? cause.message : "The previous render is no longer available.");
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
    if (!bookmarkKey || !waitingReady) return;
    try {
      const key = bookmarkKey + ":waiting";
      if (waiting.length) sessionStorage.setItem(key, JSON.stringify(waiting.map(({ bookmark }) => bookmark)));
      else sessionStorage.removeItem(key);
    } catch { /* A blocked storage policy does not affect the accepted jobs. */ }
  }, [bookmarkKey, waiting, waitingReady]);

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
    setMode(next.bookmark.mode);
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

  async function cancelActiveRender() {
    if (!activeCancel || activeCancel.pending || sendingCancel) return;
    setSendingCancel(true);
    setCancelError("");
    setQueueNotice("");
    try {
      if (hostedModel) await hostedRequest("/api/generation/jobs/" + activeCancel.id + "/cancel", { method: "POST" });
      else await request("local/queue/" + activeCancel.id + "/cancel", { method: "POST" });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Could not cancel this render.";
      setQueueNotice(message);
      setCancelError(message);
    } finally {
      setSendingCancel(false);
    }
  }

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
    setSizeIndex(run.sizeIndex);
    setEditAspectRatio(run.editAspectRatio ?? "original");
    setSteps(run.steps);
    updateDraft(run.mode, {
      prompt: run.prompt, negativePrompt: run.negativePrompt, vgl: run.vgl,
      generatedVgl: false, seed: String(image.seed), randomize: false, imageCount: run.imageCount,
    });
    requestAnimationFrame(() => document.getElementById("create-preview-prompt")?.focus({ preventScroll: true }));
  }

  function chooseImage(index: number) {
    if (!admitted || busy || (index === 4 && !inspirationEnabled)) return;
    slot.current = index;
    picker.current?.click();
  }

  function attachImage(file: File, index: number) {
    if (!admitted || busy) return;
    if (index === 0 && sourceLoad.current) {
      sourceLoad.current.abort();
      sourceLoad.current = null;
      setStatus("");
    }
    setMaskEditor(undefined);
    if (index === 0) {
      setEditAspectRatio("original");
      if (desktop && !busy) writeStageBookmark(bookmarkKey);
      setSelection(undefined);
      setMode("edit");
      setResult(undefined);
    }
    updateDraft("edit", { vgl: "", generatedVgl: false });
    setFiles((previous) => { const next = [...previous]; next[index] = file; return next; });
  }

  const promptEditor = useRef<HTMLDivElement>(null);
  const promptRange = useRef<Range | null>(null);
  const editorValue = useRef<string | null>(null);
  const richPrompt = desktop && mode === "edit";
  const promptDisabled = !admitted || (busy && !desktop);
  const placeholder = mask ? "Describe what to change in the masked area…" : "Describe the result you want…";

  function makeChip(index: number) {
    const chip = document.createElement("span");
    chip.className = "create-preview-prompt-chip";
    chip.contentEditable = "false";
    chip.dataset.slot = String(index);
    chip.textContent = files[index] ? imageTag(index) : "<image_" + (index + 1) + ">";
    return chip;
  }

  useLayoutEffect(() => {
    const editor = promptEditor.current;
    if (!editor) {
      editorValue.current = null;
      promptRange.current = null;
      return;
    }
    if (editorValue.current !== promptDraft) {
      const parts = promptDraft.split(slotMarkers);
      editor.replaceChildren(...parts.map((part, i) => i % 2 ? makeChip(Number(part)) : document.createTextNode(part)));
      editorValue.current = promptDraft;
      promptRange.current = null;
    }
    for (const chip of editor.querySelectorAll<HTMLElement>("[data-slot]")) {
      const index = Number(chip.dataset.slot);
      const missing = !files[index];
      chip.toggleAttribute("data-missing", missing);
      chip.title = missing ? "Upload this image again or delete this tag." : "";
      const label = missing ? "<image_" + (index + 1) + ">" : imageTag(index);
      if (!missing || !chip.textContent) {
        if (chip.textContent !== label) chip.textContent = label;
      }
    }
  });

  useEffect(() => {
    if (!richPrompt) return;
    const remember = () => {
      const selected = window.getSelection();
      if (!selected?.rangeCount) return;
      const range = selected.getRangeAt(0);
      if (promptEditor.current?.contains(range.commonAncestorContainer)) promptRange.current = range.cloneRange();
    };
    document.addEventListener("selectionchange", remember);
    return () => document.removeEventListener("selectionchange", remember);
  }, [richPrompt]);

  function readPromptEditor() {
    const editor = promptEditor.current;
    if (!editor) return;
    // Serialize text and chip identities, not editable HTML or current alias numbers.
    function read(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? "").replace(/[\uE000\uE001]/g, "");
      if (!(node instanceof HTMLElement)) return "";
      if (node.dataset.slot && /^[0-3]$/.test(node.dataset.slot)) return slotMarker(Number(node.dataset.slot));
      if (node.tagName === "BR") return "\n";
      let value = "";
      for (const child of node.childNodes) {
        if (child instanceof HTMLElement && ["DIV", "P"].includes(child.tagName) && value && !value.endsWith("\n")) value += "\n";
        value += read(child);
      }
      return value;
    }
    const value = read(editor).replaceAll("\u00a0", " ");
    const limited = value.slice(0, 4000).replace(/\uE000[0-3]?$/, "");
    editorValue.current = limited === value ? value : null;
    setPrompt(limited);
    if (value !== limited && limited === promptDraft) {
      editor.replaceChildren(...limited.split(slotMarkers).map((part, i) => i % 2 ? makeChip(Number(part)) : document.createTextNode(part)));
      editorValue.current = limited;
    }
  }
  const recentMenu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (!desktop) return;
    const closeOutside = (event: PointerEvent) => {
      const menu = recentMenu.current;
      if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) menu.open = false;
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [desktop]);
  const tileDragType = "application/x-renderlab-image-slot";

  function imageTag(index: number) {
    return "<image_" + files.slice(0, index + 1).filter(Boolean).length + ">";
  }

  function insertImageTag(index: number) {
    const editor = promptEditor.current;
    const selection = window.getSelection();
    if (!editor || !selection || promptDisabled || !files[index]) return;
    const prior = promptRange.current;
    const range = prior && editor.contains(prior.commonAncestorContainer) ? prior : document.createRange();
    if (range !== prior) { range.selectNodeContents(editor); range.collapse(false); }
    editor.focus({ preventScroll: true });
    selection.removeAllRanges();
    selection.addRange(range);
    // Native editing keeps insertion and its trailing space in one undo operation.
    document.execCommand("insertHTML", false, makeChip(index).outerHTML + "&nbsp;");
    readPromptEditor();
  }
  function uploadDropTarget(target: number | "canvas") {
    if (!inspirationEnabled && (target === 4 || (target === "canvas" && mode === "generate"))) return {
      onDragOver: rejectUnavailableInspirationDrop,
      onDrop: rejectUnavailableInspirationDrop,
    };
    return {
      "data-drag-over": admitted && !busy && dragTarget === target ? "true" : undefined,
      onDragOver(event: DragEvent<HTMLElement>) {
        const swap = desktop && typeof target === "number" && target < 4 && !!files[target]
          && event.dataTransfer.types.includes(tileDragType);
        if (!swap && !event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = admitted && !busy ? (swap ? "move" : "copy") : "none";
        if (admitted && !busy) setDragTarget(target);
      },
      onDragLeave(event: DragEvent<HTMLElement>) {
        if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
        setDragTarget((current) => current === target ? undefined : current);
      },
      onDrop(event: DragEvent<HTMLElement>) {
        event.preventDefault();
        setDragTarget(undefined);
        if (!admitted || busy) return;
        const from = event.dataTransfer.getData(tileDragType);
        if (from) {
          if (!desktop || typeof target !== "number" || target >= 4 || !/^[0-3]$/.test(from)) return;
          const index = Number(from);
          if (index === target || !files[index] || !files[target]) return;
          if (index === 0 || target === 0) {
            setEditAspectRatio("original");
            setSelection(undefined);
            setResult(undefined);
            writeStageBookmark(bookmarkKey);
          }
          setMaskEditor(undefined);
          updateDraft("edit", { vgl: "", generatedVgl: false });
          setFiles((previous) => {
            const next = [...previous];
            [next[index], next[target]] = [next[target], next[index]];
            return next;
          });
          setStatus("Input images swapped.");
          return;
        }
        const file = event.dataTransfer.files[0];
        if (desktop && event.dataTransfer.files.length > 1) {
          setStatus("Drop one image at a time.");
          return;
        }
        if (!file?.type.startsWith("image/")) return;
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
  const hostedBlocker = hosted && !hostedModel
    ? "Image generation is not available for this account right now."
    : hosted && !hostedCapabilities?.ready
      ? capabilityReadFailed ? "Could not verify generation availability. Reload Create to try again."
        : hostedCapabilities ? "FIBO generation is currently unavailable." : "Checking generation availability…"
      : "";
  const blocker = hostedBlocker || (!admitted ? "Sign in with an account that has Create access."
    : needsUpgrade ? "Reference images and non-square renders need the private worker update."
    : !variableSteps && steps !== 4 ? "The current worker supports 4 steps. Select 4 to generate."
    : mode === "edit" && !files[0] && !result ? "Add a source image to edit."
    : mask && files.slice(1).some(Boolean) ? "Remove references to use a mask."
    : mask && !masksEnabled ? "Masked edits are not enabled on the current worker."
    : !vglValid ? "Enter a non-empty VGL JSON object."
    : !advancedPrompt && (manualVgl || (negativeConditioningEnabled && negativePrompt.trim())) ? "Advanced prompts are unavailable on the current worker."
    : !manualVgl && missingPromptImage ? "Restore the missing image or remove its prompt tag."
    : !manualVgl && !prompt.trim() ? "Enter a prompt or VGL JSON to generate."
    : !/^[1-4]$/.test(imageCount) ? "Choose 1 to 4 images."
    : !seedValid ? "Enter a seed from 0 to 2147483647."
    : "");
  const canSubmit = stageReady && !continuationPending && !enqueueing && (!busy || !hostedModel && desktop && accepted && queueCount < 3) && !maskEditor && !blocker;
  const maskOpen = !!(maskEditor && mode === "edit" && files[0] && previews[0]);
  function closeMaskEditor(announcement = "Mask changes cancelled.") {
    setMaskAnnouncement(announcement);
    restoreMaskFocus.current = true;
    setMaskEditor(undefined);
  }
  useEffect(() => {
    if (maskOpen) { maskWasOpen.current = true; return; }
    if (!maskWasOpen.current) return;
    maskWasOpen.current = false;
    const explicit = restoreMaskFocus.current;
    restoreMaskFocus.current = false;
    const frame = requestAnimationFrame(() => {
      const root = workspaceRoot.current;
      if (!root || (!explicit && document.activeElement !== document.body && document.activeElement?.isConnected)) return;
      // The inline trigger remounts after the editor; a viewer trigger may have disappeared.
      const candidates = [
        ...root.querySelectorAll<HTMLElement>("[data-create-mask-trigger]"),
        root.querySelector<HTMLElement>("#create-preview-prompt"),
        root.querySelector<HTMLElement>('[aria-label="Image Editing"]'),
        root.querySelector<HTMLElement>('[aria-label="Text to Image"]'),
      ];
      const target = candidates.find((node) => node?.isConnected && node.getClientRects().length
        && getComputedStyle(node).visibility === "visible"
        && !node.matches(":disabled,[aria-disabled=true]") && !node.closest("dialog:not([open]),[inert]"));
      (target ?? root).focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [maskOpen]);
  const maskEditorNode = maskEditor && mode === "edit" && files[0] && previews[0] && (
    <CreatePreviewMaskEditor source={previews[0]} mask={mask} enabled={masksEnabled} inline={maskEditor === "inline"} onClose={closeMaskEditor}
      onSave={(region) => {
        setSelection(region ? { source: files[0]!, mask: region } : undefined);
        updateDraft("edit", { vgl: "", generatedVgl: false });
        closeMaskEditor(region ? "Mask saved." : "Mask cleared.");
      }} />
  );

  // These controlled fields have a single draft owner. Move the existing fields
  // into the modal while open; legacy inline access stays until the phone contract
  // can replace the existing continuation/reflow acceptance paths.
  const structuredFields = (<div className="create-preview-extra" key={mode}>
              <details open={negativeOpen} onToggle={(event) => {
                if (event.currentTarget.open !== negativeOpen) updateDraft(mode, { negativeOpen: event.currentTarget.open });
              }}>
                <summary id="create-preview-negative-label">Negative prompt{!negativeConditioningEnabled && " · unavailable"}</summary>
                {!negativeConditioningEnabled && <p id="create-preview-negative-unavailable" className="create-preview-caption">FIBO Edit Turbo does not apply independent negative conditioning. Saved negative prompts are shown for reference only and are not sent.</p>}
                <Textarea aria-labelledby="create-preview-negative-label" rows={3} maxLength={4000} spellCheck autoCorrect="on"
                  placeholder="What should the image avoid?" value={negativePrompt} disabled={busy || !negativeConditioningEnabled}
                  aria-describedby={!negativeConditioningEnabled ? "create-preview-negative-unavailable" : undefined}
                  onChange={(event) => updateDraft(mode, { negativePrompt: event.target.value })} />
              </details>
              <details open={vglOpen} onToggle={(event) => {
                if (event.currentTarget.open !== vglOpen) updateDraft(mode, { vglOpen: event.currentTarget.open });
              }}>
                <summary id="create-preview-vgl-label">{hosted ? "Manual VGL JSON" : "VGL JSON"}</summary>
                {hosted && <p className="create-preview-caption">{generatedVglNotice}</p>}
                <Textarea aria-labelledby="create-preview-vgl-label" className="create-preview-vgl" rows={5} maxLength={8192} spellCheck={false} autoCorrect="off" autoCapitalize="off"
                  placeholder="Enter VGL JSON…" value={vgl} disabled={busy} aria-invalid={!vglValid}
                  title={!vglValid ? "Enter a non-empty JSON object." : undefined}
                  aria-describedby={!vglValid ? "create-preview-vgl-invalid" : undefined}
                  onChange={(event) => updateDraft(mode, { vgl: event.target.value, generatedVgl: false })} />
                {!vglValid && <span id="create-preview-vgl-invalid" className="sr-only">Enter a non-empty JSON object.</span>}
              </details>
            </div>);
  const seedField = (<div className="create-preview-render-field">
                <label htmlFor="create-preview-seed">Seed</label>
                <div className="create-preview-seed">
                  <Input id="create-preview-seed" type="text" inputMode="numeric" spellCheck={false} autoCorrect="off" autoCapitalize="off" maxLength={10}
                    required={!randomize} value={seed} disabled={busy || randomize} onChange={(event) => updateDraft(mode, { seed: event.target.value })} />
                  <label className="create-preview-seed-dice" title="Randomize seed each time">
                    <Input type="checkbox" aria-label="Randomize seed each time" checked={randomize} disabled={busy}
                      onChange={(event) => updateDraft(mode, { randomize: event.target.checked })} />
                    <Dice5 aria-hidden="true" />
                  </label>
                </div>
              </div>);
  const stepsField = (<label className="create-preview-steps" htmlFor="create-preview-steps">
                <span>Steps <output htmlFor="create-preview-steps">{steps}</output></span>
                <Input id="create-preview-steps" type="range" min={1} max={8} step={1} value={steps}
                  disabled={busy}
                  title={variableSteps ? undefined : "The current worker renders at 4 steps"}
                  onChange={(event) => setSteps(event.target.valueAsNumber)} />
              </label>);
  function resetAdvanced() {
    if (busy) return;
    updateDraft(mode, { seed: emptyDraft.seed, randomize: emptyDraft.randomize,
      negativePrompt: emptyDraft.negativePrompt, negativeOpen: emptyDraft.negativeOpen,
      vgl: emptyDraft.vgl, vglOpen: emptyDraft.vglOpen, generatedVgl: false });
    setSteps(4);
  }

  return (
    <section ref={workspaceRoot} tabIndex={-1} className="create-preview-workspace mx-auto w-full" aria-label="Create with FIBO">
      <p className="sr-only" role="status" aria-live="polite">{maskAnnouncement}</p>
      <div className="create-preview-toolbar">
        <div className="create-preview-tools">
          <Popover open={toolbarPopover === "queue"} onOpenChange={(open) => setToolbarPopover((current) => nextCreateToolbarPopover(current, "queue", open))}>
            <PopoverTrigger asChild>
              <Button ref={queue} type="button" variant="ghost" className="create-preview-toolbar-trigger"><ListOrdered size={16} aria-hidden="true" /> Queue{queueCount > 0 && <span>{queueCount}</span>}</Button>
            </PopoverTrigger>
            <PopoverContent aria-label="Queue" className="create-preview-toolbar-popover create-preview-queue-jobs">
              <div role="status">{queueNotice || (busy ? status : "No active render in this workspace.")}</div>
              <div className="create-preview-caption">Waiting requests keep their prompt and inputs in this preview until they start, are removed, or expire.</div>
              {busy && activeCancel && <Button type="button" variant="ghost" size="sm"
                disabled={sendingCancel || activeCancel.pending} onClick={() => void cancelActiveRender()}>
                {sendingCancel || activeCancel.pending ? "Cancelling…" : "Cancel active render"}
              </Button>}
              {waiting.map(({ bookmark, run }) => (
                <div className="create-preview-queue-entry" key={bookmark.id}>
                  <span>{run?.prompt || (run ? "VGL edit" : bookmark.mode === "edit" ? "Queued image edit" : "Queued text-to-image render")}</span>
                  <Button type="button" variant="ghost" size="sm"
                    onClick={() => void removeWaiting(bookmark.id)}>Remove waiting render</Button>
                </div>
              ))}
            </PopoverContent>
          </Popover>
          <Popover open={toolbarPopover === "shortcuts"} onOpenChange={(open) => setToolbarPopover((current) => nextCreateToolbarPopover(current, "shortcuts", open))}>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" className="create-preview-toolbar-trigger"><Keyboard size={16} aria-hidden="true" /> Shortcuts</Button>
            </PopoverTrigger>
            <PopoverContent aria-label="Shortcuts" className="create-preview-toolbar-popover create-preview-shortcuts-popover">
              <p>Ctrl + Enter to generate when the form is ready.</p>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      {continuationPending && <p className="create-preview-caption" role="status">Loading saved starting point…</p>}
      {continuationError && <p className="create-preview-caption" role="alert">{continuationError}</p>}
      <div className="create-preview-grid">
        <form inert={continuationPending} className={"create-preview-controls " + phoneStyles.composer} noValidate onSubmit={submit}
          onKeyDown={(event) => {
            if (event.key === "Enter" && event.ctrlKey && !event.nativeEvent.isComposing && canSubmit) {
              event.preventDefault();
              event.currentTarget.requestSubmit();
            }
          }}>
          <div className="create-preview-fields">
            <div className="create-preview-modes" role="group" aria-label="Workflow">
              <animated.span className="create-preview-mode-highlight" aria-hidden="true"
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
            <section aria-labelledby="create-preview-setup">
              <h2 id="create-preview-setup">Image setup</h2>
              <div className="create-preview-setup-slot">
                <div className="create-preview-tiles" inert={mode !== "edit"}>
                  {slots.map((label, index) => (
                    <div className="create-preview-tile" key={label} {...uploadDropTarget(index)}>
                      <Button ref={index === 0 ? sourceButton : undefined} type="button" variant="outline" aria-label={desktop && files[index] ? "Insert " + imageTag(index) + " into prompt" : "Choose " + label.toLowerCase() + " image"}
                        title={desktop && files[index] ? "Insert " + imageTag(index) + " into prompt" : files[index]?.name ?? label}
                        disabled={!admitted || busy} draggable={desktop && !!files[index] && !busy}
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData(tileDragType, String(index));
                        }}
                        onClick={() => desktop && files[index] ? insertImageTag(index) : chooseImage(index)}>
                        {previews[index] ? <img src={previews[index]} alt="" draggable={false} /> : <Plus size={14} aria-hidden="true" />}<span>{label}</span>{desktop && previews[index] && <span aria-hidden="true" className="create-preview-tile-tag">+ {imageTag(index)}</span>}
                      </Button>
                      {files[index] && <Button type="button" variant="secondary" size="icon-sm"
                        className="create-preview-remove" aria-label={"Remove " + label.toLowerCase() + " image"} disabled={busy}
                        onClick={() => {
                          setDrafts((previous) => ({
                            ...previous,
                            edit: {
                              ...previous.edit,
                              prompt: previous.edit.prompt.replaceAll(slotMarker(index) + " ", "").replaceAll(slotMarker(index), ""),
                              vgl: "",
                              generatedVgl: false,
                            },
                          }));
                          if (index === 0) { setEditAspectRatio("original"); setSelection(undefined); if (desktop) { setResult(undefined); writeStageBookmark(bookmarkKey); } }
                          setMaskEditor(undefined);
                          setFiles((previous) => previous.map((file, i) => i === index ? undefined : file));
                        }}><X /></Button>}
                    </div>
                  ))}
                </div>
                <div className="create-preview-size" inert={mode !== "generate"}>
                  {inspirationEnabled ? <div className="create-preview-tile" {...uploadDropTarget(4)}>
                    <Button type="button" variant="outline" disabled={!admitted || busy}
                      aria-label="Choose reference image" onClick={() => chooseImage(4)}>
                      {inspirationPreview ? <img src={inspirationPreview} alt="" draggable={false} /> : <Plus size={14} aria-hidden="true" />}
                      <span>Reference</span>
                    </Button>
                    {inspiration && <Button type="button" variant="secondary" size="icon-sm" className="create-preview-remove"
                      aria-label="Remove reference image" disabled={busy} onClick={() => setReference()}><X /></Button>}
                  </div> : <div className="create-preview-tile" {...uploadDropTarget(4)}><Button type="button" variant="outline" disabled aria-label="Inspiration unavailable" aria-describedby="create-preview-inspiration-unavailable"><span>Inspiration</span></Button></div>}
                  <label className="create-preview-aspect">Aspect ratio
                    <span className="create-preview-aspect-preview" aria-hidden="true"><span style={{ "--create-aspect": size.width / size.height } as CSSProperties} /></span>
                    <NativeSelect size="sm" value={sizeIndex} disabled={busy} onChange={(event) => setSizeIndex(Number(event.target.value))}>
                      {previewImageSizes.map(({ label, width, height }, index) => (
                        <NativeSelectOption key={label} value={index}>{label} · {width} × {height}</NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </label>
                </div>
              </div>
              {mode === "generate" && !inspirationEnabled && <p id="create-preview-inspiration-unavailable" className="create-preview-caption">{inspirationNotice}</p>}
              <input ref={picker} type="file" accept="image/*" hidden onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (file && admitted && !busy) {
                  if (slot.current === 4) setReference(file);
                  else attachImage(file, slot.current);
                }
                event.currentTarget.value = "";
              }} />
            </section>
            <div className="create-preview-prompt-heading">
              <label id="create-preview-main-prompt-label" htmlFor={richPrompt ? undefined : "create-preview-prompt"} onClick={() => { if (richPrompt) promptEditor.current?.focus(); }}>Prompt</label>
              <details ref={recentMenu} className="create-preview-recents" onKeyDown={(event) => {
                if (!desktop || event.key !== "Escape" || !event.currentTarget.open) return;
                event.preventDefault();
                event.currentTarget.open = false;
                event.currentTarget.querySelector("summary")?.focus();
              }}>
                <summary aria-label="Recent prompts" title="Recent prompts"><Clock size={16} aria-hidden="true" /></summary>
                <div>
                  {desktop && <div className="create-preview-recents-heading">
                    <strong>Recent prompts</strong>
                    {recent.length > 0 && <Button type="button" variant="ghost" size="sm" disabled={busy}
                      onClick={() => { setRecent([]); recentMenu.current?.querySelector("summary")?.focus(); }}>Clear</Button>}
                  </div>}
                  {recent.length ? <div className="create-preview-recents-list">
                    {recent.map((value) => <div className="create-preview-recents-row" key={value}>
                      <Button type="button" variant="ghost" disabled={busy} onClick={() => {
                        setPrompt(value);
                        if (recentMenu.current) recentMenu.current.open = false;
                        document.getElementById("create-preview-prompt")?.focus();
                      }}>{value}</Button>
                      {desktop && <Button type="button" variant="ghost" size="icon-sm" disabled={busy}
                        aria-label={"Remove recent prompt: " + value}
                        onClick={() => {
                          setRecent((items) => items.filter((item) => item !== value));
                          recentMenu.current?.querySelector("summary")?.focus();
                        }}><X aria-hidden="true" /></Button>}
                    </div>)}
                  </div> : <p>No recent prompts in this session.</p>}
                </div>
              </details>
            </div>
            {richPrompt ? (
              <div ref={promptEditor} id="create-preview-prompt" className="create-preview-rich-prompt"
                role="textbox" aria-labelledby="create-preview-main-prompt-label" aria-multiline="true"
                aria-disabled={promptDisabled} aria-placeholder={placeholder} data-empty={!promptDraft.trim()}
                contentEditable={!promptDisabled} spellCheck autoCorrect="on"
                onInput={readPromptEditor}
                onPaste={(event) => {
                  event.preventDefault();
                  document.execCommand("insertText", false, event.clipboardData.getData("text/plain").replace(/[\uE000\uE001]/g, ""));
                }}
                onDrop={(event) => event.preventDefault()} />
            ) : (
              <Textarea id="create-preview-prompt" required spellCheck autoCorrect="on" value={prompt} disabled={promptDisabled}
                maxLength={4000} placeholder={placeholder} onChange={(event) => setPrompt(event.target.value)} />
            )}
            {!advancedSheetOpen && structuredFields}
          </div>
          <div className="create-preview-dock">
            <Sheet open={advancedSheetOpen} onOpenChange={changeAdvancedOpen}>
              <SheetTrigger asChild>
                <Button type="button" variant="secondary" size="lg" className={phoneStyles.advancedTrigger}>Advanced</Button>
              </SheetTrigger>
              <SheetContent side="bottom" showCloseButton={false} className={phoneStyles.sheet}
                style={{ transform: `translateY(${reducedMotion ? 0 : advancedOffset}%)` }}
                onCloseAutoFocus={event => {
                  if (matchMedia("(min-width: 701px)").matches) {
                    event.preventDefault();
                    workspaceRoot.current?.querySelector<HTMLElement>("#create-preview-prompt")?.focus();
                  }
                }}>
                <div className={phoneStyles.heading}>
                  <SheetTitle>Advanced</SheetTitle>
                  <SheetClose asChild><Button type="button" variant="ghost" size="lg">Done</Button></SheetClose>
                </div>
                <SheetDescription>Settings for your next image. Mode, shape and references stay in the composer.</SheetDescription>
                <div className={phoneStyles.settings}>
                  {advancedSheetOpen && <>{seedField}{stepsField}{structuredFields}</>}
                </div>
                <Button type="button" variant="secondary" size="lg" disabled={busy} onClick={resetAdvanced}>Reset to defaults</Button>
              </SheetContent>
            </Sheet>
            <div className="create-preview-settings">
              {!advancedSheetOpen && seedField}
              {mode === "edit" && editAspectRatio !== "original" && <span className="create-preview-caption">Saved size: {editAspectRatio}</span>}
              <label className="create-preview-render-field" htmlFor="create-preview-count">Images
                {multiOutputEnabled ? <Input id="create-preview-count" type="number" min={1} max={4} step={1} required value={imageCount}
                  disabled={busy} onChange={(event) => updateDraft(mode, { imageCount: event.target.value })} /> : <Input id="create-preview-count" type="number" value="1" disabled aria-describedby="create-preview-single-output" />}
                {!multiOutputEnabled && <span id="create-preview-single-output" className="create-preview-caption">One image per render.</span>}
              </label>
              {!advancedSheetOpen && stepsField}
            </div>
            <p className="create-preview-caption create-preview-worker-note" role="status">{hostedBlocker || cancelError || (sendingCancel || activeCancel?.pending ? "Cancelling…" : liveCaption ?? status)}</p>
            <span id="create-preview-blocker" className="sr-only">{blocker}</span>
            <div className="create-preview-submit-actions">
              <Button type="submit" className="create-preview-generate" disabled={!canSubmit}
                title={blocker || undefined} aria-describedby={blocker ? "create-preview-blocker" : undefined}>
                <Sparkles aria-hidden="true" />{enqueueing ? "Adding…" : busy ? desktop ? "Queue render" : "Rendering…" : "Generate"}<kbd aria-hidden="true">Ctrl + Enter</kbd>
              </Button>
              {busy && activeCancel && <Button type="button" variant="outline"
                disabled={sendingCancel || activeCancel.pending} onClick={() => void cancelActiveRender()}
                aria-label={sendingCancel || activeCancel.pending ? "Cancelling render" : "Cancel render"}>
                {sendingCancel || activeCancel.pending ? "Cancelling…" : "Cancel"}
              </Button>}
            </div>
          </div>
        </form>
        <section inert={continuationPending && !busy} className="create-preview-canvas" aria-label="Canvas" {...(!desktop && uploadDropTarget("canvas"))}>
            {stageReady && <CreatePreviewStage
              desktopResultActions={desktop ? resultActions : undefined}
              workflow={mode}
              turns={turns[mode]}
              inlineMask={maskEditor === "inline" ? maskEditorNode : undefined}
              browseDisabled={!admitted}
              browseUnavailableReason={mode === "generate" && !inspirationEnabled ? inspirationNotice : undefined}
              maskAction={admitted && mode === "edit" && files[0] && !result && !busy ? {
                mask, blocked: files.slice(1).some(Boolean), open: () => { setMaskAnnouncement(""); setMaskEditor(matchMedia("(min-width: 1025px)").matches ? "inline" : "dialog"); },
                clear: () => { setSelection(undefined); updateDraft("edit", { vgl: "", generatedVgl: false }); },
              } : undefined}
              result={busy ? inspected : result}
              history={historyGroups.map((group) => group[0])}
              historySelection={historySelection}
              desktopArrows={desktop && !maskEditor}
              dropTarget={desktop && !maskEditor ? uploadDropTarget("canvas") : undefined}
              onRestore={restoreRun}
              onSaveEdit={savedEditsAccount ? (image) => void saveEdit(image) : undefined}
              savingEdit={savingEdits}
              source={mode === "edit" ? files[0] : undefined}
              batch={busy ? runningBatch : result?.batchId ? history.filter((image) => image.batchId === result.batchId) : []}
              onSelect={(image) => {
                if (busy) {
                  setInspected(image);
                  const current = bookmarkKey && readStageBookmark(bookmarkKey);
                  if (desktop && current && current.id === image.batchId) {
                    writeStageBookmark(bookmarkKey, { ...current, filename: image.filename });
                  }
                } else if (desktop && image.batchId && image.filename) {
                  writeStageBookmark(bookmarkKey, {
                    id: image.batchId, mode, count: batches.get(image.batchId)?.length ?? 1,
                    expires: Date.now() + 55 * 60_000, filename: image.filename,
                  });
                }
                setResult(image);
              }}
              onReturnToProgress={() => {
                const current = bookmarkKey && readStageBookmark(bookmarkKey);
                if (desktop && current && current.filename) writeStageBookmark(bookmarkKey, { ...current, filename: undefined });
                setInspected(undefined);
                setResult(undefined);
              }}
              expectedImages={resuming?.count ?? Number(imageCount)}
              input={mode === "edit" ? previews[0] : inspirationEnabled ? inspirationPreview : undefined}
              inputLabel={mode === "edit" ? "Source image" : "Reference image"}
              busy={busy}
              cancelling={activeCancel?.pending}
              liveFrame={liveFrame}
              liveBlur={liveBlur}
              renderRatio={resuming ? resuming.aspect : mode === "generate" || editAspectRatio !== "original" ? size.width / size.height : undefined}
              status={liveCaption ?? status}
              onBrowse={() => chooseImage(mode === "edit" ? 0 : 4)}
              onUseInput={(file) => attachImage(file, 0)}
              onUseSource={async (image) => {
                if (!admitted || busy) return;
                sourceLoad.current?.abort();
                const controller = new AbortController();
                sourceLoad.current = controller;
                try {
                  if (image.assetId) setStatus("Loading source image…");
                  const file = await loadCreateResultSource(image, controller.signal, isMediaUploadMimeType);
                  if (image.assetId) sourceAssets.current.set(file, { type: "media-asset", id: image.assetId });
                  if (controller.signal.aborted || active.current || preparing.current) return;
                  sourceLoad.current = null;
                  attachImage(file, 0);
                  setStatus("Source image attached.");
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
                } catch {
                  if (!controller.signal.aborted) setStatus("Could not use this result as the source.");
                } finally {
                  if (sourceLoad.current === controller) sourceLoad.current = null;
                }
              }}
            />}
            {maskEditor === "dialog" && maskEditorNode}
            {!admitted && <Link href="/settings" className="create-preview-stage-sign-in">Sign in to upload</Link>}
        </section>
        <aside className="create-preview-history" aria-labelledby="create-preview-history-title"
          onKeyDown={(event) => {
            if (busy || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
            const direction = ["ArrowUp", "ArrowLeft"].includes(event.key) ? -1 : ["ArrowDown", "ArrowRight"].includes(event.key) ? 1 : 0;
            const chips = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("[data-create-history-image]:not(:disabled)")];
            const from = chips.indexOf(document.activeElement as HTMLButtonElement);
            if (!direction || from < 0) return;
            event.preventDefault();
            const next = chips[(from + direction + chips.length) % chips.length];
            next.focus();
            next.click();
          }}>
          <h2 id="create-preview-history-title">History</h2>
          <div ref={setResultActions} className="create-preview-history-result-actions" />
          {!!savedEdits.length && <Button type="button" variant="ghost" size="sm" disabled={savingEdits || busy}
            onClick={() => void saveEdit()}>Clear saved edits</Button>}
          {savedStatus && <p className="create-preview-caption" role="status">{savedStatus}</p>}
          <div ref={setHistoryRail} className="create-preview-history-rail">
            {queueCount > 0 && <Button type="button" variant="ghost" className="create-preview-history-progress"
              aria-label={"Open Queue, " + queueCount + (queueCount === 1 ? " active render" : " renders")} onClick={() => {
                queue.current?.focus({ preventScroll: true });
                setToolbarPopover("queue");
              }}>
              <span>Rendering</span><span>{queueCount} in Queue</span>
            </Button>}
            {historyGroups.length ? historyGroups.map((group, index) => {
              const image = group[0];
              return <Button key={image.batchId ?? image.filename ?? index} data-create-history-image type="button" variant="ghost"
                className="create-preview-history-cover" disabled={busy} aria-current={!!result && group.includes(result)}
                aria-label={"Open render " + (historyGroups.length - index) + ", seed " + image.seed + ", " + group.length + (group.length === 1 ? " image" : " images")}
                onClick={() => { setMaskEditor(undefined); setHistorySelection({ image }); }}>
                <img src={image.image_data} alt="" draggable={false} loading="lazy" />
                {group.length > 1 && <span className="create-preview-history-stack" aria-hidden="true">▱ {group.length}</span>}
              </Button>;
            }) : !busy && <p className="create-preview-caption">Finished images will appear here.</p>}
          </div>
        </aside>
      </div>
    </section>
  );
}
