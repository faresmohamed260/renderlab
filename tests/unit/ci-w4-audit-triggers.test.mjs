import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

const configs=[
  [".github/workflows/w4-risk-tests.yml","w4"],
  [".github/workflows/w4c-risk-tests.yml","w4c"],
];
test("CI P5 W4/W4C run only for behavioral test, helper or workflow edits",()=>{
 for(const [path,suite] of configs){
  const yaml=readFileSync(path,"utf8");
  assert.match(yaml,/on:\s*\n\s*pull_request:\s*\n\s*paths:/);
  assert.match(yaml,new RegExp('tests/unit/'+suite+'-\\*\\.test\\.mjs'));
  assert.match(yaml,new RegExp('tests/helpers/'+suite+'-\\*\\.mjs'));
  assert(yaml.includes('".github/workflows/'+suite+'-risk-tests.yml"'));
  assert.doesNotMatch(yaml,/docs\/audits\/W4C?_RISK_BOUNDARY_TEST_EVIDENCE_/);
  assert.match(yaml,/cancel-in-progress:\s*true/);
 }
});
test("CI P5 audit evidence remains governed by universal protected checks",()=>{
 for(const path of [".github/workflows/docs-governance.yml",".github/workflows/codeql.yml"]){
  const yaml=readFileSync(path,"utf8");
  assert.match(yaml,/pull_request:/);
  assert.doesNotMatch(yaml,/paths-ignore:/);
 }
});
