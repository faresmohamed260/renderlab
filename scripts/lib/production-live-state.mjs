import { validateProductionManifest } from "./production-documentation-sync.mjs";

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

export function compareProductionLiveState({ manifest, deployment, alias, rollbackDeployment, releaseMatrixRun, readinessRun }) {
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
  assertEqual(
    deploymentSha(rollbackDeployment).toLowerCase(),
    manifest.rollbackApplicationSha.toLowerCase(),
    "Vercel rollback Git SHA",
  );

  const qualification = manifest.releaseQualification;
  assertEqual(readinessRun?.id, qualification.deploymentReadinessRunId, "Deployment Readiness run ID");
  assertEqual(readinessRun?.conclusion, "success", "Deployment Readiness conclusion");
  assertEqual(readinessRun?.head_sha?.toLowerCase(), manifest.applicationSha.toLowerCase(), "Deployment Readiness head SHA");

  assertEqual(releaseMatrixRun?.id, qualification.releaseMatrixRunId, "Release Candidate Matrix run ID");
  assertEqual(releaseMatrixRun?.conclusion, "success", "Release Candidate Matrix conclusion");
  assertEqual(releaseMatrixRun?.head_sha?.toLowerCase(), manifest.applicationSha.toLowerCase(), "Release Candidate Matrix head SHA");
  assertEqual(releaseMatrixRun?.run_attempt, qualification.releaseMatrixAttempt, "Release Candidate Matrix attempt");
  assertEqual(new Date(releaseMatrixRun?.updated_at).toISOString(), qualification.qualifiedAt, "Release qualification time");

  return {
    applicationSha: manifest.applicationSha,
    deploymentId: manifest.deploymentId,
    domain: manifest.domain,
    rollbackDeploymentId: manifest.rollbackDeploymentId,
    releaseMatrixRunId: qualification.releaseMatrixRunId,
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
  const githubBase = `https://api.github.com/repos/${githubRepository}/actions/runs`;

  const [deployment, alias, rollbackDeployment, releaseMatrixRun, readinessRun] = await Promise.all([
    fetchJson(deploymentUrl, { token: vercelToken, fetchImpl, label: "Vercel production deployment" }),
    fetchJson(aliasUrl, { token: vercelToken, fetchImpl, label: "Vercel production alias" }),
    fetchJson(rollbackUrl, { token: vercelToken, fetchImpl, label: "Vercel rollback deployment" }),
    fetchJson(`${githubBase}/${manifest.releaseQualification.releaseMatrixRunId}`, {
      token: githubToken,
      fetchImpl,
      label: "GitHub Release Candidate Matrix",
    }),
    fetchJson(`${githubBase}/${manifest.releaseQualification.deploymentReadinessRunId}`, {
      token: githubToken,
      fetchImpl,
      label: "GitHub Deployment Readiness",
    }),
  ]);

  return compareProductionLiveState({
    manifest,
    deployment,
    alias,
    rollbackDeployment,
    releaseMatrixRun,
    readinessRun,
  });
}
