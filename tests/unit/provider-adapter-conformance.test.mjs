import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createFiboAdapter } from "../../src/server/generation/adapters/fibo-adapter.ts";
import { createAdapterRegistry, normalizeAdapterError } from "../../src/server/generation/adapters/provider-adapter.ts";
import { validateOperationAgainstCapability } from "../../src/server/generation/adapters/media-operation.ts";
import { createFakeUpscaleAdapter } from "../helpers/fake-provider-adapter.mjs";

const FIXED_NOW = 1_795_440_000_000;
const ownerId = "offline-owner";
const jobId = "offline-job";
const imageSource = (id) => ({ type: "media-asset", id });
function clock() {
  let value = FIXED_NOW;
  return { now: () => value, advance: (ms) => { value += ms; } };
}
function context(time) {
  return { ownerId, jobId, attemptId: "attempt-001", deadlineAtMs: FIXED_NOW + 30_000, now: time.now };
}
const textImage = () => ({
  kind: "text-to-image", requestId: "request-image", inputs: [],
  parameters: { prompt: "offline test gradient", aspectRatio: "1:1", seed: 7 },
  output: { kind: "image" },
});
const editImage = () => ({
  kind: "image-edit", requestId: "request-edit",
  inputs: [{ role: "primary-image", mediaKind: "image", source: imageSource("image-a") }],
  parameters: { prompt: "edit offline" }, output: { kind: "image" },
});
const upscale = () => ({
  kind: "image-to-image-upscale", requestId: "request-upscale",
  inputs: [{ role: "primary-image", mediaKind: "image", source: imageSource("image-a") }],
  parameters: { scale: 2 }, output: { kind: "image" },
});

function fiboFixture() {
  const time = clock();
  const calls = { submit: [], poll: [], cancel: [] };
  const makeJob = (status) => ({
    id: jobId, status, operation: "create-image",
    createdAt: new Date(FIXED_NOW).toISOString(),
    updatedAt: new Date(time.now()).toISOString(),
    outputAssetIds: status === "succeeded" ? ["durable-asset-0"] : [],
  });
  const adapter = createFiboAdapter({
    isAvailable: () => true,
    isMaskAvailable: () => true,
    submitNativeGeneration: async (owner, request) => {
      calls.submit.push({ owner, request });
      return { ok: true, job: makeJob("queued") };
    },
    pollNativeGeneration: async (owner, id) => {
      calls.poll.push({ owner, id });
      return makeJob(time.now() >= FIXED_NOW + 1_000 ? "succeeded" : "running");
    },
    requestGenerationCancellation: async (owner, id) => {
      calls.cancel.push({ owner, id });
      return { ok: true, job: makeJob("cancelled") };
    },
  });
  return { adapter, operation: textImage(), invalid: { ...textImage(), inputs: [editImage().inputs[0]] },
    time, ctx: context(time), calls };
}
function utilityFixture() {
  const time = clock();
  const adapter = createFakeUpscaleAdapter();
  const input = upscale().inputs[0];
  return { adapter, operation: upscale(), invalid: { ...upscale(), inputs: [{ ...input, role: "reference" }] },
    time, ctx: context(time) };
}
const adapters = [
  { name: "FIBO legacy facade", create: fiboFixture, id: "fibo" },
  { name: "test-only upscale utility", create: utilityFixture, id: "fixture-upscale" },
];

for (const item of adapters) {
  test(item.name + ": declares precise capabilities and validates role/count/output", () => {
    const { adapter, operation, invalid } = item.create();
    assert.equal(adapter.id, item.id);
    assert.equal(adapter.availability().enabled, true);
    assert.equal(adapter.capabilities().some((cap) => cap.operation === operation.kind), true);
    assert.deepEqual(adapter.validate(operation), { ok: true });
    assert.equal(adapter.validate(invalid).ok, false);
    assert.equal(adapter.validate({ ...operation, output: { kind: "audio" } }).ok, false);
    assert.equal(adapter.validate({ ...operation, requestId: "" }).ok, false);
    assert.deepEqual(adapter.hints(operation).timeoutMs > 0, true);
    assert.deepEqual(adapter.validate({ ...upscale(), kind: "text-to-audio" }).code, "generation_disabled");
  });

  test(item.name + ": submit, pending poll, ready poll and complete output provenance without network", async (t) => {
    t.mock.method(globalThis, "fetch", () => { throw new Error("NETWORK_CALL_FORBIDDEN"); });
    const { adapter, operation, time, ctx, calls } = item.create();
    const accepted = await adapter.submit(ctx, operation);
    assert.equal(accepted.kind, "accepted");
    assert.equal(accepted.handle.providerId, item.id);
    assert.equal((await adapter.poll(ctx, accepted.handle, operation)).kind, "pending");
    time.advance(1_000);
    const result = await adapter.poll(ctx, accepted.handle, operation);
    assert.equal(result.kind, "ready");
    assert.equal(result.outputs.length, 1);
    const output = result.outputs[0];
    assert.equal(output.kind, "image");
    assert.equal(output.mimeType, "image/png");
    assert.equal(output.outputIndex, 0);
    assert.equal(output.provenance.providerId, item.id);
    assert.equal(output.provenance.operation, operation.kind);
    assert.equal(output.provenance.jobId, jobId);
    assert.equal(output.provenance.attemptId, ctx.attemptId);
    assert.equal(output.provenance.completedAtMs, FIXED_NOW + 1_000);
    assert.equal(output.provenance.sources.length, operation.inputs.length);
    assert.match(output.provenance.parameterDigest, /^[a-f0-9]{64}$/);
    assert.deepEqual(await adapter.poll(ctx, accepted.handle, operation), result, "ready replay is deterministic");
    if (calls) {
      assert.equal(calls.submit.length, 1);
      assert.equal(calls.submit[0].owner, ownerId);
      assert.equal(calls.submit[0].request.model, "fibo2-edit-turbo");
      assert.deepEqual(calls.submit[0].request.inputs, []);
      assert.equal(calls.poll.length, 3);
    }
  });

  test(item.name + ": cancel delegates, rejects foreign handles and remains deterministic", async (t) => {
    t.mock.method(globalThis, "fetch", () => { throw new Error("NETWORK_CALL_FORBIDDEN"); });
    const { adapter, operation, ctx, calls } = item.create();
    const accepted = await adapter.submit(ctx, operation);
    assert.equal(accepted.kind, "accepted");
    assert.equal((await adapter.cancel(ctx, accepted.handle)).kind, "confirmed");
    if (calls) {
      assert.deepEqual(calls.cancel, [{ owner: ownerId, id: jobId }]);
    } else {
      assert.equal((await adapter.poll(ctx, accepted.handle, operation)).kind, "cancelled");
    }
    const foreign = { providerId: "unknown", callId: "job-foreign" };
    assert.notEqual((await adapter.cancel(ctx, foreign)).kind, "confirmed");
    assert.equal((await adapter.poll(ctx, foreign, operation)).kind, "failed");
  });

  test(item.name + ": normalized errors and rejected unsupported input do not leak provider detail", async () => {
    const { adapter, operation, invalid, ctx } = item.create();
    const refused = await adapter.submit(ctx, invalid);
    assert.equal(refused.kind, "rejected");
    assert.equal(refused.error.code, "invalid_request");
    assert.equal(adapter.mapError({ status: 503, message: "INTERNAL_SECRET" }).code,
      "generation_backend_unavailable");
    const arbitrary = adapter.mapError(new Error("INTERNAL_SECRET"));
    assert.equal(arbitrary.code, "generation_submission_failed");
    assert.doesNotMatch(JSON.stringify(arbitrary), /INTERNAL_SECRET/);
    assert.equal(adapter.mapError({ code: "generation_access_denied" }).code,
      "generation_submission_failed", "provider cannot forge an authorization decision");
    assert.equal(adapter.mapError({ detail: "FIBO_PROCESS_EXITED", status: 409 }).code, "generation_failed");
    assert.equal(adapter.availability().enabled, true);
    assert.equal(adapter.validate(operation).ok, true);
  });

  test(item.name + ": fake-clock event transcript is identical across independent instances", async () => {
    const trace = async () => {
      const { adapter, operation, time, ctx } = item.create();
      const a = await adapter.submit(ctx, operation);
      const pending = await adapter.poll(ctx, a.handle, operation);
      time.advance(1_000);
      const ready = await adapter.poll(ctx, a.handle, operation);
      return { a, pending, ready };
    };
    const first = await trace();
    const second = await trace();
    assert.deepEqual(first, second);
    const fingerprint = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
    assert.equal(fingerprint(first), fingerprint(second));
  });
}

test("FIBO mask/edit validates single source, preserves legacy aliasing, and never enables utilities", async () => {
  const fx = fiboFixture();
  const mask = { type: "temporary-source", id: "mask-1" };
  assert.deepEqual(fx.adapter.validate({ ...editImage(), mask }), { ok: true });
  assert.equal(fx.adapter.validate({
    ...editImage(), mask: imageSource("mask-durable"),
  }).ok, false);
  assert.equal(fx.adapter.validate({
    ...editImage(), mask, inputs: [...editImage().inputs,
      { role: "reference", mediaKind: "image", source: imageSource("image-b") }],
  }).ok, false);
  const accepted = await fx.adapter.submit(fx.ctx, { ...editImage(), mask });
  assert.equal(accepted.kind, "accepted");
  assert.equal(fx.calls.submit[0].request.inputs[0].alias, "image1");
  assert.deepEqual(fx.calls.submit[0].request.mask, mask);
  assert.equal(fx.adapter.validate(upscale()).code, "generation_disabled");
  assert.equal(createFiboAdapter({
    isAvailable: () => true, isMaskAvailable: () => false,
    submitNativeGeneration: async () => { throw new Error("not reached"); },
    pollNativeGeneration: async () => null,
    requestGenerationCancellation: async () => { throw new Error("not reached"); },
  }).validate({ ...editImage(), mask }).code, "generation_disabled");
});

test("explicit policy selection registers second adapter without editing FIBO; absent/unsupported disabled", () => {
  const fibo = fiboFixture().adapter;
  const utility = utilityFixture().adapter;
  const disabled = createAdapterRegistry([fibo, utility]);
  assert.equal(disabled.select("fibo", textImage()).reason, "disabled");
  assert.equal(disabled.select("fixture-upscale", upscale()).reason, "disabled");
  assert.ok(disabled.describe().every((entry) => entry.enabled === false));
  const registered = createAdapterRegistry([fibo, utility], ["fibo", "fixture-upscale"]);
  assert.equal(registered.select("fibo", textImage()).ok, true);
  assert.equal(registered.select("fixture-upscale", upscale()).ok, true);
  assert.equal(registered.select("fibo", upscale()).reason, "unsupported");
  assert.equal(registered.select("fixture-upscale", textImage()).reason, "unsupported");
  assert.equal(registered.select("fixture-upscale", { ...upscale(), inputs: [] }).reason, "invalid_input");
  const audio = {
    kind: "text-to-audio", requestId: "audio-future", inputs: [], output: { kind: "audio" },
    parameters: { text: "test" },
  };
  assert.equal(registered.select("fibo", audio).reason, "unsupported");
  assert.equal(registered.select("fixture-upscale", audio).reason, "unsupported");
  assert.equal(registered.select("unknown", upscale()).reason, "unsupported");
  const utilityUnavailable = createAdapterRegistry([createFakeUpscaleAdapter({ enabled: false })],
    ["fixture-upscale"]);
  assert.equal(utilityUnavailable.select("fixture-upscale", upscale()).reason, "disabled");
  assert.throws(() => createAdapterRegistry([fibo, fibo]), /unique/);
});

test("discriminated media operations cover two-role face swap, video, and audio while remaining unregistered", () => {
  const faceSwap = {
    kind: "face-swap", requestId: "face-future",
    inputs: [
      { role: "target-image", mediaKind: "image", source: imageSource("target") },
      { role: "source-face", mediaKind: "image", source: imageSource("source") },
    ],
    parameters: { mode: "single-face" }, output: { kind: "image" },
  };
  const faceCap = {
    operation: "face-swap", inputRequirements: [
      { role: "target-image", mediaKind: "image", min: 1, max: 1 },
      { role: "source-face", mediaKind: "image", min: 1, max: 1 },
    ], maxInputs: 2, outputKinds: ["image"], mask: "forbidden", cancellation: true,
  };
  assert.equal(validateOperationAgainstCapability(faceSwap, faceCap).ok, true);
  assert.equal(validateOperationAgainstCapability({
    ...faceSwap, inputs: [...faceSwap.inputs.slice(0, 1), { ...faceSwap.inputs[1], source: imageSource("target") }],
  }, faceCap).ok, false);
  const video = {
    kind: "image-to-video", requestId: "video-future", inputs: [{
      role: "first-frame", mediaKind: "image", source: imageSource("first-frame"),
    }], parameters: { prompt: "motion", durationSeconds: 5, fps: 24 },
    output: { kind: "video" },
  };
  assert.equal(validateOperationAgainstCapability(video, {
    operation: "image-to-video", inputRequirements: [
      { role: "first-frame", mediaKind: "image", min: 1, max: 1 },
    ], maxInputs: 1, outputKinds: ["video"], mask: "forbidden", cancellation: true,
  }).ok, true);
  assert.equal(validateOperationAgainstCapability({
    kind: "text-to-audio", requestId: "audio-future", inputs: [],
    parameters: { text: "spoken words" }, output: { kind: "audio" },
  }, {
    operation: "text-to-audio", inputRequirements: [], maxInputs: 0,
    outputKinds: ["audio"], mask: "forbidden", cancellation: true,
  }).ok, true);
  assert.equal(normalizeAdapterError({ name: "TimeoutError" }).retryable, true);
});

// Exact credential-free UI-purity gate, exercised in GitHub's offline unit CI.
test("unwired provider modules do not regress UI purity", () => {
  const cwd = fileURLToPath(new URL("../../", import.meta.url));
  const run = spawnSync(process.execPath, ["scripts/verify-ui-purity.mjs"], {
    cwd, encoding: "utf8", timeout: 30_000,
  });
  assert.equal(run.error, undefined, run.error?.message);
  assert.equal(run.status, 0, (run.stderr ?? "") + (run.stdout ?? ""));
});
