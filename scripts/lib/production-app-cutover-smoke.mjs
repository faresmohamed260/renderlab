import { PROTECTED_CHECK_CONTEXTS_V2 } from "./production-documentation-sync.mjs";
import {
  RENDERLAB_VERCEL_TEAM_ID, RENDERLAB_VERCEL_PROJECT_ID,
  RENDERLAB_GITHUB_REPOSITORY,
} from "./production-live-state.mjs";

// This temporary, read-only, app-only qualification path permits one existing
// Production FIBO Smoke run before the same-sitting production manifest PR.
// It does not modify the normal manifest/sync path or the historical Modal path.
const DOMAIN = "renderlab.faresuniform.uk";
const ROLLBACK_ID = "dpl_7X5xzARHaT7nXkzoHMoHiGxi1xfa";
const ROLLBACK_SHA = "2a64d4ccc03e8f8ce1e415d298687321179efb50";

function requireValue(condition, reason) {
  if (!condition) throw new Error("App cutover smoke preflight: " + reason);
}
function fullSha(value) {
  return typeof value === "string" && /^[0-9a-f]{40}$/i.test(value);
}
function deploymentSha(value) {
  return value?.meta?.githubCommitSha || value?.gitSource?.sha || "";
}
async function readJson(url, token, label, fetchImpl) {
  const response = await fetchImpl(url, {
    headers: { Authorization: "Bearer " + token, Accept: "application/json", "User-Agent": "renderlab-pre-record-app-cutover-smoke" },
  });
  // Fail closed without echoing token-bearing upstream bodies.
  requireValue(response.ok, label + " provider read-back failed (HTTP " + response.status + ").");
  return response.json();
}

export async function verifyProductionAppCutoverSmoke({
  expectedSha, deploymentId, readinessRunId, vercelToken, githubToken,
  fetchImpl = fetch,
} = {}) {
  requireValue(fullSha(expectedSha), "expected SHA must contain exactly 40 hex characters.");
  requireValue(/^dpl_[a-zA-Z0-9]+$/.test(deploymentId || ""), "immutable deployment ID required.");
  requireValue(Number.isSafeInteger(Number(readinessRunId)) && Number(readinessRunId) > 0,
    "exact Deployment Readiness run ID required.");
  requireValue(Boolean(vercelToken && githubToken), "both provider verification tokens are required.");

  const sha = expectedSha.toLowerCase();
  const base = "https://api.vercel.com";
  const team = "teamId=" + RENDERLAB_VERCEL_TEAM_ID;
  const repo = "https://api.github.com/repos/" + RENDERLAB_GITHUB_REPOSITORY;
  const [deployment, alias, rollback, readiness, checkResult] = await Promise.all([
    readJson(base + "/v13/deployments/" + deploymentId + "?withGitRepoInfo=true&" + team,
      vercelToken, "new deployment", fetchImpl),
    readJson(base + "/v4/aliases/" + DOMAIN + "?projectId=" + RENDERLAB_VERCEL_PROJECT_ID + "&" + team,
      vercelToken, "production alias", fetchImpl),
    readJson(base + "/v13/deployments/" + ROLLBACK_ID + "?withGitRepoInfo=true&" + team,
      vercelToken, "rollback anchor", fetchImpl),
    readJson(repo + "/actions/runs/" + readinessRunId, githubToken, "Deployment Readiness", fetchImpl),
    readJson(repo + "/commits/" + sha + "/check-runs?per_page=100", githubToken, "protected checks", fetchImpl),
  ]);

  requireValue(deployment?.id === deploymentId && deployment?.project?.id === RENDERLAB_VERCEL_PROJECT_ID,
    "new deployment identity or project mismatch.");
  requireValue((deployment?.readyState || deployment?.state) === "READY" && deployment?.target === "production",
    "new deployment is not READY Production.");
  requireValue(deploymentSha(deployment).toLowerCase() === sha,
    "new deployment Git SHA differs from the approved source.");
  requireValue(alias?.alias === DOMAIN && alias?.projectId === RENDERLAB_VERCEL_PROJECT_ID
    && (alias?.deploymentId || alias?.deployment?.id) === deploymentId,
    "production custom-domain alias does not resolve to the expected deployment.");
  requireValue(rollback?.id === ROLLBACK_ID && rollback?.project?.id === RENDERLAB_VERCEL_PROJECT_ID
    && (rollback?.readyState || rollback?.state) === "READY"
    && deploymentSha(rollback).toLowerCase() === ROLLBACK_SHA,
  "known-good same-project rollback anchor is not READY at the recorded source.");

  requireValue(readiness?.id === Number(readinessRunId) && readiness?.conclusion === "success"
    && readiness?.head_sha?.toLowerCase() === sha
    && readiness?.path?.split("@")[0] === ".github/workflows/deployment-readiness.yml",
  "Deployment Readiness is not successful on the exact deployed SHA.");

  const checks = checkResult?.check_runs || [];
  let latest = Date.parse(readiness.updated_at);
  requireValue(Number.isFinite(latest), "Deployment Readiness completion timestamp missing.");
  for (const name of PROTECTED_CHECK_CONTEXTS_V2) {
    const match = checks.find((check) => check.name === name && check.head_sha?.toLowerCase() === sha);
    requireValue(Boolean(match && match.conclusion === "success" && Number.isFinite(Date.parse(match.completed_at))),
      "protected exact-head check missing or failed: " + name);
    latest = Math.max(latest, Date.parse(match.completed_at));
  }

  const cutoverAt = alias?.updatedAt;
  requireValue(Number.isSafeInteger(cutoverAt) && cutoverAt > 0, "alias lacks authoritative updatedAt.");
  requireValue(latest <= cutoverAt, "qualification completed after production cutover.");
  return {
    deploymentId, sha, alias: DOMAIN, cutoverAt: new Date(cutoverAt).toISOString(),
    qualifiedAt: new Date(latest).toISOString(), readinessRunId: Number(readinessRunId),
    rollbackDeploymentId: ROLLBACK_ID, checksPassed: PROTECTED_CHECK_CONTEXTS_V2.length,
  };
}
