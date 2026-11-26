import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("History reads durable status after its one bounded settlement attempt", () => {
  const page = readFileSync("src/server/generation/history/history-activity.ts", "utf8");
  const list = readFileSync("src/server/generation/generation-activity.ts", "utf8");
  assert.match(page, /await settleOwnerGenerationWithinResponse\(account\.id, "activity"\)[\s\S]*await listGenerationActivity\(/);
  assert.doesNotMatch(list, /pollGenerationJob\(/);
});
