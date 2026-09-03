import http from "node:http";
import { randomUUID } from "node:crypto";

const port = Number(process.env.RENDERLAB_TEST_NATIVE_WORKER_PORT || 4312);
const jobs = new Map();

const imageBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZgZsAAAAASUVORK5CYII=",
  "base64",
);
const videoBytes = Buffer.from("00000018667479706d703432000000006d70343269736f6d", "hex");

function json(response, status, body) {
  const payload = Buffer.from(JSON.stringify(body));
  response.writeHead(status, {
    "content-type": "application/json",
    "content-length": String(payload.length),
  });
  response.end(payload);
}

async function drain(request) {
  for await (const _chunk of request) {
    // The native adapter sends multipart bodies. The mock only needs to consume them.
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://127.0.0.1:${port}`);

  if (request.method === "GET" && url.pathname === "/health") {
    return json(response, 200, { ok: true, jobs: jobs.size });
  }

  if (request.method === "POST" && (url.pathname === "/jobs/edit" || url.pathname === "/jobs/video")) {
    await drain(request);
    const id = randomUUID();
    const kind = url.pathname === "/jobs/video" ? "video" : "image";
    jobs.set(id, { kind, polls: 0 });
    return json(response, 200, { call_id: id, worker_state: "queued" });
  }

  const posterMatch = url.pathname.match(/^\/jobs\/([^/]+)\/poster$/);
  if (request.method === "GET" && posterMatch) {
    response.writeHead(503, { "content-type": "application/json" });
    return response.end(JSON.stringify({ error: "poster intentionally unavailable in Phase 14 mock" }));
  }

  const jobMatch = url.pathname.match(/^\/jobs\/([^/]+)$/);
  if (request.method === "GET" && jobMatch) {
    const job = jobs.get(decodeURIComponent(jobMatch[1]));
    if (!job) return json(response, 404, { error: "not found" });

    job.polls += 1;
    if (job.polls === 1) {
      return json(response, 202, { worker_state: "generating" });
    }

    const bytes = job.kind === "video" ? videoBytes : imageBytes;
    response.writeHead(200, {
      "content-type": job.kind === "video" ? "video/mp4" : "image/png",
      "content-length": String(bytes.length),
    });
    return response.end(bytes);
  }

  json(response, 404, { error: "not found" });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Phase 14 native worker mock listening on 127.0.0.1:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
