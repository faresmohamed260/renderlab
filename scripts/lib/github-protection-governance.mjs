import { readFile } from "node:fs/promises";
import path from "node:path";

export const GITHUB_PROTECTION_POLICY_PATH = "docs/governance/github-protection.json";

const EXPECTED_CONTEXTS = new Set([
  "quality",
  "governance",
  "unit-coverage",
  "javascript-typescript",
  "clean-room (ubuntu-latest)",
  "clean-room (windows-latest)",
]);

function topLevelSection(body, key) {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const start = lines.findIndex((line) => line === `${key}:`);
  if (start === -1) return "";
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^[A-Za-z0-9_-]+:\s*$/.test(lines[index])) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join("\n");
}

export function findGithubProtectionPolicyProblems({ policy, workflowBodies }) {
  const problems = [];
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) return [`${GITHUB_PROTECTION_POLICY_PATH}: policy must be a JSON object`];
  if (policy.schemaVersion !== 1) problems.push(`${GITHUB_PROTECTION_POLICY_PATH}: schemaVersion must be 1`);
  if (policy.branch !== "main") problems.push(`${GITHUB_PROTECTION_POLICY_PATH}: branch must be main`);
  if (policy.strict !== true) problems.push(`${GITHUB_PROTECTION_POLICY_PATH}: strict must be true`);
  if (policy.enforceAdmins !== true) problems.push(`${GITHUB_PROTECTION_POLICY_PATH}: enforceAdmins must be true`);
  if (policy.requiredPullRequestReviews !== false) problems.push(`${GITHUB_PROTECTION_POLICY_PATH}: requiredPullRequestReviews must remain false until independent reviewer ownership exists`);
  if (policy.requiredConversationResolution !== false) problems.push(`${GITHUB_PROTECTION_POLICY_PATH}: requiredConversationResolution must be false unless governance explicitly changes that policy`);
  if (!Array.isArray(policy.requiredChecks)) return [...problems, `${GITHUB_PROTECTION_POLICY_PATH}: requiredChecks must be an array`];

  const contexts = new Set();
  for (const [index, check] of policy.requiredChecks.entries()) {
    const prefix = `${GITHUB_PROTECTION_POLICY_PATH}: requiredChecks[${index}]`;
    for (const field of ["context", "workflow", "job"]) {
      if (typeof check?.[field] !== "string" || check[field].trim() === "") problems.push(`${prefix}: ${field} must be a non-empty string`);
    }
    if (!Number.isInteger(check?.appId) || check.appId < 1) problems.push(`${prefix}: appId must be a positive integer`);
    if (contexts.has(check?.context)) problems.push(`${prefix}: duplicate context ${check.context}`);
    else contexts.add(check?.context);

    const body = workflowBodies.get(check?.workflow);
    if (typeof body !== "string") {
      problems.push(`${prefix}: workflow does not exist: ${check?.workflow}`);
      continue;
    }
    const pullRequest = topLevelSection(body, "on");
    if (!/\n\s{2}pull_request:\s*(?:\n|$)/.test(pullRequest)) problems.push(`${check.workflow}: required workflow must run on pull_request`);
    const pullRequestIndex = pullRequest.indexOf("\n  pull_request:");
    const afterPullRequest = pullRequestIndex === -1 ? "" : pullRequest.slice(pullRequestIndex + 1);
    const nextEvent = afterPullRequest.slice(afterPullRequest.indexOf("\n") + 1).search(/^  [A-Za-z0-9_-]+:/m);
    const pullRequestBlock = nextEvent === -1 ? afterPullRequest : afterPullRequest.slice(0, afterPullRequest.indexOf("\n") + 1 + nextEvent);
    if (/\n\s{4}paths(?:-ignore)?:/.test(pullRequestBlock)) problems.push(`${check.workflow}: required pull_request check must not be path-filtered`);

    const jobPattern = new RegExp(`^  ${check.job.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:\\s*$`, "m");
    if (!jobPattern.test(body)) problems.push(`${check.workflow}: missing required job ${check.job}`);
    if (check.matrixOs !== undefined) {
      if (!/os:\s*\[ubuntu-latest, windows-latest\]/.test(body)) problems.push(`${check.workflow}: portability matrix must contain ubuntu-latest and windows-latest`);
      if (!body.includes("name: clean-room (${{ matrix.os }})")) problems.push(`${check.workflow}: portability job name must preserve the required clean-room context names`);
      if (!["ubuntu-latest", "windows-latest"].includes(check.matrixOs)) problems.push(`${prefix}: matrixOs must be ubuntu-latest or windows-latest`);
    }
  }

  for (const expected of EXPECTED_CONTEXTS) if (!contexts.has(expected)) problems.push(`${GITHUB_PROTECTION_POLICY_PATH}: missing required context ${expected}`);
  for (const context of contexts) if (!EXPECTED_CONTEXTS.has(context)) problems.push(`${GITHUB_PROTECTION_POLICY_PATH}: unexpected required context ${context}`);
  return problems;
}

export async function verifyGithubProtectionPolicy({ rootDir = process.cwd() } = {}) {
  const policy = JSON.parse((await readFile(path.join(rootDir, GITHUB_PROTECTION_POLICY_PATH), "utf8")).replace(/^\uFEFF/, ""));
  const workflowPaths = [...new Set(policy.requiredChecks.map((check) => check.workflow))];
  const workflowBodies = new Map(await Promise.all(workflowPaths.map(async (workflowPath) => [workflowPath, await readFile(path.join(rootDir, workflowPath), "utf8")])));
  const problems = findGithubProtectionPolicyProblems({ policy, workflowBodies });
  if (problems.length > 0) throw new Error(`GitHub protection governance verification failed:\n- ${problems.join("\n- ")}`);
  return { requiredChecks: policy.requiredChecks.length, enforceAdmins: policy.enforceAdmins };
}
