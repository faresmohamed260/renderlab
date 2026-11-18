import "server-only";
import { wandaFiboSizes } from "@/features/create/wanda-fibo-sizes";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { after } from "next/server";
import sharp from "sharp";
import { getWandaFiboOwner } from "./hosted-create";

const origin = "http://127.0.0.1:3000";
const mb = 1024 * 1024;
const ttl = 60 * 60 * 1000;
type Job = { owner: string; created: number; finished: boolean; images: Record<string, unknown>[]; error?: string };
type Upload = { owner: string; created: number; data: Buffer };
const shared = globalThis as typeof globalThis & {
  wandaFiboState?: { jobs: Map<string, Job>; uploads: Map<string, Upload>; healthUntil: number; healthCheck?: Promise<boolean> };
};
const state: NonNullable<typeof shared.wandaFiboState> = shared.wandaFiboState ??= { jobs: new Map(), uploads: new Map(), healthUntil: 0 };
const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: { "cache-control": "private, no-store" } });
const error = (message: string, status: number) => json({ error: message }, status);

async function boundedBody(request: Request, limit: number) {
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) return Buffer.concat(chunks, bytes);
      bytes += next.value.length;
      if (bytes > limit) { await reader.cancel(); throw new Error("Body too large"); }
      chunks.push(next.value);
    }
  } finally { reader.releaseLock(); }
}

function bridge(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const child = spawn("C:/Windows/py.exe", ["-3.10", join(process.cwd(), "workers/fibo-studio/wanda_bridge.py")], {
      windowsHide: true, stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });
    const timer = setTimeout(() => child.kill(), 430_000);
    let size = 0;
    const out: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > 16 * mb) child.kill();
      else out.push(chunk);
    });
    child.stderr.resume();
    child.stdin.on("error", () => child.kill());
    child.on("error", (err) => { clearTimeout(timer); reject(err); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0 || size > 16 * mb) { reject(new Error("Modal call failed")); return; }
      try { resolve(JSON.parse(Buffer.concat(out).toString("utf8"))); }
      catch (err) { reject(err); }
    });
    child.stdin.end(JSON.stringify(payload));
  });
}

export async function wandaFibo(request: Request, path: string): Promise<Response> {
  if (process.env.NODE_ENV !== "development" || process.env.RENDERLAB_WANDA_FIBO !== "1"
    || request.headers.get("host") !== "127.0.0.1:3000") return error("Not found.", 404);
  if (request.method === "POST" && request.headers.get("origin") !== origin) {
    return error("Same-origin request required.", 403);
  }
  const owner = await getWandaFiboOwner().catch(() => null);
  if (!owner) return error("An admitted RenderLab account is required.", 401);
  const now = Date.now();
  for (const [id, upload] of state.uploads) if (now - upload.created > ttl) state.uploads.delete(id);
  for (const [id, job] of state.jobs) if (job.finished && now - job.created > ttl) state.jobs.delete(id);
  if (request.method === "GET") {
    if (path === "health") {
      if (state.healthUntil <= now) {
        state.healthCheck ??= bridge({ mode: "health" }).then((value) => {
          const ready = Array.isArray(value.cuda) && value.cuda.length > 0
            && Array.isArray(value.missing_weights) && value.missing_weights.length === 0;
          if (ready) state.healthUntil = Date.now() + 5 * 60_000;
          return ready;
        }).catch(() => false).finally(() => { state.healthCheck = undefined; });
        await state.healthCheck;
      }
      return json({ model: "FIBO 2.0 Edit Turbo", engine: "ComfyUI on Modal", generation_ready: state.healthUntil > Date.now() });
    }
    if (path === "local/history") return json([]);
    if (path === "local/queue") return json({ jobs: [...state.jobs].flatMap(([id, job]) =>
      job.owner === owner && !job.finished ? [{ id, state: "running", completed: 0, cancelling: false }] : []) });
    const render = /^local\/render\/([a-f0-9]{32})$/.exec(path);
    const upload = /^local\/upload\/([a-f0-9]{32}\.png)$/.exec(path);
    if (render) {
      const job = state.jobs.get(render[1]);
      if (!job || job.owner !== owner) return error("Job not found.", 404);
      return json({ finished: job.finished, state: job.finished ? "finished" : "running",
        images: job.images, ...(job.error ? { error: job.error } : {}) });
    }
    if (upload) {
      const file = state.uploads.get(upload[1]);
      if (!file || file.owner !== owner) return error("Image not found.", 404);
      return new Response(new Uint8Array(file.data), { headers: {
        "content-type": "image/png", "cache-control": "private, no-store",
      } });
    }
    return error("This Studio endpoint is not connected on WANDA.", 404);
  }
  if (path === "gradio_api/upload") {
    try {
      const raw = await boundedBody(request, 16 * mb);
      const fields = await new Response(new Uint8Array(raw), { headers: {
        "content-type": request.headers.get("content-type") ?? "",
      } }).formData();
      const file = fields.get("files");
      if (!(file instanceof File)) return error("Choose an image to upload.", 400);
      const data = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 16_777_216 })
        .rotate().png().toBuffer();
      if (data.length > 16 * mb) return error("Image exceeds the private worker limit.", 413);
      const bytes = [...state.uploads.values()].reduce((total, upload) => total + upload.data.length, 0);
      if (state.uploads.size >= 32 || bytes + data.length > 96 * mb) return error("Local upload storage is full.", 429);
      const name = randomBytes(16).toString("hex") + ".png";
      state.uploads.set(name, { owner, data, created: now });
      return json([name]);
    } catch { return error("Invalid image or upload exceeds 16 MB.", 400); }
  }
  if (path === "local/edit" || path === "local/generate") {
    let data: Record<string, unknown>;
    try {
      const value: unknown = JSON.parse((await boundedBody(request, 64 * 1024)).toString("utf8"));
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
      data = value as Record<string, unknown>;
    } catch { return error("Invalid request.", 400); }
    const mode = path === "local/edit" ? "edit" : "generate";
    const id = data.job_id;
    const prompt = data.instruction;
    if (typeof id !== "string" || !/^[a-f0-9]{32}$/.test(id)
      || typeof prompt !== "string" || !prompt.trim() || prompt.length > 4000) {
      return error("Enter a prompt and submit a valid job.", 400);
    }
    const width = data.width ?? 1024;
    const height = data.height ?? 1024;
    if (data.mask || data.json_instruction || data.negative_prompt || data.append_to
      || (data.steps != null && data.steps !== 4) || (data.image_count != null && data.image_count !== 1)
      || (mode === "edit" && data.inspiration != null)
      || (mode === "generate" && !wandaFiboSizes.some((size) => size.width === width && size.height === height))) {
      return error("Use a supported preset, plain prompt, four steps and one output.", 422);
    }
    const extended = mode === "generate" && (width !== 1024 || height !== 1024 || data.inspiration != null);
    if (extended && process.env.RENDERLAB_WANDA_FIBO_EXTENDED !== "1") {
      return error("Inspiration and non-square renders need the private worker update.", 503);
    }
    let inspiration: string | undefined;
    if (data.inspiration != null) {
      const file = typeof data.inspiration === "string" ? state.uploads.get(data.inspiration) : null;
      if (!file || file.owner !== owner) return error("Inspiration image is missing or expired.", 400);
      inspiration = file.data.toString("base64");
    }
    const images: string[] = [];
    if (mode === "edit") {
      if (!data.source) return error("Upload a source image first.", 400);
      for (const field of ["source", "ref2", "ref3", "ref4"]) {
        if (!data[field]) continue;
        const file = typeof data[field] === "string" ? state.uploads.get(data[field] as string) : null;
        if (!file || file.owner !== owner) return error("An input is missing or expired.", 400);
        images.push(file.data.toString("base64"));
      }
    }
    const seed = data.randomize === true ? randomBytes(4).readUInt32BE() % 2147483647 + 1 : data.seed ?? 42;
    if (typeof seed !== "number" || !Number.isInteger(seed) || seed < 0 || seed > 2147483647) {
      return error("Invalid seed.", 400);
    }
    if (state.jobs.has(id)) return error("Job already exists.", 409);
    if (state.jobs.size >= 12 || [...state.jobs.values()].some((job) => !job.finished)) {
      return error("The private worker is busy or local storage is full.", 429);
    }
    const job: Job = { owner, created: now, finished: false, images: [] };
    state.jobs.set(id, job);
    after(async () => {
      try {
        const result = await bridge({ mode, instruction: prompt, seed, images, width, height, extended, inspiration });
        if (typeof result.png !== "string" || !result.png.startsWith("iVBORw0KGgo")) throw new Error();
        job.images.push({ image_data: "data:image/png;base64," + result.png, filename: id + ".png",
          seed, json_instruction: result.prompt, seconds: result.seconds, vgl_seconds: result.vgl_seconds,
          total_seconds: result.total_seconds });
      } catch { job.error = "The private Modal worker did not return a render."; }
      finally { job.finished = true; }
    });
    return json({ id, state: "running" }, 202);
  }
  return error("This Studio endpoint is not connected on WANDA.", 404);
}
