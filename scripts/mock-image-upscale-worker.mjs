import http from "node:http";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

const port = Number(process.env.RENDERLAB_TEST_UPSCALE_WORKER_PORT || 4320);
const jobs = new Map();

function json(response, status, body) {
  const payload = Buffer.from(JSON.stringify(body));
  response.writeHead(status, {
    "content-type": "application/json",
    "content-length": String(payload.length),
  });
  response.end(payload);
}

async function bodyBuffer(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function parseUpscaleRequest(request) {
  const body = await bodyBuffer(request);
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) headers.set(key, value.join(", "));
    else if (value != null) headers.set(key, String(value));
  }
  const parsed = new Request(`http://127.0.0.1:${port}/jobs/upscale`, {
    method: "POST",
    headers,
    body,
  });
  const form = await parsed.formData();
  const file = form.get("image_file");
  const scale = Number(form.get("scale"));
  if (!(file instanceof Blob) || scale !== 2) throw new Error("invalid fixed-2x Upscale request");
  const input = Buffer.from(await file.arrayBuffer());
  const metadata = await sharp(input).rotate().metadata();
  if (!metadata.width || !metadata.height) throw new Error("input geometry unavailable");
  const output = await sharp(input)
    .rotate()
    .resize(metadata.width * 2, metadata.height * 2, { fit: "fill" })
    .png()
    .toBuffer();
  return { input, output, width: metadata.width, height: metadata.height };
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://127.0.0.1:${port}`);

    if (request.method === "GET" && url.pathname === "/health") {
      return json(response, 200, {
        ready: true,
        cancel_jobs: true,
        upscale_scales: [2],
        worker_id: "renderlab-upscale-01",
        ecosystem: "image-upscale-v1",
        jobs: jobs.size,
      });
    }

    if (request.method === "POST" && url.pathname === "/jobs/upscale") {
      const source = await parseUpscaleRequest(request);
      const id = randomUUID();
      jobs.set(id, {
        ...source,
        polls: 0,
        cancelled: false,
        cancelAttempts: 0,
        mode: "complete",
      });
      return json(response, 200, {
        call_id: id,
        worker_state: "queued",
        worker_id: "renderlab-upscale-01",
        ecosystem: "image-upscale-v1",
      });
    }

    const modeMatch = url.pathname.match(/^\/jobs\/([^/]+)\/mode\/(complete|fail)$/);
    if (request.method === "POST" && modeMatch) {
      const job = jobs.get(decodeURIComponent(modeMatch[1]));
      if (!job) return json(response, 404, { error: "not found" });
      job.mode = modeMatch[2];
      return json(response, 200, { ok: true, mode: job.mode });
    }

    const stateMatch = url.pathname.match(/^\/jobs\/([^/]+)\/state$/);
    if (request.method === "GET" && stateMatch) {
      const job = jobs.get(decodeURIComponent(stateMatch[1]));
      if (!job) return json(response, 404, { error: "not found" });
      return json(response, 200, {
        polls: job.polls,
        cancelled: job.cancelled,
        cancelAttempts: job.cancelAttempts,
        mode: job.mode,
        inputWidth: job.width,
        inputHeight: job.height,
      });
    }

    const jobMatch = url.pathname.match(/^\/jobs\/([^/]+)$/);
    if (request.method === "DELETE" && jobMatch) {
      const job = jobs.get(decodeURIComponent(jobMatch[1]));
      if (!job) return json(response, 404, { error: "not found" });
      job.cancelAttempts += 1;
      job.cancelled = true;
      return json(response, 202, { ok: true, worker_state: "cancelled" });
    }

    if (request.method === "GET" && jobMatch) {
      const job = jobs.get(decodeURIComponent(jobMatch[1]));
      if (!job) return json(response, 404, { error: "not found" });
      if (job.cancelled) return json(response, 410, { code: "JOB_CANCELLED", error: "cancelled" });
      if (job.mode === "fail") {
        return json(response, 400, { code: "UPSCALE_TEST_FAILURE", error: "deterministic Upscale test failure" });
      }
      job.polls += 1;
      if (job.polls === 1) return json(response, 202, { worker_state: "generating" });
      response.writeHead(200, {
        "content-type": "image/png",
        "content-length": String(job.output.length),
      });
      return response.end(job.output);
    }

    return json(response, 404, { error: "not found" });
  } catch (error) {
    return json(response, 400, {
      code: "INVALID_UPSCALE_TEST_REQUEST",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`RenderLab Phase 18F Upscale mock listening on 127.0.0.1:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
