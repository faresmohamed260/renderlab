import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(".github/workflows/production-qa003-activity-admin.yml", "utf8");
const verifier = readFileSync("scripts/verify-production-qa003-activity-admin.mjs", "utf8");

test("QA-003 production audit is manual-only and requires exact source acknowledgement", () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\npull_request:/);
  assert.match(workflow, /expected_production_sha:/);
  assert.match(workflow, /confirm_fixture_only_provider_work:/);
  assert.match(workflow, /RENDERLAB_EXPECTED_PRODUCTION_SHA: \$\{\{ inputs\.expected_production_sha \}\}/);
  assert.equal((workflow.match(/- name: Set up Node/g) || []).length, 1);
  assert.equal((workflow.match(/- name: Validate shared-resource secrets/g) || []).length, 1);
  assert.ok(workflow.includes("grep -Eq '^[0-9a-fA-F]{40}$'"));
});

test("QA-003 verifier requires a supplied production SHA and cannot hide cleanup errors", () => {
  assert.match(verifier, /RENDERLAB_EXPECTED_PRODUCTION_SHA must be an exact 40-character Git SHA/);
  assert.doesNotMatch(verifier, /expectedSource = .*ae083473/);
  assert.doesNotMatch(verifier, /deleteConfiguredTestAccount\([^\n]+\)\.catch/);
  assert.match(verifier, /exact DB\/Auth absence was verified/);
});
