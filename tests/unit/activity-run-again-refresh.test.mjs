import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/server/generation/generation-activity.ts", "utf8");

test("Activity Run Again eligibility uses the refreshed terminal status", () => {
  assert.match(source, /pageRows\.map\(async \(row, index\) =>/);
  assert.match(source, /const effectiveStatus = refreshedItems\[index\]\?\.status \?\? row\.status/);
  assert.match(source, /if \(effectiveStatus !== "succeeded"\) return null/);
  assert.match(source, /\{ \.\.\.row, status: effectiveStatus \}/);
  assert.doesNotMatch(source, /if \(row\.status !== "succeeded"\) return null/);
});
