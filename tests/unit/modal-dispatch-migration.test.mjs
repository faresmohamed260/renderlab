import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const migration = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/0030_modal_generation_dispatch_outbox.sql"), "utf8");
const nativeGeneration = fs.readFileSync(path.join(process.cwd(), "src/server/generation/native-generation.ts"), "utf8");

test("accepted generation and dispatch intent share one database function", () => {
  const body = migration.slice(migration.indexOf("function public.renderlab_accept_generation_dispatch"), migration.indexOf("function public.renderlab_claim_generation_dispatch"));
  assert.match(body, /insert into public\.generation_jobs/);
  assert.match(body, /insert into public\.generation_dispatch_outbox/);
  assert.match(nativeGeneration, /rpc\/renderlab_accept_generation_dispatch/);
  assert.doesNotMatch(nativeGeneration, /async function insertJob/);
});

test("claims recover after expiry and overlapping ticks lock rows", () => {
  const claim = migration.slice(migration.indexOf("function public.renderlab_claim_generation_dispatch"), migration.indexOf("function public.renderlab_finish_generation_dispatch"));
  assert.match(claim, /item\.claim_until <= now\(\)/);
  assert.match(claim, /for update of item skip locked/);
  assert.match(claim, /item\.admission_deadline > now\(\)/);
});

test("dedup cleanup preserves live and unresolved attempts and stale delivery fails closed", () => {
  const cleanup = migration.slice(migration.indexOf("function public.renderlab_cleanup_generation_dispatch"));
  assert.match(cleanup, /item\.status in \('dispatched', 'failed', 'cancelled'\)/);
  assert.match(cleanup, /job\.status in \('succeeded', 'failed', 'cancelled'\)/);
  assert.doesNotMatch(cleanup, /item\.status in \([^)]*'unresolved'/);
  const begin = migration.slice(migration.indexOf("function public.renderlab_begin_generation_attempt"), migration.indexOf("function public.renderlab_cancel_queued_generation_dispatch"));
  assert.match(begin, /item\.admission_deadline = p_admission_deadline/);
  assert.match(begin, /item\.admission_deadline > now\(\)/);
  assert.match(begin, /item\.execution_started_at is null/);
});

test("queued cancellation closes the outbox and missed wake stays accepted", () => {
  assert.match(migration, /function public\.renderlab_cancel_queued_generation_dispatch/);
  assert.match(nativeGeneration, /await requestDispatcherWake\(workflow\)\.catch/);
});

test("Modal dispatcher and GPU worker receive distinct least-privilege database roles", () => {
  assert.match(migration, /create role renderlab_modal_dispatcher nologin noinherit/);
  assert.match(migration, /create role renderlab_modal_worker nologin noinherit/);
  assert.match(migration, /and \(rolsuper or rolreplication or rolbypassrls\)/);
  assert.match(migration, /alter role renderlab_modal_dispatcher with nologin noinherit nocreatedb nocreaterole connection limit 4/);
  assert.match(migration, /alter role renderlab_modal_worker with nologin noinherit nocreatedb nocreaterole connection limit 2/);
  assert.doesNotMatch(migration, /alter role[^;]+(?:nosuperuser|noreplication|nobypassrls)/);
  assert.doesNotMatch(migration, /grant renderlab_modal_dispatcher, renderlab_modal_worker to authenticator/);
  assert.match(migration, /renderlab_claim_generation_dispatch[^;]+to renderlab_modal_dispatcher/s);
  assert.match(migration, /renderlab_begin_generation_attempt[^;]+to renderlab_modal_worker/s);
  assert.doesNotMatch(migration, /renderlab_begin_generation_attempt[^;]+to renderlab_modal_dispatcher/s);
});
