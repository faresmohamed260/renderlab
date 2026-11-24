import { PROTECTED_CHECK_CONTEXTS_V2 } from "./production-documentation-sync.mjs";
import { RENDERLAB_GITHUB_REPOSITORY, RENDERLAB_VERCEL_PROJECT_ID, RENDERLAB_VERCEL_TEAM_ID,
  cutoverReadJson, validateCutoverDeployment, verifyModalCutoverSmokeRelease } from "./production-live-state.mjs";

const domain = "renderlab.faresuniform.uk";
const repo = RENDERLAB_GITHUB_REPOSITORY;
const stageWorkflow = ".github/workflows/production-cutover-stage-receipt.yml";
const assert = (condition, label) => { if (!condition) throw new Error(label); };
const isSha = value => typeof value === "string" && /^[0-9a-f]{40}$/.test(value);
const isId = value => typeof value === "string" && /^dpl_[A-Za-z0-9]+$/.test(value);
const isRun = value => Number.isSafeInteger(value) && value > 0;
const isIso = value => typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const evidenceRef = value => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9 ._:/#-]{0,199}$/.test(value);
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function verifyCutoverDispatchInputs({ deploymentId, artifactId, cutoverAt, exclusiveWindow, runAttempt }) {
  if (!deploymentId && !artifactId && !cutoverAt && !exclusiveWindow) return false;
  assert(isId(deploymentId) && /^[1-9][0-9]*$/.test(artifactId ?? "") && isRun(Number(artifactId)) && isIso(cutoverAt) && exclusiveWindow === true, "Invalid or partial cutover input bundle.");
  assert(runAttempt === "1", "Cutover smoke rerun prohibited; reconcile original run and obtain fresh authorization.");
  return true;
}

export function githubReader(token, fetchImpl = fetch) {
  return path => cutoverReadJson("https://api.github.com/repos/" + repo + path, token, fetchImpl);
}
export async function verifyCutoverQualification({ sha, readinessRunId, github, before, expected }) {
  assert(isSha(sha) && isRun(readinessRunId) && isIso(before), "Invalid qualification input.");
  const [main, readiness, result] = await Promise.all([
    github("/git/ref/heads/main"), github("/actions/runs/" + readinessRunId),
    github("/commits/" + sha + "/check-runs?filter=latest&per_page=100"),
  ]);
  assert(main?.object?.sha === sha, "Frozen main SHA mismatch.");
  assert(readiness?.id === readinessRunId && readiness?.repository?.full_name === repo &&
    readiness?.path?.split("@")[0] === ".github/workflows/deployment-readiness.yml" &&
    readiness?.head_sha === sha && readiness?.head_branch === "main" &&
    ["workflow_dispatch", "push"].includes(readiness?.event) && readiness?.status === "completed" &&
    readiness?.conclusion === "success" && isRun(readiness?.run_attempt), "Deployment Readiness provenance mismatch.");
  assert(Array.isArray(result?.check_runs) && result.total_count === result.check_runs.length && result.total_count <= 100, "Incomplete protected checks.");
  const requiredCheckRunIds = {};
  let latest = Date.parse(readiness.updated_at);
  assert(Number.isFinite(latest), "Missing readiness completion time.");
  for (const name of PROTECTED_CHECK_CONTEXTS_V2) {
    const matching = result.check_runs.filter(check => check.name === name && check.app?.id === 15368);
    assert(matching.length === 1, "Missing or ambiguous required check: " + name);
    const check = matching[0];
    assert(isRun(check.id) && check.head_sha === sha && check.status === "completed" && check.conclusion === "success" &&
      Number.isFinite(Date.parse(check.completed_at)), "Unqualified required check: " + name);
    requiredCheckRunIds[name] = check.id;
    latest = Math.max(latest, Date.parse(check.completed_at));
  }
  assert(new Set(Object.values(requiredCheckRunIds)).size === PROTECTED_CHECK_CONTEXTS_V2.length, "Duplicate check run IDs.");
  for (const check of result.check_runs.filter(check => check.name === "CodeQL")) {
    assert(check.head_sha === sha && check.status === "completed" && check.conclusion === "success" &&
      Number.isFinite(Date.parse(check.completed_at)), "CodeQL not qualified.");
    latest = Math.max(latest, Date.parse(check.completed_at));
  }
  assert(latest <= Date.parse(before), "Qualification completed after staging.");
  const qualification = { readinessRunId, readinessAttempt: readiness.run_attempt, requiredCheckRunIds, qualifiedAt: new Date(latest).toISOString() };
  if (expected) assert(equal(qualification, expected), "Qualification changed after staging.");
  return qualification;
}

function verifyPrior(previous, prior) {
  assert(previous?.deploymentId === prior.deploymentId && previous?.sha === prior.applicationSha &&
    previous?.deploymentUrl === prior.deploymentUrl && previous?.domain === domain &&
    prior.domain === domain && previous?.cutoverAt === prior.cutoverAt && isIso(prior.cutoverAt), "Previous live alias does not match accepted release.");
}

export function captureStageReceipt({ candidate, previous, prior, qualification, observedAt, authorizationRef, workerEvidenceRef, exclusiveWindow }) {
  verifyPrior(previous, prior);
  assert(exclusiveWindow === true && evidenceRef(authorizationRef) && evidenceRef(workerEvidenceRef), "Missing release authority/window or worker compatibility evidence.");
  assert(isSha(candidate?.sha) && isId(candidate?.deploymentId) && candidate?.domain === domain &&
    candidate.deploymentId !== prior.deploymentId && candidate.sha !== prior.applicationSha &&
    isIso(observedAt) && isIso(qualification?.qualifiedAt) && Date.parse(qualification.qualifiedAt) <= Date.parse(observedAt) &&
    Date.parse(prior.cutoverAt) < Date.parse(observedAt), "Invalid staged candidate evidence.");
  return { version: 1, candidate, previous, qualification, observedAt, authorizationRef, workerEvidenceRef,
    exclusiveWindow, teamId: RENDERLAB_VERCEL_TEAM_ID, projectId: RENDERLAB_VERCEL_PROJECT_ID };
}

export function validateStageReceipt({ receipt, live, prior, qualification }) {
  assert(receipt?.version === 1 && receipt.teamId === RENDERLAB_VERCEL_TEAM_ID &&
    receipt.projectId === RENDERLAB_VERCEL_PROJECT_ID, "Receipt scope mismatch.");
  captureStageReceipt({ ...receipt, prior });
  assert(equal(receipt.qualification, qualification), "Receipt qualification mismatch.");
  assert(receipt.candidate.sha === live.sha && receipt.candidate.deploymentId === live.deploymentId &&
    receipt.candidate.deploymentUrl === live.deploymentUrl && receipt.candidate.domain === live.domain &&
    isIso(live.cutoverAt) && Date.parse(live.cutoverAt) > Date.parse(receipt.observedAt), "Staged/live identity mismatch.");
  return live;
}

export function verifyReceiptArtifact({ artifact, run, artifactId, sha }) {
  assert(artifact?.id === artifactId && artifact.expired === false &&
    /^sha256:[0-9a-f]{64}$/.test(artifact.digest ?? "") && isRun(run?.id) &&
    artifact.workflow_run?.id === run.id && artifact.workflow_run?.head_sha === sha &&
    artifact.name === `cutover-stage-receipt-${run.id}-${run.run_attempt}`, "Invalid or expired stage receipt artifact.");
  assert(run.repository?.full_name === repo && run.path?.split("@")[0] === stageWorkflow &&
    run.head_sha === sha && run.head_branch === "main" && run.event === "workflow_dispatch" &&
    run.status === "completed" && run.conclusion === "success" && isRun(run.run_attempt), "Stage receipt producer provenance mismatch.");
  return artifact.digest;
}

export async function stageReceiptFromProviders({ sha, deploymentId, readinessRunId, prior, authorizationRef, workerEvidenceRef, exclusiveWindow,
  vercelToken, github, fetchImpl = fetch, now = () => new Date().toISOString() }) {
  assert(isSha(sha) && isId(deploymentId) && exclusiveWindow === true && evidenceRef(authorizationRef) && evidenceRef(workerEvidenceRef), "Invalid stage inputs.");
  const scope = "teamId=" + RENDERLAB_VERCEL_TEAM_ID;
  const candidate = validateCutoverDeployment(await cutoverReadJson(
    `https://api.vercel.com/v13/deployments/${deploymentId}?withGitRepoInfo=true&${scope}`, vercelToken, fetchImpl), deploymentId, sha);
  const previous = await verifyModalCutoverSmokeRelease({ expectedSha: prior.applicationSha, deploymentId: prior.deploymentId,
    cutoverAt: prior.cutoverAt, scenario: "text-to-image", exclusiveWindow, vercelToken, fetchImpl });
  const observedAt = now();
  const qualification = await verifyCutoverQualification({ sha, readinessRunId, github, before: observedAt });
  // Re-read the prior alias after qualification to reject a promotion during receipt capture.
  await verifyModalCutoverSmokeRelease({ expectedSha: prior.applicationSha, deploymentId: prior.deploymentId,
    cutoverAt: prior.cutoverAt, scenario: "text-to-image", exclusiveWindow, vercelToken, fetchImpl });
  return captureStageReceipt({ candidate: { ...candidate, domain }, previous, prior, qualification, observedAt,
    authorizationRef, workerEvidenceRef, exclusiveWindow });
}

export function assertCutoverFixtureSettled({ jobs, reservations, outbox, possibleSubmission, settledPreviously = false }) {
  assert([jobs, reservations, outbox].every(Array.isArray), "Invalid fixture settlement evidence.");
  assert(jobs.length <= 1, "Unexpected fixture job count.");
  assert(jobs.every(job => ["succeeded", "failed", "cancelled"].includes(job.status)), "Fixture job is not terminal.");
  assert(reservations.every(row => row.released_at && jobs.some(job => job.id === row.job_id)), "Fixture reservation is not released.");
  assert(outbox.every(row => jobs.some(job => job.id === row.job_id) &&
    ["dispatched", "failed", "cancelled"].includes(row.status) && row.claim_token == null && row.claim_until == null), "Fixture dispatch is unresolved.");
  if (possibleSubmission && !settledPreviously) {
    assert(jobs.length === 1 && reservations.length === 1 && outbox.length === 1, "Possible submission is ambiguous; operator reconciliation required.");
  }
}
