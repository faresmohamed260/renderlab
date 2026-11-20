import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  RENDERLAB_VERCEL_PROJECT_ID as projectId,
  RENDERLAB_VERCEL_TEAM_ID as teamId,
  verifyModalCutoverSmokeRelease,
} from "../../scripts/lib/production-live-state.mjs";

const sha = "c3f92247b21b9761fde6cee610cce2c9084441f8";
const supersededSha = "4f8efb7f52e7c43f5425c7a4aa3375f2292992cb";
const recoverySha = "e93481466806b3a88f986cd547f11ef62e9543fb";
const deploymentId = "dpl_test";
const domain = "renderlab.faresuniform.uk";
const base = { expectedSha: sha, deploymentId, scenario: "text-to-image", vercelToken: "test-token" };

function mockProvider({ source = sha, alias = {}, deployment = {}, status = 200 } = {}) {
  return async (url, options) => {
    const parsed = new URL(url);
    assert.equal(parsed.origin, "https://api.vercel.com");
    assert.equal(parsed.searchParams.get("teamId"), teamId);
    assert.equal(options.headers.Authorization, "Bearer test-token");
    if (parsed.pathname === `/v4/aliases/${domain}`) {
      assert.equal(parsed.searchParams.get("projectId"), projectId);
      return Response.json({ alias: domain, projectId, deploymentId, ...alias }, { status });
    }
    assert.equal(parsed.pathname, `/v13/deployments/${deploymentId}`);
    assert.equal(parsed.searchParams.get("withGitRepoInfo"), "true");
    return Response.json({
      id: deploymentId, project: { id: projectId }, readyState: "READY",
      target: "production", meta: { githubCommitSha: source }, ...deployment,
    }, { status });
  };
}

test("direct provider verification accepts both exact runbook releases without reading the production manifest", async () => {
  for (const source of [sha, recoverySha]) {
    assert.deepEqual(await verifyModalCutoverSmokeRelease({
      ...base, expectedSha: source, fetchImpl: mockProvider({ source }),
    }), { sha: source, deploymentId, domain });
  }
});

test("cutover verification rejects mismatched or unverified live deployment evidence", async () => {
  const cases = [
    [{ alias: { alias: "other.example" } }, /domain mismatch/],
    [{ alias: { deploymentId: "dpl_other" } }, /alias target mismatch/],
    [{ alias: { projectId: "prj_other" } }, /alias project mismatch/],
    [{ deployment: { id: "dpl_other" } }, /deployment ID mismatch/],
    [{ deployment: { project: { id: "prj_other" } } }, /deployment project mismatch/],
    [{ deployment: { readyState: "BUILDING" } }, /state mismatch/],
    [{ deployment: { target: "preview" } }, /target mismatch/],
    [{ source: recoverySha }, /Git SHA mismatch/],
    [{ deployment: { meta: {}, gitSource: null } }, /Git SHA mismatch/],
    [{ status: 401 }, /HTTP 401/],
  ];
  for (const [result, pattern] of cases) {
    await assert.rejects(verifyModalCutoverSmokeRelease({ ...base, fetchImpl: mockProvider(result) }), pattern);
  }
});

test("cutover inputs are checked before any provider calls", async () => {
  for (const [override, pattern] of [
    [{ expectedSha: "a".repeat(40) }, /runbook source/],
    [{ expectedSha: supersededSha }, /runbook source/],
    [{ deploymentId: "dpl_test/other" }, /deployment ID/],
    [{ scenario: "reference-edit" }, /scenario mismatch/],
    [{ vercelToken: "" }, /VERCEL_TOKEN/],
  ]) {
    await assert.rejects(verifyModalCutoverSmokeRelease({
      ...base, ...override, fetchImpl: () => assert.fail("unexpected provider call"),
    }), pattern);
  }
});

test("cutover smoke and the runbook bind the same replacement and recovery SHAs", () => {
  const runbook = readFileSync("docs/operations/MODAL_DIRECT_PRODUCTION_CUTOVER.md", "utf8");
  assert.equal(runbook.match(/^\| Replacement application and Modal source \| `([a-f0-9]{40})`;/m)?.[1], sha);
  assert.equal(runbook.match(/^\| Recovery application and Modal source \| `([a-f0-9]{40})` \|/m)?.[1], recoverySha);
});

test("the workflow keeps the routine manifest gate and uses the cutover gate before fixture work", () => {
  const yaml = readFileSync(".github/workflows/production-fibo-smoke.yml", "utf8");
  assert.match(yaml, /if \[ -n "\$RENDERLAB_CUTOVER_DEPLOYMENT_ID" \]; then\s+node scripts\/verify-modal-cutover-smoke-release\.mjs\s+else\s+node scripts\/verify-production-documentation-sync\.mjs\s+node scripts\/verify-production-live-state\.mjs\s+fi/);
  assert.ok(yaml.indexOf("node scripts/verify-modal-cutover-smoke-release.mjs") < yaml.indexOf("id: fixture"));
  assert.match(yaml, /always\(\) && steps\.fixture\.outcome/);
});
