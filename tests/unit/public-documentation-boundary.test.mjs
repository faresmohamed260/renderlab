import assert from "node:assert/strict";
import test from "node:test";

import {
  findPublicDocumentationBoundaryProblems,
  STATUS_SUMMARY_MAX_LINES,
} from "../../scripts/lib/public-documentation-boundary.mjs";

test("public documentation cannot route readers into internal handoff entry points", () => {
  const problems = findPublicDocumentationBoundaryProblems([
    { path: "README.md", body: "See [project handoff](PROJECT.md)." },
    { path: "docs/STATUS.md", body: "See [agent instructions](../AGENTS.md)." },
  ]);

  assert.deepEqual(problems, [
    "README.md:1: public documentation must not route readers to internal entry point PROJECT.md",
    "docs/STATUS.md:1: public documentation must not route readers to internal entry point AGENTS.md",
  ]);
});

test("public documentation may route to public and domain documentation", () => {
  const problems = findPublicDocumentationBoundaryProblems([
    {
      path: "README.md",
      body: "See [status](docs/STATUS.md), [capabilities](docs/architecture/PRODUCT_CAPABILITIES.md), and https://renderlab.faresuniform.uk.",
    },
    {
      path: "docs/STATUS.md",
      body: "See [capabilities](architecture/PRODUCT_CAPABILITIES.md).",
    },
  ]);

  assert.deepEqual(problems, []);
});

test("public STATUS remains compact and rejects execution-journal headings", () => {
  const oversized = Array.from({ length: STATUS_SUMMARY_MAX_LINES + 1 }, (_, index) => `line ${index + 1}`).join("\n");
  const problems = findPublicDocumentationBoundaryProblems([
    { path: "docs/STATUS.md", body: `${oversized}\n\n## ENT-011 follow-up\n` },
  ]);

  assert.equal(problems.length, 2);
  assert.match(problems[0], /keep it at or below 80 lines/);
  assert.match(problems[1], /execution-journal headings do not belong/);
});

test("README cannot relabel the internal handoff as implementation history", () => {
  const problems = findPublicDocumentationBoundaryProblems([
    { path: "README.md", body: "See PROJECT.md for detailed implementation history." },
  ]);

  assert.deepEqual(problems, [
    "README.md: PROJECT.md is the compact internal handoff, not detailed implementation/execution history",
  ]);
});
