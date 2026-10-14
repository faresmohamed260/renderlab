import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  COMPONENT_CATALOG_PATH,
  COMPONENT_SOURCE_REGISTRY_PATH,
  findComponentSourceRegistryProblems,
  verifyComponentSourceRegistry,
} from "../../scripts/lib/component-source-governance.mjs";

const rootDir = process.cwd();

async function json(repoPath) {
  return JSON.parse((await readFile(path.join(rootDir, repoPath), "utf8")).replace(/^\uFEFF/, ""));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test("checked-in component source registry matches catalog, package manifest, and lockfile", async () => {
  const result = await verifyComponentSourceRegistry({ rootDir });
  assert.equal(result.sources, 9);
  assert.equal(result.activeSources, 4);
});

test("component source registry rejects missing catalog coverage and unknown catalog headings", async () => {
  const registry = clone(await json(COMPONENT_SOURCE_REGISTRY_PATH));
  const packageJson = await json("package.json");
  const packageLock = await json("package-lock.json");
  const catalogBody = [
    "## Approved External Sources",
    "### shadcn/ui + Radix",
    "### Motion for React",
    "### New Unregistered Source",
    "## External Source Search Order",
  ].join("\n");

  const problems = findComponentSourceRegistryProblems({ registry, packageJson, packageLock, catalogBody });
  assert.ok(problems.some((problem) => problem.includes("catalogHeading does not exist")));
  assert.ok(problems.some((problem) => problem.includes("missing registry coverage for catalog source heading New Unregistered Source")));
});

test("component source registry search order matches the numbered catalog policy", async () => {
  const registry = clone(await json(COMPONENT_SOURCE_REGISTRY_PATH));
  const packageJson = await json("package.json");
  const packageLock = await json("package-lock.json");
  const catalogBody = await readFile(path.join(rootDir, COMPONENT_CATALOG_PATH), "utf8");
  const motion = registry.sources.find((source) => source.id === "motion");
  motion.searchOrder = 5;

  const problems = findComponentSourceRegistryProblems({ registry, packageJson, packageLock, catalogBody });
  assert.ok(problems.some((problem) => problem.includes("searchLabel Motion for React does not match")));
});

test("component source registry rejects dependency version and license drift", async () => {
  const registry = clone(await json(COMPONENT_SOURCE_REGISTRY_PATH));
  const packageJson = await json("package.json");
  const packageLock = await json("package-lock.json");
  const catalogBody = await readFile(path.join(rootDir, COMPONENT_CATALOG_PATH), "utf8");
  const motion = registry.sources.find((source) => source.id === "motion");
  motion.expectedVersion = "0.0.0";
  motion.licenseSpdx = "Apache-2.0";

  const problems = findComponentSourceRegistryProblems({ registry, packageJson, packageLock, catalogBody });
  assert.ok(problems.some((problem) => problem.includes("expectedVersion 0.0.0 does not match package.json 13.1.1")));
  assert.ok(problems.some((problem) => problem.includes("expectedVersion 0.0.0 does not match package-lock.json 13.1.1")));
  assert.ok(problems.some((problem) => problem.includes("licenseSpdx Apache-2.0 does not match package-lock.json MIT")));
});

test("Documentation Governance watches every component-source policy input", async () => {
  const workflow = await readFile(path.join(rootDir, ".github/workflows/docs-governance.yml"), "utf8");
  for (const watchedPath of [
    "docs/ui/component-sources.json",
    "package-lock.json",
    "scripts/lib/component-source-governance.mjs",
  ]) {
    assert.equal(workflow.split(`\"${watchedPath}\"`).length - 1, 2, `${watchedPath} must be watched on pull_request and push`);
  }
});

test("component source registry keeps copy/discovery sources on per-adoption license review", async () => {
  const registry = clone(await json(COMPONENT_SOURCE_REGISTRY_PATH));
  const packageJson = await json("package.json");
  const packageLock = await json("package-lock.json");
  const catalogBody = await readFile(path.join(rootDir, COMPONENT_CATALOG_PATH), "utf8");
  const source = registry.sources.find((entry) => entry.id === "react-bits");
  source.licenseStatus = "lockfile-verified";
  source.licenseSpdx = "MIT";
  source.packageName = "react-bits";

  const problems = findComponentSourceRegistryProblems({ registry, packageJson, packageLock, catalogBody });
  assert.ok(problems.some((problem) => problem.includes("copy-owned source requires packageName=null")));
  assert.ok(problems.some((problem) => problem.includes("copy-owned source requires licenseSpdx=null")));
  assert.ok(problems.some((problem) => problem.includes("copy-owned source must use licenseStatus review-required-per-adoption")));
});
