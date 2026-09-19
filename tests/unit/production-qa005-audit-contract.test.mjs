import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflowPath = ".github/workflows/production-qa005-reconciliation-failure.yml";
const verifierPath = "scripts/verify-production-qa005-reconciliation-failure.mjs";

test("QA-005 production failure workflow is manual-only and exact-source scoped", async () => {
  const workflow = await readFile(workflowPath, "utf8");

  assert.match(workflow, /on:\n  workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\n  push:/);
  assert.doesNotMatch(workflow, /\n  pull_request:/);
  assert.doesNotMatch(workflow, /\n  workflow_call:/);
  assert.match(workflow, /expected_production_sha:/);
  assert.match(workflow, /confirm_fixture_only_failure_work:/);
  assert.match(workflow, /confirm_zero_real_provider_work:/);
  assert.match(workflow, /permissions:\n  contents: read/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(workflow, /ref: \$\{\{ inputs\.expected_production_sha \}\}/);
  assert.match(workflow, /path: production-source/);
  assert.match(workflow, /RENDERLAB_TEST_RECONCILER_OWNER_SCOPE: "true"/);
  assert.match(workflow, /RENDERLAB_TEST_NATIVE_WORKER_OVERRIDE: "true"/);
  assert.match(workflow, /http:\/\/127\.0\.0\.1:4312/);
  assert.match(workflow, /Clean exact QA-005 fixture after audit\n        if: always\(\)/);
  assert.match(workflow, /Upload QA-005 evidence\n        if: always\(\)/);
});

test("QA-005 verifier keeps failure work fixture-scoped and real-provider-free", async () => {
  const verifier = await readFile(verifierPath, "utf8");

  assert.match(verifier, /configuredTestAccountIdentity\("qa005-reconciliation-failure"\)/);
  assert.match(verifier, /\.eq\("owner_id", fixture\.id\)\.eq\("id", id\)/);
  assert.match(verifier, /generation_provider_stalled/);
  assert.match(verifier, /generation_orchestration_stalled/);
  assert.match(verifier, /providerBackedGenerationDispatched:false/);
  assert.match(verifier, /runOwnedMockWorkerUsed:true/);
  assert.match(verifier, /trackKnownFailureOutputKeys/);
  assert.match(verifier, /getUserById\(fixture\.id\)/);
  assert.match(verifier, /data-activity-live="true"/);
  assert.match(verifier, /Generation did not complete\. Retry when you’re ready\./);
  assert.match(verifier, /waitForTimeout\(6500\)/);
  assert.match(verifier, /reducedMotion:"reduce"/);
  assert.doesNotMatch(verifier, /renderlab\.faresuniform\.uk\/api\/internal\/generation\/reconcile/);
  assert.doesNotMatch(verifier, /getByRole\("button",\{name:"Retry"\}\)\.click/);
});
