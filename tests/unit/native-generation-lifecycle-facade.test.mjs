import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import "../helpers/generation-critical-path-runtime.mjs";

// The real, offline Unit 5 critical-path suite already exercises creation,
// pending/ready poll, terminal CAS, replay and admission settlement. This test
// protects the final split's export shape and dependency direction.
const facade = await import("../../src/server/generation/native-generation.ts");
const lifecycle = await import("../../src/server/generation/native-generation-lifecycle.ts");

test("stable public facade exports exactly the same native lifecycle implementations", () => {
  for (const name of ["isNativeGenerationConfigured", "submitNativeGeneration", "pollNativeGeneration"]) {
    assert.equal(facade[name], lifecycle[name], name);
  }
  for (const name of [
    "toGenerationJob", "getJobRow", "patchJob", "patchJobRow",
    "wakeFiboDispatcher", "persistResult", "recoverPersistingResult",
  ]) assert.equal(typeof facade[name], "function", name);
});

test("native-generation compatibility facade has no submit, poll, DB, provider or R2 implementation", () => {
  const facadeSource = readFileSync(new URL("../../src/server/generation/native-generation.ts", import.meta.url), "utf8");
  assert.match(facadeSource,
    /export \{ isNativeGenerationConfigured, submitNativeGeneration, pollNativeGeneration \} from "@\/server\/generation\/native-generation-lifecycle"/);
  assert.match(facadeSource,
    /export \{ getJobRow, patchJob, patchJobRow \} from "@\/server\/generation\/native-generation-job-store"/);
  assert.match(facadeSource,
    /export \{ persistResult, recoverPersistingResult \} from "@\/server\/generation\/native-generation-output-persistence"/);
  assert.match(facadeSource,
    /export \{ wakeFiboDispatcher \} from "@\/server\/generation\/native-generation-worker-transport"/);
  assert.doesNotMatch(facadeSource, /\b(?:fetch|supabaseRest|writeR2Object|patchJobRow)\s*\(/);
  assert.doesNotMatch(facadeSource, /\b(?:async\s+)?function\s+/);

  const body = readFileSync(new URL("../../src/server/generation/native-generation-lifecycle.ts", import.meta.url), "utf8");
  assert.match(body, /async function acceptDurableDispatch\(/);
  assert.match(body, /export async function submitNativeGeneration\(/);
  assert.match(body, /export async function pollNativeGeneration\(/);
  assert.match(body, /async function reassignPollJob\(/);
  assert.match(body, /function providerFailureDiagnostic\(/);
  assert.doesNotMatch(body, /from ["']@\/server\/generation\/native-generation["']/);
});
