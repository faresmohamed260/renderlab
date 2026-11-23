import assert from "node:assert/strict";
import test from "node:test";
import { verifyProductionAppCutoverSmoke } from "../../scripts/lib/production-app-cutover-smoke.mjs";
import { PROTECTED_CHECK_CONTEXTS_V2 } from "../../scripts/lib/production-documentation-sync.mjs";

const SHA = "bc3cc27f2d207efdea87bb5d5d57706ba49320ba";
const DPL = "dpl_AsG9axxT8oe9buUuxrzXYvrB9NXB";
const OLD = "dpl_7X5xzARHaT7nXkzoHMoHiGxi1xfa";
const PID = "prj_APU35jTnge27D2MAFjuc7GP0Dd6I";
const ALIAS_TIME = Date.parse("2026-11-23T17:34:33.600Z");
const args = { expectedSha: SHA, deploymentId: DPL, readinessRunId: "45228447753", vercelToken: "fake", githubToken: "fake" };
const check = (name) => ({ name, conclusion: "success", completed_at: "2026-11-23T17:30:20Z", head_sha: SHA });
function fixtures() {
  return {
    deployment: { id: DPL, project: { id: PID }, readyState: "READY", target: "production", meta: { githubCommitSha: SHA } },
    alias: { alias: "renderlab.faresuniform.uk", projectId: PID, deploymentId: DPL, updatedAt: ALIAS_TIME },
    rollback: { id: OLD, project: { id: PID }, readyState: "READY", target: "production",
      meta: { githubCommitSha: "2a64d4ccc03e8f8ce1e415d298687321179efb50" } },
    readiness: { id: 45228447753, head_sha: SHA, conclusion: "success", updated_at: "2026-11-23T17:31:13Z", path: ".github/workflows/deployment-readiness.yml@main" },
    checks: { check_runs: PROTECTED_CHECK_CONTEXTS_V2.map(check) },
  };
}
function fakeFetch(values, httpFailure = "") {
  return async (url) => {
    const x = new URL(url);
    let key;
    if (x.pathname.endsWith("/" + DPL)) key = "deployment";
    else if (x.pathname.endsWith("/" + OLD)) key = "rollback";
    else if (x.pathname.includes("/aliases/")) key = "alias";
    else if (x.pathname.includes("/actions/runs/")) key = "readiness";
    else if (x.pathname.includes("/check-runs")) key = "checks";
    else throw new Error("Unexpected external URL: " + x.pathname);
    return Response.json(key === httpFailure ? { error: "hidden token detail" } : values[key],
      { status: key === httpFailure ? 403 : 200 });
  };
}
test("app-only pre-record cutover verifies immutable SHA, alias, readiness ordering, six checks and rollback", async () => {
  const v = await verifyProductionAppCutoverSmoke({ ...args, fetchImpl: fakeFetch(fixtures()) });
  assert.deepEqual(v, {
    deploymentId: DPL, sha: SHA, alias: "renderlab.faresuniform.uk",
    cutoverAt: new Date(ALIAS_TIME).toISOString(), qualifiedAt: "2026-11-23T17:31:13.000Z",
    readinessRunId: 45228447753, rollbackDeploymentId: OLD, checksPassed: 6,
  });
});
const failures = [
  ["wrong deployment source", (v) => { v.deployment.meta.githubCommitSha = "a".repeat(40); }, "Git SHA"],
  ["wrong deployment project", (v) => { v.deployment.project.id = "wrong"; }, "identity or project"],
  ["wrong alias target", (v) => { v.alias.deploymentId = OLD; }, "alias does not resolve"],
  ["wrong alias project", (v) => { v.alias.projectId = "wrong"; }, "alias does not resolve"],
  ["wrong rollback source", (v) => { v.rollback.meta.githubCommitSha = "a".repeat(40); }, "rollback anchor"],
  ["rollback not ready", (v) => { v.rollback.readyState = "ERROR"; }, "rollback anchor"],
  ["readiness wrong SHA", (v) => { v.readiness.head_sha = "a".repeat(40); }, "Deployment Readiness"],
  ["readiness not successful", (v) => { v.readiness.conclusion = "failure"; }, "Deployment Readiness"],
  ["late readiness", (v) => { v.readiness.updated_at = "2026-11-23T17:35:00Z"; }, "after production cutover"],
  ["missing qualification timestamp", (v) => { v.alias.updatedAt = null; }, "authoritative updatedAt"],
  ["missing CodeQL or other required check", (v) => { v.checks.check_runs = []; }, "protected exact-head check"],
  ["wrong check SHA", (v) => { v.checks.check_runs[0].head_sha = "a".repeat(40); }, "protected exact-head check"],
  ["failed check", (v) => { v.checks.check_runs[2].conclusion = "failure"; }, "protected exact-head check"],
];
for (const [label, mutate, expected] of failures) {
  test("fail closed: " + label, async () => {
    const v = fixtures();
    mutate(v);
    await assert.rejects(verifyProductionAppCutoverSmoke({ ...args, fetchImpl: fakeFetch(v) }), new RegExp(expected));
  });
}
test("a Vercel 403 does not leak upstream error bodies or permit fixture work", async () => {
  const v = fixtures();
  await assert.rejects(
    verifyProductionAppCutoverSmoke({ ...args, fetchImpl: fakeFetch(v, "deployment") }),
    (error) => error.message.includes("HTTP 403") && !error.message.includes("hidden token detail"),
  );
});
test("missing/invalid approval source and identifiers fail before any network calls", async () => {
  for (const override of [{ expectedSha: "short" }, { deploymentId: "unscoped" },
    { readinessRunId: "" }, { vercelToken: "" }, { githubToken: "" }]) {
    await assert.rejects(verifyProductionAppCutoverSmoke({
      ...args, ...override, fetchImpl: () => { throw new Error("must not fetch"); },
    }), /App cutover smoke preflight/);
  }
});
