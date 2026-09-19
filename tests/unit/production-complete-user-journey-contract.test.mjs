import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(".github/workflows/production-complete-user-journey.yml", "utf8");
const verifier = readFileSync("scripts/verify-production-complete-user-journey.mjs", "utf8");

test("QA-002 permanent production journey is explicit manual-only bounded provider work", () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\npush:/);
  assert.doesNotMatch(workflow, /\npull_request:/);
  assert.doesNotMatch(workflow, /workflow_call:/);
  assert.match(workflow, /expected_production_sha:/);
  assert.match(workflow, /confirm_bounded_fixture_provider_work:/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(workflow, /https:\/\/renderlab\.faresuniform\.uk/);
  assert.match(workflow, /node scripts\/verify-production-complete-user-journey\.mjs --cleanup-only/);
  assert.match(workflow, /if: always\(\)/);
});

test("QA-002 verifier covers exact provenance, account read-only surfaces, manifest, and independent cleanup", () => {
  assert.match(verifier, /RENDERLAB_EXPECTED_PRODUCTION_SHA/);
  assert.match(verifier, /RENDERLAB_CONFIRM_BOUNDED_FIXTURE_PROVIDER_WORK/);
  assert.match(verifier, /providerGenerationCount/);
  assert.match(verifier, /manifest\.json/);
  assert.match(verifier, /\/settings\/profile/);
  assert.match(verifier, /\/settings\/preferences/);
  assert.match(verifier, /Active RenderLab sessions/);
  assert.match(verifier, /HeadObjectCommand/);
  assert.match(verifier, /renderlab_account_preferences/);
  assert.match(verifier, /renderlab_account_lifecycle/);
  assert.match(verifier, /renderlab_account_exports/);
  assert.match(verifier, /trackedR2ObjectsChecked/);
  assert.match(verifier, /exactly four contracted provider-backed generations/);
  assert.doesNotMatch(verifier, /\/api\/account\/delete/);
  assert.doesNotMatch(verifier, /sign out other devices/i);
  assert.doesNotMatch(verifier, /challengeAndVerify/);
});
