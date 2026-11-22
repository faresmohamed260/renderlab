import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

const testKey = Symbol.for("renderlab.submit-wake.test");
const ownerId = "10000000-0000-4000-8000-000000000000";
const jobId = "20000000-0000-4000-8000-000000000000";
const reservationId = "30000000-0000-4000-8000-000000000000";
const createdAt = "2026-11-22T20:00:00.000Z";
const expected = {
  ok: true,
  job: {
    id: jobId,
    status: "queued",
    operation: "create-image",
    createdAt,
    updatedAt: createdAt,
    outputAssetIds: [],
  },
};
const validRequest = { prompt: "Red sphere", output: { kind: "image", aspectRatio: "1:1" }, inputs: [] };

function stub(source) {
  return { url: "data:text/javascript," + encodeURIComponent(source), shortCircuit: true };
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return stub("export {};");
    if (specifier === "next/server") {
      return stub(
        "export const NextResponse = Response; export function after(callback) {"
        + " return globalThis[Symbol.for('renderlab.submit-wake.test')](callback); }",
      );
    }
    if (specifier === "@/lib/supabase/server") {
      return stub("export async function getCurrentRenderLabIdentity() { return { id: "
        + JSON.stringify(ownerId) + " }; }");
    }
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL("../../src/" + specifier.slice(2) + ".ts", import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});

Object.assign(process.env, {
  SUPABASE_URL: "https://database.example.invalid",
  SUPABASE_SERVICE_ROLE_KEY: "offline-only",
  RENDERLAB_GENERATION_GATEWAY_URL: "https://fixture.modal.run",
  RENDERLAB_FIBO_MODAL_KEY: "offline-only",
  RENDERLAB_FIBO_MODAL_SECRET: "offline-only",
  RENDERLAB_FIBO_GENERATION: "1",
  CLOUDFLARE_R2_ACCOUNT_ID: "offline-only",
  CLOUDFLARE_R2_ACCESS_KEY_ID: "offline-only",
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: "offline-only",
  CLOUDFLARE_R2_BUCKET: "offline-only",
  GITHUB_ACTIONS: "true",
});
delete process.env.RENDERLAB_TEST_OBSERVABILITY_PERSIST;

const { POST, maxDuration } = await import("../../src/app/api/generation/jobs/route.ts");

function submit(body = validRequest) {
  return POST(new Request("https://renderlab.example.invalid/api/generation/jobs", {
    method: "POST",
    headers: { origin: "https://renderlab.example.invalid", "content-type": "application/json" },
    body: JSON.stringify(body),
  }));
}

function fixture(t, { admissionError, bound = true, wake = "ok", scheduleFails = false } = {}) {
  const steps = [];
  const tasks = [];
  const warnings = [];
  const timeouts = [];
  let releaseWake;
  const heldWake = new Promise((resolve) => { releaseWake = resolve; });
  globalThis[testKey] = (task) => {
    if (scheduleFails) throw new Error("No after context");
    steps.push("schedule");
    tasks.push(task);
  };
  t.after(() => { delete globalThis[testKey]; });
  t.mock.method(console, "info", () => {});
  t.mock.method(console, "warn", (line) => warnings.push(JSON.parse(line.replace(/^\[renderlab\] /, ""))));
  t.mock.method(AbortSignal, "timeout", (ms) => {
    timeouts.push(ms);
    const controller = new AbortController();
    if (wake === "timeout") controller.abort(new DOMException("Offline timeout", "TimeoutError"));
    return controller.signal;
  });
  t.mock.method(globalThis, "fetch", async (input, init) => {
    const url = new URL(input);
    assert.equal(init.method, "POST");
    if (url.href === "https://fixture.modal.run/dispatch/wake") {
      steps.push("wake");
      init.signal.throwIfAborted();
      if (wake === "held") await heldWake;
      return new Response(null, { status: wake === "error" ? 503 : 202 });
    }
    assert.equal(url.origin, "https://database.example.invalid");
    const body = JSON.parse(init.body);
    assert.equal(body.p_owner_id, ownerId);
    switch (url.pathname) {
      case "/rest/v1/rpc/renderlab_reserve_generation_admission":
        steps.push("reserve");
        return admissionError
          ? Response.json({ message: "renderlab_" + admissionError }, { status: 400 })
          : Response.json([{ reservation_id: reservationId }]);
      case "/rest/v1/rpc/renderlab_accept_generation_dispatch":
        steps.push("commit");
        return Response.json([{
          id: jobId, status: "queued", operation: "create-image", created_at: createdAt,
          updated_at: createdAt, output_asset_ids: [],
        }]);
      case "/rest/v1/rpc/renderlab_bind_generation_admission":
        steps.push("bind");
        assert.equal(body.p_reservation_id, reservationId);
        assert.equal(body.p_job_id, jobId);
        return Response.json(bound);
      default:
        assert.fail("Unexpected network request: " + url.href);
    }
  });
  return { steps, tasks, warnings, timeouts, releaseWake };
}

test("the same 202 body returns before the wake, after the durable commit and bind", { timeout: 2_000 }, async (t) => {
  const f = fixture(t, { wake: "held" });
  const response = await submit();
  assert.equal(maxDuration, 60);
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), expected);
  assert.deepEqual(f.steps, ["reserve", "commit", "bind", "schedule"]);
  assert.equal(f.tasks.length, 1);
  assert.deepEqual(f.timeouts, []);
  const wake = f.tasks[0]();
  assert.deepEqual(f.steps, ["reserve", "commit", "bind", "schedule", "wake"]);
  assert.deepEqual(f.timeouts, [6_000]);
  f.releaseWake();
  await wake;
  assert.deepEqual(f.warnings, []);
});

for (const [wake, code] of [["error", "dispatcher_wake_failed"], ["timeout", "dispatcher_wake_timeout"]]) {
  test("background wake " + wake + " only warns and leaves the accepted response intact", async (t) => {
    const f = fixture(t, { wake });
    const response = await submit();
    assert.equal(response.status, 202);
    assert.deepEqual(await response.json(), expected);
    await assert.doesNotReject(f.tasks[0]());
    assert.deepEqual(f.steps, ["reserve", "commit", "bind", "schedule", "wake"]);
    assert.deepEqual(f.timeouts, [6_000]);
    assert.deepEqual(f.warnings, [{ event: "generation.dispatch-wake", level: "warn", jobId, code }]);
  });
}

test("an unconfirmed bind preserves the accepted job and leaves dispatch to the scheduler", async (t) => {
  const f = fixture(t, { bound: false });
  const response = await submit();
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), expected);
  assert.deepEqual(f.steps, ["reserve", "commit", "bind"]);
  assert.deepEqual(f.tasks, []);
});

test("a wake registration failure warns without changing the accepted result", async (t) => {
  const f = fixture(t, { scheduleFails: true });
  const response = await submit();
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), expected);
  assert.deepEqual(f.steps, ["reserve", "commit", "bind"]);
  assert.deepEqual(f.warnings, [{
    event: "generation.dispatch-wake", level: "warn", jobId, code: "dispatcher_wake_schedule_failed",
  }]);
});

test("invalid input is rejected before any network request or background wake", async (t) => {
  const f = fixture(t);
  assert.equal((await submit(null)).status, 400);
  assert.deepEqual(f.steps, []);
  assert.deepEqual(f.tasks, []);
});

for (const admissionError of ["generation_active_limit_reached", "generation_rate_limit_reached"]) {
  test("admission " + admissionError + " still returns 429 before committing or scheduling", async (t) => {
    const f = fixture(t, { admissionError });
    const response = await submit();
    assert.equal(response.status, 429);
    assert.equal((await response.json()).error.code, admissionError);
    assert.deepEqual(f.steps, ["reserve"]);
    assert.deepEqual(f.tasks, []);
  });
}
