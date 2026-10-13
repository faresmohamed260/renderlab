import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const rootDir = process.cwd();

test("account roadmap lifecycle state uses explicit dimensions instead of legacy status chains", async () => {
  const body = await readFile(
    path.join(rootDir, "docs/architecture/ACCOUNT_SETTINGS_CAPABILITY_ROADMAP.md"),
    "utf8",
  );
  const genericStatusLines = [...body.matchAll(/^\*\*Status:\*\*\s*(.+)$/gm)].map((match) => match[1].trim());

  assert.deepEqual(
    genericStatusLines,
    [],
    "ACCOUNT_SETTINGS_CAPABILITY_ROADMAP.md must express current lifecycle with explicit Execution/Repository/Verification/Deployment fields.",
  );
  assert.equal(
    /not deployed by that workstream/i.test(body),
    false,
    "Closure-time deployment provenance must not be used as current deployment state in the Account & Settings roadmap.",
  );
});
