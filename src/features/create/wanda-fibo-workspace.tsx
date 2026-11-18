"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Clock, Dices, Images, ListOrdered, Plus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const api = "/wanda-fibo/";
const slots = ["Source", "Reference 2", "Reference 3", "Reference 4"];
type Result = { image_data: string; seed: number };
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(api + path, { cache: "no-store", ...init });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Request failed.");
  return data as T;
}

export function WandaFiboWorkspace({ admitted }: { admitted: boolean }) {
  const [mode, setMode] = useState<"edit" | "generate">("edit");
  const [files, setFiles] = useState<(File | undefined)[]>([]);
  const [prompt, setPrompt] = useState("");
  const [seed, setSeed] = useState("42");
  const [randomize, setRandomize] = useState(true);
  const [previews, setPreviews] = useState<(string | undefined)[]>([]);
  const [result, setResult] = useState<Result>();
  const [history, setHistory] = useState<Result[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
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
    if (!admitted || active.current || !prompt.trim() || (mode === "edit" && !files[0])) return;
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
      const job = crypto.randomUUID().replaceAll("-", "");
      await request("local/" + mode, { method: "POST", signal, headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...uploads, job_id: job, instruction: prompt.trim(),
          seed: Number(seed), randomize, steps: 4, image_count: 1, width: 1024, height: 1024 }) });
      setStatus("Rendering on Modal...");
      const end = Date.now() + 8 * 60_000;
      while (!signal.aborted && Date.now() < end) {
        const update = await request<{ finished: boolean; images: Result[]; error?: string }>("local/render/" + job, { signal });
        if (update.finished) {
          if (update.error || !update.images[0]) throw new Error(update.error ?? "No image returned.");
          const image = update.images[0];
          setResult(image);
          setHistory((items) => [image, ...items].slice(0, 8));
          setRecent((items) => [prompt.trim(), ...items.filter((item) => item !== prompt.trim())].slice(0, 5));
          setStatus("Render complete.");
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
    if (index === 0) setResult(undefined);
    setFiles((previous) => { const next = [...previous]; next[index] = file; return next; });
  }

  const canSubmit = admitted && !busy && !!prompt.trim() && (mode !== "edit" || !!files[0]);

  return (
    <section className="wanda-fibo-workspace mx-auto w-full" aria-label="Create with FIBO">
      <div className="wanda-fibo-toolbar">
        <div className="wanda-fibo-modes" role="group" aria-label="Workflow">
          <Button type="button" variant={mode === "generate" ? "secondary" : "ghost"} aria-pressed={mode === "generate"}
            disabled={busy} onClick={() => { if (mode !== "generate") setResult(undefined); setMode("generate"); }}>Text to Image</Button>
          <Button type="button" variant={mode === "edit" ? "secondary" : "ghost"} aria-pressed={mode === "edit"}
            disabled={busy} onClick={() => { if (mode !== "edit") setResult(undefined); setMode("edit"); }}>Image Editing</Button>
        </div>
        <details className="wanda-fibo-queue">
          <summary><ListOrdered size={16} aria-hidden="true" /> Render queue</summary>
          <p role="status">{busy ? status : "No active render in this workspace."}</p>
        </details>
      </div>
      <div className="wanda-fibo-grid">
        <form className="wanda-fibo-controls" onSubmit={submit}>
          <div className="wanda-fibo-fields">
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
                        onClick={() => setFiles((previous) => previous.map((file, i) => i === index ? undefined : file))}><X /></Button>}
                    </div>
                  ))}
                </div>
                <div className="wanda-fibo-size" inert={mode !== "generate"}>
                  <Button type="button" variant="outline" disabled>Inspiration</Button>
                  <span>Square · 1024 × 1024</span>
                </div>
              </div>
              <input ref={picker} type="file" accept="image/*" hidden onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (file) attachImage(file, slot.current);
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
            <Textarea id="wanda-fibo-prompt" required spellCheck value={prompt} disabled={!admitted || busy} maxLength={4000}
              placeholder={mode === "edit" ? "Describe the edits you want…" : "Describe the image you want…"}
              onChange={(event) => setPrompt(event.target.value)} />
            <div className="wanda-fibo-extra">
              <Button variant="ghost" type="button" disabled>Negative prompt</Button>
              <Button variant="ghost" type="button" disabled>VGL JSON</Button>
            </div>
          </div>
          <div className="wanda-fibo-dock">
            <div className="wanda-fibo-settings">
              <div>
                <label htmlFor="wanda-fibo-seed">Seed</label>
                <div className="wanda-fibo-seed">
                  <Input id="wanda-fibo-seed" type="number" min={0} max={2147483647} required value={seed}
                    disabled={!admitted || busy || randomize} onChange={(event) => setSeed(event.target.value)} />
                  <Button type="button" variant={randomize ? "secondary" : "outline"} size="icon-sm"
                    aria-label="Randomize seed" aria-pressed={randomize} disabled={!admitted || busy}
                    onClick={() => setRandomize(!randomize)}><Dices /></Button>
                </div>
              </div>
              <label>Images<Input type="number" value={1} disabled /></label>
              <label className="wanda-fibo-steps"><span>Steps <output>4</output></span><Input type="range" min={1} max={8} value={4} disabled /></label>
            </div>
            <Button type="submit" className="wanda-fibo-generate" disabled={!canSubmit}>
              <Sparkles aria-hidden="true" />{busy ? "Rendering…" : "Generate"}
            </Button>
            {status && <p className="wanda-fibo-caption" role="status">{status}</p>}
          </div>
        </form>
        <section className="wanda-fibo-canvas" aria-label="Canvas"
          onDragOver={(event) => {
            if (mode === "edit" && admitted && !busy && event.dataTransfer.types.includes("Files")) event.preventDefault();
          }}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files[0];
            if (mode === "edit" && file?.type.startsWith("image/")) attachImage(file, 0);
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
            mode === "edit" ? (
              <Button type="button" variant="ghost" className="wanda-fibo-canvas-upload" disabled={busy}
                onClick={() => chooseImage(0)}>
                <Images size={20} aria-hidden="true" /> Drop an image or click to upload
              </Button>
            ) : <p className="wanda-fibo-caption">Your generated image will appear here.</p>
          )}
        </section>
        <aside className="wanda-fibo-history" aria-labelledby="wanda-fibo-history-title">
          <h2 id="wanda-fibo-history-title">History</h2>
          {history.length ? history.map((image, index) => (
            <Button key={index} type="button" variant="outline" onClick={() => setResult(image)}>Render {history.length - index} · {image.seed}</Button>
          )) : <p className="wanda-fibo-caption">No renders in this session.</p>}
        </aside>
      </div>
    </section>
  );
}
