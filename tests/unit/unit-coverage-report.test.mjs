import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";

import {
  assessUnitCoverageReport,
  eligibleUnitCoverageSources,
  isEligibleUnitCoverageSource,
} from "../../scripts/lib/unit-coverage-report.mjs";

const repositoryRoot = resolve("/tmp/renderlab-unit-coverage-fixture");

function metric(total, covered, skipped = 0) {
  return {
    total,
    covered,
    skipped,
    pct: total === 0 ? 100 : Number(((covered / total) * 100).toFixed(2)),
  };
}

function entry({ statements, lines, functions, branches }) {
  return {
    statements: metric(...statements),
    lines: metric(...lines),
    functions: metric(...functions),
    branches: metric(...branches),
  };
}

function completeSummary() {
  return {
    total: entry({
      statements: [8, 4],
      lines: [8, 4],
      functions: [3, 2],
      branches: [4, 2],
    }),
    [resolve(repositoryRoot, "src/a.ts")]: entry({
      statements: [4, 4],
      lines: [4, 4],
      functions: [2, 2],
      branches: [2, 2],
    }),
    [resolve(repositoryRoot, "src/b.tsx")]: entry({
      statements: [4, 0],
      lines: [4, 0],
      functions: [1, 0],
      branches: [2, 0],
    }),
  };
}

const eligibleSources = ["src/a.ts", "src/b.tsx"];

test("unit coverage source boundary includes TS/TSX and excludes declarations", () => {
  assert.equal(isEligibleUnitCoverageSource("src/example.ts"), true);
  assert.equal(isEligibleUnitCoverageSource("src/example.tsx"), true);
  assert.equal(isEligibleUnitCoverageSource("src/example.d.ts"), false);
  assert.equal(isEligibleUnitCoverageSource("tests/example.ts"), false);

  assert.deepEqual(
    eligibleUnitCoverageSources("src/example.ts\0src/example.d.ts\0src/example.tsx\0README.md\0"),
    ["src/example.ts", "src/example.tsx"],
  );
});

test("unit coverage report accepts a complete all-source denominator", () => {
  const result = assessUnitCoverageReport({
    summary: completeSummary(),
    eligibleSources,
    repositoryRoot,
    proofSource: "src/b.tsx",
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.problems, []);
  assert.deepEqual(result.reportedSources, eligibleSources);
  assert.equal(result.totals.lines, 50);
});

test("unit coverage report fails closed when a zero-import source disappears", () => {
  const summary = completeSummary();
  delete summary[resolve(repositoryRoot, "src/b.tsx")];
  summary.total = summary[resolve(repositoryRoot, "src/a.ts")];

  const result = assessUnitCoverageReport({
    summary,
    eligibleSources,
    repositoryRoot,
    proofSource: "src/b.tsx",
  });

  assert.equal(result.ok, false);
  assert.match(result.problems.join("\n"), /Eligible source is missing from unit coverage: src\/b\.tsx/);
  assert.match(result.problems.join("\n"), /All-source proof file is missing/);
  assert.match(result.problems.join("\n"), /denominator mismatch/);
});

test("unit coverage report rejects totals-only and malformed percentages", () => {
  const totalsOnly = assessUnitCoverageReport({
    summary: { total: completeSummary().total },
    eligibleSources,
    repositoryRoot,
  });
  assert.equal(totalsOnly.ok, false);
  assert.match(totalsOnly.problems.join("\n"), /no per-file source entries/);

  const malformed = completeSummary();
  malformed.total.lines.pct = Number.NaN;
  const result = assessUnitCoverageReport({
    summary: malformed,
    eligibleSources,
    repositoryRoot,
  });
  assert.equal(result.ok, false);
  assert.match(result.problems.join("\n"), /total\.lines\.pct must be a finite percentage/);
});

test("unit coverage report rejects paths outside the repository coverage boundary", () => {
  const summary = completeSummary();
  summary[resolve(repositoryRoot, "../outside.ts")] = entry({
    statements: [1, 0],
    lines: [1, 0],
    functions: [1, 0],
    branches: [1, 0],
  });

  const result = assessUnitCoverageReport({
    summary,
    eligibleSources,
    repositoryRoot,
  });
  assert.equal(result.ok, false);
  assert.match(result.problems.join("\n"), /outside the repository or invalid/);
});
