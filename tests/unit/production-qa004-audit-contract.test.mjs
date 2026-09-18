import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(".github/workflows/production-qa004-account-security-data.yml", "utf8");
const verifier = readFileSync("scripts/verify-production-qa004-account-security-data.mjs", "utf8");

test("QA-004 production audit is manual-only and requires exact source plus destructive-fixture acknowledgement", () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\npull_request:/);
  assert.doesNotMatch(workflow, /\npush:/);
  assert.match(workflow, /expected_production_sha:/);
  assert.match(workflow, /confirm_production_sha_verified:/);
  assert.match(workflow, /confirm_fixture_only_destructive_work:/);
  assert.match(workflow, /RENDERLAB_EXPECTED_PRODUCTION_SHA: \$\{\{ inputs\.expected_production_sha \}\}/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(workflow, /https:\/\/renderlab\.faresuniform\.uk/);
  assert.ok(workflow.includes('grep -Eq "^[0-9a-fA-F]{40}$"'));
});

test("QA-004 verifier reuses bounded account suites without provider-generation or email-change dispatch", () => {
  assert.match(verifier, /verify-account-profile-credential\.mjs/);
  assert.match(verifier, /verify-account-preferences\.mjs/);
  assert.match(verifier, /verify-session-controls\.mjs/);
  assert.doesNotMatch(verifier, /verify-account-data-lifecycle\.mjs/);
  assert.doesNotMatch(verifier, /\/api\/generation\/jobs/);
  assert.match(verifier, /providerBackedGenerationDispatched: false/);
  assert.match(verifier, /emailChange: "skipped_gate_not_met"/);
  assert.match(verifier, /RENDERLAB_EXPECTED_PRODUCTION_SHA must be an exact 40-character Git SHA/);
  assert.match(verifier, /exact known DB\/Auth\/R2 absence was verified/);
});
