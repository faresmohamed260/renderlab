import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { RENDERLAB_VERCEL_PROJECT_ID as projectId, RENDERLAB_VERCEL_TEAM_ID as teamId,
  verifyModalCutoverSmokeRelease } from "../../scripts/lib/production-live-state.mjs";
import { assertCutoverFixtureSettled, verifyCutoverDispatchInputs, verifyCutoverQualification,
  captureStageReceipt, validateStageReceipt, verifyReceiptArtifact } from "../../scripts/lib/cutover-smoke-gate.mjs";

const sha = "a".repeat(40), secondSha = "b".repeat(40), oldSha = "c".repeat(40);
const deploymentId = "dpl_test", previousId = "dpl_previous", domain = "renderlab.faresuniform.uk";
const stagedAt = "2026-11-24T12:00:00.000Z", cutoverAt = "2026-11-24T12:01:00.000Z";
const previousAt = "2026-11-23T12:00:00.000Z", qualifiedAt = "2026-11-24T11:00:00.000Z";
const base = { expectedSha: sha, deploymentId, scenario: "text-to-image", vercelToken: "test-token",
  cutoverAt, exclusiveWindow: true };
const prior = { applicationSha: oldSha, deploymentId: previousId, deploymentUrl: "https://previous.example.test",
  domain, cutoverAt: previousAt };
function mockProvider({ source = sha, alias = {}, deployment = {}, status = 200 } = {}) {
  return async (url, options) => {
    const parsed = new URL(url);
    assert.equal(parsed.origin, "https://api.vercel.com");
    assert.equal(parsed.searchParams.get("teamId"), teamId);
    assert.equal(options.headers.Authorization, "Bearer test-token");
    assert.equal(options.redirect, "error");
    if (parsed.pathname === `/v4/aliases/${domain}`) {
      assert.equal(parsed.searchParams.get("projectId"), projectId);
      return Response.json({ alias: domain, projectId, deploymentId, updatedAt: Date.parse(cutoverAt), ...alias }, { status });
    }
    assert.equal(parsed.pathname, `/v13/deployments/${deploymentId}`);
    return Response.json({ id: deploymentId, project: { id: projectId }, readyState: "READY",
      target: "production", url: "candidate.example.test", meta: { githubCommitSha: source }, ...deployment }, { status });
  };
}
test("arbitrary qualified candidate identities replace the historical SHA allowlist", async () => {
  for (const source of [sha, secondSha]) for (const scenario of ["text-to-image", "reference-edit"]) {
    const result = await verifyModalCutoverSmokeRelease({ ...base, expectedSha: source, scenario, fetchImpl: mockProvider({ source }) });
    assert.equal(result.sha, source);
    assert.equal(result.deploymentId, deploymentId);
    assert.equal(result.cutoverAt, cutoverAt);
  }
  const source = readFileSync("scripts/lib/production-live-state.mjs", "utf8");
  assert.doesNotMatch(source, /CUTOVER_REPLACEMENT_SHA|CUTOVER_RECOVERY_SHA|c3f92247b21b9761fde6cee610cce2c9084441f8|e93481466806b3a88f986cd547f11ef62e9543fb/);
});
test("provider verification fails closed for wrong target, provenance, or changed alias assignment", async () => {
  for (const [result, pattern] of [
    [{ alias: { alias: "other.example" } }, /domain/],
    [{ alias: { deploymentId: "dpl_other" } }, /alias target/],
    [{ alias: { deployment: { id: "dpl_other" } } }, /alias target/],
    [{ alias: { projectId: "prj_other" } }, /alias project/],
    [{ alias: { updatedAt: Date.parse(cutoverAt) + 1 } }, /assignment/],
    [{ deployment: { id: "dpl_other" } }, /deployment ID/],
    [{ deployment: { project: { id: "prj_other" } } }, /deployment project/],
    [{ deployment: { readyState: "BUILDING" } }, /state/],
    [{ deployment: { target: "preview" } }, /target/],
    [{ source: secondSha }, /Git SHA/],
    [{ deployment: { gitSource: { sha: secondSha } } }, /Git SHA/],
    [{ deployment: { meta: {}, gitSource: null } }, /Git SHA/],
    [{ status: 401 }, /HTTP 401/],
  ]) await assert.rejects(verifyModalCutoverSmokeRelease({ ...base, fetchImpl: mockProvider(result) }), pattern);
});
test("strict inputs reject before provider I/O; routine rejects partial cutover bundle", async () => {
  for (const override of [{ expectedSha: "bad" }, { deploymentId: "dpl_test/other" }, { scenario: "video" },
    { vercelToken: "" }, { exclusiveWindow: false }, { cutoverAt: "not-a-date" }]) {
    await assert.rejects(verifyModalCutoverSmokeRelease({ ...base, ...override, fetchImpl: () => assert.fail("unexpected provider call") }));
  }
  assert.throws(() => verifyCutoverDispatchInputs({ deploymentId: "", artifactId: "12", cutoverAt: "", exclusiveWindow: false }), /partial/);
  assert.equal(verifyCutoverDispatchInputs({ deploymentId: "", artifactId: "", cutoverAt: "", exclusiveWindow: false }), false);
  assert.throws(() => verifyCutoverDispatchInputs({ deploymentId, artifactId: "12", cutoverAt, exclusiveWindow: true, runAttempt: "2" }), /rerun/);
});
const names = ["quality","governance","unit-coverage","javascript-typescript","clean-room (ubuntu-latest)","clean-room (windows-latest)"];
const checks = names.map((name, i) => ({ id: i + 10, name, app: { id: 15368 }, head_sha: sha,
  status: "completed", conclusion: "success", completed_at: qualifiedAt }));
const readiness = { id: 21, run_attempt: 1, path: ".github/workflows/deployment-readiness.yml",
  head_sha: sha, head_branch: "main", event: "workflow_dispatch", status: "completed", conclusion: "success", updated_at: qualifiedAt,
  repository: { full_name: "faresmohamed260/renderlab" } };
function github({ changedChecks = checks, changedReadiness = readiness, mainSha = sha } = {}) {
  return async (path) => {
    if (path === "/git/ref/heads/main") return { object: { sha: mainSha } };
    if (path === "/actions/runs/21") return changedReadiness;
    if (path.startsWith("/commits/")) return { total_count: changedChecks.length, check_runs: changedChecks };
    throw Error("unexpected GitHub path");
  };
}
test("qualification binds exact frozen main, required contexts, readiness and times", async () => {
  const good = await verifyCutoverQualification({ sha, readinessRunId: 21, github: github(), before: stagedAt });
  assert.equal(good.qualifiedAt, qualifiedAt);
  for (const options of [
    { mainSha: secondSha },
    { changedChecks: checks.slice(1) },
    { changedChecks: checks.map((c,i) => i === 0 ? { ...c, conclusion: "failure" } : c) },
    { changedChecks: checks.map((c,i) => i === 0 ? { ...c, completed_at: cutoverAt } : c) },
    { changedChecks: checks.map((c,i) => i === 0 ? { ...c, app: {id: 0} } : c) },
    { changedReadiness: { ...readiness, head_sha: secondSha } },
    { changedReadiness: { ...readiness, path: ".github/workflows/other.yml" } },
  ]) await assert.rejects(verifyCutoverQualification({ sha, readinessRunId: 21, github: github(options), before: stagedAt }));
});
test("stage receipt proves the previous alias, exact candidate, rollback and qualification", async () => {
  const qualification = await verifyCutoverQualification({ sha, readinessRunId: 21, github: github(), before: stagedAt });
  const candidate = { sha, deploymentId, domain, deploymentUrl: "https://candidate.example.test" };
  const previous = { ...prior, sha: oldSha };
  const receipt = captureStageReceipt({ candidate, previous, prior, qualification, observedAt: stagedAt,
    authorizationRef: "release-approval-1", workerEvidenceRef: "worker-proof-1", exclusiveWindow: true });
  const live = { ...candidate, cutoverAt };
  assert.equal(validateStageReceipt({ receipt, live, prior, qualification }).deploymentId, deploymentId);
  for (const bad of [{ ...receipt, observedAt: cutoverAt }, { ...receipt, candidate: { ...candidate, sha: secondSha } },
    { ...receipt, previous: { ...previous, deploymentId: "dpl_other" } }, { ...receipt, authorizationRef: "" }]) {
    assert.throws(() => validateStageReceipt({ receipt: bad, live, prior, qualification }));
  }
  assert.throws(() => validateStageReceipt({ receipt, live: { ...live, cutoverAt: stagedAt }, prior, qualification }));
});
test("receipt artifact provenance rejects expired, forged, wrong workflow and wrong head", () => {
  const run = { ...readiness, id: 31, path: ".github/workflows/production-cutover-stage-receipt.yml" };
  const artifact = { id: 41, name: "cutover-stage-receipt-31-1", expired: false, digest: "sha256:" + "d".repeat(64),
    workflow_run: { id: 31, head_sha: sha } };
  assert.equal(verifyReceiptArtifact({ artifact, run, artifactId: 41, sha }), artifact.digest);
  for (const bad of [{ ...artifact, expired: true }, { ...artifact, digest: null }, { ...artifact, workflow_run: { id: 31, head_sha: secondSha } }]) {
    assert.throws(() => verifyReceiptArtifact({ artifact: bad, run, artifactId: 41, sha }));
  }
  assert.throws(() => verifyReceiptArtifact({ artifact, run: { ...run, path: readiness.path }, artifactId: 41, sha }));
});
test("race between pre-dispatch and generation recheck blocks submission; ABA also rejected", async () => {
  let submits = 0;
  await verifyModalCutoverSmokeRelease({ ...base, fetchImpl: mockProvider() });
  for (const alias of [{ deploymentId: "dpl_other" }, { updatedAt: Date.parse(cutoverAt) + 1 }]) {
    await assert.rejects(async () => {
      await verifyModalCutoverSmokeRelease({ ...base, fetchImpl: mockProvider({ alias }) });
      submits++;
    });
  }
  assert.equal(submits, 0);
});
test("cancellation/ambiguous acceptance must never delete an unsettled fixture", () => {
  const terminal = [{ id: "job", status: "succeeded" }];
  const released = [{ job_id: "job", released_at: qualifiedAt }];
  const outbox = [{ job_id: "job", status: "dispatched", claim_token: null, claim_until: null }];
  assert.doesNotThrow(() => assertCutoverFixtureSettled({ jobs: [], reservations: [], outbox: [], possibleSubmission: false }));
  assert.doesNotThrow(() => assertCutoverFixtureSettled({ jobs: terminal, reservations: released, outbox, possibleSubmission: true }));
  assert.throws(() => assertCutoverFixtureSettled({ jobs: [], reservations: [], outbox: [], possibleSubmission: true }), /ambiguous/);
  assert.throws(() => assertCutoverFixtureSettled({ jobs: [{ id: "job", status: "running" }], reservations: released, outbox, possibleSubmission: true }));
  assert.throws(() => assertCutoverFixtureSettled({ jobs: terminal, reservations: [{ job_id: "job", released_at: null }], outbox, possibleSubmission: true }));
  assert.throws(() => assertCutoverFixtureSettled({ jobs: terminal, reservations: released, outbox: [{ ...outbox[0], status: "unresolved" }], possibleSubmission: true }));
});
test("workflow retains routine gate, isolated credentials, cancellation cleanup and durable pre-generation intent", () => {
  const yaml = readFileSync(".github/workflows/production-fibo-smoke.yml", "utf8");
  assert.match(yaml, /workflow_dispatch:/);
  assert.match(yaml, /refs\/heads\/main/);
  assert.match(yaml, /cancel-in-progress: false/);
  assert.ok(yaml.indexOf("node scripts/verify-production-live-state.mjs") < yaml.indexOf("id: fixture"));
  assert.ok(yaml.indexOf("Recheck cutover immediately before generation") < yaml.indexOf("Run exactly one FIBO generation"));
  assert.ok(yaml.indexOf("Persist bounded cutover intent") < yaml.indexOf("Run exactly one FIBO generation"));
  assert.match(yaml, /always\(\) && steps\.fixture\.outcome/);
  assert.match(yaml, /Recheck cutover after generation/);
  assert.doesNotMatch(yaml, /permissions:\s*\n(?:[^\n]*\n)*?\s+\w+: write/);
});
