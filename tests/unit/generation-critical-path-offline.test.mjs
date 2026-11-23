import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import {
  runtime, resetRuntime, fakeFetch, flushAfter, currentJob,
  heldReservation, setAge, OWNER_A, OWNER_B, JOB_ID,
  RESERVATION_ID, FIXED_TIME, PROVIDER_ID,
} from "../helpers/generation-critical-path-runtime.mjs";

const submitApi = await import("../../src/app/api/generation/jobs/route.ts");
const native = await import("../../src/server/generation/native-generation.ts");
const poll = await import("../../src/server/generation/poll-generation.ts");
const reconciliation = await import("../../src/server/generation/reconcile-generation.ts");
const submission = await import("../../src/server/generation/submit-generation.ts");
const cancellation = await import("../../src/server/generation/cancel-generation.ts");
const ownerReturn = await import("../../src/server/generation/owner-generation-settlement.ts");

const request = {
  prompt:"Offline test gradient", model:"fibo2-edit-turbo",
  output:{kind:"image",aspectRatio:"1:1"},inputs:[],
};
const site = "https://renderlab.example.invalid";

function fixture(t, options = {}) {
  resetRuntime(options);
  t.mock.method(globalThis, "fetch", fakeFetch);
  t.mock.method(AbortSignal, "timeout", () => new AbortController().signal);
  t.mock.method(console, "info", () => {});
  t.mock.method(console, "warn", () => {});
  t.mock.method(console, "error", () => {});
  assert.equal(Date.now(),FIXED_TIME);
  return runtime;
}
async function submit() {
  return submitApi.POST(new Request(site+"/api/generation/jobs",{
    method:"POST",headers:{origin:site,"content-type":"application/json"},
    body:JSON.stringify(request),
  }));
}
async function accepted() {
  const result=await submit();
  assert.equal(result.status,202);
  const body=await result.json();
  assert.equal(body.ok,true);
  assert.equal(body.job.id,JOB_ID);
  assert.equal(body.job.status,"queued");
  assert.equal(currentJob().status,"queued");
  assert.equal(heldReservation(),true);
  assert.equal(runtime.outbox.get(JOB_ID).status,"pending");
  assert.equal(runtime.afterTasks.length,1);
  return body.job;
}
async function dispatched() {
  await accepted();
  await flushAfter();
  assert.equal(currentJob().status,"running");
  assert.equal(currentJob().provider_job_id,PROVIDER_ID);
  assert.equal(runtime.outbox.get(JOB_ID).status,"dispatched");
  assert.equal(runtime.dispatchCalls,1);
  assert.equal(runtime.wakeCalls,1);
  return currentJob();
}

test("P0-05 happy path: API submit > admission > durable outbox > wake > poll > R2/media > release",async(t)=>{
  fixture(t);
  await dispatched();
  const result=await poll.pollGenerationJob(OWNER_A,JOB_ID);
  assert.equal(result?.status,"succeeded");
  assert.equal(currentJob().status,"succeeded");
  assert.equal(currentJob().output_asset_ids.length,1);
  assert.equal(runtime.mediaWrites,1);
  assert.equal(runtime.media.size,1);
  assert.equal(runtime.r2.size,2,"primary and thumbnail are durable");
  assert.equal(heldReservation(),false);
  assert.equal(runtime.releases,1);
  assert.equal(runtime.providerPolls,1);
  const sequence=runtime.traces.map(x=>x.side==="db"?x.table:x.path);
  assert.ok(sequence.indexOf("rpc/renderlab_reserve_generation_admission")
    < sequence.indexOf("rpc/renderlab_accept_generation_dispatch"));
  assert.ok(sequence.indexOf("rpc/renderlab_accept_generation_dispatch")
    < sequence.indexOf("rpc/renderlab_bind_generation_admission"));
  assert.ok(sequence.includes("/dispatch/wake"));
  assert.ok(sequence.includes("/jobs"));
  assert.ok(sequence.includes("media_assets"));
  assert.equal(runtime.traces.every(x=>x.side==="db"||x.side==="provider"),true);
  const eventLog = {
    jobStatus:currentJob().status, outputAssetIds:currentJob().output_asset_ids,
    releases:runtime.releases, mediaWrites:runtime.mediaWrites, r2Writes:runtime.r2Writes,
    reservationHeld:heldReservation(), outboxStatus:runtime.outbox.get(JOB_ID).status,
    trace:runtime.traces.map(x=>[x.side,x.method,x.table??x.path]),
  };
  process.stdout.write("P0_05_EVENT_SIGNATURE="
    +createHash("sha256").update(JSON.stringify(eventLog)).digest("hex")+"\n");
});

test("P0-05 admission denial returns 429 without creating job/outbox/provider",async(t)=>{
  fixture(t,{admissionFailure:"generation_rate_limit_reached"});
  const res=await submit();
  assert.equal(res.status,429);
  assert.equal((await res.json()).error.code,"generation_rate_limit_reached");
  assert.equal(runtime.jobs.size,0);
  assert.equal(runtime.outbox.size,0);
  assert.equal(runtime.afterTasks.length,0);
  assert.equal(runtime.providerPolls,0);
  assert.equal(runtime.dispatchCalls,0);
});

test("P0-05 queued cancellation wins before outbox send and releases once",async(t)=>{
  fixture(t);
  await accepted();
  const first=await cancellation.requestGenerationCancellation(OWNER_A,JOB_ID);
  assert.equal(first.ok,true);
  assert.equal(first.job.status,"cancelled");
  assert.equal(runtime.outbox.get(JOB_ID).status,"cancelled");
  assert.equal(runtime.releases,1);
  assert.equal(heldReservation(),false);
  await flushAfter();
  assert.equal(runtime.dispatchCalls,0,"cancelled outbox cannot send");
  const replay=await cancellation.requestGenerationCancellation(OWNER_A,JOB_ID);
  assert.equal(replay.ok,true);
  assert.equal(replay.job.status,"cancelled");
  assert.equal(runtime.releases,1);
  assert.equal(runtime.mediaWrites,0);
});

test("P0-05 running cancellation wins and provider DELETE is called once",async(t)=>{
  fixture(t);await dispatched();
  const cancelled=await cancellation.requestGenerationCancellation(OWNER_A,JOB_ID);
  assert.equal(cancelled.ok,true);
  assert.equal(cancelled.job.status,"cancelled");
  assert.equal(runtime.providerCancels,1);
  assert.equal(runtime.releases,1);
  assert.equal(heldReservation(),false);
  const race=await poll.pollGenerationJob(OWNER_A,JOB_ID);
  assert.equal(race.status,"cancelled");
  assert.equal(runtime.providerPolls,0);
});

test("P0-05 preparing legacy job permits cancellation through the guarded claim",async(t)=>{
  fixture(t);await dispatched();
  currentJob().status="preparing";
  const cancelled=await cancellation.requestGenerationCancellation(OWNER_A,JOB_ID);
  assert.equal(cancelled.ok,true);
  assert.equal(cancelled.job.status,"cancelled");
  assert.equal(runtime.providerCancels,1);
  assert.equal(runtime.releases,1);
});

test("P0-05 persisting and terminal jobs refuse new cancellation, no provider DELETE",async(t)=>{
  fixture(t);await dispatched();
  currentJob().status="persisting";
  const refused=await cancellation.requestGenerationCancellation(OWNER_A,JOB_ID);
  assert.equal(refused.ok,false);
  assert.equal(refused.error.code,"cancel_not_available");
  assert.equal(currentJob().status,"persisting");
  assert.equal(runtime.providerCancels,0);
  currentJob().status="failed";
  const again=await cancellation.requestGenerationCancellation(OWNER_A,JOB_ID);
  assert.equal(again.ok,false);
  assert.equal(runtime.providerCancels,0);
});

test("P0-05 provider 202 is pending without status or reservation mutation",async(t)=>{
  fixture(t,{providerOutcome:"pending"});await dispatched();
  const checked=await reconciliation.reconcileNativeGeneration(OWNER_A,JOB_ID);
  assert.equal(checked?.status,"running");
  assert.equal(runtime.mediaWrites,0);
  assert.equal(heldReservation(),true);
  assert.equal(runtime.providerPolls,1);
});

test("P0-05 503 retryable provider failure leaves job live and reservation held",async(t)=>{
  fixture(t,{providerOutcome:"retryable"});await dispatched();
  await assert.rejects(()=>reconciliation.reconcileNativeGeneration(OWNER_A,JOB_ID),
    /provider|temporarily|unavailable/i);
  assert.equal(currentJob().status,"running");
  assert.equal(heldReservation(),true);
  assert.equal(runtime.mediaWrites,0);
});

test("P0-05 provider terminal 422 marks failed and settles admission",async(t)=>{
  fixture(t,{providerOutcome:"terminal"});await dispatched();
  const result=await reconciliation.reconcileNativeGeneration(OWNER_A,JOB_ID);
  assert.equal(result?.status,"failed");
  assert.equal(result.error?.code,"generation_failed");
  assert.equal(runtime.releases,1);
  assert.equal(runtime.mediaWrites,0);
});

test("P0-05 FIBO_PROCESS_EXITED 409 becomes terminal generation_failed",async(t)=>{
  fixture(t,{providerOutcome:"process-exited"});await dispatched();
  const result=await reconciliation.reconcileNativeGeneration(OWNER_A,JOB_ID);
  assert.equal(result?.status,"failed");
  assert.equal(result.error?.code,"generation_failed");
  assert.equal(currentJob().error_code,"generation_failed");
  assert.equal(runtime.releases,1);
});

test("P0-05 ambiguous provider 404 is unresolved then fails at exactly 2h",async(t)=>{
  fixture(t,{providerOutcome:"ambiguous"});await dispatched();
  const unresolved=await reconciliation.reconcileNativeGeneration(OWNER_A,JOB_ID);
  assert.equal(unresolved?.status,"running");
  assert.equal(heldReservation(),true);
  setAge(2*60*60*1000 - 1);
  const justBefore=await reconciliation.reconcileNativeGeneration(OWNER_A,JOB_ID);
  assert.equal(justBefore?.status,"running");
  setAge(2*60*60*1000);
  const final=await reconciliation.reconcileNativeGeneration(OWNER_A,JOB_ID);
  assert.equal(final?.status,"failed");
  assert.equal(final.error?.code,"generation_provider_stalled");
  assert.equal(runtime.releases,1);
});

test("P0-05 stale missing-dispatch fallback fails after 15min, without provider call",async(t)=>{
  fixture(t);await dispatched();
  currentJob().worker_id=null;
  currentJob().provider_job_id=null;
  setAge(15*60*1000);
  const result=await reconciliation.reconcileNativeGeneration(OWNER_A,JOB_ID);
  assert.equal(result?.status,"failed");
  assert.equal(result.error?.code,"generation_orchestration_stalled");
  assert.equal(runtime.providerPolls,0);
  assert.equal(runtime.releases,1);
});

test("P0-05 owner-return recovers persisted R2 bytes after interruption, without re-generation",async(t)=>{
  fixture(t,{finalizationFault:"after-primary-write"});await dispatched();
  await assert.rejects(()=>reconciliation.reconcileNativeGeneration(OWNER_A,JOB_ID),/OFFLINE_FINALIZATION_FAULT/);
  assert.equal(currentJob().status,"persisting");
  assert.equal(runtime.mediaWrites,0);
  assert.equal(runtime.r2.size,1,"primary object was written before simulated interruption");
  const priorPolls=runtime.providerPolls;
  const settled=await ownerReturn.settleOwnerGenerationWithinResponse(OWNER_A,"activity");
  assert.equal(settled,true);
  assert.equal(currentJob().status,"succeeded");
  assert.equal(runtime.mediaWrites,1);
  assert.equal(runtime.providerPolls,priorPolls,"persisting recovered from durable R2 without provider polling");
  assert.equal(runtime.releases,1);
  const second=await ownerReturn.settleOwnerGenerationWithinResponse(OWNER_A,"activity");
  assert.equal(second,false,"owner-return candidate should not reselect terminal jobs");
  assert.equal(runtime.releases,1);
});

test("P0-05 duplicate callback and repeated poll cannot write duplicate output or release twice",async(t)=>{
  fixture(t);await dispatched();
  await reconciliation.reconcileNativeGeneration(OWNER_A,JOB_ID);
  assert.equal(currentJob().status,"succeeded");
  const before={writes:runtime.mediaWrites,storage:runtime.r2Writes,polls:runtime.providerPolls,releases:runtime.releases};
  for(let i=0;i<3;i++){
    const again=await reconciliation.reconcileNativeGeneration(OWNER_A,JOB_ID);
    assert.equal(again.status,"succeeded");
  }
  assert.equal(runtime.mediaWrites,before.writes);
  assert.equal(runtime.r2Writes,before.storage);
  assert.equal(runtime.providerPolls,before.polls);
  assert.equal(runtime.releases,before.releases);
});

test("P0-05 repeated outbox wake is idempotent and does not dispatch a second provider call",async(t)=>{
  fixture(t);await dispatched();
  await native.wakeFiboDispatcher();
  assert.equal(runtime.dispatchCalls,1);
  assert.equal(runtime.wakeCalls,2);
  assert.equal(runtime.outbox.get(JOB_ID).status,"dispatched");
});

test("P0-05 ambiguous outbox dispatch keeps queued state and blocks premature retry",async(t)=>{
  fixture(t,{skipDispatch:true});await accepted();await flushAfter();
  assert.equal(currentJob().status,"queued");
  assert.equal(runtime.dispatchCalls,0);
  assert.equal(runtime.mediaWrites,0);
  assert.equal(heldReservation(),true);
});

test("P0-05 an unrelated owner's job ID never returns the stored A job",async(t)=>{
  fixture(t);await dispatched();
  const foreign=await poll.pollGenerationJob(OWNER_B,JOB_ID);
  assert.equal(foreign,null);
  assert.equal(runtime.mediaWrites,0);
  assert.equal(heldReservation(),true);
});

test("P0-05 owner-scoped source lookup accepts ready image and rejects missing or failed source",async(t)=>{
  fixture(t);
  const sourceId="30000000-0000-4000-8000-000000000001";
  const withReference={...request,inputs:[{alias:"image1",role:"primary-image",source:{type:"temporary-source",id:sourceId}}]};
  assert.equal(await submission.generationImageInputsAvailable(OWNER_A,withReference),false);
  runtime.references.set(sourceId,{id:sourceId,owner_id:OWNER_A,mime_type:"image/png",status:"ready",metadata:null});
  assert.equal(await submission.generationImageInputsAvailable(OWNER_A,withReference),true);
  runtime.references.get(sourceId).status="failed";
  assert.equal(await submission.generationImageInputsAvailable(OWNER_A,withReference),false);
  assert.equal(runtime.traces.every(x=>x.side==="db"),true);
});

test("P0-05 unavailable owner-scoped media source or mask fails admission before provider",async(t)=>{
  fixture(t);
  const mediaRequest={...request,inputs:[{alias:"image1",role:"primary-image",source:{type:"media-asset",id:JOB_ID}}]};
  assert.equal(await submission.generationImageInputsAvailable(OWNER_A,mediaRequest),false);
  const masked={...request,mask:{id:"30000000-0000-4000-8000-000000000001"}};
  assert.equal(await submission.generationImageInputsAvailable(OWNER_A,masked),false);
  assert.equal(runtime.providerPolls,0);
  assert.equal(runtime.jobs.size,0);
});
test("P0-05 cancelling retries an unconfirmed provider DELETE and settles only once",async(t)=>{
  fixture(t,{cancelOutcome:"retryable"});
  await dispatched();
  const first=await cancellation.requestGenerationCancellation(OWNER_A,JOB_ID);
  assert.equal(first.ok,true);
  assert.equal(first.job.status,"cancelling");
  assert.equal(currentJob().status,"cancelling");
  assert.equal(heldReservation(),true);
  assert.equal(runtime.releases,0);
  assert.equal(runtime.providerCancels,1);
  runtime.cancelOutcome="confirmed";
  const second=await cancellation.requestGenerationCancellation(OWNER_A,JOB_ID);
  assert.equal(second.ok,true);
  assert.equal(second.job.status,"cancelled");
  assert.equal(runtime.releases,1);
  assert.equal(runtime.providerCancels,2);
  assert.equal(heldReservation(),false);
  const replay=await cancellation.requestGenerationCancellation(OWNER_A,JOB_ID);
  assert.equal(replay.job.status,"cancelled");
  assert.equal(runtime.releases,1);
  assert.equal(runtime.providerCancels,2);
});
test("P0-05 lost wake response after accepted dispatch cannot duplicate provider dispatch",async(t)=>{
  fixture(t,{wakeResponseLost:true});
  await accepted();
  await flushAfter();
  assert.equal(currentJob().status,"running");
  assert.equal(runtime.outbox.get(JOB_ID).status,"dispatched");
  assert.equal(runtime.dispatchCalls,1);
  assert.equal(runtime.wakeCalls,1);
  assert.equal(heldReservation(),true);
  await native.wakeFiboDispatcher();
  assert.equal(runtime.wakeCalls,2);
  assert.equal(runtime.dispatchCalls,1);
  const result=await reconciliation.reconcileNativeGeneration(OWNER_A,JOB_ID);
  assert.equal(result.status,"succeeded");
  assert.equal(runtime.mediaWrites,1);
  assert.equal(runtime.releases,1);
});

test("P0-05 failed wake before provider acceptance leaves durable intent queued",async(t)=>{
  fixture(t,{wakeFailure:true});
  await accepted();
  await flushAfter();
  assert.equal(currentJob().status,"queued");
  assert.equal(runtime.outbox.get(JOB_ID).status,"pending");
  assert.equal(runtime.dispatchCalls,0);
  assert.equal(runtime.wakeCalls,1);
  assert.equal(heldReservation(),true);
  runtime.wakeFailure=false;
  await native.wakeFiboDispatcher();
  assert.equal(runtime.dispatchCalls,1);
  assert.equal(currentJob().status,"running");
});

test("P0-05 overlapping reconciliation callbacks converge on one durable output",async(t)=>{
  fixture(t);
  await dispatched();
  await Promise.all([
    reconciliation.reconcileNativeGeneration(OWNER_A,JOB_ID),
    reconciliation.reconcileNativeGeneration(OWNER_A,JOB_ID),
  ]);
  assert.equal(currentJob().status,"succeeded");
  assert.equal(runtime.mediaWrites,1);
  assert.equal(runtime.r2.size,2);
  assert.equal(runtime.releases,1);
  assert.equal(heldReservation(),false);
});
test("P0-07 atomic success releases the bound slot within the terminal RPC",async(t)=>{
  fixture(t);await dispatched();
  const job=await reconciliation.reconcileNativeGeneration(OWNER_A,JOB_ID);
  assert.equal(job.status,"succeeded");
  assert.equal(runtime.atomicCommits,1);
  assert.equal(runtime.releases,1);
  assert.equal(heldReservation(),false);
  assert.ok(runtime.traces.some(x=>x.table==="rpc/renderlab_terminalize_generation_and_release"
    && x.body?.p_terminal_status==="succeeded"));
  const atomicIndex=runtime.traces.findIndex(x=>x.table==="rpc/renderlab_terminalize_generation_and_release");
  const cleanupIndex=runtime.traces.findIndex(x=>x.table==="generation_admission_reservations"
    && x.method==="PATCH");
  assert.ok(atomicIndex>=0 && (cleanupIndex<0 || atomicIndex<cleanupIndex),
    "the atomic commit must precede any optional legacy owner-return cleanup");
  assert.equal(runtime.releases,1,"cleanup cannot release a slot already released atomically");
});

test("P0-07 in-flight cancellation terminalizes and releases atomically",async(t)=>{
  fixture(t);await dispatched();
  const response=await cancellation.requestGenerationCancellation(OWNER_A,JOB_ID);
  assert.equal(response.ok,true);
  assert.equal(response.job.status,"cancelled");
  assert.equal(runtime.atomicCommits,1);
  assert.equal(runtime.releases,1);
  assert.equal(runtime.providerCancels,1);
  assert.equal(heldReservation(),false);
});

test("P0-07 schema-not-installed is the only pre-migration fallback",async(t)=>{
  fixture(t,{atomicRpcAvailable:false});await dispatched();
  const result=await reconciliation.reconcileNativeGeneration(OWNER_A,JOB_ID);
  assert.equal(result.status,"succeeded");
  assert.ok(runtime.atomicAttempts>=1,"first probes the new RPC");
  assert.equal(runtime.atomicCommits,0);
  assert.equal(runtime.releases,1);
  assert.ok(runtime.traces.some(x=>x.table==="generation_jobs"&&x.method==="PATCH"
    &&x.body?.status==="succeeded"),"existing status-CAS stays available before migration");
});

test("P0-07 database failure is not misclassified as a missing-RPC fallback",async(t)=>{
  fixture(t,{atomicRpcFailure:true,providerOutcome:"process-exited"});await dispatched();
  await assert.rejects(()=>reconciliation.reconcileNativeGeneration(OWNER_A,JOB_ID),
    /Privileged database request is temporarily unavailable/);
  assert.equal(currentJob().status,"running");
  assert.equal(runtime.atomicCommits,0);
  assert.equal(runtime.releases,0);
  assert.equal(heldReservation(),true);
  assert.equal(runtime.traces.some(x=>x.table==="generation_jobs"&&x.method==="PATCH"
    &&x.body?.status==="failed"),false,"must not silently fall back on a failed installed RPC");
});
