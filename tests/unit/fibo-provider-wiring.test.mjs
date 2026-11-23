import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  runtime, resetRuntime, fakeFetch, flushAfter, currentJob, heldReservation,
  OWNER_A, JOB_ID,
} from "../helpers/generation-critical-path-runtime.mjs";

const submitApi = await import("../../src/app/api/generation/jobs/route.ts");
const poll = await import("../../src/server/generation/poll-generation.ts");
const { fiboProvider } = await import("../../src/server/generation/adapters/fibo-adapter.ts");

test("P1-02 provider wiring retains exactly one app accept, one outbox dispatch and one terminal release", async t => {
  resetRuntime();
  t.mock.method(globalThis, "fetch", fakeFetch);
  t.mock.method(AbortSignal, "timeout", () => new AbortController().signal);
  t.mock.method(console, "warn", () => {});
  t.mock.method(console, "info", () => {});
  assert.equal(fiboProvider.id, "fibo");
  const site = "https://renderlab.example.invalid";
  const accepted = await submitApi.POST(new Request(site + "/api/generation/jobs", {
    method: "POST",
    headers: { origin: site, "content-type": "application/json" },
    body: JSON.stringify({
      prompt: "No duplicate dispatch", model: "fibo2-edit-turbo",
      output: { kind: "image", aspectRatio: "1:1" }, inputs: [],
    }),
  }));
  assert.equal(accepted.status, 202);
  assert.equal(currentJob().status, "queued");
  assert.equal(runtime.outbox.get(JOB_ID).status, "pending");
  await flushAfter();
  assert.equal(runtime.dispatchCalls, 1);
  assert.equal(runtime.wakeCalls, 1);

  const finished = await poll.pollGenerationJob(OWNER_A, JOB_ID);
  assert.equal(finished?.status, "succeeded");
  assert.equal(runtime.providerPolls, 1);
  assert.equal(runtime.mediaWrites, 1);
  assert.equal(runtime.atomicCommits, 1);
  assert.equal(runtime.releases, 1);
  assert.equal(heldReservation(), false);
  const accepts = runtime.traces.filter(x => x.side === "db"
    && x.table === "rpc/renderlab_accept_generation_dispatch");
  assert.equal(accepts.length, 1);
  assert.equal(runtime.traces.filter(x => x.side === "provider"
    && x.method === "POST" && x.path === "/jobs/fibo").length, 0);
  assert.equal(runtime.traces.filter(x => x.side === "provider"
    && x.method === "GET" && x.path === "/jobs").length, 1);
  assert.equal((await poll.pollGenerationJob(OWNER_A, JOB_ID))?.status, "succeeded");
  assert.equal(runtime.providerPolls, 1);
  assert.equal(runtime.releases, 1);
});

test("FIBO port alone owns payload encoding/status translation; owner DB and R2 remain in lifecycle", () => {
  const transport = readFileSync(new URL("../../src/server/generation/native-generation-worker-transport.ts", import.meta.url), "utf8");
  const lifecycle = readFileSync(new URL("../../src/server/generation/native-generation-lifecycle.ts", import.meta.url), "utf8");
  const port = readFileSync(new URL("../../src/server/generation/adapters/fibo-provider-port.ts", import.meta.url), "utf8");
  assert.match(transport, /fiboProvider\.prepareDurableSubmission\(request, sources, maskBytes\)/);
  assert.match(lifecycle, /await fiboProvider\.status\(worker, row\.provider_job_id, row\.output_kind, providerTimeoutMs\)/);
  assert.match(lifecycle, /fiboProvider\.interpretFailure\(response\.status, body\)/);
  assert.match(lifecycle, /rpc\/renderlab_accept_generation_dispatch/);
  assert.match(lifecycle, /await patchJobRow\(row/);
  assert.match(lifecycle, /await persistResult\(persisting, bytes, contentType, poster\)/);
  assert.doesNotMatch(port, /supabaseRest|writeR2Object|patchJobRow|releaseBoundGenerationAdmission/);
});
