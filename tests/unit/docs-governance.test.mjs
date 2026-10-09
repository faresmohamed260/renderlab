import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  DOCUMENT_METADATA_PATH,
  DOCUMENT_METADATA_SCHEMA_PATH,
  findBrokenDocumentationReferenceProblems,
  findClosedContractUncheckedBoxProblems,
  findDuplicateCurrentSectionProblems,
  findStructuredStatusProblems,
  findUiDecisionSupersessionProblems,
  validateDocumentMetadata,
  verifyDocsGovernance,
} from "../../scripts/lib/docs-governance.mjs";

const rootDir = process.cwd();

async function json(repoPath) {
  return JSON.parse((await readFile(path.join(rootDir, repoPath), "utf8")).replace(/^\uFEFF/, ""));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test("checked-in documentation governance passes the complete credential-free verifier", async () => {
  const result = await verifyDocsGovernance({ rootDir, now: new Date("2026-10-10T00:00:00Z") });
  assert.ok(result.managedDocuments >= 20);
  assert.ok(result.markdownDocuments >= 90);
  assert.ok(result.currentManagedDocuments >= 19);
});

test("metadata review-date policy fails stale current authorities", async () => {
  const registry = clone(await json(DOCUMENT_METADATA_PATH));
  const schema = await json(DOCUMENT_METADATA_SCHEMA_PATH);
  registry.documents.find((entry) => entry.path === "docs/STATUS.md").lastReviewed = "2026-01-01";
  const problems = await validateDocumentMetadata({
    registry,
    schema,
    rootDir,
    now: new Date("2026-10-10T00:00:00Z"),
  });
  assert.ok(problems.some((problem) => problem.includes("docs/STATUS.md: governance review is stale")));
});

test("metadata lifecycle and ownership values are schema-enforced", async () => {
  const registry = clone(await json(DOCUMENT_METADATA_PATH));
  const schema = await json(DOCUMENT_METADATA_SCHEMA_PATH);
  registry.documents.find((entry) => entry.path === "docs/INDEX.md").lifecycle = "floating";
  registry.documents.find((entry) => entry.path === "AGENTS.md").ownerRole = "nobody";
  const problems = await validateDocumentMetadata({
    registry,
    schema,
    rootDir,
    now: new Date("2026-10-10T00:00:00Z"),
  });
  assert.ok(problems.some((problem) => problem.includes("lifecycle must be one of")));
  assert.ok(problems.some((problem) => problem.includes("ownerRole must be one of")));
});

test("document supersession must be reciprocal", async () => {
  const registry = clone(await json(DOCUMENT_METADATA_PATH));
  const schema = await json(DOCUMENT_METADATA_SCHEMA_PATH);
  registry.documents.find((entry) => entry.path === "docs/archive/PROJECT_PRE_CYCLE3_2026-09-03.md").supersededBy = [];
  const problems = await validateDocumentMetadata({
    registry,
    schema,
    rootDir,
    now: new Date("2026-10-10T00:00:00Z"),
  });
  assert.ok(problems.some((problem) => problem.includes("reciprocal supersededBy is missing")));
});

test("UI decision supersession is explicit and reciprocal", () => {
  const body = [
    "### UI-100 — Old",
    "**Status:** Superseded",
    "**Superseded by:** UI-101",
    "",
    "### UI-101 — New",
    "**Status:** Accepted",
    "",
  ].join("\n");
  const problems = findUiDecisionSupersessionProblems(body);
  assert.ok(problems.some((problem) => problem.includes("does not reciprocally declare Supersedes UI-100")));
});

test("structured current-state status dimensions reject unknown enum values", () => {
  const problems = findStructuredStatusProblems([
    {
      path: "docs/example.md",
      body: "**Execution:** `DONE`. **Repository:** `MERGED`. **Deployment:** `PRODUCTION-LIVE`.\n**Execution:** `complete`.",
    },
  ]);
  assert.deepEqual(problems, [
    'docs/example.md:1: Execution uses unknown/non-canonical value "DONE"',
    'docs/example.md:2: Execution uses unknown/non-canonical value "complete"',
  ]);
});

test("closed contracts cannot retain unchecked task boxes", () => {
  const problems = findClosedContractUncheckedBoxProblems([
    {
      path: "docs/example/EXAMPLE_CONTRACT.md",
      body: "# Example\n\n**Status:** COMPLETE\n\n- [x] closed\n- [ ] stale task\n",
    },
  ]);
  assert.deepEqual(problems, [
    "docs/example/EXAMPLE_CONTRACT.md:6: closed contract contains an unchecked task box",
  ]);
});

test("duplicate normalized current H2 sections fail", () => {
  const problems = findDuplicateCurrentSectionProblems([
    {
      path: "docs/example.md",
      body: "## Current production — 2026-10-09\nA\n## Current production — 2026-10-10\nB\n",
    },
  ]);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /duplicate current H2/);
});

test("broken relative Markdown documentation references fail", async () => {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "renderlab-doc-governance-"));
  try {
    const problems = await findBrokenDocumentationReferenceProblems(
      [{ path: "docs/example.md", body: "See [missing](./MISSING.md)." }],
      { rootDir: tempRoot },
    );
    assert.equal(problems.length, 1);
    assert.match(problems[0], /broken documentation reference/);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("Documentation Governance CI is secret-free and invokes the repository command", async () => {
  const workflow = (await readFile(path.join(rootDir, ".github/workflows/docs-governance.yml"), "utf8")).replace(/\r\n/g, "\n");
  const packageJson = await json("package.json");
  assert.equal(packageJson.scripts["verify:docs-governance"], "node scripts/verify-docs-governance.mjs");
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /push:/);
  assert.match(workflow, /permissions:\n  contents: read/);
  assert.match(workflow, /npm run verify:docs-governance/);
  assert.doesNotMatch(workflow, /secrets\./);
  assert.doesNotMatch(workflow, /VERCEL_TOKEN|SUPABASE|CLOUDFLARE|RESEND|MODAL/);
});
