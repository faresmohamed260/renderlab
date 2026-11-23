import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
let expectedSignature = null;
const repetitions = 20;

for (let run = 1; run <= repetitions; run++) {
  const child = spawnSync(process.execPath,
    ["--test", "tests/unit/generation-critical-path-offline.test.mjs"],
    { cwd: root, encoding: "utf8", timeout: 30_000, maxBuffer: 1024 * 1024 });
  const output = `${child.stdout ?? ""}\n${child.stderr ?? ""}`;
  assert.equal(child.error, undefined, `Process ${run}: ${child.error?.message}`);
  assert.equal(child.status, 0, `Process ${run} failed:\n${output.slice(-4000)}`);
  const signature = output.match(/P0_05_EVENT_SIGNATURE=([a-f0-9]{64})/);
  assert.ok(signature, `Process ${run} has no event signature`);
  const pass = output.match(/(?:^|\n)(?:ℹ|#)\s*pass\s+(\d+)/);
  const fail = output.match(/(?:^|\n)(?:ℹ|#)\s*fail\s+(\d+)/);
  const skipped = output.match(/(?:^|\n)(?:ℹ|#)\s*skipped\s+(\d+)/);
  assert.equal(Number(pass?.[1]), 23, `Process ${run}: expected 23 tests`);
  assert.equal(Number(fail?.[1]), 0, `Process ${run}: unexpected failure`);
  assert.equal(Number(skipped?.[1]), 0, `Process ${run}: unexpected skip`);
  expectedSignature ??= signature[1];
  assert.equal(signature[1], expectedSignature,
    `Process ${run}: terminal/job/media/release event sequence changed`);
}
console.log(`P0-05 DETERMINISM PASS: ${repetitions} independent Node processes; 23/23 tests each; no failures/skips; identical SHA-256 event signature ${expectedSignature}`);