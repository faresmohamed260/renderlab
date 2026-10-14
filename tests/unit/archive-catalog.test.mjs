import assert from "node:assert/strict";
import test from "node:test";

import { findArchiveCatalogProblems } from "../../scripts/lib/archive-catalog.mjs";

const archivePaths = [
  "docs/archive/README.md",
  "docs/archive/PROJECT_PRE_HISTORY_SEPARATION_2026-10-10.md",
  "docs/archive/STATUS_PRE_PUBLIC_SUMMARY_2026-10-13.md",
];

test("archive catalog accepts one entry for every root Markdown snapshot", () => {
  const problems = findArchiveCatalogProblems({
    archivePaths,
    catalogBody: [
      "# Historical Evidence",
      "",
      "- `PROJECT_PRE_HISTORY_SEPARATION_2026-10-10.md` — Project snapshot.",
      "- `STATUS_PRE_PUBLIC_SUMMARY_2026-10-13.md` — Status snapshot.",
    ].join("\n"),
  });

  assert.deepEqual(problems, []);
});

test("archive catalog rejects missing, stale, and duplicate root entries", () => {
  const problems = findArchiveCatalogProblems({
    archivePaths,
    catalogBody: [
      "- `PROJECT_PRE_HISTORY_SEPARATION_2026-10-10.md` — Project snapshot.",
      "- `PROJECT_PRE_HISTORY_SEPARATION_2026-10-10.md` — Duplicate.",
      "- `REMOVED_SNAPSHOT.md` — Stale entry.",
    ].join("\n"),
  });

  assert.deepEqual(problems, [
    "docs/archive/README.md: missing root archive entry STATUS_PRE_PUBLIC_SUMMARY_2026-10-13.md",
    "docs/archive/README.md: catalogs unknown root archive entry REMOVED_SNAPSHOT.md",
    "docs/archive/README.md: duplicate root archive catalog entry",
  ]);
});

test("archive catalog ignores nested historical evidence", () => {
  const problems = findArchiveCatalogProblems({
    archivePaths: [...archivePaths, "docs/archive/nested/DETAIL.md"],
    catalogBody: [
      "- `PROJECT_PRE_HISTORY_SEPARATION_2026-10-10.md` — Project snapshot.",
      "- `STATUS_PRE_PUBLIC_SUMMARY_2026-10-13.md` — Status snapshot.",
    ].join("\n"),
  });

  assert.deepEqual(problems, []);
});
