import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/features/activity/activity-auto-refresh.tsx", "utf8");

test("Activity keeps refreshing while server truth remains active", () => {
  assert.match(source, /window\.setInterval\(\(\) => router\.refresh\(\), 5000\)/);
  assert.match(source, /window\.clearInterval\(timer\)/);
  assert.doesNotMatch(source, /window\.setTimeout/);
});
