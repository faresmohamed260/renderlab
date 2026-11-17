"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const api = "/wanda-fibo/";
const slots = ["Source", "Reference 1", "Reference 2", "Reference 3"];
type Result = { image_data: string; seed: number };
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(api + path, { cache: "no-store", ...init });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Request failed.");
  return data as T;
}

export function FiboStudioFrame() {
  const [mode, setMode] = useState<"edit" | "generate">("edit");
  const [files, setFiles] = useState<(File | undefined)[]>([]);
  const [prompt, setPrompt] = useState("");
  const [seed, setSeed] = useState("42");
  const [randomize, setRandomize] = useState(true);
  const [source, setSource] = useState<string>();
  const [result, setResult] = useState<Result>();
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  useEffect(() => {
    if (!files[0]) { setSource(undefined); return; }
    const url = URL.createObjectURL(files[0]);
    setSource(url);
    return () => URL.revokeObjectURL(url);
  }, [files]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (active.current || !prompt.trim() || (mode === "edit" && !files[0])) return;
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
          setResult(update.images[0]);
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

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 p-4 lg:grid-cols-[22rem_1fr]">
      <form className="space-y-4" onSubmit={submit}>
        <div><h1 className="text-xl font-semibold">FIBO Studio</h1><p className="text-sm">Private Modal worker</p></div>
        <div className="flex gap-2" aria-label="Workflow mode">
          <Button type="button" disabled={busy} variant={mode === "edit" ? "default" : "outline"} aria-pressed={mode === "edit"} onClick={() => { setMode("edit"); setResult(undefined); }}>Image edit</Button>
          <Button type="button" disabled={busy} variant={mode === "generate" ? "default" : "outline"} aria-pressed={mode === "generate"} onClick={() => { setMode("generate"); setResult(undefined); }}>Text to image</Button>
        </div>
        {mode === "edit" && <fieldset className="grid gap-3" disabled={busy}><legend>Image inputs</legend>
          {slots.map((label, index) => <label key={label} className="grid gap-1 text-sm">{label}
            <Input type="file" accept="image/*" required={index === 0} onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              setFiles((previous) => { const next = [...previous]; next[index] = file; return next; });
            }} /></label>)}
        </fieldset>}
        <label className="grid gap-1">Prompt
          <Textarea required value={prompt} disabled={busy} maxLength={4000} onChange={(event) => setPrompt(event.target.value)} />
        </label>
        <label className="grid gap-1">Seed
          <Input type="number" min={0} max={2147483647} value={seed} disabled={busy || randomize} onChange={(event) => setSeed(event.target.value)} />
        </label>
        <label className="flex gap-2"><Input className="h-4 w-4" type="checkbox" checked={randomize} disabled={busy} onChange={(event) => setRandomize(event.target.checked)} /> Randomize seed</label>
        <p className="text-sm">Four steps, one output{mode === "generate" ? ", 1024 × 1024" : ""}.</p>
        <Button type="submit" disabled={busy || !prompt.trim() || (mode === "edit" && !files[0])}>{busy ? "Rendering..." : mode === "edit" ? "Generate edit" : "Generate image"}</Button>
        <p role="status" className="text-sm">{status}</p>
      </form>
      <section className="grid content-start gap-4" aria-label="Images">
        {mode === "edit" && source && <figure><figcaption>Source</figcaption><img className="max-h-[33vh] max-w-full rounded-lg object-contain" src={source} alt="Source image" /></figure>}
        {result && <figure><figcaption>Result · seed {result.seed}</figcaption>
          <img className="max-h-[60vh] max-w-full rounded-lg object-contain" src={result.image_data} alt="Generated result" />
          <a className="underline" href={result.image_data} download="fibo-result.png">Download image</a>
        </figure>}
      </section>
    </main>
  );
}
