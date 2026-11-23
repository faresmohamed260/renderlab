#!/usr/bin/env node
// Read-only presentation wrapper around the P0-05 deterministic app harness.
// Fake DB, provider, clock, storage, and blocked network live in tests/helpers.
import assert from "node:assert/strict";
import {
  runtime, resetRuntime, fakeFetch, flushAfter, currentJob, heldReservation,
  OWNER_A, JOB_ID, FIXED_TIME,
} from "../tests/helpers/generation-critical-path-runtime.mjs";

const cases = [
  "success", "admission-denied", "cancel-mid-run", "provider-terminal-failure",
  "process-exit", "ambiguous-then-recovery", "owner-return-settlement",
];
const flags = process.argv.slice(2);
if (flags.includes("--help")) {
  process.stdout.write("Usage: npm run demo:backend -- [--scenario " + cases.join("|") + "] [--json]\n");
  process.exit(0);
}
const argumentIndex = flags.indexOf("--scenario");
const scenario = argumentIndex < 0 ? "success" : flags[argumentIndex + 1];
const json = flags.includes("--json");
const validArguments = flags.every((flag, index) =>
  flag === "--json" || flag === "--scenario"
  || (index === argumentIndex + 1 && cases.includes(flag)));
if (!cases.includes(scenario) || !validArguments || (argumentIndex >= 0 && !flags[argumentIndex + 1])) {
  process.stderr.write("Unknown scenario/flag. Use --help for supported offline cases.\n");
  process.exit(2);
}

// Register loader hooks before importing the real application modules.
const submitApi = await import("../src/app/api/generation/jobs/route.ts");
const reconciliation = await import("../src/server/generation/reconcile-generation.ts");
const cancellation = await import("../src/server/generation/cancel-generation.ts");
const ownerReturn = await import("../src/server/generation/owner-generation-settlement.ts");

const requestBody = {
  prompt: "Offline test gradient", model: "fibo2-edit-turbo",
  output: { kind: "image", aspectRatio: "1:1" }, inputs: [],
};
const origin = "https://renderlab.example.invalid";
resetRuntime({
  ...(scenario === "admission-denied" ? { admissionFailure: "generation_rate_limit_reached" } : {}),
  ...(scenario === "provider-terminal-failure" ? { providerOutcome: "terminal" } : {}),
  ...(scenario === "process-exit" ? { providerOutcome: "process-exited" } : {}),
  ...(scenario === "ambiguous-then-recovery" ? { providerOutcome: "ambiguous" } : {}),
  ...(scenario === "owner-return-settlement" ? { finalizationFault: "after-primary-write" } : {}),
});
assert.equal(Date.now(), FIXED_TIME);
globalThis.fetch = fakeFetch;
AbortSignal.timeout = () => new AbortController().signal;
console.info = () => {};
console.warn = () => {};
console.error = () => {};

const events = [];
function emit(phase, note) {
  events.push({
    number: events.length + 1, phase, note,
    status: currentJob()?.status ?? "not_created",
    outbox: runtime.outbox.get(JOB_ID)?.status ?? null,
    reservationHeld: heldReservation(),
  });
}
function finalSnapshot(responseError = null) {
  const job = currentJob();
  return {
    status: job?.status ?? "not_created",
    errorCode: job?.error_code ?? responseError,
    mediaAssets: runtime.media.size,
    r2Objects: runtime.r2.size,
    providerDispatches: runtime.dispatchCalls,
    providerPolls: runtime.providerPolls,
    providerCancels: runtime.providerCancels,
    reservationReleases: runtime.releases,
    reservationHeld: heldReservation(),
  };
}
function evidence() {
  return runtime.traces.map((entry) => ({
    side: entry.side, method: entry.method, operation: entry.table ?? entry.path,
  }));
}
async function execute() {
  emit("submit", "POST /api/generation/jobs (fixture owner)");
  const response = await submitApi.POST(new Request(origin + "/api/generation/jobs", {
    method: "POST", headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(requestBody),
  }));
  const body = await response.json();
  if (scenario === "admission-denied") {
    assert.equal(response.status, 429);
    assert.equal(body.error.code, "generation_rate_limit_reached");
    emit("admission-denied", "429 generation_rate_limit_reached; no job or outbox");
    return finalSnapshot(body.error.code);
  }
  assert.equal(response.status, 202);
  assert.equal(body.job.status, "queued");
  emit("admission", "fixture reservation granted and bound to owner/job");
  emit("outbox", "durable intent accepted; job queued and outbox pending");
  await flushAfter();
  assert.equal(currentJob().status, "running");
  emit("dispatch", "outbox wake accepted; one fake provider dispatch");

  if (scenario === "cancel-mid-run") {
    const result = await cancellation.requestGenerationCancellation(OWNER_A, JOB_ID);
    assert.equal(result.ok, true);
    emit("cancel", "running job cancellation requested");
    assert.equal(runtime.providerCancels, 1);
    emit("provider-cancel", "fake provider DELETE confirmed");
    emit("settle", "job terminal cancelled");
    emit("release", "owner reservation released once");
    return finalSnapshot();
  }

  if (scenario === "owner-return-settlement") {
    await assert.rejects(
      () => reconciliation.reconcileNativeGeneration(OWNER_A, JOB_ID),
      /OFFLINE_FINALIZATION_FAULT/,
    );
    assert.equal(currentJob().status, "persisting");
    emit("provider-result", "ready bytes obtained from fake provider");
    emit("interruption", "simulated crash after primary R2 write; no asset row yet");
    const previousPolls = runtime.providerPolls;
    assert.equal(await ownerReturn.settleOwnerGenerationWithinResponse(OWNER_A, "activity"), true);
    assert.equal(runtime.providerPolls, previousPolls);
    emit("owner-return", "Activity return resumes from stored bytes without a new provider poll");
  } else if (scenario === "ambiguous-then-recovery") {
    const unresolved = await reconciliation.reconcileNativeGeneration(OWNER_A, JOB_ID);
    assert.equal(unresolved?.status, "running");
    emit("provider-ambiguous", "404 unconfirmed; leave running and reservation held");
    runtime.providerOutcome = "ready";
    const recovered = await reconciliation.reconcileNativeGeneration(OWNER_A, JOB_ID);
    assert.equal(recovered?.status, "succeeded");
    emit("provider-recovered", "later fake provider poll returns ready bytes");
  } else {
    const settled = await reconciliation.reconcileNativeGeneration(OWNER_A, JOB_ID);
    const outcome = scenario === "process-exit" ? "409 FIBO_PROCESS_EXITED"
      : scenario === "provider-terminal-failure" ? "422 terminal rejection" : "200 image/png";
    emit("provider-result", outcome);
    assert.equal(settled?.status, scenario === "success" ? "succeeded" : "failed");
  }
  emit("reconcile", "server reconciliation completed");
  if (currentJob().status === "succeeded") {
    assert.equal(runtime.media.size, 1);
    assert.equal(runtime.r2.size, 2);
    emit("persist", "one durable media asset, primary and thumbnail in fake R2");
  } else {
    assert.equal(runtime.media.size, 0);
    emit("persist-skipped", "terminal provider result has no output to persist");
  }
  emit("settle", "terminal job " + currentJob().status);
  assert.equal(heldReservation(), false);
  assert.equal(runtime.releases, 1);
  emit("release", "admission reservation released exactly once");
  return finalSnapshot();
}
const final = await execute();
const output = {
  schemaVersion: 1, scenario, fixedTime: new Date(FIXED_TIME).toISOString(),
  events, final, trace: evidence(),
};
if (json) process.stdout.write(JSON.stringify(output, null, 2) + "\n");
else {
  process.stdout.write("RenderLab offline backend demo | " + scenario + "\n");
  process.stdout.write("Fixed clock: " + output.fixedTime + " | fake services only; no network/GPU\n");
  for (const event of events) {
    process.stdout.write(String(event.number).padStart(2, "0") + "  "
      + event.phase.padEnd(19) + event.note + "\n");
  }
  process.stdout.write("Final: " + final.status + (final.errorCode ? " (" + final.errorCode + ")" : "")
    + " | assets=" + final.mediaAssets + " | dispatches=" + final.providerDispatches
    + " | releases=" + final.reservationReleases
    + " | held=" + final.reservationHeld + "\n");
}
