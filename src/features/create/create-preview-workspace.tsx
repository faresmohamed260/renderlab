"use client";

import columns from "./create-desktop-columns.module.css";
import { CreateStageSkeleton } from "./create-rail-stage-skeleton";

import { animated, useSpring } from "@react-spring/web";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { ArrowUp, ChevronDown, RefreshCw, Plus, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { registerCreateCommand } from "@/lib/create-commands";
import { nextResultIndex, useCreateShortcuts } from "./use-create-shortcuts";
import { Sheet, SheetTrigger, SheetContent, SheetClose, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import phoneStyles from "./create-phone-composer.module.css";
import { springOptions } from "@/lib/ui/spring-roles";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { nextCreateToolbarPopover, type CreateToolbarPopover } from "./create-toolbar-popover-state";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Textarea } from "@/components/ui/textarea";

import { DeferredMaskEditor as CreatePreviewMaskEditor } from "./create-preview-deferred-mask-editor";
import { clearSavedEdits, readSavedEdits, saveEdits } from "./create-preview-saved-edits";
import { CreatePreviewStage, type StageTurn } from "./create-preview-stage";
import { previewImageSizes } from "./create-preview-sizes";
import { loadCreateResultSource } from "./create-result-source";
import { fetchHostedCreateCapabilities, rejectUnavailableInspirationDrop, type HostedCreateCapabilities } from "./create-hosted-capabilities";
import { loadContinuationFiles, type CreateContinuationPlan } from "./create-continuation";
import { CreateHistoryPanel, CreateHistorySheet, Jobs, type RailResult } from "./history/create-history-panel";
import { createHistoryTransport, type HistoryReadActions } from "./history/history-transport";
import type { HistoryTransport } from "./history/history-contract";
import { useCreateHistory } from "./history/use-create-history";

import { fiboImageAspectRatios, type AspectRatio, type PresetAspectRatio, type GenerationModel, type GenerationInput, type GenerationJob } from "@/lib/capabilities/generation";
import { isMediaUploadMimeType } from "@/lib/api/media-upload-contract";
import type { PublicMediaAsset } from "@/lib/api/media-assets-contract";
import { uploadFiboMaskFile } from "@/lib/browser/fibo-mask-upload-client";
import { normalizeFiboVgl, resolveFiboVglReferences } from "@/lib/capabilities/fibo-vgl";
import { uploadPersistentImageFile } from "@/lib/browser/media-upload-client";

const unavailableHistory: HistoryTransport = {
  readJobs: async () => ({ state: "private" }), readPrompts: async () => ({ items: [], nextCursor: null }),
  mutate: async () => ({ ok: false, message: "History is unavailable." }), reuse: async () => ({ ok: false, reason: "unavailable" }),
};

const hostedJobId = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const hostedRatios = fiboImageAspectRatios;

async function hostedRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, cache: "no-store" });
  const data = await response.json();
  if (!response.ok || data.ok !== true) throw new Error(data.error?.message ?? "Hosted request failed.");
  return data as T;
}

function hostedResult(asset: PublicMediaAsset): Result {
  return { image_data: "/api/media/assets/" + asset.id + "/content", assetId: asset.id, isFavorite: asset.isFavorite, width: asset.width ?? undefined, height: asset.height ?? undefined, promptUsed: asset.prompt ?? undefined,
    filename: asset.originalFilename ?? "result.png", seed: 0, batchId: asset.generationJobId ?? asset.id,
    aspect: asset.width && asset.height ? asset.width / asset.height : undefined };
}

const api = "/create-preview/";
const slotMarker = (index: number) => "\uE000" + index + "\uE001";
const slotMarkers = /\uE000([0-3])\uE001/g;
const slots = ["Source", "Reference 2", "Reference 3", "Reference 4"];
type Result = { promptUsed?: string; assetId?: string; isFavorite?: boolean; width?: number; height?: number; image_data: string; aspect?: number; seed: number; filename?: string; json_instruction?: string; source?: File; batchId?: string; run?: RunSettings };
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

export function CreatePreviewWorkspace({ admitted, extendedSetup, variableSteps, advancedPrompt, masksEnabled: configuredMasksEnabled = false, hostedOnly = false, hostedModel, hostedAccountKey, savedEditsAccount, initialAspectRatio = "1:1", initialContinuation = null, initialContinuationError = null, historyActions }: { historyActions?: HistoryReadActions; initialContinuation?: CreateContinuationPlan | null; initialContinuationError?: string | null; admitted: boolean; hostedOnly?: boolean; hostedModel?: { id: GenerationModel; label: string }; hostedAccountKey?: string; savedEditsAccount?: string; initialAspectRatio?: PresetAspectRatio; masksEnabled?: boolean; advancedPrompt: boolean; extendedSetup: boolean; variableSteps: boolean }) {
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
  const inspirationNotice = "Describe what you want below, then generate.";
  const bookmarkKey = hostedModel && hostedAccountKey ? "renderlab:hosted-fibo-stage:" + hostedAccountKey
    : admitted && savedEditsAccount ? "renderlab:wf-stage:" + savedEditsAccount : undefined;
  const [stageReady, setStageReady] = useState(!bookmarkKey);
  const [mode, setMode] = useState<Workflow>("edit");
  const [editAspectRatio, setEditAspectRatio] = useState<AspectRatio>("original");
  const [continuationPending, setContinuationPending] = useState(!!initialContinuation);
  const [continuationError, setContinuationError] = useState(initialContinuationError);
  const [reducedMotion, setReducedMotion] = useState(true);
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
  const { prompt: promptDraft, negativePrompt, vgl, generatedVgl, vglOpen, seed, randomize, imageCount: draftImageCount } = drafts[mode];
  const imageCount = multiOutputEnabled ? draftImageCount : "1";
  let missingPromptImage = false;
  const prompt = promptDraft.replace(slotMarkers, (_, slot: string) => {
    const index = Number(slot);
    if (!files[index]) missingPromptImage = true;
    return imageTag(index);
  });
  // Legacy workers can return VGL, but cannot accept it back as a manual instruction.
  const manualVgl = !vglOpen || ((hosted || !advancedPrompt) && generatedVgl) ? "" : vgl.trim();

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
  const [desktop, setDesktop] = useState(false);
  const [phone, setPhone] = useState(false);
  const [advancedSheetOpen, setAdvancedSheetOpen] = useState(false);
  const [composerPopover, setComposerPopover] = useState<"references" | "mode" | "shape" | null>(null);
  const [desktopAdvancedOpen, setDesktopAdvancedOpen] = useState(true);
  const advancedTrigger = useRef<HTMLButtonElement>(null);
  const [advancedOffset, setAdvancedOffset] = useState(0);
  const advancedClosing = useRef(false);
  const [, advancedSpring] = useSpring(() => ({ offset: 0 }), []);
  const finishAdvancedClose = useCallback(() => {
    advancedClosing.current = false;
    // Remove the portal in one commit; the phone composer stays compact.
    // Flush Radix's focus trap cleanup and return focus in the same browser task.
    flushSync(() => {
      setAdvancedSheetOpen(false);
      setAdvancedOffset(0);
    });
    const root = workspaceRoot.current;
    const destination = matchMedia("(min-width: 701px)").matches
      ? root?.querySelector<HTMLElement>("#create-preview-prompt")
      : advancedTrigger.current;
    destination?.focus({ preventScroll: true });
    if (document.activeElement === document.body) root?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReducedMotion(query.matches);
      if (query.matches && advancedClosing.current) finishAdvancedClose();
    };
    setReducedMotion(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [finishAdvancedClose]);

  function changeAdvancedOpen(next: boolean) {
    if (next) {
      advancedClosing.current = false;
      advancedSpring.stop();
      setAdvancedOffset(reducedMotion ? 0 : 100);
      setAdvancedSheetOpen(true);
    } else if (reducedMotion) {
      finishAdvancedClose();
    } else if (!advancedClosing.current) {
      advancedClosing.current = true;
      void advancedSpring.start({ to: { offset: 100 }, ...springOptions("smooth", false),
        onChange: result => setAdvancedOffset(result.value.offset),
        onRest: result => {
          if (result.finished && advancedClosing.current) finishAdvancedClose();
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
      return;
    }
    void advancedSpring.start({ from: { offset: 100 }, to: { offset: 0 }, reset: true,
      ...springOptions("smooth", false),
      onChange: result => setAdvancedOffset(result.value.offset),
      onRest: result => { if (result.finished && !advancedClosing.current) setAdvancedOffset(0); } });
    return () => { advancedSpring.stop(); };
  }, [advancedSheetOpen, reducedMotion, advancedSpring, finishAdvancedClose]);
  useEffect(() => {
    if (!advancedSheetOpen) return;
    const query = matchMedia("(min-width: 701px)");
    const closeOnWide = () => {
      if (query.matches) finishAdvancedClose();
    };
    query.addEventListener("change", closeOnWide);
    return () => query.removeEventListener("change", closeOnWide);
  }, [advancedSheetOpen, finishAdvancedClose]);
  useEffect(() => {
    const query = matchMedia("(max-width: 700px)");
    const update = () => setPhone(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
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
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySelection, setHistorySelection] = useState<{ image: Result }>();
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
  const historyRead = useCreateHistory({
    accountKey: historyActions && admitted ? hostedAccountKey ?? null : null,
    visible: !!historyActions && (desktop || historyOpen || toolbarPopover === "queue"),
    combined: true,
    transport: historyActions ? createHistoryTransport(historyActions) : unavailableHistory,
    onReuseDraft: async (draft, signal) => {
      if (!admitted || busy || continuationPending || maskEditor) throw new Error("Create is busy.");
      const loaded = await readContinuationFiles(draft, signal);
      signal?.throwIfAborted();
      if (active.current || preparing.current) throw new Error("Create is busy.");
      applyContinuation(draft, loaded);
      setHistoryOpen(false);
    },
    onPrompt: (value) => { if (!busy && !continuationPending) { setPrompt(value); setHistoryOpen(false); } },
    onSessionResult: (entry) => { void selectHistoryResult(entry.id); },
  });
  const historySelectionRequest = useRef<AbortController | null>(null);
  useEffect(() => () => historySelectionRequest.current?.abort(), [hostedAccountKey, admitted]);
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
    if (!hostedModel || historyActions) return;
    const controller = new AbortController();
    void hostedRequest<{ items: PublicMediaAsset[] }>("/api/media/assets?kind=image&origin=generated&limit=48", { signal: controller.signal })
      .then(({ items }) => {
        if (controller.signal.aborted) return;
        const rows = items.filter((asset) => asset.model === hostedModel.label).map(hostedResult);
        setHistory((current) => [...current, ...rows.filter((row) => !current.some((item) => item.assetId === row.assetId))].slice(0, 8));
      })
      .catch(() => { if (!controller.signal.aborted) setSavedStatus("Hosted History could not be loaded."); });
    return () => controller.abort();
  }, [hostedModel, historyActions]);

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
  const selectedShape = mode === "edit" ? editAspectRatio : hostedRatios[sizeIndex];
  const effectiveSizeIndex = selectedShape === "original" ? sizeIndex : hostedRatios.indexOf(selectedShape);
  const size = previewImageSizes[effectiveSizeIndex] ?? previewImageSizes[0];
  const shapeLabel = selectedShape === "original" ? "Original" : selectedShape;
  const shapeOptions: readonly AspectRatio[] = mode === "edit"
    ? ["original", "1:1", "4:3", "16:9", "3:4", "9:16"]
    : ["1:1", "4:3", "16:9", "3:4", "9:16"];

  function selectShape(value: string) {
    if (busy || !value) return;
    if (value === "original" && mode === "edit") {
      setEditAspectRatio("original");
      return;
    }
    const index = hostedRatios.indexOf(value as PresetAspectRatio);
    if (index < 0) return;
    if (mode === "edit") setEditAspectRatio(hostedRatios[index]);
    else setSizeIndex(index);
  }
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

  function readContinuationFiles(draft: CreateContinuationPlan, signal?: AbortSignal) {
    const requestSignal = signal ?? new AbortController().signal;
    return loadContinuationFiles(draft, requestSignal, async (reference, signal) => {
      if (reference.source.type === "media-asset") {
        return loadCreateResultSource({ assetId: reference.source.id, image_data: "", filename: reference.label }, signal, isMediaUploadMimeType);
      }
      const response = await fetch("/api/assets/reference/" + encodeURIComponent(reference.source.id) + "/content?source=1", { signal, cache: "no-store" });
      if (!response.ok) throw new Error("Reference is unavailable.");
      const blob = await response.blob();
      if (!blob.size || !isMediaUploadMimeType(blob.type)) throw new Error("Invalid reference image.");
      return new File([blob], reference.label, { type: blob.type });
    });
  }

  function applyContinuation(draft: CreateContinuationPlan, loaded: Awaited<ReturnType<typeof readContinuationFiles>>) {
    for (const { source, file } of loaded) sourceAssets.current.set(file, source);
    setFiles(loaded.map(({ file }) => file));
    setResult(undefined);
    setSelection(undefined);
    setMaskEditor(undefined);
    setMode(draft.mode);
    setEditAspectRatio(draft.mode === "edit" ? draft.aspectRatio : "original");
    if (draft.aspectRatio !== "original") setSizeIndex(Math.max(0, hostedRatios.indexOf(draft.aspectRatio)));
    setSteps(draft.steps);
    updateDraft(draft.mode, {
      prompt: draft.prompt, seed: draft.seed, randomize: draft.randomize,
      negativePrompt: draft.negativePrompt, negativeOpen: !!draft.negativePrompt,
      vgl: draft.vgl, vglOpen: !!draft.vgl, generatedVgl: false, imageCount: "1",
    });
    setStatus(draft.references.length ? "Source image attached." : "Saved settings loaded.");
  }

  async function selectHistoryResult(id: string) {
    if (!admitted || busy || !hostedJobId.test(id)) return;
    historySelectionRequest.current?.abort();
    const controller = new AbortController();
    historySelectionRequest.current = controller;
    try {
      const { asset } = await hostedRequest<{ asset: PublicMediaAsset }>("/api/media/assets/" + encodeURIComponent(id), { signal: controller.signal });
      if (controller.signal.aborted || active.current || preparing.current || asset.id !== id || asset.kind !== "image") return;
      setMaskEditor(undefined);
      setHistorySelection({ image: { ...hostedResult(asset), ...sessionHistory.find(item => item.assetId === id), image_data: hostedResult(asset).image_data, isFavorite: asset.isFavorite } });
      setHistoryOpen(false);
    } catch {
      if (!controller.signal.aborted) setStatus("This result is no longer available.");
    } finally {
      if (historySelectionRequest.current === controller) historySelectionRequest.current = null;
    }
  }

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
        mode, prompt: prompt.trim(), negativePrompt: negativePrompt.trim(), vgl: manualVgl, steps, imageCount, sizeIndex: effectiveSizeIndex, editAspectRatio,
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
        const generated = image.json_instruction;
        setDrafts(previous => previous[mode].vgl && !previous[mode].generatedVgl ? previous : ({
          ...previous, [mode]: { ...previous[mode], vgl: generated, generatedVgl: true },
        }));
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
          if (!restoring) for (const image of images) {
            if (image.assetId) historyRead.recordResult({ id: image.assetId, label: run?.prompt?.trim() || image.filename || "Generated result", createdAt: new Date().toISOString() });
          }
          historyRead.refresh();
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
      prompt: run.prompt, negativePrompt: run.negativePrompt, vgl: run.vgl, vglOpen: !!run.vgl,
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
    if (!vglOpen) return true;
    if (!manualVgl) return false;
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
        root.querySelector<HTMLElement>('[aria-label="Edit image"]'),
        root.querySelector<HTMLElement>('[aria-label="Text to image"]'),
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

  // These controlled fields have a single draft owner. On phones they are
  // rendered only in Advanced; wider layouts keep their existing inline access.
  const structuredFields = (
    <div className={phoneStyles.structuredFields} key={mode}>
      <label className={phoneStyles.structuredRow} htmlFor="create-preview-vgl-enabled">
        <Checkbox id="create-preview-vgl-enabled" checked={vglOpen} disabled={busy || (!advancedPrompt && !vglOpen)}
          onCheckedChange={checked => updateDraft(mode, { vglOpen: checked === true })}
          aria-controls={vglOpen ? "create-preview-vgl-editor" : undefined} />
        <span>Use my own structured prompt</span>
      </label>
      {vglOpen && <div id="create-preview-vgl-editor" className={phoneStyles.structuredEditor}>
        {hosted && <p className="create-preview-caption">{generatedVglNotice}</p>}
        <Textarea aria-label="Manual VGL JSON" className="create-preview-vgl" rows={5} maxLength={8192}
          spellCheck={false} autoCorrect="off" autoCapitalize="off" placeholder="Enter VGL JSON…" value={vgl}
          disabled={busy} aria-invalid={!vglValid} aria-describedby={!vglValid ? "create-preview-vgl-invalid" : undefined}
          onChange={event => updateDraft(mode, { vgl: event.target.value, generatedVgl: false })} />
        {!vglValid && <span id="create-preview-vgl-invalid" className="sr-only">Enter a non-empty JSON object.</span>}
      </div>}
    </div>);
  const seedField = (
    <div className={phoneStyles.seedRow}>
      <label htmlFor="create-preview-seed">Seed</label>
      <Input id="create-preview-seed" type="text" inputMode="numeric" spellCheck={false} autoCorrect="off" autoCapitalize="off" maxLength={10}
        required={!randomize} value={seed} disabled={busy || randomize} onChange={(event) => updateDraft(mode, { seed: event.target.value })} />
      <Button type="button" variant="ghost" className={phoneStyles.randomize} title="Randomize seed each time"
        aria-label="Randomize seed each time" aria-pressed={randomize} disabled={busy}
        onClick={() => updateDraft(mode, { randomize: !randomize })}>
        <RefreshCw aria-hidden="true" />
      </Button>
    </div>);
  const stepsField = (
    <div className={phoneStyles.stepsRow}>
      <label htmlFor="create-preview-steps">Steps</label>
      <Input id="create-preview-steps" type="range" min={1} max={8} step={1} value={steps}
        disabled={busy} title={variableSteps ? undefined : "The current worker renders at 4 steps"}
        onChange={(event) => setSteps(event.target.valueAsNumber)} />
      <output htmlFor="create-preview-steps">{steps}</output>
    </div>);
  function resetAdvanced() {
    if (busy) return;
    updateDraft(mode, { seed: emptyDraft.seed, randomize: emptyDraft.randomize,
      negativePrompt: emptyDraft.negativePrompt, negativeOpen: emptyDraft.negativeOpen,
      vgl: emptyDraft.vgl, vglOpen: emptyDraft.vglOpen, generatedVgl: false });
    setSteps(4);
  }

  const shortcutResults = historyGroups.flat();
  const selectedResultIndex = result ? shortcutResults.findIndex(image => image === result || matchesImage(image, result)) : -1;
  const shortcuts = useCreateShortcuts({
    root: workspaceRoot,
    overlay: advancedSheetOpen || toolbarPopover !== null || composerPopover !== null || maskOpen || historyOpen,
    canGenerate: canSubmit,
    canStep: !busy && !continuationPending && shortcutResults.length > 1,
    step: direction => {
      const next = nextResultIndex(selectedResultIndex, direction, shortcutResults.length);
      if (next >= 0) setHistorySelection({ image: shortcutResults[next] });
    },
  });

  useEffect(() => registerCreateCommand({
    id: "generate", label: busy ? "Queue render" : "Generate", keywords: ["render", "submit"],
    shortcut: shortcuts.enabled ? shortcuts.modifierHint + " Enter" : undefined, group: "Create",
    enabled: canSubmit, run: () => workspaceRoot.current?.querySelector<HTMLFormElement>("form.create-preview-controls")?.requestSubmit(),
  }), [busy, canSubmit, shortcuts.enabled, shortcuts.modifierHint]);
  useEffect(() => registerCreateCommand({
    id: "focus-prompt", label: "Focus prompt", keywords: ["prompt", "write"], shortcut: shortcuts.enabled ? "/" : undefined,
    group: "Create", enabled: !continuationPending && !promptDisabled,
    run: () => workspaceRoot.current?.querySelector<HTMLElement>("#create-preview-prompt")?.focus(),
  }), [continuationPending, promptDisabled, shortcuts.enabled]);
  useEffect(() => registerCreateCommand({
    id: "switch-mode", label: mode === "generate" ? "Edit image" : "Text to image", keywords: ["mode", "text", "edit"],
    group: "Create", enabled: !busy && !continuationPending,
    run: () => { setMaskEditor(undefined); setMode(mode === "generate" ? "edit" : "generate"); },
  }), [mode, busy, continuationPending]);

  const railResults: RailResult[] = historyRead.accountAvailable ? historyRead.session.map(entry => {
    const image = history.find(item => item.assetId === entry.id);
    return { id: entry.id, label: entry.label, image: image?.image_data, createdAt: entry.createdAt, edit: image?.run?.mode === "edit", current: result?.assetId === entry.id,
      onSelect: () => historyRead.selectSessionResult(entry) };
  }) : historyGroups.map((group, index) => {
    const image = group[0];
    return { id: image.batchId ?? image.filename ?? String(index), label: image.run?.prompt || image.promptUsed || image.filename || "Generated result", image: image.image_data, edit: image.run?.mode === "edit",
      current: !!result && group.some(item => item === result || matchesImage(item, result)), onSelect: () => { setMaskEditor(undefined); setHistorySelection({ image }); setHistoryOpen(false); } };
  });
  const railProps = { state: historyRead, results: railResults, recent, disabled: busy || continuationPending,
    onReusePrompt: (value: string) => { if (!busy && !continuationPending) { setPrompt(value); setHistoryOpen(false); } },
    onRemovePrompt: (value: string) => setRecent(items => items.filter(item => item !== value)),
    onClearPrompts: () => setRecent([]), shortcutsEnabled: shortcuts.enabled };
  useEffect(() => {
    const openQueue = () => setToolbarPopover("queue");
    const openHistory = () => { if (matchMedia("(min-width: 1025px)").matches) workspaceRoot.current?.querySelector<HTMLElement>(".create-preview-history")?.focus(); else setHistoryOpen(true); };
    window.addEventListener("renderlab:open-queue", openQueue);
    window.addEventListener("renderlab:open-history", openHistory);
    if (new URLSearchParams(window.location.search).get("queue") === "1") openQueue();
    const unregister = [
      registerCreateCommand({id:"open-queue",label:"Open Queue",keywords:["jobs","cancel","retry"],group:"Create",enabled:true,run:openQueue}),
      registerCreateCommand({id:"open-history",label:"Open History",keywords:["results","prompts"],group:"Create",enabled:true,run:openHistory}),
    ];
    return () => { window.removeEventListener("renderlab:open-queue",openQueue); window.removeEventListener("renderlab:open-history",openHistory); unregister.forEach(fn=>fn()); };
  }, []);
  useEffect(() => {
    const unregister = ([-1,1] as const).map(direction => registerCreateCommand({id:direction === -1 ? "step-result-prev" : "step-result-next", label:direction === -1 ? "Previous result" : "Next result", keywords:["history","step"], shortcut:direction === -1 ? "[" : "]",group:"Create",enabled:!busy && !continuationPending && shortcutResults.length>1,run:()=>{const next=nextResultIndex(selectedResultIndex,direction,shortcutResults.length);if(next>=0)setHistorySelection({image:shortcutResults[next]});}}));
    return () => unregister.forEach(fn=>fn());
  }, [busy, continuationPending, selectedResultIndex, shortcutResults]);
  useEffect(() => registerCreateCommand({id:"toggle-keyboard-shortcuts",label:shortcuts.enabled ? "Disable keyboard shortcuts" : "Enable keyboard shortcuts",keywords:["keyboard"],group:"Create",enabled:true,run:()=>shortcuts.changeEnabled(!shortcuts.enabled)}),[shortcuts.enabled,shortcuts.changeEnabled]);

  function preserveToolbarFocus(event: Event) {
    // Radix returns focus after portal teardown. Preserve any newer focus and
    // otherwise let Radix decide whether this dismissal should focus the trigger.
    const { activeElement, body, documentElement } = document;
    event.preventDefault();
    if (activeElement?.isConnected && activeElement !== body && activeElement !== documentElement && activeElement !== queue.current) return;
    document.querySelector<HTMLElement>(".rebuild-queue-pill")?.focus({ preventScroll: true });
  }

  return (
    <section ref={workspaceRoot} tabIndex={-1} onKeyDown={shortcuts.onKeyDown} className={"create-preview-workspace mx-auto w-full " + columns.workspace} aria-label="Create with FIBO">
      <p className="sr-only" role="status" aria-live="polite">{maskAnnouncement}</p>
      <p className="sr-only" role="status" aria-live="polite" data-create-shortcut-announcement>{selectedResultIndex >= 0 ? "Result " + (selectedResultIndex + 1) + " of " + shortcutResults.length : ""}</p>
      <div className={columns.queueAnchor}>
        <Popover open={toolbarPopover === "queue"} onOpenChange={(open) => setToolbarPopover(current => nextCreateToolbarPopover(current, "queue", open))}>
          <PopoverTrigger asChild><Button ref={queue} type="button" tabIndex={-1} aria-hidden="true" className={columns.invisibleAnchor}>Queue</Button></PopoverTrigger>
          <PopoverContent data-create-shortcut-overlay="" aria-label="Queue" className={columns.queuePopover} onCloseAutoFocus={preserveToolbarFocus}>
            <h2 className="font-semibold">Queue</h2>
            {historyActions && <Jobs state={historyRead} />}
            {(!historyActions || !hostedModel || queueNotice) && <>
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
            </>}
          </PopoverContent>
        </Popover>
      </div>
      {!desktop && <CreateHistorySheet {...railProps} open={historyOpen} onOpenChange={setHistoryOpen} />}
      {continuationPending && <p className="create-preview-caption" role="status">Loading saved starting point…</p>}
      {continuationError && <p className="create-preview-caption" role="alert">{continuationError}</p>}
      <div className={"create-preview-grid " + columns.grid}>
        <form inert={continuationPending} className={"create-preview-controls " + phoneStyles.composer} noValidate onSubmit={submit}>
          <div className={phoneStyles.fields}>
            <ToggleGroup type="single" value={mode} onValueChange={(value) => {
              if (value === "generate") { setMaskEditor(undefined); setMode("generate"); }
              else if (value === "edit") setMode("edit");
            }} disabled={busy} aria-label="Mode" className={phoneStyles.modeGroup}>
              <animated.span className={phoneStyles.modeHighlight} aria-hidden="true"
                style={{ transform: modeSpring.position.to((position) => "translateX(" + (position * 100) + "%)") }} />
              <ToggleGroupItem value="generate" aria-label="Text to image">Text to image</ToggleGroupItem>
              <ToggleGroupItem value="edit" aria-label="Edit image">Edit image</ToggleGroupItem>
            </ToggleGroup>
            <div className={phoneStyles.promptSection}>
              <div className={phoneStyles.promptHeading}>
                <label id="create-preview-main-prompt-label" htmlFor={richPrompt ? undefined : "create-preview-prompt"} onClick={() => { if (richPrompt) promptEditor.current?.focus(); }}>Prompt</label>
                <div className={phoneStyles.promptHints}>
                  {shortcuts.enabled && <kbd aria-hidden="true">/</kbd>}
                </div>
              </div>
            {richPrompt ? (
              <div ref={promptEditor} id="create-preview-prompt" className="create-preview-rich-prompt"
                role="textbox" aria-labelledby="create-preview-main-prompt-label" aria-multiline="true" aria-keyshortcuts={shortcuts.enabled ? "/" : undefined} title={shortcuts.enabled ? "Focus prompt: /" : undefined}
                aria-disabled={promptDisabled} aria-placeholder={placeholder} data-empty={!promptDraft.trim()}
                contentEditable={!promptDisabled} spellCheck autoCorrect="on"
                onInput={readPromptEditor}
                onPaste={(event) => {
                  event.preventDefault();
                  document.execCommand("insertText", false, event.clipboardData.getData("text/plain").replace(/[\uE000\uE001]/g, ""));
                }}
                onDrop={(event) => event.preventDefault()} />
            ) : (
              <Textarea id="create-preview-prompt" aria-keyshortcuts={shortcuts.enabled ? "/" : undefined} title={shortcuts.enabled ? "Focus prompt: /" : undefined} required spellCheck autoCorrect="on" value={prompt} disabled={promptDisabled}
                maxLength={4000} placeholder={placeholder} onChange={(event) => setPrompt(event.target.value)} />
            )}

            </div>
            {mode === "edit" && !phone && <section className={phoneStyles.references} aria-label="References">
              <div className={phoneStyles.referenceHeading}>
                <span>References · {files.filter(Boolean).length} of 4</span>
                <Button type="button" variant="ghost" data-create-mask-trigger="" disabled={!admitted || busy || !masksEnabled || !files[0] || files.slice(1).some(Boolean)}
                  onClick={() => { setMaskAnnouncement(""); setMaskEditor(desktop ? "inline" : "dialog"); }}>Select region</Button>
              </div>
              <div className={phoneStyles.referenceTiles}>
                {slots.map((label, index) => files[index] ? (
                  <div className={phoneStyles.referenceTile} key={label} {...uploadDropTarget(index)}>
                    <Button ref={index === 0 ? sourceButton : undefined} type="button" variant="ghost" aria-label={desktop ? "Insert " + imageTag(index) + " into prompt" : "Choose " + label.toLowerCase() + " image"}
                      title={desktop ? "Insert " + imageTag(index) + " into prompt" : files[index]?.name ?? label}
                      disabled={!admitted || busy} draggable={desktop && !busy}
                      onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData(tileDragType, String(index)); }}
                      onClick={() => desktop ? insertImageTag(index) : chooseImage(index)}>
                      {previews[index] && <img src={previews[index]} alt="" draggable={false} />}
                    </Button>
                    <Button type="button" variant="secondary" size="icon-sm" className={phoneStyles.removeReference}
                      aria-label={"Remove " + label.toLowerCase() + " image"} disabled={busy}
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
                        }}><X /></Button>
                  </div>
                ) : null)}
                {slots.some((_, index) => !files[index]) && (() => {
                  const index = slots.findIndex((_, index) => !files[index]);
                  return <div className={phoneStyles.referenceTile} {...uploadDropTarget(index)}>
                    <Button ref={index === 0 ? sourceButton : undefined} type="button" variant="ghost" className={phoneStyles.addTile}
                      aria-label="Add a reference image" disabled={!admitted || busy} onClick={() => chooseImage(index)}><Plus aria-hidden="true" /></Button>
                  </div>;
                })()}
              </div>
            </section>}
              <input ref={picker} type="file" accept="image/*" hidden onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (file && admitted && !busy) {
                  if (slot.current === 4) setReference(file);
                  else attachImage(file, slot.current);
                }
                event.currentTarget.value = "";
              }} />

            <section className={phoneStyles.shapeSection} aria-label="Shape">
              <div className={phoneStyles.sectionLabel}>Shape</div>
              <ToggleGroup type="single" value={selectedShape} disabled={busy} aria-label="Shape" className={phoneStyles.shapes}
                onValueChange={selectShape}>
                {shapeOptions.map(ratio => <ToggleGroupItem key={ratio} value={ratio}
                  disabled={mode === "generate" && !extendedSetup && ratio !== "1:1"}>{ratio === "original" ? "Original" : ratio}</ToggleGroupItem>)}
              </ToggleGroup>
            </section>
            {!phone && !advancedSheetOpen && <section className={phoneStyles.desktopAdvanced}>
              <Button type="button" variant="ghost" aria-expanded={desktopAdvancedOpen} aria-controls="create-desktop-advanced-fields"
                onClick={() => setDesktopAdvancedOpen(value => !value)} className={phoneStyles.advancedHeading}>
                Advanced <ChevronDown aria-hidden="true" data-expanded={desktopAdvancedOpen} />
              </Button>
              <div id="create-desktop-advanced-fields" hidden={!desktopAdvancedOpen} className={phoneStyles.advancedFields}>
                {seedField}{stepsField}{structuredFields}
              </div>
            </section>}
          </div>
          <div className={phoneStyles.dock}>
            <p className={phoneStyles.workerNote} role="status">{hostedBlocker || cancelError || (sendingCancel || activeCancel?.pending ? "Cancelling…" : liveCaption ?? status)}</p>
            <span id="create-preview-blocker" className="sr-only">{blocker}</span>
            <div className={phoneStyles.actionRow}>
              <div className={phoneStyles.phoneActions}>
                {mode === "generate" ? (
                  <Button type="button" variant="ghost" className={phoneStyles.roundControl} ref={phone ? sourceButton : undefined}
                    aria-label="Add a reference image" disabled={!admitted || busy} onClick={() => chooseImage(0)}><Plus aria-hidden="true" /></Button>
                ) : (
                  <Popover open={composerPopover === "references"} onOpenChange={open => setComposerPopover(current => open ? "references" : current === "references" ? null : current)}>
                    <PopoverTrigger asChild><Button type="button" variant="ghost" ref={phone ? sourceButton : undefined} className={phoneStyles.roundControl}
                      aria-label="References" disabled={!admitted || busy}><Plus aria-hidden="true" /></Button></PopoverTrigger>
                    <PopoverContent data-create-shortcut-overlay="" side="top" align="start" className={phoneStyles.phonePopover} aria-label="References">
                      <div className={phoneStyles.referenceHeading}><span>References · {files.filter(Boolean).length} of 4</span>
                        <Button type="button" variant="ghost" data-create-mask-trigger="" disabled={!admitted || busy || !masksEnabled || !files[0] || files.slice(1).some(Boolean)}
                          onClick={() => { setComposerPopover(null); setMaskAnnouncement(""); setMaskEditor("dialog"); }}>Select region</Button></div>
                      <div className={phoneStyles.referenceTiles}>
                        {slots.map((label, index) => files[index] ? <div className={phoneStyles.referenceTile} key={label} {...uploadDropTarget(index)}>
                          <Button type="button" variant="ghost" aria-label={"Choose " + label.toLowerCase() + " image"} disabled={!admitted || busy} onClick={() => chooseImage(index)}>
                            {previews[index] && <img src={previews[index]} alt="" draggable={false} />}
                          </Button>
                          <Button type="button" variant="secondary" size="icon-sm" className={phoneStyles.removeReference}
                            aria-label={"Remove " + label.toLowerCase() + " image"} disabled={busy}
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
                        }}><X /></Button>
                        </div> : null)}
                        {slots.some((_, index) => !files[index]) && (() => {
                          const index = slots.findIndex((_, index) => !files[index]);
                          return <div className={phoneStyles.referenceTile} {...uploadDropTarget(index)}>
                            <Button type="button" variant="ghost" className={phoneStyles.addTile} aria-label="Add a reference image" disabled={!admitted || busy}
                              onClick={() => chooseImage(index)}><Plus aria-hidden="true" /></Button>
                          </div>;
                        })()}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
                <Popover open={composerPopover === "mode"} onOpenChange={open => setComposerPopover(current => open ? "mode" : current === "mode" ? null : current)}>
                  <PopoverTrigger asChild><Button type="button" variant="ghost" className={phoneStyles.phoneChip} disabled={busy} aria-label={"Mode: " + (mode === "generate" ? "text to image" : "edit image")}>
                    {mode === "generate" ? "Text" : "Edit"} <ChevronDown aria-hidden="true" />
                  </Button></PopoverTrigger>
                  <PopoverContent data-create-shortcut-overlay="" side="top" align="start" className={phoneStyles.phonePopover} aria-label="Mode">
                    <ToggleGroup type="single" orientation="vertical" value={mode} className={phoneStyles.menuChoices} onValueChange={value => {
                      if (value === "generate") { setMaskEditor(undefined); setMode("generate"); }
                      else if (value === "edit") setMode("edit");
                      setComposerPopover(null);
                    }}>
                      <ToggleGroupItem value="generate">Text to image</ToggleGroupItem><ToggleGroupItem value="edit">Edit image</ToggleGroupItem>
                    </ToggleGroup>
                  </PopoverContent>
                </Popover>
                <Popover open={composerPopover === "shape"} onOpenChange={open => setComposerPopover(current => open ? "shape" : current === "shape" ? null : current)}>
                  <PopoverTrigger asChild><Button type="button" variant="ghost" className={phoneStyles.phoneChip} disabled={busy} aria-label={"Shape " + shapeLabel}>{shapeLabel}</Button></PopoverTrigger>
                  <PopoverContent data-create-shortcut-overlay="" side="top" align="start" className={phoneStyles.phonePopover} aria-label="Shape">
                    <ToggleGroup type="single" orientation="vertical" value={selectedShape} className={phoneStyles.menuChoices}
                      onValueChange={value => { selectShape(value); setComposerPopover(null); }}>
                      {shapeOptions.map(ratio => <ToggleGroupItem key={ratio} value={ratio}
                        disabled={mode === "generate" && !extendedSetup && ratio !== "1:1"}>{ratio === "original" ? "Original" : ratio}</ToggleGroupItem>)}
                    </ToggleGroup>
                  </PopoverContent>
                </Popover>
                <Sheet open={advancedSheetOpen} onOpenChange={changeAdvancedOpen}>
                  <SheetTrigger asChild><Button ref={advancedTrigger} type="button" variant="ghost" className={phoneStyles.roundControl} aria-label="Advanced settings"><SlidersHorizontal aria-hidden="true" /></Button></SheetTrigger>
                  {advancedSheetOpen && (
                    <SheetContent data-create-shortcut-overlay="" side="bottom" showCloseButton={false} className={phoneStyles.sheet}
                      style={{ transform: `translateY(${reducedMotion ? 0 : advancedOffset}%)` }} onCloseAutoFocus={event => event.preventDefault()}>
                      <div className={phoneStyles.handle} aria-hidden="true" />
                      <div className={phoneStyles.heading}><SheetTitle>Advanced</SheetTitle>
                        <SheetClose asChild><Button type="button" variant="ghost">Done</Button></SheetClose>
                      </div>
                      <SheetDescription>These apply to your next image. Mode, shape and references are in the prompt box.</SheetDescription>
                      <div className={phoneStyles.settings}>{seedField}{stepsField}{structuredFields}</div>
                      <Button type="button" variant="secondary" size="lg" disabled={busy} onClick={resetAdvanced}>Reset to defaults</Button>
                    </SheetContent>
                  )}
                </Sheet>
              </div>
              <Button type="submit" className={"create-preview-generate " + phoneStyles.generate} disabled={!canSubmit}
                aria-label={enqueueing ? "Adding…" : busy ? desktop ? "Queue render" : "Rendering…" : "Generate"}
                aria-keyshortcuts={shortcuts.enabled ? "Control+Enter Meta+Enter" : undefined}
                title={blocker || (shortcuts.enabled ? shortcuts.modifierHint + " + Enter" : undefined)} aria-describedby={blocker ? "create-preview-blocker" : undefined}>
                <Sparkles aria-hidden="true" className={phoneStyles.desktopIcon} /><ArrowUp aria-hidden="true" className={phoneStyles.phoneIcon} />
                <span className={phoneStyles.generateLabel}>{enqueueing ? "Adding…" : busy ? desktop ? "Queue render" : "Rendering…" : "Generate"}</span>
                {shortcuts.enabled && <kbd aria-hidden="true">{shortcuts.modifierHint} Enter</kbd>}
              </Button>
            </div>
          </div>
        </form>
        <section inert={continuationPending && !busy} className={"create-preview-canvas " + columns.canvas} aria-label="Canvas" {...(!desktop && uploadDropTarget("canvas"))}>
            <div className={columns.stageRegion}>
            {stageReady ? <CreatePreviewStage
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
              resultPosition={selectedResultIndex >= 0 ? { index: selectedResultIndex, count: shortcutResults.length } : undefined}
              desktopArrows={desktop && !maskEditor}
              desktopActions={desktop && !maskEditor && !busy}
              onFavoriteChange={(id, favorite) => {
                setHistory(items => items.map(image => image.assetId === id ? { ...image, isFavorite: favorite } : image));
                setResult(image => image?.assetId === id ? { ...image, isFavorite: favorite } : image);
              }}
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
            /> : <CreateStageSkeleton />}
            </div>
            {maskEditor === "dialog" && maskEditorNode}
            {!admitted && <Link href="/settings" className="create-preview-stage-sign-in">Sign in to upload</Link>}
        </section>
        <aside className={"create-preview-history " + columns.rebuiltRail} tabIndex={-1} aria-label="Session and prompt history" aria-keyshortcuts={shortcuts.enabled ? "[ ]" : undefined}
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
          <CreateHistoryPanel {...railProps}>
            {!!savedEdits.length && <Button type="button" variant="ghost" size="sm" disabled={savingEdits || busy} onClick={() => void saveEdit()}>Clear saved edits</Button>}
            {savedStatus && <p className="create-preview-caption" role="status">{savedStatus}</p>}
          </CreateHistoryPanel>
        </aside>
      </div>
    </section>
  );
}
