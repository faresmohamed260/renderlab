import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const helper = readFileSync("scripts/lib/configured-test-account.mjs", "utf8");
const activity = readFileSync("scripts/verify-activity-cancel.mjs", "utf8");
const activityWorkflow = readFileSync(".github/workflows/activity-cancel-visual.yml", "utf8");
const library = readFileSync("scripts/verify-library-lifecycle.mjs", "utf8");

test("configured fixture cleanup retries and proves absence", () => {
  assert.match(helper, /async function retryConfiguredCleanup/);
  assert.match(helper, /async function verifyConfiguredTestAccountAbsent/);
  assert.match(helper, /Configured account residue verification/);
  assert.match(helper, /authAdmin\(\`users\/\$\{encodedId\}\`, \{ method: "GET" \}\)/);
});

test("Activity Cancel cleanup cannot be silently swallowed", () => {
  assert.doesNotMatch(activity, /deleteConfiguredTestAccount\(ownerIdentity\)\.catch/);
  assert.match(activity, /process\.argv\.includes\("--cleanup-only"\)/);
  assert.match(activityWorkflow, /name: Cleanup Activity Cancel fixtures/);
  assert.match(activityWorkflow, /if: always\(\)/);
  assert.match(activityWorkflow, /node scripts\/verify-activity-cancel\.mjs --cleanup-only/);
});

test("Library lifecycle retries its idempotent cleanup sequence", () => {
  assert.match(library, /async function retryCleanup/);
  assert.match(library, /Library initial fixture cleanup/);
  assert.match(library, /Library final fixture cleanup/);
  assert.match(library, /Library fixture cleanup/);
});
