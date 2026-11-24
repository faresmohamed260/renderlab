import assert from "node:assert/strict";
import test from "node:test";
import { runtime, resetRuntime, fakeFetch, flushAfter, currentJob, heldReservation, OWNER_A, JOB_ID } from "../helpers/generation-critical-path-runtime.mjs";

const submitApi=await import("../../src/app/api/generation/jobs/route.ts");
const { reconcileNativeGeneration }=await import("../../src/server/generation/reconcile-generation.ts");
const request={prompt:"Offline test gradient",model:"fibo2-edit-turbo",output:{kind:"image",aspectRatio:"1:1"},inputs:[]};

for(const expired of [false,true]){
  test("F5 cancel landing between claimed snapshot and native poll wins; expired="+expired,async t=>{
    resetRuntime();
    t.mock.method(AbortSignal,"timeout",()=>new AbortController().signal);
    for(const method of ["info","warn","error"]) t.mock.method(console,method,()=>{});
    let interpose=false, reread=false;
    t.mock.method(globalThis,"fetch",async(input,init={})=>{
      const url=new URL(input);
      if(interpose && !reread && url.pathname==="/rest/v1/generation_jobs" && url.searchParams.get("select")==="*" && init.method==="GET"){
        assert.equal(url.searchParams.get("owner_id"),"eq."+OWNER_A);
        assert.equal(currentJob().status,"running");
        currentJob().status="cancelling";
        reread=true;
      }
      return fakeFetch(input,init);
    });
    const submitted=await submitApi.POST(new Request("https://renderlab.example.invalid/api/generation/jobs",{
      method:"POST",headers:{origin:"https://renderlab.example.invalid","content-type":"application/json"},body:JSON.stringify(request),
    }));
    assert.equal(submitted.status,202);
    await flushAfter();
    if(expired) runtime.nowMs+=25*60*1000;
    interpose=true;
    const result=await reconcileNativeGeneration(OWNER_A,JOB_ID);
    assert.equal(reread,true);
    assert.equal(result?.status,"cancelling");
    assert.equal(currentJob().status,"cancelling");
    assert.equal(runtime.providerPolls,0);
    assert.equal(runtime.jobPatchMutations,0);
    assert.equal(runtime.r2Writes,0);
    assert.equal(runtime.mediaWrites,0);
    assert.equal(runtime.atomicCommits,0);
    assert.equal(heldReservation(),true);
  });
}
