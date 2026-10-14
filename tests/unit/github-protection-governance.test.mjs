import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { GITHUB_PROTECTION_POLICY_PATH, findGithubProtectionPolicyProblems, verifyGithubProtectionPolicy } from "../../scripts/lib/github-protection-governance.mjs";

const rootDir = process.cwd();
async function json(repoPath) { return JSON.parse(await readFile(path.join(rootDir, repoPath), "utf8")); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }

async function workflowBodies(policy) {
  const paths = [...new Set(policy.requiredChecks.map((check) => check.workflow))];
  return new Map(await Promise.all(paths.map(async (workflowPath) => [workflowPath, await readFile(path.join(rootDir, workflowPath), "utf8")])));
}

test("checked-in protected-main policy matches always-on required workflows", async () => {
  const result = await verifyGithubProtectionPolicy({ rootDir });
  assert.equal(result.requiredChecks, 6);
  assert.equal(result.enforceAdmins, true);
});

test("protected-main policy rejects missing checks and weakened administrator enforcement", async () => {
  const policy = clone(await json(GITHUB_PROTECTION_POLICY_PATH));
  const bodies = await workflowBodies(policy);
  policy.enforceAdmins = false;
  policy.requiredChecks = policy.requiredChecks.filter((check) => check.context !== "javascript-typescript");
  const problems = findGithubProtectionPolicyProblems({ policy, workflowBodies: bodies });
  assert.ok(problems.some((problem) => problem.includes("enforceAdmins must be true")));
  assert.ok(problems.some((problem) => problem.includes("missing required context javascript-typescript")));
});

test("required branch checks cannot be path-filtered", async () => {
  const policy = clone(await json(GITHUB_PROTECTION_POLICY_PATH));
  const bodies = await workflowBodies(policy);
  const docsWorkflow = policy.requiredChecks.find((check) => check.context === "governance").workflow;
  bodies.set(docsWorkflow, bodies.get(docsWorkflow).replace("  pull_request:\n", "  pull_request:\n    paths:\n      - '**/*.md'\n"));
  const problems = findGithubProtectionPolicyProblems({ policy, workflowBodies: bodies });
  assert.ok(problems.some((problem) => problem.includes("required pull_request check must not be path-filtered")));
});

test("portability context names stay bound to both supported operating systems", async () => {
  const policy = clone(await json(GITHUB_PROTECTION_POLICY_PATH));
  const bodies = await workflowBodies(policy);
  const portability = policy.requiredChecks.find((check) => check.matrixOs === "ubuntu-latest").workflow;
  bodies.set(portability, bodies.get(portability).replace("os: [ubuntu-latest, windows-latest]", "os: [ubuntu-latest]"));
  const problems = findGithubProtectionPolicyProblems({ policy, workflowBodies: bodies });
  assert.ok(problems.some((problem) => problem.includes("portability matrix must contain ubuntu-latest and windows-latest")));
});
