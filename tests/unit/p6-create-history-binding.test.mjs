import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("production Create passes authenticated History action references and no owner input to client transport", () => {
  const route = readFileSync("src/app/(app)/create/page.tsx", "utf8");
  const workspace = readFileSync("src/features/create/create-preview-workspace.tsx", "utf8");
  const production = route.slice(route.indexOf("async function Create({ params }"));
  assert.match(production, /getCurrentRenderLabAccount\(\)/);
  assert.match(production, /historyActions=\{\{\s*readJobsAction: readCreateHistoryJobs,\s*readPromptsAction: readCreateHistoryPrompts,\s*reuseAction: loadCreateHistoryReuse\s*\}\}/);
  assert.match(workspace, /createHistoryTransport\(historyActions\)/);
  assert.match(workspace, /accountKey: historyActions && admitted \? hostedAccountKey \?\? null : null/);
  assert.doesNotMatch(workspace, /from ["']@\/server\//);
  assert.match(workspace, /<CreateHistorySheet\b/);
  assert.match(workspace, /<CreateHistoryPanel\b/);
});
