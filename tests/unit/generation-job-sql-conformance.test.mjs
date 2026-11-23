import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  generationJobStatuses, generationActiveStatuses, generationTerminalStatuses,
} from "../../src/lib/capabilities/generation-job-state-machine.ts";

const root = process.cwd();
const migration = (name) => fs.readFileSync(path.join(root, "supabase/migrations", name), "utf8");
const source = (name) => fs.readFileSync(path.join(root, name), "utf8");
function sqlEnum(text, expression, label) {
  const match = expression.exec(text);
  assert.ok(match, "Migration must define " + label);
  return Array.from(match[1].matchAll(/'([a-z][a-z0-9_-]*)'/g), (m) => m[1]);
}

test("P0-04 current generation_jobs SQL CHECK exactly matches TS statuses (no stale 0002 set)", () => {
  const current = migration("0016_generation_cancellation.sql");
  const allowed = sqlEnum(current,
    /add constraint generation_jobs_status_check\s+check\s*\(\s*status\s+in\s*\(([^)]+)\)\s*\)/i,
    "generation_jobs_status_check");
  assert.deepEqual([...allowed].sort(), [...generationJobStatuses].sort());
  const preCancellation = migration("0002_generation_jobs_media_assets.sql");
  const oldSet = sqlEnum(preCancellation,
    /status text not null default 'queued' check \(status in \(([^)]+)\)\)/i,
    "original job status enum");
  assert.ok(!oldSet.includes("cancelling"), "Cancellation should have expanded original enum");
  assert.ok(allowed.includes("cancelling"));
  const tsUnion = source("src/lib/capabilities/generation.ts").match(
    /export type GenerationJobStatus\s*=\s*([\s\S]*?);/,
  )?.[1];
  assert.ok(tsUnion, "Canonical TypeScript GenerationJobStatus union must remain present");
  const unionValues = Array.from(tsUnion.matchAll(/"([a-z]+)"/g), (m) => m[1]);
  assert.deepEqual(unionValues.sort(), [...generationJobStatuses].sort());
});

test("P0-04 reconciliation lease SQL admits every active state and excludes terminal states", () => {
  const sql = migration("0016_generation_cancellation.sql");
  const eligible = sqlEnum(sql,
    /job\.status in\s*\(([^)]+)\)/i,
    "reconciliation claim active statuses");
  assert.deepEqual(eligible.sort(), [...generationActiveStatuses].sort());
  for (const terminal of generationTerminalStatuses) assert.ok(!eligible.includes(terminal));
  assert.match(sql, /job\.owner_id = p_owner_id/);
  assert.match(sql, /job\.reconcile_token = p_token/);
});

test("P0-04 outbox has distinct SQL state enum; job versus outbox are not conflated", () => {
  const sql = migration("0030_modal_generation_dispatch_outbox.sql");
  const outbox = sqlEnum(sql,
    /status text not null default 'pending'\s+check\s*\(status in \(([^)]+)\)\)/i,
    "generation_dispatch_outbox status check");
  assert.deepEqual(outbox.sort(),
    ["pending", "claimed", "retry_wait", "dispatched", "unresolved", "failed", "cancelled"].sort());
  assert.ok(!generationJobStatuses.includes("retry_wait"));
  assert.ok(!generationJobStatuses.includes("unresolved"));
  assert.match(sql, /job\.status not in\s*\('cancelling', 'cancelled', 'failed', 'succeeded'\)/);
});

test("P0-04 latest dispatch recovery SQL preserves queued on unresolved and CAS on terminals", () => {
  const sql = migration("20261120022122_modal_dispatch_recovery.sql");
  assert.match(sql, /create or replace function public\.renderlab_finish_generation_dispatch\s*\(/);
  assert.match(sql, /and item\.status = 'claimed' and item\.claim_until > now\(\)/);
  assert.match(sql, /p_status = 'dispatched'[\s\S]*?status = case when/);
  assert.match(sql, /where id = v_row\.job_id and status = 'queued'/);
  assert.match(sql, /p_status = 'unresolved'[\s\S]*?worker_state = 'dispatch_unresolved'/);
  assert.match(sql, /p_status = 'failed'[\s\S]*?set status = 'failed'/);
  assert.match(sql, /where job\.id = p_job_id and job\.owner_id = p_owner_id and job\.status = 'queued'/);
  assert.match(sql, /item\.execution_started_at is null/);
  // Do not assert the old migration 0030 "unresolved -> failed": it was superseded.
});

test("P0-04 materialized media has SQL uniqueness for (job, output_index), and release is idempotent", () => {
  const media = migration("0013_generation_reconciliation.sql");
  assert.match(media, /on public\.media_assets\s*\(generation_job_id,\s*generation_output_index\)/);
  assert.match(media, /where generation_job_id is not null and generation_output_index is not null/);
  const bind = migration("0015_generation_admission_external_bind.sql");
  const terminalAtBind = sqlEnum(bind, /v_job_status in\s*\(([^)]+)\)/, "terminal bind release");
  assert.deepEqual(terminalAtBind.sort(), [...generationTerminalStatuses].sort());
  assert.match(bind, /reservation\.released_at is null/);
  const reservation = migration("0012_renderlab_generation_admission.sql");
  assert.match(reservation, /create or replace function public\.renderlab_release_generation_admission/);
  assert.match(reservation, /set released_at = now\(\)/);
  assert.match(reservation, /and released_at is null/);
  assert.match(reservation, /reservation\.owner_id = p_owner_id/);
});

test("P0-04 migration conformance is static and does not assert nonexistent trigger-enforced transitions", () => {
  const sql = migration("0016_generation_cancellation.sql");
  assert.ok(!/create\s+(?:or\s+replace\s+)?trigger\s+generation_jobs_state_transition/i.test(sql));
  const liveCode = source("src/server/generation/native-generation.ts");
  assert.match(liveCode, /export async function patchJob\(/);
  assert.match(liveCode, /generation_jobs\?owner_id=eq\.\$\{encodeURIComponent\(ownerId\)\}&id=eq\.\$\{encodeURIComponent\(jobId\)\}&select=\*/);
  assert.ok(!/generation_jobs\?owner_id=eq\.[^'"\n]*&status=in\./.test(
    liveCode.match(/export async function patchJob\([\s\S]*?\n}\n/)?.[0] ?? "",
  ), "Generic patchJob should be documented as not globally status-CAS guarded");
});

test("reconciliation fairness is stored in an owner-scoped atomic claim, without touching updated_at", () => {
  const sql = migration("0033_generation_reconciliation_fairness.sql");
  assert.match(sql, /add column if not exists last_reconciled_at timestamptz/i);
  assert.match(sql, /create index if not exists generation_jobs_reconcile_fairness_idx/i);
  assert.match(sql, /create or replace function public\.renderlab_claim_generation_reconciliation\s*\(/i);
  assert.match(sql, /set reconcile_token = p_token,[\s\S]*?reconcile_lease_until\s*=[^\n]+,[\s\S]*?last_reconciled_at = now\(\)/i);
  assert.match(sql, /job\.owner_id = p_owner_id/i);
  assert.match(sql, /job\.reconcile_token = p_token/i);
  assert.doesNotMatch(sql, /set[\s\S]*?updated_at\s*=/i);
  const reconcile = source("src/server/generation/reconcile-generation.ts");
  assert.equal((reconcile.match(/order=last_reconciled_at\.asc\.nullsfirst,updated_at\.asc,id\.asc/g) || []).length, 1);
  assert.match(reconcile, /order: "last_reconciled_at\.asc\.nullsfirst,updated_at\.asc,id\.asc"/);
});
