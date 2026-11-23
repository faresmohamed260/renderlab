import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {createHash} from "node:crypto";
import {dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";
const cwd=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const files=[
  "tests/unit/w4c-account-lifecycle.test.mjs",
  "tests/unit/w4c-admin-operations.test.mjs",
  "tests/unit/w4c-api-boundaries.test.mjs",
  "tests/unit/w4c-diagnostics-mail.test.mjs",
  "tests/unit/w4c-reference-upload.test.mjs"
];
let count=null,signature=null;
for(let i=1;i<=20;i++){
 const child=spawnSync(process.execPath,["--test",...files],{
  cwd,encoding:"utf8",timeout:60_000,maxBuffer:3*1024*1024,
  env:{...process.env,NODE_V8_COVERAGE:""},
 });
 const output=(child.stdout||"")+"\n"+(child.stderr||"");
 assert.equal(child.error,undefined,"W4C repeat "+i+": "+child.error?.message);
 assert.equal(child.status,0,"W4C repeat "+i+" failed:\n"+output.slice(-8500));
 const number=k=>Number(output.match(new RegExp("(?:^|\\n)(?:#|ℹ)\\s*"+k+"\\s+(\\d+)"))?.[1]);
 const tests=number("tests"),passed=number("pass"),failed=number("fail"),skipped=number("skipped");
 assert.ok(tests>0,"No recognized test report on repeat "+i);
 assert.equal(passed,tests,"Pass-count mismatch on "+i);
 assert.equal(failed,0,"Failure on repeat "+i);
 assert.equal(skipped,0,"Skip on repeat "+i);
 count??=tests;assert.equal(tests,count,"Test-set size drift on repeat "+i);
 // TAP output order is file-specific; stable alphabetical case names isolate scheduling/duration noise.
 const names=output.split("\n").filter(line=>line.includes("✔ C ")).map(line=>line.split("✔ ")[1].replace(/ \([\d.]+ms\).*$/,"")).sort();
 assert.equal(names.length,tests,"Expected one named W4C test for each passing result");
 const digest=createHash("sha256").update(names.join("\n")).digest("hex");
 signature??=digest;assert.equal(digest,signature,"Test identity changed in repeat "+i);
}
console.log("W4C_DETERMINISM_PASS="+JSON.stringify({runs:20,testsPerRun:count,failures:0,skips:0,testSetSha256:signature}));