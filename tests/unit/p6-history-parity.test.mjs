import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { fiboGenerationModel } from "../../src/lib/capabilities/generation.ts";
import { postHistoryJobAction } from "../../src/features/create/history/history-job-actions.ts";

const owner = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const job = "11111111-1111-4111-8111-111111111111";
const nextJob = "22222222-2222-4222-8222-222222222222";
const key = Symbol.for("renderlab.history.parity");
const state = globalThis[key] = { account: { id: owner }, calls: [], items: [], error: false, failedReuse: null, recipe: null, requestHeaders: new Headers({ host: "renderlab.example", origin: "https://renderlab.example", "sec-fetch-site": "same-origin", "x-forwarded-proto": "https" }) };
const stub = source => ({ url: "data:text/javascript," + encodeURIComponent(source), shortCircuit: true });
const shared = 'const s=globalThis[Symbol.for("renderlab.history.parity")];';
const hook = registerHooks({
  resolve(spec, context, next) {
    if (spec === "next/headers") return stub(shared + 'export async function headers(){return s.requestHeaders;}');
    if (context.parentURL?.endsWith("/history-actions.ts") && spec === "./history-action-origin") return next("./history-action-origin.ts", context);
    if (spec === "server-only") return stub("export {};");
    if (spec === "@/lib/supabase/server") return stub(shared + 'export async function getCurrentRenderLabAccount(){s.calls.push(["account"]);return s.account;}');
    if (spec === "@/server/data/supabase-rest") return stub(shared + 'export function isSupabaseConfigured(){return !s.error;}');
    if (spec === "@/server/generation/owner-generation-settlement") return stub(shared + 'export async function settleOwnerGenerationWithinResponse(owner,source){s.calls.push(["settle",owner,source]);return false;}');
    if (spec === "@/server/generation/generation-activity") return stub(shared + 'export async function listGenerationActivity(query){s.calls.push(["list",query]);return {items:s.items,page:{offset:query.offset,limit:query.limit,hasMore:true},hasActive:true};}');
    if (spec === "@/features/create/create-continuation") return next(new URL("../../src/features/create/create-continuation.ts", import.meta.url).href, context);
    if (spec === "@/server/generation/generation-recipe") return stub(shared + 'export async function loadInitialGenerationRecipe(owner,id){s.calls.push(["initial-recipe",owner,id]);return s.recipe;}');
    if (context.parentURL?.endsWith("/history-actions.ts") && spec === "./failed-reuse") return stub(shared + 'export async function loadFailedReuseDraft(owner,id){s.calls.push(["failed-reuse",owner,id]);return s.failedReuse;}');
    if (context.parentURL?.endsWith("/history-actions.ts") && spec === "./prompt-history") return stub('export async function listPromptHistory(){throw new Error("unexpected prompt read");}');
    if (context.parentURL?.endsWith("/history-actions.ts") && spec === "./history-activity") return next("./history-activity.ts", context);
    return next(spec, context);
  },
});
const { readHistoryActivity } = await import("../../src/server/generation/history/history-activity.ts");
const { loadCreateHistoryReuse, readCreateHistoryJobs, readCreateHistoryPrompts } = await import("../../src/server/generation/history/history-actions.ts");
hook.deregister();

test("History uses the admitted owner and Activity recovery before the identical bounded projection", async () => {
  state.account = { id: owner }; state.error = false; state.calls = [];
  state.items = [
    { id: job, status: "failed", operation: "edit-image", canCancel: false, canRunAgain: false, outputAssetIds: [], error: { code: "generation_failed", message: "Generation did not complete." } },
    { id: nextJob, status: "succeeded", operation: "create-image", canCancel: false, canRunAgain: true, outputAssetIds: ["surviving"], error: null },
    { id: "legacy", status: "failed", operation: "create-video", canCancel: false, canRunAgain: false, outputAssetIds: [], error: null },
  ];
  const result = await readHistoryActivity({ offset: 20, ownerId: "forged", limit: 999 });
  assert.deepEqual(state.calls, [["account"], ["settle", owner, "activity"], ["list", { ownerId: owner, offset: 20, limit: 20 }]]);
  assert.equal(result.state, "ready");
  assert.deepEqual(result.items, state.items.map((item, i) => ({ ...item, canRetry: i === 0, canReuse: i === 0 || i === 1 })));
  assert.deepEqual(result.page, { offset: 20, limit: 20, hasMore: true });
  assert.equal(result.hasActive, true);
});
test("History distinguishes private and unavailable; neither reaches settlement or projection", async () => {
  state.calls = []; state.account = null; state.error = false;
  assert.deepEqual(await readHistoryActivity(), { state: "private" });
  assert.deepEqual(state.calls, [["account"]]);
  state.calls = []; state.account = { id: owner }; state.error = true;
  assert.deepEqual(await readHistoryActivity(), { state: "unavailable" });
  assert.deepEqual(state.calls, [["account"]]);
  state.calls = []; state.error = false; state.items = [];
  const page = await readHistoryActivity({ offset: -12 });
  assert.equal(page.state, "ready");
  assert.deepEqual(page.items, []);
  assert.deepEqual(page.page, { offset: 0, limit: 20, hasMore: true });
});
test("History actions use only existing owner-scoped POST endpoints and distinguish new attempts", async () => {
  const signal = new AbortController().signal;
  for (const [action, suffix, id, status] of [
    ["cancel", "cancel", job, "cancelling"],
    ["retry", "retry", nextJob, "queued"],
    ["runAgain", "run-again", nextJob, "queued"],
  ]) {
    const calls = [];
    const result = await postHistoryJobAction(action, job, signal, async (url, init) => {
      calls.push([url, init]); return Response.json({ ok: true, job: { id, status } }, { status: 202 });
    });
    assert.deepEqual(result, { ok: true, job: { id, status } });
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], "/api/generation/jobs/" + job + "/" + suffix);
    assert.equal(calls[0][1].method, "POST");
    assert.equal(calls[0][1].signal, signal);
    assert.equal(calls[0][1].credentials, "same-origin");
    assert.equal(calls[0][1].body, undefined);
  }
});
test("History rejects malformed or contradictory acceptance and handles cancel races without resubmission", async () => {
  const signal = new AbortController().signal;
  for (const [action, id, status] of [["retry", job, "queued"], ["runAgain", job, "queued"], ["cancel", nextJob, "cancelling"], ["cancel", job, "running"]]) {
    const outcome = await postHistoryJobAction(action, job, signal, async () => Response.json({ ok: true, job: { id, status } }, { status: 202 }));
    assert.equal(outcome.ok, false);
  }
  let calls = 0;
  const race = await postHistoryJobAction("cancel", job, signal, async () => {
    calls++; return Response.json({ ok: false, error: { code: "cancel_not_available", message: "private implementation detail" } }, { status: 409 });
  });
  assert.deepEqual(race, { ok: false, message: "Cancellation is no longer available." });
  assert.equal(calls, 1);
  const invalid = await postHistoryJobAction("retry", "../foreign", signal, async () => { throw Error("must not call"); });
  assert.equal(invalid.ok, false);
});

test("History reuses eligible succeeded settings as a validated draft through the existing owner-scoped recipe loader", async () => {
  state.account = { id: owner };
  state.calls = [];
  state.failedReuse = { ok: false, reason: "not_failed" };
  state.recipe = { jobId: nextJob, request: {
    model: fiboGenerationModel, prompt: "A saved prompt", output: { kind: "image", aspectRatio: "1:1" },
    inputs: [], advanced: { seed: 123, steps: 8 },
  }, references: [] };
  assert.deepEqual(await loadCreateHistoryReuse(nextJob), { ok: true, draft: {
    mode: "generate", references: [], prompt: "A saved prompt", vgl: "", seed: "123",
    randomize: false, steps: 8, negativePrompt: "", aspectRatio: "1:1",
  } });
  assert.deepEqual(state.calls, [["account"], ["failed-reuse", owner, nextJob], ["initial-recipe", owner, nextJob]]);

  state.recipe.request.autoVgl = true;
  assert.equal((await loadCreateHistoryReuse(nextJob)).ok, false);
  state.recipe = null;
  assert.equal((await loadCreateHistoryReuse(nextJob)).ok, false);
});

test("History retains the failed-reuse result and never falls through on missing, foreign or signed-out jobs", async () => {
  state.calls = [];
  state.failedReuse = { ok: false, reason: "job_not_found" };
  assert.deepEqual(await loadCreateHistoryReuse(job), state.failedReuse);
  assert.deepEqual(state.calls, [["account"], ["failed-reuse", owner, job]]);

  state.calls = [];
  state.failedReuse = { ok: true, draft: { prompt: "Editable failed prompt" } };
  assert.deepEqual(await loadCreateHistoryReuse(job), state.failedReuse);
  assert.deepEqual(state.calls, [["account"], ["failed-reuse", owner, job]]);

  state.calls = [];
  state.account = null;
  assert.deepEqual(await loadCreateHistoryReuse(job), { ok: false, reason: "unavailable" });
  assert.deepEqual(state.calls, [["account"]]);
});

test("History action boundary rejects cross-site, missing or mismatched origins before auth, settlement, or recipe lookup", async () => {
  const original = state.requestHeaders;
  state.account = { id: owner };
  try {
    for (const headers of [
      { host: "renderlab.example", origin: "https://evil.example", "sec-fetch-site": "cross-site" },
      { host: "renderlab.example", origin: "https://renderlab.example", "sec-fetch-site": "same-site" },
      { host: "renderlab.example", "sec-fetch-site": "same-origin" },
      { host: "renderlab.example", origin: "null" },
      { host: "renderlab.example", origin: "https://evil.example" },
      { host: "renderlab.example", origin: "http://renderlab.example", "x-forwarded-proto": "https" },
      { host: "renderlab.example", origin: "https://renderlab.example/path" },
    ]) {
      state.requestHeaders = new Headers(headers);
      state.calls = [];
      assert.deepEqual(await readCreateHistoryJobs(0), { state: "private" });
      await assert.rejects(() => readCreateHistoryPrompts({ search: "x" }), /Private history unavailable/);
      assert.deepEqual(await loadCreateHistoryReuse(job), { ok: false, reason: "unavailable" });
      assert.deepEqual(state.calls, []);
    }
    state.requestHeaders = original;
    state.calls = []; state.error = false; state.items = [];
    assert.equal((await readCreateHistoryJobs(0)).state, "ready");
    assert.deepEqual(state.calls, [["account"], ["settle", owner, "activity"], ["list", { ownerId: owner, offset: 0, limit: 20 }]]);
  } finally { state.requestHeaders = original; }
});

test("History does not serialize internal or unknown persisted error codes", async () => {
  state.account = { id: owner }; state.error = false; state.calls = [];
  const codes = ["generation_submission_failed", "generation_failed", "worker_credit_exhausted", "generation_dispatch_unresolved", "internal-fixture-provider-id"];
  state.items = codes.map((code, index) => ({
    id: job, status: "failed", operation: "create-image", canCancel: false, canRunAgain: false,
    outputAssetIds: [], error: { code, message: index === 0 ? "Generation could not be started. Retry when you’re ready." : "Generation did not complete. Retry when you’re ready." },
  }));
  const result = await readHistoryActivity();
  assert.equal(result.state, "ready");
  assert.deepEqual(result.items.map(item => item.error?.code), ["generation_submission_failed", "generation_failed", "generation_failed", "generation_failed", "generation_failed"]);
  assert.deepEqual(result.items.map(item => item.error?.message), state.items.map(item => item.error.message));
  assert.ok(!JSON.stringify(result).includes("internal-fixture-provider-id"));
  assert.deepEqual(result.items.map(item => item.canRetry), [true, true, true, true, true]);
});
