"use client";

import { animated, useSpring } from "@react-spring/web";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Clock, Dices, Image as ImageIcon, ImagePlus, Keyboard, Pencil, ListOrdered, Plus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

import { wandaFiboSizes } from "./wanda-fibo-sizes";

const api = "/wanda-fibo/";
const slots = ["Source", "Reference 2", "Reference 3", "Reference 4"];
type Result = { image_data: string; seed: number; json_instruction?: string };
type Workflow = "edit" | "generate";
type PromptDraft = {
  prompt: string;
  negativePrompt: string;
  vgl: string;
  generatedVgl: boolean;
  negativeOpen: boolean;
  vglOpen: boolean;
};
const emptyDraft: PromptDraft = {
  prompt: "", negativePrompt: "", vgl: "", generatedVgl: false, negativeOpen: false, vglOpen: false,
};
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(api + path, { cache: "no-store", ...init });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Request failed.");
  return data as T;
}

export function WandaFiboWorkspace({ admitted, extendedSetup, variableSteps, advancedPrompt }: { admitted: boolean; advancedPrompt: boolean; extendedSetup: boolean; variableSteps: boolean }) {
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
  const [files, setFiles] = useState<(File | undefined)[]>([]);
  const [drafts, setDrafts] = useState<Record<Workflow, PromptDraft>>({ edit: emptyDraft, generate: emptyDraft });
  const { prompt, negativePrompt, vgl, generatedVgl, negativeOpen, vglOpen } = drafts[mode];
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
  const [imageCount, setImageCount] = useState("1");
  const [steps, setSteps] = useState(4);
  const [seed, setSeed] = useState("42");
  const [randomize, setRandomize] = useState(true);
  const [previews, setPreviews] = useState<(string | undefined)[]>([]);
  const [result, setResult] = useState<Result>();
  const [history, setHistory] = useState<Result[]>([]);
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
  const picker = useRef<HTMLInputElement>(null);
  const slot = useRef(0);
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
      const job = crypto.randomUUID().replaceAll("-", "");
      await request("local/" + mode, { method: "POST", signal, headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...uploads, job_id: job, instruction: prompt.trim(), negative_prompt: negativePrompt.trim(), json_instruction: manualVgl,
          seed: Number(seed), randomize, steps, image_count: Number(imageCount), width: size.width, height: size.height }) });
      setStatus("Rendering on Modal...");
      const end = Date.now() + 8 * 60_000;
      while (!signal.aborted && Date.now() < end) {
        const update = await request<{ finished: boolean; images: Result[]; error?: string }>("local/render/" + job, { signal });
        if (update.finished) {
          if (!update.images[0]) throw new Error(update.error ?? "No image returned.");
          const image = update.images[0];
          setResult(image);
          if (typeof image.json_instruction === "string" && image.json_instruction.trim()) {
            updateDraft(mode, { vgl: image.json_instruction, generatedVgl: true });
          }
          setHistory((items) => [...update.images, ...items].slice(0, 8));
          if (prompt.trim()) setRecent((items) => [prompt.trim(), ...items.filter((item) => item !== prompt.trim())].slice(0, 5));
          setStatus(update.error ?? (update.images.length === 1 ? "Render complete." : update.images.length + " images ready in History."));
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      throw new Error("Render status did not return before the local timeout.");
    } catch (cause) {
      if (!signal.aborted) setStatus(cause instanceof Error ? cause.message : "Render failed.");
    } finally {
      active.current = null;
      if (!signal.aborted) setBusy(false);
    }
  }

  function chooseImage(index: number) {
    if (!admitted || busy) return;
    slot.current = index;
    picker.current?.click();
  }

  function attachImage(file: File, index: number) {
    if (!admitted || busy) return;
    if (index === 0) { setMode("edit"); setResult(undefined); }
    updateDraft("edit", { vgl: "", generatedVgl: false });
    setFiles((previous) => { const next = [...previous]; next[index] = file; return next; });
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
    : !vglValid ? "Enter a non-empty VGL JSON object."
    : !advancedPrompt && (manualVgl || negativePrompt.trim()) ? "Advanced prompts need the private worker update."
    : !manualVgl && !prompt.trim() ? "Enter a prompt or VGL JSON to generate."
    : !/^[1-4]$/.test(imageCount) ? "Choose 1 to 4 images."
    : !seedValid ? "Enter a seed from 0 to 2147483647."
    : "";
  const canSubmit = !busy && !blocker;

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
                onClick={() => { if (mode !== "generate") setResult(undefined); setMode("generate"); }}>
                <ImagePlus aria-hidden="true" />
              </Button>
              <Button type="button" variant="ghost" aria-label="Image Editing" title="Image Editing"
                aria-pressed={mode === "edit"} disabled={busy}
                onClick={() => { if (mode !== "edit") setResult(undefined); setMode("edit"); }}>
                <Pencil aria-hidden="true" />
              </Button>
            </div>
            <section aria-labelledby="wanda-fibo-setup">
              <h2 id="wanda-fibo-setup">Image setup</h2>
              <div className="wanda-fibo-setup-slot">
                <div className="wanda-fibo-tiles" inert={mode !== "edit"}>
                  {slots.map((label, index) => (
                    <div className="wanda-fibo-tile" key={label}>
                      <Button type="button" variant="outline" aria-label={"Choose " + label.toLowerCase() + " image"}
                        title={files[index]?.name ?? label} disabled={!admitted || busy}
                        onClick={() => chooseImage(index)}>
                        {previews[index] ? <img src={previews[index]} alt="" draggable={false} /> : <Plus size={14} aria-hidden="true" />}<span>{label}</span>
                      </Button>
                      {files[index] && <Button type="button" variant="secondary" size="icon-sm"
                        className="wanda-fibo-remove" aria-label={"Remove " + label.toLowerCase() + " image"} disabled={busy}
                        onClick={() => {
                          updateDraft("edit", { vgl: "", generatedVgl: false });
                          setFiles((previous) => previous.map((file, i) => i === index ? undefined : file));
                        }}><X /></Button>}
                    </div>
                  ))}
                </div>
                <div className="wanda-fibo-size" inert={mode !== "generate"}>
                  <div className="wanda-fibo-tile">
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
              placeholder="Describe the result you want…"
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
              <div>
                <label htmlFor="wanda-fibo-seed">Seed</label>
                <div className="wanda-fibo-seed">
                  <Input id="wanda-fibo-seed" type="text" inputMode="numeric" spellCheck={false} autoCorrect="off" autoCapitalize="off" maxLength={10} required={!randomize} value={seed}
                    disabled={!admitted || busy} onChange={(event) => { setSeed(event.target.value); setRandomize(false); }} />
                  <Button type="button" variant={randomize ? "secondary" : "outline"} size="icon-sm"
                    aria-label="Randomize seed" aria-pressed={randomize} disabled={!admitted || busy}
                    onClick={() => setRandomize(!randomize)}><Dices /></Button>
                </div>
              </div>
              <label htmlFor="wanda-fibo-count">Images
                <Input id="wanda-fibo-count" type="number" min={1} max={4} step={1} value={imageCount}
                  disabled={!admitted || busy} onChange={(event) => setImageCount(event.target.value)} />
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
        <section className="wanda-fibo-canvas" aria-label="Canvas"
          onDragOver={(event) => {
            if (admitted && !busy && event.dataTransfer.types.includes("Files")) event.preventDefault();
          }}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files[0];
            if (admitted && !busy && file?.type.startsWith("image/")) attachImage(file, 0);
          }}>
          {!admitted ? (
            <p>Sign in with an admitted RenderLab account to generate. <Link href="/settings" className="underline">Open Settings</Link></p>
          ) : result ? (
            <figure><img src={result.image_data} alt="Generated result" />
              <figcaption>Seed {result.seed} · <a href={result.image_data} download="fibo-result.png">Download image</a></figcaption>
            </figure>
          ) : mode === "edit" && previews[0] ? (
            <figure><img src={previews[0]} alt="Source image" /><figcaption>Source</figcaption></figure>
          ) : (
            <Button type="button" variant="ghost" className="wanda-fibo-canvas-upload" disabled={busy}
              title="Add a source image to start editing" onClick={() => chooseImage(0)}>
              <ImageIcon size={20} aria-hidden="true" /> Drop an image or click to upload
            </Button>
          )}
        </section>
        <aside className="wanda-fibo-history" aria-labelledby="wanda-fibo-history-title">
          <h2 id="wanda-fibo-history-title">History</h2>
          {history.length ? history.map((image, index) => (
            <Button key={index} type="button" variant="outline" onClick={() => setResult(image)}>Render {history.length - index} · {image.seed}</Button>
          )) : <p className="wanda-fibo-caption">Finished images will appear here.</p>}
        </aside>
      </div>
    </section>
  );
}
