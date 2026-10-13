import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const rootDir = process.cwd();

test("product capability lifecycle state separates current dimensions from closure evidence", async () => {
  const body = await readFile(
    path.join(rootDir, "docs/architecture/PRODUCT_CAPABILITIES.md"),
    "utf8",
  );

  const genericStatusLines = body
    .split(/\r?\n/)
    .filter((line) => /^\*\*Status:/i.test(line));
  assert.deepEqual(
    genericStatusLines,
    [],
    "PRODUCT_CAPABILITIES.md must not use generic Status fields for current capability lifecycle state.",
  );

  assert.equal(
    body.includes("still-deployed Cycle 2/Phase 13 application"),
    false,
    "Historical deployment claims must not read as present production truth.",
  );
  assert.equal(
    body.includes("Phase 18 is complete/verified/merged; production rollout remains separate"),
    false,
    "Superseded Phase 18 rollout wording must not remain current-state prose.",
  );
  assert.equal(
    body.includes("### Phase 16 Creative Iteration — COMPLETE / VERIFIED in RenderLab"),
    false,
    "Historical phase headings must not chain execution and verification into a current-looking title.",
  );
  assert.equal(
    body.includes("## Phase 18 Image Upscale v0.1 — COMPLETE / VERIFIED / MERGED"),
    false,
    "Historical phase headings must not chain execution, verification, and repository state.",
  );

  assert.ok(
    body.includes("**Execution:** `COMPLETE`. **Repository:** `MERGED`. **Verification:** `EXACT-HEAD VERIFIED`. **Deployment:** `PRODUCTION-LIVE`."),
    "Current Image-model productization status must use canonical lifecycle dimensions.",
  );
  assert.ok(
    body.includes("**Execution:** `COMPLETE`. **Repository:** `MERGED`. **Verification:** `EXACT-HEAD VERIFIED`, `MERGED-MAIN VERIFIED`. **Deployment:** `PRODUCTION-LIVE`."),
    "Current Library-origin browsing status must use canonical lifecycle dimensions.",
  );

  const closureLabels = body.match(/\*\*Closure-time (?:status|deployment note):\*\*/g) ?? [];
  assert.ok(
    closureLabels.length >= 3,
    "Historical capability status must remain explicitly labeled as closure-time evidence.",
  );
});
