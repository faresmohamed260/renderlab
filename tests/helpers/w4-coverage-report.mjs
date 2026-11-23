import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Report only the predeclared privileged non-lifecycle modules. Run after c8.
export const targets = [
  ["src/server/account/account-access.ts", 75],
  ["src/server/media/upload-admission.ts", 85],
  ["src/server/admin/admin-settings.ts", 90],
  ["src/server/media/media-assets.ts", 50],
  ["src/server/media/media-collections.ts", 65],
  ["src/server/observability/diagnostic-store.ts", 50],
  ["src/server/account/account-profile.ts", 45],
  ["src/server/media/media-uploads.ts", 45],
  ["src/server/admin/admin-operations.ts", 45],
  ["src/server/observability/oldest-active-job-store.ts", 80],
  ["src/server/storage/r2.ts", 85],
];
const summary = JSON.parse(readFileSync("coverage/coverage-summary.json", "utf8"));
const output = targets.map(([path, lineTarget]) => {
  const key = Object.keys(summary).find(k => k.replaceAll("\\", "/").endsWith("/" + path));
  assert.ok(key, "Coverage summary missing predeclared module: " + path);
  const { lines, branches } = summary[key];
  return { path, lineTarget, lines: { covered: lines.covered, total: lines.total, pct: lines.pct },
    branches: { covered: branches.covered, total: branches.total, pct: branches.pct },
    targetMet: lines.pct >= lineTarget };
});
console.log("W4_MODULE_COVERAGE=" + JSON.stringify(output));
