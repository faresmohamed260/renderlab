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
  findAmbiguousLifecycleStatusProblems,
  findArchitectureDecisionAuthorityProblems,
  findArchitectureDecisionSupersessionProblems,
  findUiDecisionAuthorityProblems,
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
  const result = await verifyDocsGovernance({ rootDir, now: new Date("2026-10-14T00:00:00Z") });
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
    now: new Date("2026-10-14T00:00:00Z"),
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
    now: new Date("2026-10-14T00:00:00Z"),
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
    now: new Date("2026-10-14T00:00:00Z"),
  });
  assert.ok(problems.some((problem) => problem.includes("reciprocal supersededBy is missing")));
});

test("architecture decision authority requires durable fields and rejects evidence journals", () => {
  const body = [
    "## ADR-100 — Wrong heading",
    "**Status:** Accepted",
    "",
    "### ADR-101 — Bad status",
    "**Status:** Accepted / Implemented",
    "**Scope:** Example boundary",
    "**Decision:** Keep one durable boundary.",
    "**Rationale:** Avoid ambiguity.",
    "**Consequences:** Future work follows the boundary.",
    "**Current truth:** `docs/example.md`",
    "#### ADR-101 verification",
    "**Verification:** run 123",
    "",
    "### ADR-102 — Missing rationale",
    "**Status:** Proposed",
    "**Scope:** Example boundary",
    "**Decision:** Proposed choice.",
    "**Consequences:** None yet.",
    "**Current truth:** `docs/example.md`",
  ].join("\n");
  const problems = findArchitectureDecisionAuthorityProblems(body);
  assert.ok(problems.some((problem) => problem.includes("architecture decision headings must use H3")));
  assert.ok(problems.some((problem) => problem.includes("checkpoint/evidence subheadings")));
  assert.ok(problems.some((problem) => problem.includes("detailed implementation/verification chronology")));
  assert.ok(problems.some((problem) => problem.includes("Status must be Proposed, Accepted, or Superseded")));
  assert.ok(problems.some((problem) => problem.includes("ADR-102: missing Rationale field")));
});

test("architecture decision supersession is explicit and reciprocal", () => {
  const base = (id, status, extra = "") => [
    `### ${id} — Decision`,
    `**Status:** ${status}`,
    "**Scope:** Example boundary",
    "**Decision:** Example decision.",
    "**Rationale:** Example rationale.",
    "**Consequences:** Example consequence.",
    "**Current truth:** `docs/example.md`",
    extra,
    "",
  ].filter(Boolean).join("\n");
  const body = [
    base("ADR-100", "Superseded", "**Superseded by:** ADR-101"),
    base("ADR-101", "Accepted"),
  ].join("\n\n");
  const problems = findArchitectureDecisionSupersessionProblems(body);
  assert.ok(problems.some((problem) => problem.includes("does not reciprocally declare Supersedes ADR-100")));
});

test("UI decision authority rejects execution journals and lifecycle chains", () => {
  const body = [
    "## UI-100 — Wrong heading",
    "**Status:** Accepted / Implemented / Verified",
    "",
    "### UI-101 — Current decision",
    "**Status:** Accepted / Implemented / Verified",
    "#### UI-101 implementation verification — 2026-10-13",
    "**Verification:** run 123",
    "",
    "## Current UI redesign deployment state — 2026-10-13",
  ].join("\n");
  const problems = findUiDecisionAuthorityProblems(body);
  assert.ok(problems.some((problem) => problem.includes("headings must use H3")));
  assert.ok(problems.some((problem) => problem.includes("checkpoint/evidence subheadings")));
  assert.ok(problems.some((problem) => problem.includes("detailed implementation/verification chronology")));
  assert.ok(problems.some((problem) => problem.includes("deployment journals")));
  assert.ok(problems.some((problem) => problem.includes("Status must be Proposed, Accepted, or Superseded")));
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

test("current lifecycle authorities reject generic Status fields without blocking domain-specific status vocabularies", () => {
  const problems = findAmbiguousLifecycleStatusProblems([
    { path: "docs/STATUS.md", body: "**Status:** COMPLETE / VERIFIED / MERGED" },
    { path: "docs/ui/UI_MIGRATION.md", body: "- **Status:** COMPLETE" },
    { path: "docs/ui/COMPONENT_CATALOG.md", body: "**Status:** APPROVED" },
    { path: "docs/ui/UI_DECISIONS.md", body: "**Status:** Accepted" },
  ]);
  assert.deepEqual(problems, [
    "docs/STATUS.md:1: current lifecycle authority must use explicit Execution/Repository/Verification/Deployment fields instead of generic Status",
    "docs/ui/UI_MIGRATION.md:1: current lifecycle authority must use explicit Execution/Repository/Verification/Deployment fields instead of generic Status",
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
