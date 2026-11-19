import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL("../../src/" + specifier.slice(2) + ".ts", import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});

const { parseGenerationRequest } = await import("../../src/lib/api/generation-contract.ts");
const base = {
  model: "fibo2-edit-turbo",
  prompt: "Four variations of a glass pavilion",
  output: { kind: "image", aspectRatio: "1:1" },
  inputs: [],
};

test("FIBO request domain accepts one to four outputs without inventing browser jobs", () => {
  assert.equal(parseGenerationRequest(base).request.batchCount, undefined);
  assert.equal(parseGenerationRequest({ ...base, batchCount: 1 }).request.batchCount, undefined);
  for (const batchCount of [2, 3, 4]) {
    const parsed = parseGenerationRequest({ ...base, batchCount });
    assert.equal(parsed.ok, true);
    assert.equal(parsed.request.batchCount, batchCount);
  }
  for (const batchCount of [0, 5, -1, 1.5, "4", true, null]) {
    const parsed = parseGenerationRequest({ ...base, batchCount });
    assert.equal(parsed.ok, false, String(batchCount));
    assert.equal(parsed.error.code, "invalid_request");
  }
});

test("batch admission remains fail-closed until the per-output engine is qualified", () => {
  const submission = fs.readFileSync("src/server/generation/submit-generation.ts", "utf8");
  assert.match(submission, /\(request\.batchCount \?\? 1\) > 1/);
  assert.match(submission, /generation_disabled/);
  assert.match(submission, /per-output lifecycle qualification/);
});

test("durable slot migration is owner-bound, bounded, indexed, and browser-revoked", () => {
  const migration = fs.readFileSync("supabase/migrations/0030_fibo_batch_output_slots.sql", "utf8");
  assert.match(migration, /primary key \(generation_job_id, output_index\)/i);
  assert.match(migration, /output_index between 0 and 3/i);
  assert.match(migration, /status in \('queued', 'running', 'persisting', 'succeeded', 'failed', 'cancelled'\)/i);
  assert.match(migration, /generation_job_outputs_provider_job_unique_idx/i);
  assert.match(migration, /generation_output_index = new\.output_index/i);
  assert.match(migration, /alter table public\.generation_job_outputs enable row level security/i);
  assert.match(migration, /revoke all on table public\.generation_job_outputs from public, anon, authenticated/i);
  assert.doesNotMatch(migration, /create policy/i);
});

test("retry and recovery preserve count while Create recipe restore fails closed", () => {
  const engine = fs.readFileSync("src/server/generation/native-generation.ts", "utf8");
  const recipe = fs.readFileSync("src/server/generation/generation-recipe.ts", "utf8");
  assert.match(engine, /request\.batchCount \? \{ batchCount: request\.batchCount \}/);
  assert.match(engine, /typeof row\.parameters\.batchCount === "number"/);
  assert.match(recipe, /typeof row\.parameters\.batchCount === "number"/);
  assert.match(recipe, /\(request\.batchCount \?\? 1\) > 1/);
});

test("native batch orchestration owns dispatch, persistence, recovery, and public summary", () => {
  const engine = fs.readFileSync("src/server/generation/native-generation.ts", "utf8");
  const activity = fs.readFileSync("src/server/generation/generation-activity.ts", "utf8");
  const publicContract = fs.readFileSync("src/lib/api/generation-activity-contract.ts", "utf8");
  assert.match(engine, /createFiboBatchOutputSlots\([\s\S]*request\.advanced\?\.seed/);
  assert.match(engine, /advanced: \{ \.\.\.request\.advanced, seed: slot\.seed \}/);
  assert.match(engine, /worker_id: submitted\.worker\.id/);
  assert.match(engine, /provider_job_id: submitted\.callId/);
  assert.match(engine, /status: "persisting"[\s\S]*persistResultSlot\(row, slot\.output_index/);
  assert.match(engine, /recoverFiboBatchSlot/);
  assert.match(engine, /summarizeFiboBatchSlots/);
  assert.match(engine, /output_asset_ids: summary\.outputAssetIds/);
  assert.match(activity, /parseFiboBatchSummary/);
  assert.match(publicContract, /batch\?: FiboBatchSummary/);
  assert.doesNotMatch(publicContract, /providerJobId|workerId/);
});
