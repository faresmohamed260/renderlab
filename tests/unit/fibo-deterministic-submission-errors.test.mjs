import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { runtime, resetRuntime, fakeFetch, currentJob, OWNER_A, JOB_ID } from "../helpers/generation-critical-path-runtime.mjs";

const fault=Symbol.for("renderlab.f6.payload-fault");
registerHooks({resolve(specifier,context,nextResolve){
  if(specifier==="@/server/media/media-assets")return {shortCircuit:true,url:"data:text/javascript,"+encodeURIComponent("export async function getMediaAsset(){return null;} export function publicMediaAsset(asset){return asset;}")};
  if(specifier==="@/server/generation/fibo-worker-payload")return {shortCircuit:true,url:"data:text/javascript,"+encodeURIComponent(
    "export function buildFiboWorkerPayload(){if(globalThis[Symbol.for('renderlab.f6.payload-fault')])throw Error('Fixture payload preparation rejected.');return {contentType:'application/json',body:JSON.stringify({prompt:'fixture',images:[]})};}"
  )};
  return nextResolve(specifier,context);
}});
const {POST:submit}=await import("../../src/app/api/generation/jobs/route.ts");
const {POST:retry}=await import("../../src/app/api/generation/jobs/[jobId]/retry/route.ts");
const {POST:runAgain}=await import("../../src/app/api/generation/jobs/[jobId]/run-again/route.ts");
const {submitNativeGeneration}=await import("../../src/server/generation/native-generation.ts");
const sourceId="30000000-0000-4000-8000-000000000001";
const maskId="30000000-0000-4000-8000-000000000002";
const key="test-f6-0123456789abcdef";
const request={model:"fibo2-edit-turbo",prompt:"Offline test gradient",output:{kind:"image",aspectRatio:"1:1"},inputs:[]};
const edit={...request,inputs:[{alias:"image1",role:"primary-image",source:{type:"temporary-source",id:sourceId}}]};
const site="https://renderlab.example.invalid";

function fixture(t){
  resetRuntime();
  globalThis[fault]=false;
  t.after(()=>{delete globalThis[fault];});
  for(const method of ["info","warn","error"])t.mock.method(console,method,()=>{});
  t.mock.method(globalThis,"fetch",async(input,init={})=>{
    const url=new URL(input);
    if(url.pathname.endsWith("/rpc/renderlab_lookup_generation_request_acceptance")){
      const body=JSON.parse(init.body);
      assert.equal(body.p_owner_id,OWNER_A);
      return Response.json([{outcome:"not_found",job_id:null,attempt_id:null,reservation_id:null,admission_deadline:null}]);
    }
    return fakeFetch(input,init);
  });
}
function readyReference(withBytes=false){
  runtime.references.set(sourceId,{id:sourceId,owner_id:OWNER_A,mime_type:"image/png",filename:"source.png",storage_key:"fixture-source",status:"ready",metadata:null});
  if(withBytes)runtime.r2.set("fixture-source",{bytes:Buffer.from([137,80,78,71,13,10,26,10]),contentType:"image/png"});
}
function submitRequest(body, idempotencyKey){
  return submit(new Request(site+"/api/generation/jobs",{method:"POST",headers:{origin:site,"content-type":"application/json",...(idempotencyKey?{"idempotency-key":idempotencyKey}:{})},body:JSON.stringify(body)}));
}
function assertNoAcceptance(){
  assert.equal(runtime.traces.some(x=>x.table==="rpc/renderlab_accept_generation_dispatch_idempotent"),false);
  assert.equal(runtime.reservations.size,0);
  assert.equal(runtime.outbox.size,0);
  assert.equal(runtime.afterTasks.length,0);
  assert.equal(runtime.dispatchCalls,0);
}
for(const idempotencyKey of [undefined,key]){
  test("F6 a ready source whose bytes vanished is deterministic HTTP 502; key="+Boolean(idempotencyKey),async t=>{
    fixture(t);readyReference();
    const response=await submitRequest(edit,idempotencyKey);
    assert.equal(response.status,502);
    assert.equal(response.headers.get("retry-after"),null);
    assert.deepEqual((await response.json()).error,{code:"generation_submission_failed",message:"OFFLINE_NOT_FOUND"});
    assertNoAcceptance();
  });
}
test("F6 deterministic mask resolution failure never calls acceptance RPC",async t=>{
  fixture(t);readyReference(true);
  const result=await submitNativeGeneration(OWNER_A,{...edit,mask:{type:"temporary-source",id:maskId}},key);
  assert.deepEqual(result,{ok:false,error:{code:"generation_submission_failed",message:"The owner-scoped mask source is unavailable."}});
  assertNoAcceptance();
});
test("F6 deterministic payload preparation failure never calls acceptance RPC",async t=>{
  fixture(t);globalThis[fault]=true;
  const response=await submitRequest(request,key);
  assert.equal(response.status,502);
  assert.deepEqual((await response.json()).error,{code:"generation_submission_failed",message:"Fixture payload preparation rejected."});
  assertNoAcceptance();
});
for(const [status,action,route] of [["failed","retry",retry],["succeeded","run-again",runAgain]]){
  test("F6 "+action+" preserves deterministic source failure and HTTP 502",async t=>{
    fixture(t);readyReference();
    runtime.jobs.set(JOB_ID,{id:JOB_ID,owner_id:OWNER_A,status,operation:"edit-image",output_kind:"image",prompt:edit.prompt,inputs:edit.inputs,
      parameters:{model:edit.model,output:edit.output,advanced:{seed:42}},created_at:new Date().toISOString(),updated_at:new Date().toISOString(),output_asset_ids:[]});
    const response=await route(new Request(site+"/api/generation/jobs/"+JOB_ID+"/"+action,{method:"POST",headers:{origin:site}}),{params:Promise.resolve({jobId:JOB_ID})});
    assert.equal(response.status,502);
    assert.deepEqual((await response.json()).error,{code:"generation_submission_failed",message:"OFFLINE_NOT_FOUND"});
    assert.equal(currentJob().status,status);
    assertNoAcceptance();
  });
}
