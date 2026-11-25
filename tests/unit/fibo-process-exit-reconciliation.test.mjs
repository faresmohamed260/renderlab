import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";
import { Suspense } from "react";
import { renderToPipeableStream } from "react-dom/server";
import { createServer, get } from "node:http";
import { once } from "node:events";
import sharp from "sharp";
import { transformSync } from "next/dist/build/swc/index.js";

const afterKey = Symbol.for("renderlab.gateway-auth-alert.after");
const ownerId = "10000000-0000-4000-8000-000000000000";
const foreignJobId = "90000000-0000-4000-8000-000000000001";
const afterCallbacksKey = Symbol.for("renderlab.owner-settlement.after");

function stub(source) {
  return { url: "data:text/javascript," + encodeURIComponent(source), shortCircuit: true };
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return nextResolve("data:text/javascript,export{};", context);
    if (specifier === "next/server") {
      return stub("export const NextResponse = Response; export function after(callback) {"
        + " (globalThis[Symbol.for('renderlab.gateway-auth-alert.after')]"
        + " ?? globalThis[Symbol.for('renderlab.owner-settlement.after')])(callback); }");
    }
    if (specifier === "@/lib/supabase/server") {
      return stub(`export async function getCurrentRenderLabAccount() { return globalThis[Symbol.for("renderlab.p603c.fixture.account")] === undefined ? { id: "${ownerId}" } : globalThis[Symbol.for("renderlab.p603c.fixture.account")]; }
        export const getCurrentRenderLabIdentity = getCurrentRenderLabAccount;`);
    }
    // The route only passes these references across the stubbed client boundary.
    // If it invokes History IO during SSR, fail rather than silently returning data.
    if (specifier === "@/server/generation/history/history-actions") {
      return stub("const unexpected = () => { throw new Error('Unexpected History action during route render'); };"
        + " export const readCreateHistoryJobs = unexpected, readCreateHistoryPrompts = unexpected, loadCreateHistoryReuse = unexpected;");
    }
    if (specifier === "@/server/hosted-create") {
      return stub("export const getCreatePreviewOwner = () => null, getHostedCreateMedia = () => null,"
        + " getHostedCreatePreferences = () => null, getHostedCreateState = () => null;");
    }
    if (specifier === "@/server/create-preview-mode") {
      return stub("export const isCreatePreview = () => false;");
    }
    const views = {
      "@/features/library/library-view": "LibraryView",
      "@/features/activity/activity-view": "ActivityView",
      "@/features/create/create-workspace": "CreateWorkspace",
      "@/features/create/create-preview-workspace": "CreatePreviewWorkspace",
      "@/components/shell/route-loading": "RouteLoading",
    };
    if (views[specifier]) {
      return stub(`export function ${views[specifier]}() {}`);
    }
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL("../../src/" + specifier.slice(2) + ".ts", import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith(new URL("../../src/app/(app)/", import.meta.url).href) && url.endsWith("/page.tsx")) {
      const source = transformSync(readFileSync(new URL(url), "utf8"), {
        jsc: { parser: { syntax: "typescript", tsx: true }, transform: { react: { runtime: "automatic" } } },
      }).code;
      return { format: "module", shortCircuit: true, source };
    }
    return nextLoad(url, context);
  },
});

process.env.SUPABASE_URL = "https://database.example.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "offline-fixture-key";
process.env.RENDERLAB_GENERATION_GATEWAY_URL = "https://faresmohamed260-main--renderlab-generation-gateway-web.us-east.modal.run";
process.env.RENDERLAB_FIBO_MODAL_KEY = "offline-proxy-key";
process.env.RENDERLAB_FIBO_MODAL_SECRET = "offline-proxy-secret";
process.env.CLOUDFLARE_R2_ACCOUNT_ID = "offline-account";
process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = "offline-r2-key";
process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = "offline-r2-secret";
process.env.CLOUDFLARE_R2_BUCKET = "offline-bucket";
process.env.GITHUB_ACTIONS = "true";
process.env.RENDERLAB_FIBO_GENERATION = "1";
delete process.env.RENDERLAB_TEST_OBSERVABILITY_PERSIST;

const { reconcileNativeGeneration } = await import("../../src/server/generation/reconcile-generation.ts");
const { pollNativeGeneration } = await import("../../src/server/generation/native-generation.ts");
const { adminDiagnosticProjection } = await import("../../src/server/observability/diagnostic-store.ts");
const { POST: submitRoute } = await import("../../src/app/api/generation/jobs/route.ts");
const { default: loadCreate, maxDuration: createDuration } = await import("../../src/app/(app)/create/page.tsx");
const { default: loadLibraryPage, maxDuration: libraryDuration } = await import("../../src/app/(app)/library/page.tsx");
const { default: loadActivity, maxDuration: activityDuration } = await import("../../src/app/(app)/activity/page.tsx");
const { settleOwnerGenerationWithinResponse } = await import("../../src/server/generation/owner-generation-settlement.ts");
const png = await sharp({
  create: { width: 16, height: 16, channels: 3, background: "#ffffff" },
}).png().toBuffer();

function fixture(t, {
  id = "20000000-0000-4000-8000-000000000000",
  status = "running",
  handleDiagnosticRequest,
  lookupError,
  holdWrite,
  denyRetry,
} = {}) {
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
    parameters: { output: { kind: "image", aspectRatio: "1:1" } },
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
  const afterCallbacks = [];
  const admissionSteps = [];
  let reservationReleased = false;
  let releases = 0;
  let candidateLookups = 0;
  let reads = 0;

  globalThis[afterCallbacksKey] = (callback) => afterCallbacks.push(callback);
  t.after(() => { delete globalThis[afterCallbacksKey]; });
  t.mock.method(console, "info", () => {});
  t.mock.method(console, "warn", (message) => warnings.push(message));
  t.mock.method(globalThis, "fetch", async (input, init = {}) => {
    const url = new URL(input);
    if (url.origin === "https://faresmohamed260-main--renderlab-generation-gateway-web.us-east.modal.run") {
      assert.equal(url.pathname, "/jobs");
      assert.equal(init.method, "GET");
      assert.equal(new Headers(init.headers).get("X-RenderLab-Job-Handle"), row.provider_job_id);
      reads += 1;
      assert.ok(responses.length, "Unexpected gateway poll");
      const reply = responses.shift();
      return typeof reply === "function" ? reply(init.signal) : reply;
    }

    if (url.hostname === "offline-bucket.offline-account.r2.cloudflarestorage.com") {
      assert.equal(init.method, "PUT");
      objects.push({
        contentType: new Headers(init.headers).get("content-type"),
        body: Buffer.from(init.body),
      });
      if (objects.length === 1 && holdWrite) await holdWrite();
      return new Response(null, { status: 200 });
    }

    const diagnosticReply = await handleDiagnosticRequest?.(url, init);
    if (diagnosticReply) return diagnosticReply;

    assert.equal(url.origin, "https://database.example.invalid");
    const method = init.method || "GET";
    const body = init.body ? JSON.parse(init.body) : undefined;
    if (url.pathname === "/rest/v1/generation_jobs") {
      assert.equal(url.searchParams.get("owner_id"), "eq." + ownerId);
      const query = url.searchParams;
      if (query.get("select") === "id") {
        assert.equal(method, "GET");
        assert.equal(query.get("limit"), "1");
        assert.equal(query.get("order"), "last_reconciled_at.asc.nullsfirst,updated_at.asc,id.asc");
        assert.match(query.get("or"), /provider_job_id.not.is.null/);
        assert.ok(init.signal instanceof AbortSignal);
        candidateLookups += 1;
        if (lookupError) return lookupError();
        const candidates = [row, { ...row, id: foreignJobId, owner_id: "foreign-owner" }];
        return Response.json(candidates.filter((item) => query.get("owner_id") === "eq." + item.owner_id
          && (!query.has("id") || query.get("id") === `in.(${item.id})`)
          && query.get("status").includes(item.status)
          && (item.status === "persisting" || item.provider_job_id)).slice(0, 1));
      }
      if (query.has("offset")) {
        assert.equal(method, "GET");
        return Response.json([row]);
      }

      if (query.get("id") === "eq.90000000-0000-4000-8000-000000000000" && method === "GET") {
        return Response.json([{ ...row, id: "90000000-0000-4000-8000-000000000000", status:"queued", output_asset_ids:[] }]);
      }
      assert.equal(query.get("id"), "eq." + id);
      if (method === "PATCH") {
        patches.push(body);
        Object.assign(row, body);
      } else {
        assert.equal(method, "GET");
      }
      return Response.json([row]);
    }
    // This older lifecycle fixture deliberately models the pre-0031 hosted schema.
    // The atomic adapter must then use the existing owner-scoped status-CAS path.
    if (url.pathname === "/rest/v1/rpc/renderlab_terminalize_generation_and_release") {
      return Response.json({ code: "PGRST202", message: "New RPC not installed in this fixture" }, { status: 404 });
    }
    if (url.pathname === "/rest/v1/rpc/renderlab_claim_generation_reconciliation") {
      assert.equal(method, "POST");
      assert.equal(body.p_owner_id, ownerId);
      assert.equal(body.p_job_id, id);
      if (claims.length) return Response.json(false);
      claims.push(body.p_token);
      return Response.json(true);
    }
    if (url.pathname === "/rest/v1/rpc/renderlab_release_generation_reconciliation") {
      assert.equal(method, "POST");
      assert.equal(body.p_token, claims.pop());
      return Response.json(true);
    }
    if (url.pathname === "/rest/v1/generation_admission_reservations") {
      assert.equal(url.searchParams.get("owner_id"), "eq." + ownerId);
      assert.equal(url.searchParams.get("released_at"), "is.null");
      if (method === "GET") {
        assert.match(url.searchParams.get("expires_at"), /^gt\./);
        assert.equal(url.searchParams.get("job_id"), "not.is.null");
        admissionSteps.push("lookup");
        return Response.json(reservationReleased ? [] : [{ job_id: id }]);
      }
      assert.equal(method, "PATCH");
      assert.equal(url.searchParams.get("job_id"), "eq." + id);
      if (reservationReleased) return Response.json([]);
      releases += 1;
      reservationReleased = true;
      admissionSteps.push("release");
      return Response.json([{ id: "admission" }]);
    }
    if (url.pathname === "/rest/v1/rpc/renderlab_accept_generation_dispatch_idempotent") {
      assert.equal(body.p_owner_id, ownerId);
      admissionSteps.push("atomic-accept");
      return reservationReleased && !denyRetry
        ? Response.json([{outcome:"accepted",job_id:"90000000-0000-4000-8000-000000000000",
          reservation_id:"91000000-0000-4000-8000-000000000000",attempt_id:body.p_attempt_id,
          admission_deadline:body.p_admission_deadline}])
        : Response.json({code:"P0001",message:"renderlab_generation_active_limit_reached"},{status:400});
    }
    if (url.pathname === "/rest/v1/renderlab_account_preferences") {
      assert.equal(method, "GET");
      assert.equal(url.searchParams.get("owner_id"), "eq." + ownerId);
      return Response.json([{ create_image_aspect_ratio: "3:4" }]);
    }
    if (url.pathname === "/rest/v1/media_collections") {
      assert.equal(method, "GET");
      assert.equal(url.searchParams.get("owner_id"), "eq." + ownerId);
      return Response.json([]);
    }
    if (url.pathname === "/rest/v1/media_assets") {
      if (method === "POST") {
        assert.equal(body.generation_job_id, id);
        media.push(body);
        return new Response(null, { status: 204 });
      }
      assert.equal(method, "GET");
      assert.equal(url.searchParams.get("owner_id"), "eq." + ownerId);
      return Response.json(media);
    }
    assert.fail("Unexpected database request: " + method + " " + url.pathname);
  });

  return {
    row, patches, media, objects, warnings, afterCallbacks, admissionSteps,
    get candidateLookups() { return candidateLookups; },
    get releases() { return releases; },
    poll: () => reconcileNativeGeneration(ownerId, id),
    pollNative: () => pollNativeGeneration(ownerId, id),
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

test("an exact FIBO render timeout fails once and releases admission without media", async (t) => {
  const job = fixture(t);
  job.respond(Response.json({ detail: "FIBO_RENDER_TIMED_OUT" }, { status: 409 }));
  const failed = await job.poll();
  assert.equal(failed.status, "failed");
  assert.equal(failed.error.code, "generation_failed");
  assert.match(failed.error.message, /render timed out/i);
  assert.equal(job.reservationReleased, true);
  assert.deepEqual(job.patches.map(({ status }) => status), ["failed"]);
  assert.deepEqual(job.media, []);
  assert.deepEqual(job.objects, []);
  assert.deepEqual(await job.poll(), failed);
  assert.equal(job.reads, 1);
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

test("FIBO budget and unavailable hints cannot discard a late successful provider result", async (t) => {
  const job = fixture(t);
  job.respond(
    Response.json({ detail: "workspace budget exhausted" }, { status: 402 }),
    Response.json({ code: "WORKER_UNAVAILABLE", detail: "temporary backend fault" }, { status: 409 }),
    Response.json({ detail: "temporarily unavailable" }, { status: 409 }),
    new Response(png, { headers: { "content-type": "image/png" } }),
  );
  await assert.rejects(job.poll(), /temporarily unavailable/i);
  await assert.rejects(job.poll(), /temporarily unavailable/i);
  assert.equal((await job.poll()).status, "running");
  assert.deepEqual(job.patches, []);
  assert.equal(job.reservationReleased, false);
  const succeeded = await job.poll();
  assert.equal(succeeded.status, "succeeded");
  assert.deepEqual(job.patches.map(({ status }) => status), ["persisting", "succeeded"]);
  assert.equal(job.media.length, 1);
  assert.ok(job.reservationReleased);
  assert.equal(job.reads, 4);
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


function captureDiagnostics(t, vercelEnvironment) {
  const env = {
    VERCEL_ENV: vercelEnvironment,
    RENDERLAB_TEST_OBSERVABILITY_PERSIST: "true",
    NEXT_PUBLIC_SUPABASE_URL: "https://database.example.invalid",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "offline-publishable-key",
    RESEND_API_KEY: "re_offline_fixture",
  };
  const previous = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
  Object.assign(process.env, env);
  const callbacks = [];
  globalThis[afterKey] = (callback) => callbacks.push(callback);
  t.after(() => {
    delete globalThis[afterKey];
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  return callbacks;
}

test("production Modal 401 and 403 persist a bounded diagnostic and reuse threshold and cooldown", async (t) => {
  const callbacks = captureDiagnostics(t, "production");
  const diagnostics = [];
  const alertCalls = [];
  const emails = [];
  const adminId = "90000000-0000-4000-8000-000000000000";
  const adminEmail = "operator@example.invalid";

  const job = fixture(t, { async handleDiagnosticRequest(url, init) {
    const body = init.body ? JSON.parse(init.body) : undefined;
    if (url.pathname === "/rest/v1/renderlab_diagnostic_events") {
      if (init.method === "POST") {
        diagnostics.push(body);
        return new Response(null, { status: 204 });
      }
      const { occurred_at: recordedAt } = diagnostics.at(-1);
      assert.equal(url.searchParams.get("occurred_at"), `gte.${new Date(Date.parse(recordedAt) - 15 * 60_000).toISOString()}`);
      assert.equal(url.searchParams.get("limit"), "3");
      assert.match(url.searchParams.get("or"),
        /,and\(event\.eq\.generation\.reconciliation,phase\.eq\.provider-outcome,code\.eq\.provider-unconfirmed,count\.in\.\(401,403\)\)\)$/);
      assert.doesNotMatch(url.searchParams.get("or"), /gateway_auth_rejected|generation_failed|404|409|410|422/);
      return Response.json(diagnostics.slice(0, 3).map((_, id) => ({ id })));
    }
    if (url.pathname === "/rest/v1/rpc/renderlab_record_operational_alert") {
      alertCalls.push(body);
      return Response.json([{
        family: body.p_family,
        severity: body.p_severity,
        first_seen_at: alertCalls[0].p_seen_at,
        last_seen_at: body.p_seen_at,
        occurrence_count: alertCalls.length,
        should_notify: alertCalls.length === 1,
      }]);
    }
    if (url.pathname === "/rest/v1/renderlab_account_access") {
      assert.equal(url.searchParams.get("role"), "eq.admin");
      assert.equal(url.searchParams.get("status"), "eq.active");
      return Response.json([{ user_id: adminId }]);
    }
    if (url.pathname === `/auth/v1/admin/users/${adminId}`) {
      return Response.json({ id: adminId, email: adminEmail, email_confirmed_at: "2026-11-20T00:00:00Z" });
    }
    if (url.href === "https://api.resend.com/emails") {
      emails.push(body);
      return Response.json({ id: "offline-alert-id" });
    }
  } });

  const statuses = [401, 403, 401, 403];
  for (const [index, status] of statuses.entries()) {
    job.respond(Response.json({ detail: "private-gateway-response-body" }, {
      status, headers: { "X-Private-Header": "private-gateway-response-header" },
    }));
    assert.equal((await job.pollNative()).status, "running");
    assert.equal(callbacks.length, 1);
    assert.equal(diagnostics.length, index);
    await callbacks.shift()();
    assert.equal(diagnostics.length, index + 1);
    assert.equal(alertCalls.length, Math.max(0, index - 1));
    assert.equal(emails.length, index >= 2 ? 1 : 0);
  }
  assert.deepEqual(job.patches, []);
  assert.equal(job.reservationReleased, false);
  const runtime = job.warnings.map((line) => JSON.parse(line.slice("[renderlab] ".length)));
  const authEvents = runtime.filter((event) => event.code === "gateway_auth_rejected");
  const unconfirmed = runtime.filter((event) => event.code === "provider-unconfirmed");
  assert.deepEqual(authEvents.map((event) => event.upstreamStatus), statuses);
  assert.deepEqual(unconfirmed.map((event) => event.upstreamStatus), statuses);
  assert.deepEqual(Object.keys(authEvents[0]).sort(),
    ["code", "correlationId", "event", "jobId", "level", "phase", "timestamp", "upstreamStatus"]);
  for (const [index, row] of diagnostics.entries()) {
    assert.deepEqual({
      event: row.event, phase: row.phase, code: row.code, count: row.count, job: row.job_id,
    }, {
      event: "generation.reconciliation", phase: "provider-outcome", code: "provider-unconfirmed",
      count: statuses[index], job: job.row.id,
    });
    const admin = adminDiagnosticProjection(row);
    assert.equal(admin.code, "gateway_auth_rejected");
    assert.equal(admin.upstreamStatus, statuses[index]);
    assert.equal(admin.count, null);
    assert.equal("jobId" in admin, false);
  }
  assert.deepEqual(alertCalls.map(({ p_alert_key, p_family, p_code }) => [p_alert_key, p_family, p_code]), [
    ["generation-provider-degradation", "generation-provider-degradation", "gateway_auth_rejected"],
    ["generation-provider-degradation", "generation-provider-degradation", "gateway_auth_rejected"],
  ]);
  assert.deepEqual(emails[0].to, [adminEmail]);
  const saved = JSON.stringify({ runtime, diagnostics, alertCalls, emails });
  for (const secret of [
    "private-gateway-response-body", "private-gateway-response-header", "offline-proxy-key", "offline-proxy-secret",
    "offline-fixture-key", "re_offline_fixture", job.row.provider_job_id,
  ]) {
    assert.equal(saved.includes(secret), false);
  }
  assert.equal(JSON.stringify(emails).includes(job.row.id), false);
});

test("production structured outcomes and other gateway statuses do not emit the auth diagnostic", async (t) => {
  const callbacks = captureDiagnostics(t, "production");
  const outcomes = [
    [202, "pending", "running"],
    [404, "Unknown FIBO job", "running"],
    [410, "FIBO result expired", "failed"],
    [422, "FIBO rejected the render inputs", "failed"],
    [409, "FIBO_PROCESS_EXITED", "failed"],
  ];
  for (const [status, detail, expected] of outcomes) {
    await t.test(String(status), async (scenario) => {
      const job = fixture(scenario);
      job.respond(Response.json({ detail }, { status }));
      assert.equal((await job.pollNative()).status, expected);
      assert.ok(job.warnings.every((line) => !line.includes("gateway_auth_rejected")));
      assert.equal(callbacks.length, 0);
    });
  }
});

test("preview Modal auth rejections preserve the ambiguous response without a production alert", async (t) => {
  const callbacks = captureDiagnostics(t, "preview");
  const job = fixture(t);
  job.respond(Response.json(null, { status: 401 }));
  assert.equal((await job.pollNative()).status, "running");
  assert.equal(job.warnings.length, 1);
  assert.match(job.warnings[0], /"code":"provider-unconfirmed"/);
  assert.equal(callbacks.length, 0);
});

function pngResult() {
  return new Response(png, { headers: { "content-type": "image/png" } });
}

function pageInput() {
  return { searchParams: Promise.resolve({}) };
}

// The admitted Library route now returns a content Suspense boundary. Execute
// its real async child, as the Create and Activity tests do, rather than
// mistaking the returned boundary for the settled view.
async function loadLibrary(input) {
  const boundary = await loadLibraryPage(input);
  assert.equal(boundary.type, Suspense);
  assert.equal(boundary.props.fallback.props.surface, "library");
  assert.equal(typeof boundary.props.children.type, "function");
  return boundary.props.children.type(boundary.props.children.props);
}

function submitAnotherGeneration() {
  const origin = "https://renderlab.example.invalid";
  return submitRoute(new Request(origin + "/api/generation/jobs", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({
      prompt: "Test fixture",
      inputs: [],
      output: { kind: "image", aspectRatio: "1:1" },
    }),
  }));
}

test("Library settles one owned result before reading the list", async (t) => {
  const job = fixture(t);
  job.respond(pngResult());
  const view = await loadLibrary(pageInput());

  assert.equal(libraryDuration, 30);
  assert.equal(view.props.available, true);
  assert.equal(view.props.items.length, 1);
  assert.equal(view.props.items[0].generationJobId, job.row.id);
  assert.equal(job.row.status, "succeeded");
  assert.equal(job.candidateLookups, 1);
  assert.equal(job.reads, 1);
  assert.equal(job.releases, 1);
  assert.deepEqual(job.afterCallbacks, []);
});

test("production Create returns before settling the owner's result", async (t) => {
  const job = fixture(t);
  job.respond(pngResult());
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  t.after(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  const page = await loadCreate(pageInput());
  const pageShell = await page.type(page.props);
  assert.equal(pageShell.type, Suspense);
  const view = await pageShell.props.children.type(pageShell.props.children.props);

  assert.equal(createDuration, 30);
  assert.equal(view.props.admitted, true);
  assert.equal(view.props.initialAspectRatio, "3:4");
  assert.equal(job.candidateLookups, 0);
  assert.equal(job.reads, 0);
  assert.equal(job.afterCallbacks.length, 1);
  await job.afterCallbacks[0]();
  assert.equal(job.row.status, "succeeded");
  assert.equal(job.media.length, 1);
  assert.equal(job.releases, 1);
});

test("Activity bounds reconciliation and lists a fresh successful result", async (t) => {
  const job = fixture(t);
  job.respond(pngResult());
  const boundary = await loadActivity(pageInput());
  assert.equal(boundary.type, Suspense);
  const view = await boundary.props.children.type(boundary.props.children.props);

  assert.equal(activityDuration, 30);
  assert.equal(view.props.available, true);
  assert.equal(view.props.hasActive, false);
  assert.equal(view.props.items[0].status, "succeeded");
  assert.equal(view.props.items[0].canRunAgain, true);
  assert.equal(job.candidateLookups, 1);
  assert.equal(job.reads, 1);
});

for (const denyRetry of [false, true]) {
  test("occupied admission retries once after settlement " + (denyRetry ? "even if still occupied" : "and accepts the next job"), async (t) => {
    const job = fixture(t, { denyRetry });
    job.respond(pngResult());
    const response = await submitAnotherGeneration();

    assert.equal(response.status, denyRetry ? 429 : 202);
    assert.equal(job.row.status, "succeeded");
    assert.deepEqual(job.admissionSteps, [
      "atomic-accept", "lookup", "release", "atomic-accept",
    ]);
    assert.equal(job.reads, 1);
  });
}

test("concurrent Library responses use one claim, asset, primary write and release", async (t) => {
  let startRead;
  let finishRead;
  const reading = new Promise((resolve) => { startRead = resolve; });
  const result = new Promise((resolve) => { finishRead = resolve; });
  const job = fixture(t);
  job.respond(() => { startRead(); return result; });

  const first = loadLibrary(pageInput());
  await Promise.race([reading, first.then(() => assert.fail("Library completed before provider read started"))]);
  const second = await loadLibrary(pageInput());
  assert.equal(second.props.available, true);
  assert.deepEqual(second.props.items, []);
  finishRead(pngResult());
  assert.equal((await first).props.items.length, 1);
  assert.equal(job.candidateLookups, 2);
  assert.equal(job.reads, 1);
  assert.equal(job.media.length, 1);
  assert.equal(job.objects.filter(({ contentType }) => contentType === "image/png").length, 1);
  assert.equal(job.releases, 1);
  assert.deepEqual(job.patches.map(({ status }) => status), ["persisting", "succeeded"]);
});

test("Library returns normally at six seconds while the claimed PNG write finishes after the response", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let startedWrite;
  let finishWrite;
  const writing = new Promise((resolve) => { startedWrite = resolve; });
  const write = new Promise((resolve) => { finishWrite = resolve; });
  const job = fixture(t, { holdWrite: () => { startedWrite(); return write; } });
  job.respond(pngResult());

  const page = loadLibrary(pageInput());
  await Promise.race([writing, page.then(() => assert.fail("Library completed before primary write started"))]);
  t.mock.timers.tick(6_000);
  const view = await page;
  assert.equal(view.props.available, true);
  assert.deepEqual(view.props.items, []);
  assert.equal(job.row.status, "persisting");
  assert.equal(job.afterCallbacks.length, 1);
  assert.ok(job.warnings.some((warning) => warning.includes("response_wait_expired")));

  finishWrite();
  await job.afterCallbacks[0]();
  assert.equal(job.row.status, "succeeded");
  assert.equal(job.media.length, 1);
  assert.equal(job.releases, 1);
});

test("lookup failure leaves Activity available without a second provider poll", async (t) => {
  const job = fixture(t, { lookupError: () => Response.json({ message: "private-error" }, { status: 503 }) });
  const boundary = await loadActivity(pageInput());
  assert.equal(boundary.type, Suspense);
  const view = await boundary.props.children.type(boundary.props.children.props);

  assert.equal(view.props.available, true);
  assert.equal(view.props.items[0].status, "running");
  assert.equal(job.reads, 0);
  assert.ok(job.warnings.some((warning) => warning.includes("settlement_failed")));
  assert.ok(job.warnings.every((warning) => !warning.includes("private-error")));
});

test("a provider deadline preserves the original occupied response and job state", async (t) => {
  const requestedDeadlines = [];
  t.mock.method(AbortSignal, "timeout", (ms) => {
    requestedDeadlines.push(ms);
    const controller = new AbortController();
    if (ms === 4_000) controller.abort(new DOMException("private-timeout", "TimeoutError"));
    return controller.signal;
  });
  const job = fixture(t);
  job.respond((signal) => { signal.throwIfAborted(); });
  const response = await submitAnotherGeneration();

  assert.equal(response.status, 429);
  assert.equal((await response.json()).error.code, "generation_active_limit_reached");
  assert.deepEqual(job.admissionSteps, ["atomic-accept", "lookup"]);
  assert.deepEqual(job.patches, []);
  assert.equal(requestedDeadlines.at(-1), 4_000);
  assert.ok(requestedDeadlines.slice(0, -1).every((ms) => ms === 1_500));
  assert.ok(job.warnings.some((warning) => warning.includes("lookup_or_provider_timeout")));
  assert.ok(job.warnings.every((warning) => !warning.includes("private-timeout")));
});

test("a confirmed expired result releases an occupied slot without producing media", async (t) => {
  const job = fixture(t);
  job.respond(Response.json({ detail: "FIBO result expired" }, { status: 410 }));

  assert.equal(await settleOwnerGenerationWithinResponse(ownerId, "submit"), true);
  assert.equal(job.row.status, "failed");
  assert.equal(job.releases, 1);
  assert.deepEqual(job.media, []);
});

for (const session of ["signed-out", "suspended", "denied"]) {
  test("P6-03c " + session + " pages retain denied content outside Suspense", async (t) => {
    // The production account helper maps all three denied states to null.
    const key = Symbol.for("renderlab.p603c.fixture.account");
    globalThis[key] = null;
    const oldEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    t.after(() => {
      delete globalThis[key];
      if (oldEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = oldEnv;
    });
    t.mock.method(globalThis, "fetch", async () => assert.fail("Denied page performed provider or private data I/O"));
    const create = await loadCreate(pageInput());
    const view = await create.type(create.props);
    assert.notEqual(view.type, Suspense);
    assert.equal(view.props.admitted, false);
    assert.equal(view.props.hostedModel, undefined);
    assert.equal(view.props.hostedAccountKey, undefined);
    const library = await loadLibraryPage(pageInput());
    assert.notEqual(library.type, Suspense);
    assert.equal(library.props.accountAvailable, false);
    assert.deepEqual(library.props.items, []);
    assert.equal(library.props.hasMore, false);
    const activity = await loadActivity(pageInput());
    assert.notEqual(activity.type, Suspense);
    assert.equal(activity.props.accountAvailable, false);
    assert.deepEqual(activity.props.items, []);
    assert.equal(activity.props.hasActive, false);
    assert.equal(activity.props.hasMore, false);
  });
}

// HTTP transport of the real page functions with the same exact offline import
// stubs above. This is not a Next routing/proxy integration test: it exercises
// page control flow and React SSR without credentials or external I/O.
function pageResponse(url) {
  return new Promise((resolve, reject) => {
    get(url, res => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", chunk => { body += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, location: res.headers.location, body }));
      res.on("error", reject);
    }).on("error", reject);
  });
}

function sendPageError(error, response) {
  const digest = typeof error?.digest === "string" ? error.digest : "";
  // Preserve Next control-flow status and Location instead of following a redirect.
  const redirect = /^NEXT_REDIRECT;(?:push|replace);(.*);(307|308);$/.exec(digest);
  if (redirect) {
    response.writeHead(Number(redirect[2]), { Location: redirect[1] });
    response.end();
  } else if (digest === "NEXT_HTTP_ERROR_FALLBACK;404") {
    response.writeHead(404);
    response.end();
  } else {
    response.writeHead(500);
    response.end("Page rendering failed");
  }
}

for (const session of ["signed-out", "suspended", "denied"]) {
  test("P6-03c HTTP " + session + " Create and Activity preserve denied response status and Location", async (t) => {
    const key = Symbol.for("renderlab.p603c.fixture.account");
    globalThis[key] = null;
    const oldEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    t.after(() => {
      delete globalThis[key];
      if (oldEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = oldEnv;
    });
    t.mock.method(globalThis, "fetch", async () => assert.fail("Denied page performed outbound or private data I/O"));
    const server = createServer(async (request, response) => {
      try {
        const create = request.url === "/create";
        const node = create ? await loadCreate(pageInput()) : await loadActivity(pageInput());
        const view = create ? await node.type(node.props) : node;
        assert.notEqual(view.type, Suspense);
        assert.equal(create ? view.props.admitted : view.props.accountAvailable, false);
        if (create) assert.equal(view.props.hostedAccountKey, undefined);
        else assert.deepEqual(view.props.items, []);
        let didError = false;
        const stream = renderToPipeableStream(view, {
          onShellReady() {
            if (didError) return;
            response.setHeader("Content-Type", "text/html; charset=utf-8");
            stream.pipe(response);
          },
          onShellError(error) { didError = true; sendPageError(error, response); },
          onError() { didError = true; },
        });
      } catch (error) { sendPageError(error, response); }
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    try {
      const origin = "http://127.0.0.1:" + server.address().port;
      for (const route of ["/create", "/activity"]) {
        const response = await pageResponse(origin + route);
        // The pre-change denied pages rendered their private/guest view with
        // HTTP 200, no Location, and no redirect/not-found control flow.
        assert.equal(response.status, 200, route);
        assert.equal(response.location, undefined, route);
        assert.doesNotMatch(response.body, /Loading content|\$\?/, route);
      }
    } finally {
      server.closeAllConnections();
      await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  });
}
