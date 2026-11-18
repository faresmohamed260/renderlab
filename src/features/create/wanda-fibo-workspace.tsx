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
type Result = { image_data: string; seed: number; filename?: string; json_instruction?: string; source?: File; batchId?: string; run?: RunSettings };
type Workflow = "edit" | "generate";
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
  const [result, setResult] = useState<Result>();
  const [turns, setTurns] = useState<Record<Workflow, StageTurn<Result>[]>>({ edit: [], generate: [] });
  const [liveFrame, setLiveFrame] = useState<string>();
  const [runningBatch, setRunningBatch] = useState<Result[]>([]);
  const [inspected, setInspected] = useState<Result>();
  const [sessionHistory, setHistory] = useState<Result[]>([]);
  const [savedEdits, setSavedEdits] = useState<Result[]>([]);
  const [savingEdits, setSavingEdits] = useState(false);
  const [savedStatus, setSavedStatus] = useState("");
  const history = [...sessionHistory, ...savedEdits.filter((item) =>
    !sessionHistory.some((image) => image.filename === item.filename))].slice(0, 8);

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
  const [busy, setBusy] = useState(false);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  useEffect(() => {
    const urls = files.map((file) => file ? URL.createObjectURL(file) : undefined);
    setPreviews(urls);
    return () => urls.forEach((url) => { if (url) URL.revokeObjectURL(url); });
  }, [files]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || active.current) return;
    const controller = new AbortController();
    const { signal } = controller;
    active.current = controller;
    const job = crypto.randomUUID().replaceAll("-", "");
    const threaded = matchMedia("(max-width: 760px)").matches;
    if (threaded) setTurns((previous) => ({
      ...previous,
      [mode]: [...previous[mode], { id: job, prompt: prompt.trim() || (manualVgl ? "VGL JSON" : ""),
        input: mode === "edit" ? files[0] : manualVgl ? undefined : inspiration }].slice(-8),
    }));
    function finishTurn(images: Result[], error?: string) {
      if (threaded) setTurns((previous) => ({
        ...previous, [mode]: previous[mode].map((turn) => turn.id === job ? { ...turn, images, error } : turn),
      }));
    }
    setLiveFrame(undefined);
    setRunningBatch([]);
    setInspected(undefined);
    setBusy(true);
    setStatus(mode === "edit" ? "Uploading images..." : "Submitting render...");
    try {
      const uploads: Record<string, string> = {};
      if (mode === "edit") {
        for (const [index, file] of files.entries()) {
          if (!file) continue;
          const form = new FormData();
          form.set("files", file);
          const [id] = await request<string[]>("gradio_api/upload", { method: "POST", body: form, signal });
          uploads[["source", "ref2", "ref3", "ref4"][index]] = id;
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
        inputs: mode === "edit" ? [...files] : [],
      };
      await request("local/" + mode, { method: "POST", signal, headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...uploads, job_id: job, instruction: prompt.trim(), negative_prompt: negativePrompt.trim(), json_instruction: manualVgl,
          seed: Number(seed), randomize, steps, image_count: Number(imageCount), width: size.width, height: size.height }) });
      setStatus("Rendering on Modal...");
      const end = Date.now() + 8 * 60_000;
      let images: Result[] = [];
      while (!signal.aborted && Date.now() < end) {
        const update = await request<{ finished: boolean; images: Result[]; preview?: string; error?: string }>("local/render/" + job, { signal });
        setLiveFrame(update.preview);
        if (update.images.length > images.length) {
          images = [...images, ...update.images.slice(images.length).map((image) => ({
            ...image, batchId: job, run, source: mode === "edit" ? files[0] : undefined,
          }))];
          setRunningBatch(images);
        }
        if (update.finished) {
          if (!update.images[0]) throw new Error(update.error ?? "No image returned.");
          finishTurn(images, update.error);
          const image = images[0];
          setResult((previous) => previous?.batchId === job ? previous : image);
          if (typeof image.json_instruction === "string" && image.json_instruction.trim()) {
            updateDraft(mode, { vgl: image.json_instruction, generatedVgl: true });
          }
          setHistory((items) => [...images, ...items].slice(0, 8));
          if (prompt.trim()) setRecent((items) => [prompt.trim(), ...items.filter((item) => item !== prompt.trim())].slice(0, 5));
          setStatus(update.error ?? (update.images.length === 1 ? "Render complete." : update.images.length + " images ready in History."));
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      throw new Error("Render status did not return before the local timeout.");
    } catch (cause) {
      if (!signal.aborted) {
        const message = cause instanceof Error ? cause.message : "Render failed.";
        finishTurn([], message);
        setStatus(message);
      }
    } finally {
      active.current = null;
      if (!signal.aborted) setBusy(false);
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
    : mode === "edit" && !files[0] ? "Add a source image to edit."
    : mask && files.slice(1).some(Boolean) ? "Remove references to use a mask."
    : mask && !masksEnabled ? "Masked edits need the private worker update."
    : !vglValid ? "Enter a non-empty VGL JSON object."
    : !advancedPrompt && (manualVgl || negativePrompt.trim()) ? "Advanced prompts need the private worker update."
    : !manualVgl && !prompt.trim() ? "Enter a prompt or VGL JSON to generate."
    : !/^[1-4]$/.test(imageCount) ? "Choose 1 to 4 images."
    : !seedValid ? "Enter a seed from 0 to 2147483647."
    : "";
  const canSubmit = !busy && !maskEditor && !blocker;
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
          <details className="wanda-fibo-queue">
            <summary><ListOrdered size={16} aria-hidden="true" /> Queue</summary>
            <p role="status">{busy ? status : "No active render in this workspace."}</p>
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
            <Textarea id="wanda-fibo-prompt" required spellCheck autoCorrect="on" value={prompt} disabled={!admitted || busy} maxLength={4000}
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
              <Sparkles aria-hidden="true" />{busy ? "Rendering…" : "Generate"}<kbd aria-hidden="true">Ctrl + Enter</kbd>
            </Button>
          </div>
        </form>
        <section className="wanda-fibo-canvas" aria-label="Canvas" {...uploadDropTarget("canvas")}>
            <WandaFiboStage
              workflow={mode}
              turns={turns[mode]}
              inlineMask={maskEditor === "inline" ? maskEditorNode : undefined}
              browseDisabled={!admitted}
              maskAction={admitted && mode === "edit" && files[0] && !result && !busy ? {
                mask, blocked: files.slice(1).some(Boolean), open: () => setMaskEditor(matchMedia("(min-width: 1025px)").matches ? "inline" : "dialog"),
                clear: () => { setSelection(undefined); updateDraft("edit", { vgl: "", generatedVgl: false }); },
              } : undefined}
              result={busy ? inspected : result}
              history={history}
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
              expectedImages={Number(imageCount)}
              input={mode === "edit" ? previews[0] : inspirationPreview}
              inputLabel={mode === "edit" ? "Source image" : "Reference image"}
              busy={busy}
              liveFrame={liveFrame}
              renderRatio={mode === "generate" ? size.width / size.height : undefined}
              status={status}
              onBrowse={() => chooseImage(mode === "edit" ? 0 : 4)}
              onUseInput={(file) => attachImage(file, 0)}
              onUseSource={(image) => {
                try {
                  const bytes = Uint8Array.from(atob(image.image_data.split(",")[1]), (ch) => ch.charCodeAt(0));
                  attachImage(new File([bytes], image.filename ?? "fibo-result.png", { type: "image/png" }), 0);
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
            />
            {maskEditor === "dialog" && maskEditorNode}
            {!admitted && <Link href="/settings" className="wanda-fibo-stage-sign-in">Sign in to upload</Link>}
        </section>
        <aside className="wanda-fibo-history" aria-labelledby="wanda-fibo-history-title"
          onKeyDown={(event) => {
            if (busy || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
            const direction = ["ArrowUp", "ArrowLeft"].includes(event.key) ? -1 : ["ArrowDown", "ArrowRight"].includes(event.key) ? 1 : 0;
            const chips = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
            const from = chips.indexOf(document.activeElement as HTMLButtonElement);
            if (!direction || from < 0) return;
            event.preventDefault();
            const next = chips[(from + direction + chips.length) % chips.length];
            next.focus();
            next.click();
          }}>
          <h2 id="wanda-fibo-history-title">History</h2>
          {!!savedEdits.length && <Button type="button" variant="ghost" size="sm" disabled={savingEdits || busy}
            onClick={() => void saveEdit()}>Clear saved edits</Button>}
          {savedStatus && <p className="wanda-fibo-caption" role="status">{savedStatus}</p>}
          {history.length ? history.map((image, index) => (
            <Button key={image.filename ?? index} type="button" variant="outline" disabled={busy} aria-current={result === image} onClick={() => { setMaskEditor(undefined); setResult(image); }}>Render {history.length - index} · {image.seed}</Button>
          )) : <p className="wanda-fibo-caption">Finished images will appear here.</p>}
        </aside>
      </div>
    </section>
  );
}
