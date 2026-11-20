import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(".github/workflows/production-adr005-worker-lifecycle.yml", "utf8");
const verifier = readFileSync("scripts/verify-production-adr005-worker-lifecycle.mjs", "utf8");

test("ADR-005 lifecycle workflow is manual, serialized, exact-release bound and two-call bounded", () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(workflow, /confirm_two_disposable_provider_calls/);
  assert.match(workflow, /confirm_external_process_termination/);
  assert.match(workflow, /verify-production-live-state\.mjs/);
  assert.doesNotMatch(workflow, /schedule:/);
  assert.doesNotMatch(workflow, /modal deploy|supabase migration|vercel deploy/i);
});

test("ADR-005 lifecycle verifier covers warm queue, cancellation, process exit, clean recovery and exact cleanup", () => {
  assert.match(verifier, /"warm-queue", "cancel-recovery", "process-exit-recovery"/);
  assert.match(verifier, /phase: "queued-behind-active"/);
  assert.match(verifier, /\/cancel`/);
  assert.match(verifier, /Cancelled render published durable output/);
  assert.match(verifier, /Post-cancellation render ended as/);
  assert.match(verifier, /ADR005_PROCESS_EXIT_READY/);
  assert.match(verifier, /provider-process-exit-unreadable/);
  assert.match(verifier, /provider-failure-clock-advanced/);
  assert.match(verifier, /Process-exit render published durable output or lacked a truthful failed state/);
  assert.match(verifier, /Post-process-exit render ended as/);
  assert.match(verifier, /delivery_count === 1/);
  assert.match(verifier, /providerCallCeiling: 2/);
  assert.match(verifier, /cleanup left durable dispatch residue/);
  assert.match(verifier, /if \(!primaryError\) primaryError = error/);
  assert.doesNotMatch(verifier, /media_assets\?[^\n]+status=eq\.active/);
});
