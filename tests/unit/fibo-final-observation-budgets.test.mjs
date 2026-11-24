import assert from "node:assert/strict";
import test from "node:test";
import { runtime, resetRuntime, fakeFetch, flushAfter, currentJob, heldReservation, OWNER_A, JOB_ID } from "../helpers/generation-critical-path-runtime.mjs";

const submitApi = await import("../../src/app/api/generation/jobs/route.ts");
const { reconcileNativeGeneration } = await import("../../src/server/generation/reconcile-generation.ts");
const request = { prompt:"Offline test gradient", model:"fibo2-edit-turbo", output:{kind:"image",aspectRatio:"1:1"},inputs:[] };
const png = Buffer.from([137,80,78,71,13,10,26,10]);
const caption = '{"short_description":"test scene"}';

async function fixture(t, {autoVgl = true, headerMs = 3_000, bodyMs = 3_000, sidecarMs = 3_000} = {}) {
  resetRuntime();
  t.mock.timers.enable({apis:["setTimeout"]});
  t.mock.method(AbortSignal,"timeout",ms=>{
    const controller=new AbortController();
    setTimeout(()=>controller.abort(new DOMException("Fixture timeout","TimeoutError")),ms);
    return controller.signal;
  });
  for(const method of ["info","warn","error"]) t.mock.method(console,method,()=>{});
  const timeline=[];
  t.mock.method(globalThis,"fetch",async (input,init={})=>{
    const url=new URL(input);
    if(url.pathname==="/jobs" && init.method==="GET"){
      timeline.push("headers");
      runtime.providerPolls++;
      t.mock.timers.tick(headerMs);
      init.signal?.throwIfAborted();
      const response=new Response(png,{headers:{"content-type":"image/png"}});
      const read=response.arrayBuffer.bind(response);
      t.mock.method(response,"arrayBuffer",async()=>{
        timeline.push("body");
        t.mock.timers.tick(bodyMs);
        init.signal?.throwIfAborted();
        return read();
      });
      return response;
    }
    if(url.pathname==="/jobs/vgl" && init.method==="GET"){
      timeline.push("sidecar");
      t.mock.timers.tick(sidecarMs);
      init.signal?.throwIfAborted();
      return Response.json({vgl:caption});
    }
    return fakeFetch(input,init);
  });
  const submitted=await submitApi.POST(new Request("https://renderlab.example.invalid/api/generation/jobs",{
    method:"POST",headers:{origin:"https://renderlab.example.invalid","content-type":"application/json"},body:JSON.stringify(request),
  }));
  assert.equal(submitted.status,202);
  await flushAfter();
  assert.equal(currentJob().status,"running");
  if(autoVgl) currentJob().parameters.autoVgl=true;
  runtime.nowMs+=25*60*1000;
  return timeline;
}

test("F4 final observation gives headers, PNG body and generated VGL independent budgets",async(t)=>{
  const timeline=await fixture(t);
  const result=await reconcileNativeGeneration(OWNER_A,JOB_ID,{lookupMs:1500,providerMs:4000});
  assert.equal(result?.status,"succeeded");
  assert.deepEqual(timeline,["headers","body","sidecar"]);
  assert.equal(currentJob().parameters.generatedVgl,caption);
  assert.equal(runtime.providerPolls,1);
  assert.equal(runtime.mediaWrites,1);
  assert.equal(runtime.atomicCommits,1);
  assert.equal(heldReservation(),false);
});

test("F4 slow but separately bounded PNG is not lost without a sidecar",async(t)=>{
  const timeline=await fixture(t,{autoVgl:false});
  const result=await reconcileNativeGeneration(OWNER_A,JOB_ID,{lookupMs:1500,providerMs:4000});
  assert.equal(result?.status,"succeeded");
  assert.deepEqual(timeline,["headers","body"]);
  assert.equal(runtime.providerPolls,1);
  assert.equal(runtime.mediaWrites,1);
});

for(const slow of ["headers","body","sidecar"]){
  test("F4 an individually expired "+slow+" budget does not persist incomplete output",async(t)=>{
    await fixture(t,{[({headers:"headerMs",body:"bodyMs",sidecar:"sidecarMs"})[slow]]:4001});
    const result=await reconcileNativeGeneration(OWNER_A,JOB_ID,{lookupMs:1500,providerMs:4000});
    assert.equal(result?.status,"failed");
    assert.equal(result.error?.code,"generation_deadline_exceeded");
    assert.equal(runtime.providerPolls,1);
    assert.equal(runtime.mediaWrites,0);
    assert.equal(runtime.r2Writes,0);
    assert.equal(runtime.atomicCommits,1);
  });
}
