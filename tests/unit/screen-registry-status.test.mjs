import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const rootDir = process.cwd();

test("screen registry lifecycle state uses explicit dimensions instead of generic Status chains", async () => {
  const body = await readFile(path.join(rootDir, "docs/ui/SCREEN_REGISTRY.md"), "utf8");
  const genericStatusLines = [...body.matchAll(/^\*\*Status:\*\*\s*(.+)$/gm)].map((match) => match[1].trim());

  assert.deepEqual(
    genericStatusLines,
    [],
    "SCREEN_REGISTRY.md must express lifecycle with explicit Execution/Repository/Verification/Deployment fields; UI maturity uses its dedicated field.",
  );
});
