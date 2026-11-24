import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const workflows = [
  "account-ownership",
  "maintenance-integration",
  "media-upload-integration",
  "reference-upload-integration",
  "upload-admission-integration",
  "ent007-recovery-backup",
  "ent007-recovery-drill",
  "production-qa004-account-security-data",
  "production-qa005-reconciliation-failure",
  "production-documentation-sync"
];
test("N3 secret-bearing dispatch jobs require main ref, without relying on the guard as a secret boundary", () => {
  for (const name of workflows) {
    const yaml = readFileSync(".github/workflows/" + name + ".yml", "utf8");
    assert.match(yaml, /workflow_dispatch:/);
    assert.match(yaml, /jobs:\n  [\w-]+:\n    # Defense in depth only[^\n]*\n    if: \$\{\{ github\.ref == 'refs\/heads\/main' \}\}\n    runs-on:/);
    assert.match(yaml, /secrets\./);
  }
});
