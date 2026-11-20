import { PROTECTED_CHECK_CONTEXTS_V2, validateProductionManifest } from "./production-documentation-sync.mjs";

export const RENDERLAB_VERCEL_TEAM_ID = "team_r09C6RLmb2acHapENECQIn9T";
export const RENDERLAB_VERCEL_PROJECT_ID = "prj_UGFbrAJ0fg2H0cZOznBoCZ8RCsJU";
export const RENDERLAB_GITHUB_REPOSITORY = "faresmohamed260/renderlab";

function deploymentSha(deployment) {
  return deployment?.meta?.githubCommitSha || deployment?.gitSource?.sha || "";
}

function deploymentState(deployment) {
  return deployment?.readyState || deployment?.state || "";
}

function deploymentOrigin(deployment) {
  const value = deployment?.url || "";
  return value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`;
}

function isoFromMilliseconds(value, label) {
  if (!Number.isFinite(value)) throw new Error(`${label} is missing a valid millisecond timestamp.`);
  return new Date(value).toISOString();
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} mismatch: expected ${expected}, received ${actual || "<missing>"}.`);
  }
}

export function compareProductionLiveState({ manifest, deployment, alias, rollbackDeployment, releaseMatrixRun, readinessRun, protectedChecks }) {
  validateProductionManifest(manifest);

  assertEqual(deployment?.id, manifest.deploymentId, "Vercel production deployment ID");
  assertEqual(deploymentState(deployment), "READY", "Vercel production deployment state");
  assertEqual(deployment?.target, "production", "Vercel production deployment target");
  assertEqual(deployment?.project?.id, RENDERLAB_VERCEL_PROJECT_ID, "Vercel production project ID");
  assertEqual(deploymentSha(deployment).toLowerCase(), manifest.applicationSha.toLowerCase(), "Vercel production Git SHA");
  assertEqual(deploymentOrigin(deployment), manifest.deploymentUrl, "Vercel production deployment URL");

  assertEqual(alias?.alias, manifest.domain, "Vercel custom-domain alias");
  assertEqual(alias?.projectId, RENDERLAB_VERCEL_PROJECT_ID, "Vercel alias project ID");
  assertEqual(alias?.deploymentId || alias?.deployment?.id, manifest.deploymentId, "Vercel custom-domain deployment target");
  assertEqual(isoFromMilliseconds(alias?.updatedAt, "Vercel alias updatedAt"), manifest.cutoverAt, "Vercel custom-domain cutover time");

  assertEqual(rollbackDeployment?.id, manifest.rollbackDeploymentId, "Vercel rollback deployment ID");
  assertEqual(deploymentState(rollbackDeployment), "READY", "Vercel rollback deployment state");
  assertEqual(rollbackDeployment?.project?.id, RENDERLAB_VERCEL_PROJECT_ID, "Vercel rollback project ID");
  if (manifest.rollbackApplicationSha !== null) {
    assertEqual(
      deploymentSha(rollbackDeployment).toLowerCase(),
      manifest.rollbackApplicationSha.toLowerCase(),
      "Vercel rollback Git SHA",
    );
  }

  const qualification = manifest.releaseQualification;
  assertEqual(readinessRun?.id, qualification.deploymentReadinessRunId, "Deployment Readiness run ID");
  assertEqual(readinessRun?.conclusion, "success", "Deployment Readiness conclusion");
  assertEqual(readinessRun?.head_sha?.toLowerCase(), manifest.applicationSha.toLowerCase(), "Deployment Readiness head SHA");

  if (manifest.schemaVersion === 1) {
    assertEqual(releaseMatrixRun?.id, qualification.releaseMatrixRunId, "Release Candidate Matrix run ID");
    assertEqual(releaseMatrixRun?.conclusion, "success", "Release Candidate Matrix conclusion");
    assertEqual(releaseMatrixRun?.head_sha?.toLowerCase(), manifest.applicationSha.toLowerCase(), "Release Candidate Matrix head SHA");
    assertEqual(releaseMatrixRun?.run_attempt, qualification.releaseMatrixAttempt, "Release Candidate Matrix attempt");
    assertEqual(new Date(releaseMatrixRun?.updated_at).toISOString(), qualification.qualifiedAt, "Release qualification time");
  } else {
    assertEqual(readinessRun?.path?.split("@")[0], ".github/workflows/deployment-readiness.yml", "Deployment Readiness workflow");
    let latest = Date.parse(readinessRun?.updated_at);
    if (!Number.isFinite(latest)) throw new Error("Missing readiness completion time.");
    for (const context of PROTECTED_CHECK_CONTEXTS_V2) {
      const check = protectedChecks?.[context];
      assertEqual(check?.id, qualification.requiredCheckRunIds[context], context + " ID");
      assertEqual(check?.name, context, context + " name");
      assertEqual(check?.app?.id, 15368, context + " GitHub Actions app");
      assertEqual(check?.conclusion, "success", context + " conclusion");
      assertEqual(check?.head_sha?.toLowerCase(), manifest.applicationSha.toLowerCase(), context + " head SHA");
      latest = Math.max(latest, Date.parse(check?.completed_at));
    }
    assertEqual(isoFromMilliseconds(latest, "Protected check completion"), qualification.qualifiedAt, "Release qualification time");
  }

  return {
    applicationSha: manifest.applicationSha,
    deploymentId: manifest.deploymentId,
    domain: manifest.domain,
    rollbackDeploymentId: manifest.rollbackDeploymentId,
    releaseMatrixRunId: qualification.releaseMatrixRunId,
    rollbackSourceVerified: manifest.rollbackApplicationSha !== null,
    qualificationType: qualification.type ?? "release-matrix",
    cutoverAt: manifest.cutoverAt,
  };
}

async function fetchJson(url, { token, fetchImpl = fetch, label }) {
  const response = await fetchImpl(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "User-Agent": "renderlab-production-verifier",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${label} request failed with HTTP ${response.status}: ${body.slice(0, 300)}`);
  }
  return response.json();
}

export async function verifyProductionLiveState({
  manifest,
  vercelToken,
  githubToken,
  fetchImpl = fetch,
  vercelTeamId = RENDERLAB_VERCEL_TEAM_ID,
  vercelProjectId = RENDERLAB_VERCEL_PROJECT_ID,
  githubRepository = RENDERLAB_GITHUB_REPOSITORY,
} = {}) {
  validateProductionManifest(manifest);
  if (!vercelToken) throw new Error("VERCEL_TOKEN is required for read-only production verification.");
  if (!githubToken) throw new Error("GITHUB_TOKEN is required for read-only release qualification verification.");
  assertEqual(vercelTeamId, RENDERLAB_VERCEL_TEAM_ID, "RenderLab Vercel team ID");
  assertEqual(vercelProjectId, RENDERLAB_VERCEL_PROJECT_ID, "RenderLab Vercel project ID");
  assertEqual(githubRepository, RENDERLAB_GITHUB_REPOSITORY, "RenderLab GitHub repository");

  const teamQuery = `teamId=${encodeURIComponent(vercelTeamId)}`;
  const projectQuery = `projectId=${encodeURIComponent(vercelProjectId)}`;
  const deploymentUrl = `https://api.vercel.com/v13/deployments/${encodeURIComponent(manifest.deploymentId)}?withGitRepoInfo=true&${teamQuery}`;
  const aliasUrl = `https://api.vercel.com/v4/aliases/${encodeURIComponent(manifest.domain)}?${projectQuery}&${teamQuery}`;
  const rollbackUrl = `https://api.vercel.com/v13/deployments/${encodeURIComponent(manifest.rollbackDeploymentId)}?withGitRepoInfo=true&${teamQuery}`;
  const githubRepo = `https://api.github.com/repos/${githubRepository}`;
  const githubBase = githubRepo + "/actions/runs";

  const [deployment, alias, rollbackDeployment, releaseMatrixRun, readinessRun, protectedChecks] = await Promise.all([
    fetchJson(deploymentUrl, { token: vercelToken, fetchImpl, label: "Vercel production deployment" }),
    fetchJson(aliasUrl, { token: vercelToken, fetchImpl, label: "Vercel production alias" }),
    fetchJson(rollbackUrl, { token: vercelToken, fetchImpl, label: "Vercel rollback deployment" }),
    manifest.schemaVersion === 1 ? fetchJson(`${githubBase}/${manifest.releaseQualification.releaseMatrixRunId}`, {
      token: githubToken,
      fetchImpl,
      label: "GitHub Release Candidate Matrix",
    }) : null,
    fetchJson(`${githubBase}/${manifest.releaseQualification.deploymentReadinessRunId}`, {
      token: githubToken,
      fetchImpl,
      label: "GitHub Deployment Readiness",
    }),
    manifest.schemaVersion === 2 ? Promise.all(Object.entries(manifest.releaseQualification.requiredCheckRunIds).map(
      async ([context, id]) => [context, await fetchJson(githubRepo + "/check-runs/" + id, {
        token: githubToken, fetchImpl, label: context,
      })],
    )).then(Object.fromEntries) : null,
  ]);

  return compareProductionLiveState({
    manifest,
    deployment,
    alias,
    rollbackDeployment,
    releaseMatrixRun,
    readinessRun,
    protectedChecks,
  });
}

const CUTOVER_REPLACEMENT_SHA = "68651d2d1e3c5602c2f840a0d066a0f6185a5cf2";
const CUTOVER_RECOVERY_SHA = "4f8efb7f52e7c43f5425c7a4aa3375f2292992cb";
const CUTOVER_DOMAIN = "renderlab.faresuniform.uk";

// The transient cutover target is not the accepted release in the production manifest.
export async function verifyModalCutoverSmokeRelease({
  expectedSha, deploymentId, scenario, vercelToken, fetchImpl = fetch,
} = {}) {
  const sha = expectedSha?.toLowerCase();
  if (![CUTOVER_REPLACEMENT_SHA, CUTOVER_RECOVERY_SHA].includes(sha)) {
    throw new Error("Cutover smoke SHA must match an exact runbook source.");
  }
  if (!/^dpl_[a-zA-Z0-9]+$/.test(deploymentId ?? "")) {
    throw new Error("Cutover smoke requires an exact Vercel deployment ID.");
  }
  assertEqual(scenario, "text-to-image", "Cutover smoke scenario");
  if (!vercelToken) throw new Error("VERCEL_TOKEN is required for cutover verification.");

  const scope = `teamId=${RENDERLAB_VERCEL_TEAM_ID}`;
  const [alias, deployment] = await Promise.all([
    fetchJson(`https://api.vercel.com/v4/aliases/${CUTOVER_DOMAIN}?projectId=${RENDERLAB_VERCEL_PROJECT_ID}&${scope}`,
      { token: vercelToken, fetchImpl, label: "Vercel cutover alias" }),
    fetchJson(`https://api.vercel.com/v13/deployments/${deploymentId}?withGitRepoInfo=true&${scope}`,
      { token: vercelToken, fetchImpl, label: "Vercel cutover deployment" }),
  ]);
  assertEqual(alias?.alias, CUTOVER_DOMAIN, "Cutover domain");
  assertEqual(alias?.projectId, RENDERLAB_VERCEL_PROJECT_ID, "Cutover alias project");
  assertEqual(alias?.deploymentId || alias?.deployment?.id, deploymentId, "Cutover alias target");
  assertEqual(deployment?.id, deploymentId, "Cutover deployment ID");
  assertEqual(deployment?.project?.id, RENDERLAB_VERCEL_PROJECT_ID, "Cutover deployment project");
  assertEqual(deploymentState(deployment), "READY", "Cutover deployment state");
  assertEqual(deployment?.target, "production", "Cutover deployment target");
  assertEqual(deploymentSha(deployment).toLowerCase(), sha, "Cutover deployment Git SHA");
  return { sha, deploymentId, domain: CUTOVER_DOMAIN };
}
