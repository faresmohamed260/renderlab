import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return nextResolve("data:text/javascript,export{};", context);
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL("../../src/" + specifier.slice(2) + ".ts", import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});
Object.assign(process.env, {
  RENDERLAB_GENERATION_GATEWAY_URL: "https://fixture.modal.run",
  RENDERLAB_FIBO_MODAL_KEY: "fixture-modal-key",
  RENDERLAB_FIBO_MODAL_SECRET: "fixture-modal-secret",
  RENDERLAB_FIBO_GENERATION: "1",
  GITHUB_ACTIONS: "true",
});

const { fiboProvider } = await import("../../src/server/generation/adapters/fibo-provider-port.ts");
const { buildFiboWorkerPayload } = await import("../../src/server/generation/fibo-worker-payload.ts");
const { workersForEcosystem } = await import("../../src/server/generation/worker-fleet.ts");
const worker = workersForEcosystem("fibo2-edit-turbo")[0];
const handle = "fc-" + "A".repeat(16) + "." + "a".repeat(64);
const request = { model: "fibo2-edit-turbo", prompt: "A red sphere",
  output: { kind: "image", aspectRatio: "1:1" }, inputs: [] };
assert.ok(worker, "offline signed FIBO fixture must resolve");

test("provider prepare is byte-identical, source scoped and cannot submit twice", () => {
  const original = buildFiboWorkerPayload(request, []);
  const prepared = fiboProvider.prepareDurableSubmission(request, []);
  assert.deepEqual(prepared, original);
  assert.deepEqual(JSON.parse(prepared.body), {
    prompt: "A red sphere", width: 1024, height: 1024,
    seed: 42, steps: 4, negative_prompt: "", images: [],
  });
  const inputs = [{ bytes: Buffer.from("fake-image") }];
  const edit = { ...request, inputs: [{ alias: "image1", role: "primary-image",
    source: { type: "temporary-source", id: "source-id" } }] };
  assert.deepEqual(fiboProvider.prepareDurableSubmission(edit, inputs),
    buildFiboWorkerPayload(edit, inputs));
  const source = readFileSync(new URL("../../src/server/generation/adapters/fibo-provider-port.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /supabaseRest|generation_jobs|media_assets|admission|releaseBoundGenerationAdmission|\bmethod: "POST"/);
  assert.doesNotMatch(source, /native-generation-lifecycle|createBoundFiboAdapter/);
});

test("provider status maintains exact signed, no-store GET/timeout and response without settling", async t => {
  const requests = [];
  const signals = [];
  t.mock.method(AbortSignal, "timeout", ms => {
    signals.push(ms);
    return new AbortController().signal;
  });
  t.mock.method(globalThis, "fetch", async (url, options) => {
    requests.push({ url: String(url), options });
    return Response.json({ worker_state: "generating" }, { status: 202 });
  });
  const result = await fiboProvider.status(worker, handle, "image", 4_500);
  assert.equal(result.response.status, 202);
  assert.deepEqual(signals, [4_500]);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "https://fixture.modal.run/jobs");
  assert.equal(requests[0].options.method, "GET");
  assert.equal(requests[0].options.cache, "no-store");
  assert.equal(requests[0].options.redirect, "error");
  const headers = new Headers(requests[0].options.headers);
  assert.equal(headers.get("Modal-Key"), "fixture-modal-key");
  assert.equal(headers.get("Modal-Secret"), "fixture-modal-secret");
  assert.equal(headers.get("X-RenderLab-Job-Handle"), handle);
  assert.equal(headers.get("accept"), "image/*, application/json");
  assert.equal(result.options.signal, requests[0].options.signal);
});

test("status translation distinguishes confirmed terminal, ambiguous and retryable outcomes", () => {
  const cases = [
    [409, { detail: "FIBO_PROCESS_EXITED" }, { processExited: true, renderTimedOut: false, unconfirmed: true, detailCategory: "process-exited" }],
    [409, { detail: "FIBO_RENDER_TIMED_OUT" }, { processExited: false, renderTimedOut: true, unconfirmed: true, detailCategory: "render-timed-out" }],
    [410, { detail: "FIBO result expired" }, { terminal: true, unconfirmed: false, detailCategory: "result-expired" }],
    [422, { detail: "FIBO rejected the render inputs" }, { terminal: true, unconfirmed: false, detailCategory: "inputs-rejected" }],
    [402, { error: "quota exposed PRIVATE_TOKEN" }, { unconfirmed: false, detailCategory: "unknown" }],
    [503, { detail: "upstream provider PRIVATE_TOKEN" }, { unconfirmed: false, detailCategory: "unknown" }],
    [409, { detail: "UNKNOWN_PRIVATE_PAYLOAD" }, { unconfirmed: true, detailCategory: "unknown" }],
  ];
  for (const [status, body, expected] of cases) {
    const out = fiboProvider.interpretFailure(status, body);
    for (const [key, value] of Object.entries(expected)) {
      assert.equal(out[key], value, "status " + status + " field " + key);
    }
    assert.doesNotMatch(out.detailCategory, /PRIVATE_TOKEN|UNKNOWN_PRIVATE_PAYLOAD/);
  }
});

test("cancel translates exactly one signed DELETE and preserves 204, 404, 410, 503 and timeout", async t => {
  const outcomes = [
    new Response(null, { status: 204 }),
    new Response(null, { status: 404 }),
    new Response(null, { status: 410 }),
    new Response(null, { status: 503 }),
    new DOMException("provider deadline", "TimeoutError"),
  ];
  const requests = [];
  t.mock.method(AbortSignal, "timeout", ms => {
    assert.equal(ms, 10_000);
    return new AbortController().signal;
  });
  t.mock.method(globalThis, "fetch", async (url, options) => {
    requests.push({ url: String(url), options });
    const next = outcomes.shift();
    if (next instanceof Error) throw next;
    return next;
  });
  const statuses = [];
  for (let i = 0; i < 5; i++) {
    statuses.push(await fiboProvider.cancel(worker, handle));
  }
  assert.deepEqual(statuses, [
    { kind: "confirmed", status: 204 },
    { kind: "not-running", status: 404 },
    { kind: "not-running", status: 410 },
    { kind: "retryable", status: 503, reason: "provider-unconfirmed" },
    { kind: "retryable", status: null, reason: "timeout" },
  ]);
  assert.equal(requests.length, 5);
  for (const call of requests) {
    assert.equal(call.url, "https://fixture.modal.run/jobs");
    assert.equal(call.options.method, "DELETE");
    assert.equal(call.options.cache, "no-store");
    assert.equal(call.options.redirect, "error");
    const h = new Headers(call.options.headers);
    assert.equal(h.get("Modal-Key"), "fixture-modal-key");
    assert.equal(h.get("Modal-Secret"), "fixture-modal-secret");
    assert.equal(h.get("X-RenderLab-Job-Handle"), handle);
    assert.equal(h.get("accept"), "application/json");
  }
});

test("retired worker cannot enter provider-only FIBO gateway", async t => {
  t.mock.method(globalThis, "fetch", () => { throw Error("NETWORK_FORBIDDEN"); });
  const retired = { ...worker, ecosystem: "flux2-klein-9b" };
  await assert.rejects(() => fiboProvider.status(retired, handle, "image", 1_000), /signed FIBO worker/);
  await assert.rejects(() => fiboProvider.cancel(retired, handle), /signed FIBO worker/);
});
