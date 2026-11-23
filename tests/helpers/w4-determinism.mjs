import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const files = [
  "tests/unit/w4-access-admin-limits.test.mjs",
  "tests/unit/w4-account-media.test.mjs",
  "tests/unit/w4-observability.test.mjs",
  "tests/unit/w4-storage-r2.test.mjs",
];
const repetitions = 20;
let expectedCount = null;
for(let index=1;index<=repetitions;index++){
  const child=spawnSync(process.execPath,["--test",...files],{
    cwd:root,encoding:"utf8",timeout:45_000,maxBuffer:2*1024*1024,
    env:{...process.env,NODE_V8_COVERAGE:""},
  });
  const out=(child.stdout||"")+"\n"+(child.stderr||"");
  assert.equal(child.error,undefined,"run "+index+" timed out: "+child.error?.message);
  assert.equal(child.status,0,"run "+index+" failed: "+out.slice(-6000));
  const count=Number(out.match(/(?:^|\n)(?:#|ℹ)\s*tests\s+(\d+)/)?.[1]);
  const pass=Number(out.match(/(?:^|\n)(?:#|ℹ)\s*pass\s+(\d+)/)?.[1]);
  const fail=Number(out.match(/(?:^|\n)(?:#|ℹ)\s*fail\s+(\d+)/)?.[1]);
  const skip=Number(out.match(/(?:^|\n)(?:#|ℹ)\s*skipped\s+(\d+)/)?.[1]);
  assert.ok(count>0,"run "+index+": no test summary");
  assert.equal(pass,count,"run "+index+": pass-count mismatch");
  assert.equal(fail,0,"run "+index+": unexpected failure");
  assert.equal(skip,0,"run "+index+": unexpected skipped test");
  expectedCount ??= count;
  assert.equal(count,expectedCount,"run "+index+": test set changed");
}
console.log("W4_DETERMINISM_PASS="+JSON.stringify({runs:repetitions,testsPerRun:expectedCount,failures:0,skips:0}));
