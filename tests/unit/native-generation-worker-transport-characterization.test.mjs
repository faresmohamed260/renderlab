import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

// Offline real-module characterization. No gateway, Modal, R2 or database access.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return nextResolve("data:text/javascript,export{};", context);
    }
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL("../../src/" + specifier.slice(2) + ".ts", import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});

Object.assign(process.env, {
  RENDERLAB_GENERATION_GATEWAY_URL: "https://fixture.modal.run",
  RENDERLAB_FIBO_MODAL_KEY: "offline-test-key",
  RENDERLAB_FIBO_MODAL_SECRET: "offline-test-secret",
  RENDERLAB_FIBO_GENERATION: "1",
  GITHUB_ACTIONS: "true",
});

const transport = await import("../../src/server/generation/native-generation-worker-transport.ts");
const facade = await import("../../src/server/generation/native-generation.ts");
const { workflowFor } = await import("../../src/server/generation/native-generation-legacy-workflows.ts");
const { workersForEcosystem } = await import("../../src/server/generation/worker-fleet.ts");

const request = {
  model: "fibo2-edit-turbo",
  prompt: "A red sphere",
  output: { kind: "image", aspectRatio: "1:1" },
  inputs: [],
};
const worker = workersForEcosystem("fibo2-edit-turbo")[0];
const workflow = workflowFor(request);
const callId = "fc-" + "A".repeat(16) + "." + "a".repeat(64);
assert.ok(worker, "Offline fixture must provide the sole configured FIBO worker");

test("transport extraction retains the existing native-generation facade API", () => {
  assert.equal(facade.wakeFiboDispatcher, transport.wakeFiboDispatcher);
  for (const name of [
    "prepareWorkerSubmission", "dispatchWorker", "getGeneratedFiboCaption",
    "fetchPoster", "InvalidGeneratedFiboSidecarError",
  ]) assert.equal(typeof transport[name], "function", name);
});

test("FIBO JSON body, signed dispatch options, timeout and wake stay byte-for-byte equivalent", async (t) => {
  const timeoutCalls = [];
  const calls = [];
  t.mock.method(AbortSignal, "timeout", (ms) => {
    timeoutCalls.push(ms);
    return new AbortController().signal;
  });
  t.mock.method(globalThis, "fetch", async (input, options) => {
    calls.push({ url: String(input), options });
    return new Response(null, { status: 202 });
  });

  const submission = await transport.prepareWorkerSubmission(workflow, request, []);
  assert.equal(submission.contentType, "application/json");
  assert.equal(typeof submission.body, "string");
  assert.deepEqual(JSON.parse(submission.body), {
    prompt: "A red sphere",
    width: 1024,
    height: 1024,
    seed: 42,
    steps: 4,
    negative_prompt: "",
    images: [],
  });
  const accepted = await transport.dispatchWorker(worker, workflow, submission);
  assert.equal(accepted.status, 202);
  await facade.wakeFiboDispatcher();

  assert.deepEqual(calls.map(x => x.url), [
    "https://fixture.modal.run/jobs/fibo",
    "https://fixture.modal.run/dispatch/wake",
  ]);
  assert.deepEqual(calls.map(x => x.options.method), ["POST", "POST"]);
  assert.deepEqual(calls.map(x => x.options.cache), ["no-store", "no-store"]);
  assert.deepEqual(timeoutCalls, [30_000, 6_000]);
  assert.equal(calls[0].options.body, submission.body);
  assert.equal(calls[1].options.body, null);
  for (const call of calls) {
    const headers = new Headers(call.options.headers);
    assert.equal(headers.get("Modal-Key"), "offline-test-key");
    assert.equal(headers.get("Modal-Secret"), "offline-test-secret");
    assert.equal(call.options.redirect, "error");
    assert.ok(call.options.signal instanceof AbortSignal);
  }
  assert.equal(new Headers(calls[0].options.headers).get("content-type"), "application/json");
});

test("gateway sidecar keeps signed handle, exact pending/invalid/transient distinctions", async (t) => {
  const replies = [
    Response.json({ worker_state: "generating" }, { status: 202 }),
    Response.json({ detail: "Unknown FIBO job" }, { status: 404 }),
    Response.json({ detail: "FIBO result expired" }, { status: 410 }),
    Response.json({ detail: "FIBO rejected the render inputs" }, { status: 422 }),
    Response.json({ detail: "Invalid generated VGL" }, { status: 502 }),
    Response.json({ detail: "temporarily unavailable" }, { status: 503 }),
    Response.json({ vgl: "not JSON" }),
    Response.json({ vgl: JSON.stringify({ short_description: "The result" }) }),
  ];
  const calls = [];
  t.mock.method(AbortSignal, "timeout", () => new AbortController().signal);
  t.mock.method(globalThis, "fetch", async (input, options) => {
    calls.push({ url: String(input), options });
    assert.ok(replies.length, "unexpected repeated provider poll");
    return replies.shift();
  });

  await assert.rejects(
    () => transport.getGeneratedFiboCaption(worker, callId, 7_000),
    /still being prepared/,
  );
  for (let i = 0; i < 4; i++) {
    await assert.rejects(
      () => transport.getGeneratedFiboCaption(worker, callId, 7_000),
      transport.InvalidGeneratedFiboSidecarError,
    );
  }
  await assert.rejects(
    () => transport.getGeneratedFiboCaption(worker, callId, 7_000),
    /temporarily unavailable/,
  );
  await assert.rejects(
    () => transport.getGeneratedFiboCaption(worker, callId, 7_000),
    transport.InvalidGeneratedFiboSidecarError,
  );
  const caption = await transport.getGeneratedFiboCaption(worker, callId, 7_000);
  assert.deepEqual(JSON.parse(caption), { short_description: "The result" });
  assert.equal(replies.length, 0);
  assert.equal(calls.length, 8);
  for (const call of calls) {
    assert.equal(call.url, "https://fixture.modal.run/jobs/vgl");
    assert.equal(call.options.method, "GET");
    assert.equal(call.options.cache, "no-store");
    assert.equal(call.options.redirect, "error");
    const headers = new Headers(call.options.headers);
    assert.equal(headers.get("X-RenderLab-Job-Handle"), callId);
    assert.equal(headers.get("Modal-Key"), "offline-test-key");
    assert.equal(headers.get("Modal-Secret"), "offline-test-secret");
    assert.equal(headers.get("accept"), "application/json");
  }
});

test("legacy poster read retains optional timeout, URL and silent failure semantics", async (t) => {
  const requests = [];
  t.mock.method(AbortSignal, "timeout", () => new AbortController().signal);
  t.mock.method(globalThis, "fetch", async (url, options) => {
    requests.push({ url, options });
    return requests.length === 1
      ? new Response(Uint8Array.of(0x01, 0x02, 0x03), { status: 200, headers: { "content-type": "image/jpeg; charset=binary" } })
      : new Response(null, { status: 503 });
  });
  const ok = await transport.fetchPoster(worker, callId, 1_500);
  assert.equal(ok.contentType, "image/jpeg");
  assert.deepEqual([...ok.bytes], [1, 2, 3]);
  assert.equal(await transport.fetchPoster(worker, callId, 1_500), null);
  assert.deepEqual(requests.map(x => x.url), [
    "https://fixture.modal.run/jobs/" + encodeURIComponent(callId) + "/poster",
    "https://fixture.modal.run/jobs/" + encodeURIComponent(callId) + "/poster",
  ]);
  for (const call of requests) {
    assert.equal(call.options.cache, "no-store");
    assert.equal(new Headers(call.options.headers).get("accept"), "image/*, application/json");
    assert.ok(call.options.signal instanceof AbortSignal);
  }
});
