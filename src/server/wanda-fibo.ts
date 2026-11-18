import "server-only";
import { wandaFiboSizes } from "@/features/create/wanda-fibo-sizes";
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, readdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after } from "next/server";
import sharp from "sharp";
import { getWandaFiboOwner } from "./hosted-create";

const origin = "http://127.0.0.1:3000";
const mb = 1024 * 1024;
const ttl = 60 * 60 * 1000;
const previewCaptions: ReadonlyMap<unknown, string> = new Map([
  ["vgl", "Writing VGL…"], ["prepare", "Preparing the render…"], ["denoise", "Starting denoising…"],
  ["shapes", "Resolving shapes…"], ["details", "Bringing out details…"],
  ["refine", "Refining details…"], ["finish", "Finishing image…"],
]);
type PreviewUpdate = { frame: string; blur?: number } | { caption: string };
type QueueRecord = { id: string; created: number; count: number; payload: Record<string, unknown> & { seed: number } };
type Job = { pending?: { bytes: number; record: QueueRecord }; writing?: boolean; cancelToken?: string; cancelling?: boolean; owner: string; created: number; finished: boolean; images: Record<string, unknown>[]; preview?: string; previewBlur?: number; caption?: string; error?: string };
type Upload = { owner: string; created: number; data: Buffer };
const shared = globalThis as typeof globalThis & {
  wandaFiboState?: { jobs: Map<string, Job>; uploads: Map<string, Upload>; healthUntil: number; healthCheck?: Promise<boolean>; queueLoads?: Map<string, Promise<void>> };
};
const state: NonNullable<typeof shared.wandaFiboState> = shared.wandaFiboState ??= { jobs: new Map(), uploads: new Map(), healthUntil: 0 };
const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: { "cache-control": "private, no-store" } });
const error = (message: string, status: number) => json({ error: message }, status);

type ArchiveRun = { id: string; images: Record<string, unknown>[]; error?: string };
const archiveLimit = 32 * mb;
const archiveRoot = join(process.env.LOCALAPPDATA || tmpdir(), "RenderLab", "WandaFiboHistory");
function archivePath(owner: string) {
  return join(archiveRoot, createHash("sha256").update("wanda-fibo-history:" + owner).digest("hex") + ".json");
}
async function readArchive(owner: string): Promise<ArchiveRun[]> {
  try {
    const data = await readFile(archivePath(owner));
    if (data.length > archiveLimit) throw new Error("History file is oversized");
    const archive: unknown = JSON.parse(data.toString("utf8"));
    if (!Array.isArray(archive)) throw new Error("Invalid History file");
    return archive;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}
async function saveHistory(id: string, job: Job) {
  const path = archivePath(job.owner);
  const older = await readArchive(job.owner);
  const images = job.images.map(({ image_data, filename, seed }) => ({ image_data, filename, seed }));
  const runs: ArchiveRun[] = [{ id, images, error: job.error }, ...older.filter((item) => item.id !== id)].slice(0, 8);
  let data = JSON.stringify(runs);
  while (runs.length > 1 && Buffer.byteLength(data) > archiveLimit) {
    runs.pop();
    data = JSON.stringify(runs);
  }
  if (Buffer.byteLength(data) > archiveLimit) throw new Error("History limit exceeded");
  await mkdir(archiveRoot, { recursive: true });
  const temp = path + "." + randomBytes(8).toString("hex") + ".tmp";
  try {
    await writeFile(temp, data, { flag: "wx", mode: 0o600 });
    await rename(temp, path);
  } finally { await unlink(temp).catch(() => {}); }
}

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

function bridge(payload: Record<string, unknown>, timeoutMs = 430_000, onPreview?: (update: PreviewUpdate) => void): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const child = spawn("C:/Windows/py.exe", ["-3.10", join(process.cwd(), "workers/fibo-studio/wanda_bridge.py")], {
      windowsHide: true, stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });
    const timer = setTimeout(() => child.kill(), timeoutMs);
    let size = 0;
    let pending: Buffer[] = [];
    let result: Record<string, unknown> | undefined;
    let malformed = false;
    function line() {
      const raw = Buffer.concat(pending).toString("utf8").trim();
      pending = [];
      if (!raw) return;
      const value = JSON.parse(raw);
      if (!value || typeof value !== "object" || Array.isArray(value) || result) throw new Error("Invalid bridge response");
      if ("frame" in value) {
        if (!onPreview || typeof value.frame !== "string" || value.frame.length > 256 * 1024
          || !/^\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(value.frame)) throw new Error("Invalid preview frame");
        const blur = typeof value.blur === "number" && Number.isFinite(value.blur) && value.blur >= 30 && value.blur <= 90 ? value.blur : undefined;
        onPreview({ frame: "data:image/jpeg;base64," + value.frame, blur });
      } else if ("phase" in value) {
        const caption = previewCaptions.get(value.phase);
        if (!onPreview || !caption) throw new Error("Invalid preview phase");
        onPreview({ caption });
      } else result = value;
    }
    child.stdout.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > (onPreview ? 20 : 16) * mb) { child.kill(); return; }
      try {
        let start = 0;
        for (let end = chunk.indexOf(10); end !== -1; end = chunk.indexOf(10, start)) {
          pending.push(chunk.subarray(start, end));
          line();
          start = end + 1;
        }
        if (start < chunk.length) pending.push(chunk.subarray(start));
      } catch { malformed = true; child.kill(); }
    });
    child.stderr.resume();
    child.stdin.on("error", () => child.kill());
    child.on("error", (err) => { clearTimeout(timer); reject(err); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0 || malformed || size > (onPreview ? 20 : 16) * mb) { reject(new Error("Modal call failed")); return; }
      try {
        if (pending.length) line();
        if (!result) throw new Error("Missing bridge result");
        resolve(result);
      }
      catch (err) { reject(err); }
    });
    child.stdin.end(JSON.stringify(payload));
  });
}

const queueLimit = 48 * mb;
const queueRoot = join(process.env.LOCALAPPDATA || tmpdir(), "RenderLab", "WandaFiboQueue");
function queueDirectory(owner: string) {
  return join(queueRoot, createHash("sha256").update("wanda-fibo-queue:" + owner).digest("hex"));
}
function queuePath(owner: string, id: string) { return join(queueDirectory(owner), id + ".json"); }

async function storeQueueRecord(owner: string, record: QueueRecord) {
  const data = JSON.stringify(record);
  if (Buffer.byteLength(data) > queueLimit) throw new Error("Queue entry exceeds the disk limit");
  const path = queuePath(owner, record.id);
  const temp = path + "." + randomBytes(8).toString("hex") + ".tmp";
  await mkdir(queueDirectory(owner), { recursive: true });
  try {
    await writeFile(temp, data, { flag: "wx", mode: 0o600 });
    await rename(temp, path);
  } finally { await unlink(temp).catch(() => {}); }
}

async function restoreWaiting(owner: string) {
  state.queueLoads ??= new Map();
  let loading = state.queueLoads.get(owner);
  if (!loading) {
    loading = (async () => {
      const names = await readdir(queueDirectory(owner)).catch((cause: NodeJS.ErrnoException) => {
        if (cause.code === "ENOENT") return [];
        throw cause;
      });
      const records: { record: QueueRecord; bytes: number }[] = [];
      for (const name of names.filter((entry) => /^[a-f0-9]{32}\.json$/.test(entry)).slice(0, 12)) {
        const id = name.slice(0, -5);
        if (state.jobs.has(id)) continue;
        const file = await readFile(queuePath(owner, id)).catch((cause: NodeJS.ErrnoException) => {
          if (cause.code === "ENOENT") return undefined;
          throw cause;
        });
        if (!file || file.length > queueLimit) continue;
        let record: QueueRecord;
        try { record = JSON.parse(file.toString("utf8")); } catch { continue; }
        if (!record || record.id !== id || !Number.isFinite(record.created)
          || !Number.isInteger(record.count) || record.count < 1 || record.count > 4
          || !record.payload || !Number.isInteger(record.payload.seed)
          || !["generate", "edit"].includes(String(record.payload.mode))) continue;
        if (Date.now() - record.created > ttl) {
          await unlink(queuePath(owner, id)).catch(() => {});
          continue;
        }
        const { images, inspiration, mask } = record.payload;
        const bytes = (Array.isArray(images) ? images : []).reduce<number>((sum, value) => sum + String(value).length, 0)
          + (typeof inspiration === "string" ? inspiration.length : 0) + (typeof mask === "string" ? mask.length : 0);
        records.push({ record, bytes });
      }
      for (const { record, bytes } of records.sort((a, b) => a.record.created - b.record.created)) {
        const outstanding = [...state.jobs.values()].filter((job) => !job.finished);
        if (state.jobs.has(record.id)) continue;
        if (state.jobs.size >= 12 || outstanding.length >= 3
          || outstanding.reduce((sum, job) => sum + (job.pending?.bytes ?? 0), bytes) > queueLimit) break;
        state.jobs.set(record.id, { owner, created: record.created, finished: false, images: [], pending: { record, bytes } });
      }
    })().finally(() => state.queueLoads?.delete(owner));
    state.queueLoads.set(owner, loading);
  }
  await loading;
}

async function drainWandaQueue() {
  while (true) {
    const entries = [...state.jobs.values()];
    if (entries.some((job) => !job.finished && !job.pending)) return;
    const next = entries.filter((job) => !job.finished && job.pending).sort((a, b) => a.created - b.created)[0];
    if (!next?.pending || next.writing) return;
    const { record } = next.pending;
    next.pending = undefined;
    try {
      // A job is never re-submitted after relay restart if its GPU call may already have begun.
      await unlink(queuePath(next.owner, record.id));
    } catch {
      next.error = "Could not claim this waiting render. No render was submitted.";
      next.finished = true;
      continue;
    }
    if (Date.now() - record.created > ttl) {
      next.error = "This waiting render expired before it started.";
      next.finished = true;
      continue;
    }
    await runQueuedRender(next, record);
  }
}

async function runQueuedRender(job: Job, record: QueueRecord) {
  const { id, count, payload } = record;
  if ((payload.extended && process.env.RENDERLAB_WANDA_FIBO_EXTENDED !== "1")
    || (payload.mask && process.env.RENDERLAB_WANDA_FIBO_MASKS !== "1")
    || (payload.steps !== 4 && process.env.RENDERLAB_WANDA_FIBO_VARIABLE_STEPS !== "1")
    || ((payload.negative_prompt || payload.json_instruction) && process.env.RENDERLAB_WANDA_FIBO_ADVANCED_PROMPT !== "1")) {
    job.error = "This waiting render uses a capability no longer enabled on WANDA.";
    job.finished = true;
    return;
  }
  try {
    const deadline = Date.now() + 430_000;
    let batchBytes = 0;
    let retainedBytes = [...state.jobs.values()].reduce((total, entry) =>
      total + entry.images.reduce((bytes, image) => bytes + String(image.image_data).length, 0), 0);
    for (let index = 0; index < count; index++) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new Error("Render time limit exceeded");
      const imageSeed = (payload.seed + index) % 2147483648;
      job.preview = undefined;
      job.previewBlur = undefined;
      job.caption = undefined;
      const preview = process.env.RENDERLAB_WANDA_FIBO_LIVE_PREVIEW === "1";
      job.cancelToken = preview && process.env.RENDERLAB_WANDA_FIBO_CANCEL === "1" ? randomBytes(16).toString("hex") : undefined;
      const result = await bridge({
        ...payload, preview, seed: imageSeed, cancel_token: job.cancelToken,
      }, remaining, preview ? (update) => {
        if (job.cancelling) return;
        if ("frame" in update) { job.preview = update.frame; job.previewBlur = update.blur; }
        else job.caption = update.caption;
      } : undefined);
      job.cancelToken = undefined;
      if (result.cancelled === true) {
        job.error = job.images.length ? "Render cancelled. Completed images are in History." : "Render cancelled.";
        break;
      }
      if (typeof result.png !== "string" || !result.png.startsWith("iVBORw0KGgo")) throw new Error("Invalid PNG");
      batchBytes += result.png.length;
      retainedBytes += result.png.length + "data:image/png;base64,".length;
      if (batchBytes > 16 * mb || retainedBytes > 96 * mb) throw new Error("Batch exceeds the preview result limit");
      job.images.push({ image_data: "data:image/png;base64," + result.png,
        filename: id + "-" + (index + 1) + ".png", seed: imageSeed, json_instruction: result.prompt,
        seconds: result.seconds, vgl_seconds: result.vgl_seconds, total_seconds: result.total_seconds });
      if (job.cancelling && index + 1 < count) {
        job.error = "Remaining images cancelled. Completed images are in History.";
        break;
      }
    }
  } catch {
    job.error = job.images.length
      ? "Only " + job.images.length + " of " + count + " images finished. See History for the completed images."
      : "The private Modal worker did not return a render.";
  }
  finally {
    try {
      if (job.images.length) await saveHistory(id, job);
    } catch {
      job.error = [job.error, "This result could not be saved to local History."].filter(Boolean).join(" ");
    } finally {
      job.preview = undefined;
      job.previewBlur = undefined;
      job.caption = undefined;
      job.cancelToken = undefined;
      job.cancelling = false;
      job.finished = true;
    }
  }
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
  if (/^local\/(?:queue(?:\/|$)|render\/|generate$|edit$)/.test(path)) {
    try { await restoreWaiting(owner); }
    catch { return error("Local Queue could not be opened.", 503); }
  }
  if (request.method === "GET") {
    if ((path === "local/queue" || path.startsWith("local/render/"))
      && [...state.jobs.values()].some((job) => job.owner === owner && job.pending && !job.writing)) after(drainWandaQueue);
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
    if (path === "local/history") {
      try { return json(await readArchive(owner)); }
      catch { return error("Local History could not be opened.", 503); }
    }
    if (path === "local/queue") return json({ jobs: [...state.jobs].flatMap(([id, job]) =>
      job.owner === owner && !job.finished ? [{ id, state: job.pending ? "pending" : "running", completed: job.images.length, cancelling: !!job.cancelling }] : []) });
    const render = /^local\/render\/([a-f0-9]{32})$/.exec(path);
    const upload = /^local\/upload\/([a-f0-9]{32}\.png)$/.exec(path);
    if (render) {
      const offset = new URL(request.url).searchParams.get("afterImages");
      const afterImages = offset !== null && /^[0-4]$/.test(offset) ? Number(offset) : 0;
      const job = state.jobs.get(render[1]);
      if (!job || job.owner !== owner) {
        try {
          const stored = (await readArchive(owner)).find((item) => item.id === render[1]);
          if (stored) return json({ finished: true, state: "finished", images: stored.images.slice(afterImages), imageOffset: afterImages, error: stored.error });
        } catch { return error("Local History could not be opened.", 503); }
        return error("Job not found.", 404);
      }
      return json({ finished: job.finished, state: job.finished ? "finished" : job.pending ? "pending" : "running",
        images: job.images.slice(afterImages), imageOffset: afterImages, canCancel: !!job.cancelToken, cancelling: !!job.cancelling, ...(job.preview ? { preview: job.preview, previewBlur: job.previewBlur } : {}), ...(job.caption ? { caption: job.caption } : {}), ...(job.error ? { error: job.error } : {}) });
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
  const cancel = /^local\/queue\/([a-f0-9]{32})\/cancel$/.exec(path);
  if (request.method === "POST" && cancel) {
    const job = state.jobs.get(cancel[1]);
    if (!job || job.owner !== owner) return error("Job not found.", 404);
    if (!job.pending) {
      const token = job.cancelToken;
      if (job.finished || !token) return error("This render cannot be cancelled.", 409);
      if (job.cancelling) return json({ accepted: true }, 202);
      job.cancelling = true;
      try {
        const result = await bridge({ mode: "cancel", token }, 18_000);
        if (result.accepted === true) return json({ accepted: true }, 202);
      } catch { /* Worker unavailable; allow a retry without marking the render cancelled. */ }
      job.cancelling = false;
      return error("Could not cancel this render. Try again.", 409);
    }
    if (job.writing) return error("Wait for Queue to finish updating.", 409);
    job.writing = true;
    try { await unlink(queuePath(owner, cancel[1])); }
    catch { return error("Could not remove the waiting render.", 503); }
    finally { job.writing = false; }
    job.pending = undefined;
    job.finished = true;
    job.error = "Removed from Queue.";
    after(drainWandaQueue);
    return json({ id: cancel[1], state: "finished" });
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
    const prompt = data.instruction ?? "";
    const negative = data.negative_prompt ?? "";
    const rawVgl = data.json_instruction ?? "";
    if (typeof negative !== "string" || negative.length > 4000 || typeof rawVgl !== "string" || rawVgl.length > 8192) {
      return error("Advanced prompt exceeds the preview limits.", 422);
    }
    const vgl = rawVgl.trim();
    if (vgl) {
      try {
        const value: unknown = JSON.parse(vgl);
        if (value === null || typeof value !== "object" || Array.isArray(value) || !Object.keys(value).length) throw new Error();
      } catch { return error("Enter a non-empty VGL JSON object.", 422); }
    }
    if ((vgl || negative.trim()) && process.env.RENDERLAB_WANDA_FIBO_ADVANCED_PROMPT !== "1") {
      return error("Advanced prompts need the private worker update.", 503);
    }
    if (typeof id !== "string" || !/^[a-f0-9]{32}$/.test(id)
      || typeof prompt !== "string" || (!prompt.trim() && !vgl) || prompt.length > 4000) {
      return error("Enter a prompt or VGL JSON and submit a valid job.", 400);
    }
    const steps = data.steps ?? 4;
    const count = data.image_count ?? 1;
    if (typeof steps !== "number" || !Number.isInteger(steps) || steps < 1 || steps > 8
      || typeof count !== "number" || !Number.isInteger(count) || count < 1 || count > 4) {
      return error("Choose 1 to 8 steps and 1 to 4 images.", 422);
    }
    if (steps !== 4 && process.env.RENDERLAB_WANDA_FIBO_VARIABLE_STEPS !== "1") {
      return error("Adjustable steps need the private worker update.", 503);
    }
    const width = data.width ?? 1024;
    const height = data.height ?? 1024;
    if (data.append_to
      || (mode === "edit" && data.inspiration != null)
      || (mode === "generate" && !wandaFiboSizes.some((size) => size.width === width && size.height === height))) {
      return error("Use a supported preset without history appends.", 422);
    }
    const extended = mode === "generate" && (width !== 1024 || height !== 1024 || (data.inspiration != null && !vgl));
    if (extended && process.env.RENDERLAB_WANDA_FIBO_EXTENDED !== "1") {
      return error("Inspiration and non-square renders need the private worker update.", 503);
    }
    let inspiration: string | undefined;
    if (data.inspiration != null && !vgl) {
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
    let mask: string | undefined;
    if (data.mask != null) {
      if (mode !== "edit" || images.length !== 1) return error("A mask requires one source and no references.", 422);
      if (process.env.RENDERLAB_WANDA_FIBO_MASKS !== "1") return error("Masked edits need the private worker update.", 503);
      const region = typeof data.mask === "string" ? state.uploads.get(data.mask) : undefined;
      if (!region || region.owner !== owner) return error("Mask is missing or expired.", 400);
      mask = region.data.toString("base64");
    }
    const seed = data.randomize === true ? randomBytes(4).readUInt32BE() % 2147483647 + 1 : data.seed ?? 42;
    if (typeof seed !== "number" || !Number.isInteger(seed) || seed < 0 || seed > 2147483647) {
      return error("Invalid seed.", 400);
    }
    if (state.jobs.has(id)) return error("Job already exists.", 409);
    const outstanding = [...state.jobs.values()].filter((entry) => !entry.finished);
    const bytes = images.reduce((total, image) => total + image.length, 0)
      + (inspiration?.length ?? 0) + (mask?.length ?? 0);
    if (bytes > queueLimit - 64 * 1024) return error("Inputs exceed the private Queue limit.", 413);
    const waitingBytes = outstanding.reduce((total, entry) => total + (entry.pending?.bytes ?? 0), 0);
    if (state.jobs.size >= 12 || outstanding.length >= 3 || (outstanding.length > 0 && waitingBytes + bytes > 48 * mb)) {
      return error("The private render queue is full.", 429);
    }
    const job: Job = { owner, created: now, finished: false, images: [] };
    const record: QueueRecord = {
      id, created: now, count,
      payload: { mode, instruction: prompt, seed, images, mask, width, height, extended, inspiration, steps,
        negative_prompt: negative.trim(), json_instruction: vgl },
    };
    job.pending = { bytes, record };
    job.writing = true;
    state.jobs.set(id, job);
    try {
      await storeQueueRecord(owner, record);
    } catch {
      state.jobs.delete(id);
      return error("Local Queue could not save this render.", 503);
    } finally { job.writing = false; }
    after(drainWandaQueue);
    return json({ id, state: outstanding.length ? "pending" : "running" }, 202);
  }
  return error("This Studio endpoint is not connected on WANDA.", 404);
}
