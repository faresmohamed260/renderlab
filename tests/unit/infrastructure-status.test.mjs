import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const rootDir = process.cwd();

test("infrastructure lifecycle state distinguishes current status from historical closure evidence", async () => {
  const body = await readFile(
    path.join(rootDir, "docs/architecture/INFRASTRUCTURE.md"),
    "utf8",
  );
  const genericStatusLines = body
    .split(/\r?\n/)
    .filter((line) => /^\*\*Status:/i.test(line));

  assert.deepEqual(
    genericStatusLines,
    [],
    "INFRASTRUCTURE.md must not use generic Status fields for current or closure-time lifecycle state.",
  );
  assert.equal(
    body.includes("Cycle 2 production is accepted and Phase 13"),
    false,
    "Infrastructure operating rules must defer present deployment truth to the canonical current-production authority.",
  );
  assert.equal(
    body.includes("Phase 12B is `COMPLETE / VERIFIED`"),
    false,
    "Superseded rollout status must be written as closure-time history rather than present lifecycle state.",
  );
  const closureTimeStatusLines = body
    .split(/\r?\n/)
    .filter((line) => /^\*\*Closure-time status:\*\*/i.test(line));
  assert.equal(
    closureTimeStatusLines.length,
    3,
    "The three legacy infrastructure Status fields must remain explicitly labeled as closure-time evidence.",
  );
});
