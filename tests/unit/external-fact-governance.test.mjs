import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  DOCUMENT_METADATA_PATH,
  EXTERNAL_FACT_REGISTRY_PATH,
  findExternalFactRegistryProblems,
  verifyExternalFactRegistry,
} from "../../scripts/lib/external-fact-governance.mjs";

const rootDir = process.cwd();
const now = new Date("2026-10-15T12:00:00Z");

async function json(repoPath) {
  return JSON.parse((await readFile(path.join(rootDir, repoPath), "utf8")).replace(/^\uFEFF/, ""));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function fixture() {
  const registry = await json(EXTERNAL_FACT_REGISTRY_PATH);
  const documentsRegistry = await json(DOCUMENT_METADATA_PATH);
  const currentPaths = documentsRegistry.documents.filter((document) => document.lifecycle === "current").map((document) => document.path);
  const authorityBodies = new Map(
    await Promise.all(currentPaths.map(async (documentPath) => [documentPath, await readFile(path.join(rootDir, documentPath), "utf8")])),
  );
  return { registry, documentsRegistry, authorityBodies };
}

test("checked-in action-sensitive external fact registry passes", async () => {
  const result = await verifyExternalFactRegistry({ rootDir, now });
  assert.ok(result.facts >= 5);
  assert.equal(result.reverifyBeforeAction, result.facts);
});

test("external facts require source, valid verification time, and bounded freshness behavior", async () => {
  const { registry, documentsRegistry, authorityBodies } = await fixture();
  const candidate = clone(registry);
  candidate.facts[0].source = "";
  candidate.facts[1].verified_at = "2099-01-01";
  candidate.facts[2].reverify_before_action = false;
  const problems = findExternalFactRegistryProblems({ registry: candidate, documentsRegistry, authorityBodies, now });
  assert.ok(problems.some((problem) => problem.includes("source must be a non-empty string")));
  assert.ok(problems.some((problem) => problem.includes("verified_at cannot be in the future")));
  assert.ok(problems.some((problem) => problem.includes("require reverify_before_action=true or a bounded max_age_days")));
});

test("external fact markers and registry records must be one-to-one with current authorities", async () => {
  const { registry, documentsRegistry, authorityBodies } = await fixture();
  const missingRecord = clone(registry);
  const removed = missingRecord.facts.shift();
  let problems = findExternalFactRegistryProblems({ registry: missingRecord, documentsRegistry, authorityBodies, now });
  assert.ok(problems.some((problem) => problem.includes(`marker ${removed.id} has no registry record`)));

  const missingMarkerBodies = new Map(authorityBodies);
  missingMarkerBodies.set(
    removed.authority_path,
    missingMarkerBodies.get(removed.authority_path).replace(`<!-- EXTERNAL_FACT: ${removed.id} -->`, ""),
  );
  problems = findExternalFactRegistryProblems({ registry, documentsRegistry, authorityBodies: missingMarkerBodies, now });
  assert.ok(problems.some((problem) => problem.includes("registry fact is missing")));
});

test("external fact authority must be a current managed document and action contexts are explicit", async () => {
  const { registry, documentsRegistry, authorityBodies } = await fixture();
  const candidate = clone(registry);
  candidate.facts[0].authority_path = "docs/archive/STATUS_PRE_PUBLIC_SUMMARY_2026-10-13.md";
  candidate.facts[1].action_contexts = [];
  const problems = findExternalFactRegistryProblems({ registry: candidate, documentsRegistry, authorityBodies, now });
  assert.ok(problems.some((problem) => problem.includes("authority_path must reference a current managed document")));
  assert.ok(problems.some((problem) => problem.includes("require at least one action_context")));
});

test("Documentation Governance always covers external-fact policy inputs", async () => {
  const workflow = (await readFile(path.join(rootDir, ".github/workflows/docs-governance.yml"), "utf8")).replace(/\r\n/g, "\n");
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /push:/);
  assert.doesNotMatch(workflow, /\n\s+paths(?:-ignore)?:/);
});
