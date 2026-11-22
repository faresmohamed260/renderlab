import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import sharp from "sharp";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return nextResolve("data:text/javascript,export{};", context);
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL("../../src/" + specifier.slice(2) + ".ts", import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});

process.env.SUPABASE_URL = "https://database.example.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "offline-fixture-key";
process.env.RENDERLAB_GENERATION_GATEWAY_URL = "https://fixture.modal.run";
process.env.RENDERLAB_FIBO_MODAL_KEY = "offline-proxy-key";
process.env.RENDERLAB_FIBO_MODAL_SECRET = "offline-proxy-secret";
process.env.CLOUDFLARE_R2_ACCOUNT_ID = "offline-account";
process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = "offline-r2-key";
process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = "offline-r2-secret";
process.env.CLOUDFLARE_R2_BUCKET = "offline-bucket";
process.env.GITHUB_ACTIONS = "true";
delete process.env.RENDERLAB_TEST_OBSERVABILITY_PERSIST;

const { reconcileNativeGeneration } = await import("../../src/server/generation/reconcile-generation.ts");
const ownerId = "10000000-0000-4000-8000-000000000000";
const png = await sharp({
  create: { width: 16, height: 16, channels: 3, background: "#ffffff" },
}).png().toBuffer();

function fixture(t, { id = "20000000-0000-4000-8000-000000000000", status = "running" } = {}) {
  const timestamp = new Date().toISOString();
  const row = {
    id,
    owner_id: ownerId,
    status,
    operation: "create-image",
    output_kind: "image",
    prompt: "Test fixture",
    workflow_id: "fibo",
    model: "fibo-2.0-turbo",
    ecosystem: "fibo2-edit-turbo",
    inputs: [],
    parameters: {},
    worker_id: "fibo",
    provider_job_id: "fc-offline-fixture-handle",
    worker_state: status === "queued" ? "queued" : "generating",
    failover_history: [],
    output_asset_ids: [],
    error_code: null,
    error_message: null,
    created_at: timestamp,
    updated_at: timestamp,
    started_at: status === "running" ? timestamp : null,
    completed_at: null,
  };
  const responses = [];
  const patches = [];
  const media = [];
  const objects = [];
  const warnings = [];
  const claims = [];
  let reservationReleased = false;
  let reads = 0;

  t.mock.method(console, "info", () => {});
  t.mock.method(console, "warn", (message) => warnings.push(message));
  t.mock.method(globalThis, "fetch", async (input, init = {}) => {
    const url = new URL(input);
    if (url.origin === "https://fixture.modal.run") {
      assert.equal(url.pathname, "/jobs");
      assert.equal(init.method, "GET");
      assert.equal(new Headers(init.headers).get("X-RenderLab-Job-Handle"), row.provider_job_id);
      reads += 1;
      assert.ok(responses.length, "Unexpected gateway poll");
      return responses.shift();
    }

    if (url.hostname === "offline-bucket.offline-account.r2.cloudflarestorage.com") {
      assert.equal(init.method, "PUT");
      objects.push({
        contentType: new Headers(init.headers).get("content-type"),
        body: Buffer.from(init.body),
      });
      return new Response(null, { status: 200 });
    }

    assert.equal(url.origin, "https://database.example.invalid");
    const method = init.method || "GET";
    const body = init.body ? JSON.parse(init.body) : undefined;
    if (url.pathname === "/rest/v1/generation_jobs") {
      assert.equal(url.searchParams.get("owner_id"), "eq." + ownerId);
      assert.equal(url.searchParams.get("id"), "eq." + id);
      if (method === "PATCH") {
        patches.push(body);
        Object.assign(row, body);
      } else {
        assert.equal(method, "GET");
      }
      return Response.json([row]);
    }
    if (url.pathname === "/rest/v1/rpc/renderlab_claim_generation_reconciliation") {
      assert.equal(method, "POST");
      assert.equal(body.p_owner_id, ownerId);
      assert.equal(body.p_job_id, id);
      claims.push(body.p_token);
      return Response.json(true);
    }
    if (url.pathname === "/rest/v1/rpc/renderlab_release_generation_reconciliation") {
      assert.equal(method, "POST");
      assert.equal(body.p_token, claims.pop());
      return Response.json(true);
    }
    if (url.pathname === "/rest/v1/generation_admission_reservations") {
      assert.equal(method, "PATCH");
      assert.equal(url.searchParams.get("job_id"), "eq." + id);
      if (reservationReleased) return Response.json([]);
      reservationReleased = true;
      return Response.json([{ id: "admission" }]);
    }
    if (url.pathname === "/rest/v1/media_assets") {
      if (method === "POST") {
        assert.equal(body.generation_job_id, id);
        media.push(body);
        return new Response(null, { status: 204 });
      }
      assert.equal(method, "GET");
      return Response.json(media);
    }
    assert.fail("Unexpected database request: " + method + " " + url.pathname);
  });

  return {
    row, patches, media, objects, warnings,
    poll: () => reconcileNativeGeneration(ownerId, id),
    respond: (...items) => responses.push(...items),
    get reads() { return reads; },
    get reservationReleased() { return reservationReleased; },
  };
}

test("a confirmed FIBO process exit fails the first job exactly once and releases admission", async (t) => {
  const first = fixture(t);
  first.respond(Response.json({ detail: "FIBO_PROCESS_EXITED" }, { status: 409 }));

  const failed = await first.poll();
  assert.equal(failed.status, "failed");
  assert.equal(failed.error.code, "generation_failed");
  assert.match(failed.error.message, /render process exited/i);
  assert.ok(first.reservationReleased);
  assert.deepEqual(await first.poll(), failed);
  assert.equal(first.reads, 1);
  assert.deepEqual(first.patches.map(({ status }) => status), ["failed"]);
  assert.deepEqual(failed.outputAssetIds, []);
  assert.deepEqual(first.media, []);
  assert.deepEqual(first.objects, []);
});

test("the recovery job survives pending and ambiguous responses and persists one image", async (t) => {
  const recovery = fixture(t, { id: "30000000-0000-4000-8000-000000000000", status: "queued" });
  const untrusted = "raw reply with a fixture handle or credential";
  recovery.respond(
    Response.json({ worker_state: "generating" }, { status: 202 }),
    Response.json({ detail: "Unknown FIBO job" }, { status: 404 }),
    Response.json({ detail: untrusted }, { status: 409 }),
    Response.json(null, { status: 403 }),
    Response.json({ detail: "FIBO_PROCESS_EXITED" }, { status: 404 }),
    new Response(png, { headers: { "content-type": "image/png" } }),
  );

  for (let poll = 0; poll < 5; poll += 1) {
    assert.equal((await recovery.poll()).status, "queued");
  }
  assert.deepEqual(recovery.patches, []);
  assert.deepEqual(recovery.media, []);
  assert.deepEqual(recovery.objects, []);
  assert.equal(recovery.reservationReleased, false);
  assert.ok(recovery.warnings.every((entry) => !entry.includes(untrusted)
    && !entry.includes(recovery.row.provider_job_id)));
  const diagnostics = recovery.warnings.map((entry) => JSON.parse(entry.slice("[renderlab] ".length)));
  assert.deepEqual(diagnostics.map(({ upstreamStatus, detailCategory }) => [upstreamStatus, detailCategory]), [
    [404, "unknown-job"], [409, "unknown"], [403, "unknown"], [404, "process-exited"],
  ]);
  assert.ok(diagnostics.every(({ jobId }) => jobId === recovery.row.id));

  // The worker's admission transition owns queued-to-running.
  recovery.row.status = "running";
  const saved = await recovery.poll();
  assert.equal(saved.status, "succeeded");
  assert.deepEqual(recovery.patches.map(({ status }) => status), ["persisting", "succeeded"]);
  assert.equal(recovery.media.length, 1);
  assert.deepEqual(saved.outputAssetIds, [recovery.media[0].id]);
  assert.deepEqual(recovery.objects.find(({ contentType }) => contentType === "image/png")?.body, png);
  assert.ok(recovery.reservationReleased);
});

test("a generic gateway 500 stays retryable without a failed transition", async (t) => {
  const job = fixture(t);
  job.respond(Response.json({ detail: "FIBO job failed or could not be read" }, { status: 500 }));
  await assert.rejects(job.poll(), /Generation provider status is temporarily unavailable/);
  assert.equal(job.row.status, "running");
  assert.deepEqual(job.patches, []);
  assert.deepEqual(job.media, []);
  assert.equal(job.reservationReleased, false);
});

for (const [status, detail] of [[410, "FIBO result expired"], [422, "FIBO rejected the render inputs"]]) {
  test("recognized FIBO " + status + " still terminalizes as before", async (t) => {
    const job = fixture(t);
    job.respond(Response.json({ detail }, { status }));
    const failed = await job.poll();
    assert.equal(failed.status, "failed");
    assert.equal(failed.error.code, "generation_failed");
    assert.match(failed.error.message, /assigned worker/);
    assert.deepEqual(job.patches.map((patch) => patch.status), ["failed"]);
    assert.deepEqual(job.media, []);
  });
}
