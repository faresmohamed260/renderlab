import assert from "node:assert/strict";
import test from "node:test";
import {A,B,S1,S2,E1,NOW,reset,st,lifecycleRow,exportRow} from "../helpers/w4c-account-runtime.mjs";
const lifecycle=await import("../../src/server/account/account-data-lifecycle.ts");
const sessions=await import("../../src/server/account/account-sessions.ts");
const row=(id=S1,at=NOW)=>({session_id:id,created_at:NOW,last_active_at:at,user_agent:"Mozilla/5.0"});
test("C sessions: malformed identity/session are denied without Auth RPC",async()=>{
 reset();assert.equal(await sessions.isRenderLabAuthSessionLive("bad",S1),null);
 assert.equal(await sessions.isRenderLabAuthSessionLive(A,"not-uuid"),null);
 assert.equal(await sessions.getRenderLabSessionSummaries(A,"not-uuid"),null);
 assert.deepEqual(st.authCalls,[]);
});
test("C sessions: only authenticated owner ID reaches privileged projection",async()=>{
 reset({sessionRows:[row()]});
 assert.equal(await sessions.isRenderLabAuthSessionLive(A,S1),true);
 assert.deepEqual(st.authCalls[0],["rpc","renderlab_auth_session_projection",{p_user_id:A}]);
 reset({sessionRows:[row(S2)]});
 assert.equal(await sessions.isRenderLabAuthSessionLive(A,S1),false);
});
test("C sessions: DB failure/invalid row fails closed, cannot forge live session",async()=>{
 reset({sessionError:true});assert.equal(await sessions.isRenderLabAuthSessionLive(A,S1),null);
 for(const bad of [{...row(),session_id:"forged"},{...row(),created_at:"not a date"},{...row(),last_active_at:"bad"},{...row(),user_agent:42}]){
  reset({sessionRows:[bad]});
  assert.equal(await sessions.isRenderLabAuthSessionLive(A,S1),null);
 }
});
test("C sessions: current session appears exactly once, sorted current first",async()=>{
 reset({sessionRows:[row(S2,"2026-11-23T12:02:00.000Z"),row(S1,"2026-11-23T10:00:00.000Z")]});
 const result=await sessions.getRenderLabSessionSummaries(A,S1);
 assert.equal(result.length,2);assert.equal(result[0].id,S1);assert.equal(result[0].isCurrent,true);
 assert.equal(result[1].id,S2);assert.equal(result[1].isCurrent,false);
 assert.equal(typeof result[0].clientLabel,"string");
});
test("C sessions: missing or duplicate current session is not a valid projection",async()=>{
 reset({sessionRows:[row(S2)]});assert.equal(await sessions.getRenderLabSessionSummaries(A,S1),null);
 reset({sessionRows:[row(S1),row(S1)]});assert.equal(await sessions.getRenderLabSessionSummaries(A,S1),null);
});
test("C password recheck: different Auth user denied and session cleaned up",async()=>{
 reset({passwordUserId:B});
 assert.equal(await lifecycle.verifyCurrentAccountPassword("a@example.invalid","password",A),false);
 assert(st.authCalls.some(c=>c[0]==="signOut"));
 reset();assert.equal(await lifecycle.verifyCurrentAccountPassword("a@example.invalid","password",A),true);
 assert(st.authCalls.some(c=>c[0]==="signOut"));
});
test("C account export: owner-scoped read and safe public state",async()=>{
 reset({db:async(c)=>c.table==="renderlab_account_exports"?[exportRow()]:[]});
 const item=await lifecycle.getPublicAccountExport(A);
 assert.deepEqual({id:item.id,status:item.status,schemaVersion:item.schemaVersion,sizeBytes:item.sizeBytes},
  {id:E1,status:"ready",schemaVersion:4,sizeBytes:80});
 assert.equal(st.calls[0].query.get("owner_id"),"eq."+A);
 assert(!JSON.stringify(item).includes("owner-a/export.json"));
});
test("C account export: already elapsed ready becomes expired without leaking storage key",()=>{
 reset();const item=lifecycle.accountExportPublicState(exportRow({expires_at:"2026-11-23T11:59:59.000Z"}));
 assert.equal(item.status,"expired");assert.equal(item.errorCode,null);
 assert.equal(lifecycle.accountExportPublicState(null),null);
});
test("C export request: owner deleting is denied before export scan",async()=>{
 reset({db:async()=>[lifecycleRow()]});
 await assert.rejects(()=>lifecycle.requestAccountExport(A),/account_deletion_in_progress/);
 assert.equal(st.calls.length,1);assert.equal(st.calls[0].query.get("user_id"),"eq."+A);
});
test("C export request: unexpired archive/pending work are idempotent",async()=>{
 for(const status of ["pending","processing","ready"]){
  reset({db:async(c)=>c.table==="renderlab_account_lifecycle"?[]:[exportRow({status})]});
  const got=await lifecycle.requestAccountExport(A);assert.equal(got.status,status);
  assert.equal(st.calls.filter(c=>c.method!=="GET").length,0);
  assert(st.calls.every(c=>c.query.get("owner_id")==="eq."+A||c.query.get("user_id")==="eq."+A));
 }
});
test("C export request: failed export restarts via owner+id CAS, no duplicate new row",async()=>{
 reset({db:async(c)=>{
  if(c.table==="renderlab_account_lifecycle")return [];
  if(c.method==="PATCH")return [exportRow({status:"pending"})];
  return [exportRow({status:"failed",error_code:"account_export_failed"})];
 }});
 const got=await lifecycle.requestAccountExport(A);assert.equal(got.status,"pending");
 const patch=st.calls.find(c=>c.method==="PATCH");
 assert.equal(patch.query.get("owner_id"),"eq."+A);
 assert.equal(patch.query.get("id"),"eq."+E1);assert.equal(patch.query.get("status"),"eq.failed");
 assert.equal(st.calls.some(c=>c.method==="POST"),false);
});
test("C export request: absent export is inserted for acting owner only",async()=>{
 reset({db:async(c)=>c.method==="POST"?[exportRow({status:"pending"})]:[]});
 assert.equal((await lifecycle.requestAccountExport(A)).status,"pending");
 const post=st.calls.find(c=>c.method==="POST");assert.deepEqual(post.body,{owner_id:A,status:"pending",schema_version:4});
});
test("C export download: only ready unexpired owner file signs, TTL bound to 300",async()=>{
 for(const r of [null,exportRow({status:"failed"}),exportRow({expires_at:"2026-11-23T11:00:00.000Z"}),exportRow({storage_key:null})]){
  reset({db:async()=>r?[r]:[]});assert.equal(await lifecycle.accountExportDownloadUrl(A),null);assert.equal(st.signed.length,0);
 }
 reset({db:async()=>[exportRow()]});
 assert.equal(await lifecycle.accountExportDownloadUrl(A),"https://signed.invalid/export");
 assert.equal(st.calls[0].query.get("owner_id"),"eq."+A);
 assert.equal(st.signed[0].expiresIn,300);assert.equal(st.signed[0].key,"owner-a/export.json");
 assert(st.signed[0].contentDisposition.includes(E1));
});
test("C export processing: missing, expired, ready, busy never claim/write",async()=>{
 for(const [r,result] of [[null,"missing"],[exportRow({status:"expired"}),"failed"],[exportRow(),"ready"],[exportRow({status:"processing"}),"busy"]]){
  reset({db:async()=>r?[r]:[]});
  assert.equal((await lifecycle.processAccountExport(E1)).state,result);
  assert.equal(st.calls.some(c=>c.method==="PATCH"),false);assert.equal(st.written.length,0);
 }
});
test("C export processing: lost CAS cannot build/write or create a second export",async()=>{
 reset({db:async(c)=>c.method==="PATCH"?[]:[exportRow({status:"pending"})]});
 assert.equal((await lifecycle.processAccountExport(E1)).state,"busy");assert.equal(st.written.length,0);
});
test("C export processing: deleting owner fails safely and CAS error scoped to same owner",async()=>{
 reset({db:async(c)=>{
  if(c.table==="renderlab_account_exports"&&c.method==="GET")return [exportRow({status:"pending"})];
  if(c.table==="renderlab_account_exports"&&c.method==="PATCH"&&c.body.status==="processing")return [exportRow({status:"processing"})];
  if(c.table==="renderlab_account_lifecycle")return [lifecycleRow()];
  return [];
 }});
 const result=await lifecycle.processAccountExport(E1);assert.deepEqual(result,{state:"failed",code:"account_deletion_in_progress"});
 const patches=st.calls.filter(c=>c.method==="PATCH");assert.equal(patches.length,2);
 assert(patches.every(c=>c.query.get("owner_id")==="eq."+A));
 assert.equal(st.written.length,0);
});
test("C deletion initiation: RPC binds acting user, no client-provided other owner",async()=>{
 reset({db:async(c)=>c.path==="rpc/renderlab_begin_account_deletion"?[lifecycleRow()]:[]});
 const row=await lifecycle.beginAccountDeletion(A);assert.equal(row.user_id,A);
 assert.deepEqual(st.calls[0].body,{p_user_id:A});
});
test("C deletion processing: missing lifecycle never touches storage/Auth",async()=>{
 reset();assert.deepEqual(await lifecycle.processAccountDeletion(A),{state:"missing"});
 assert.equal(st.deleted.length,0);assert.deepEqual(st.authCalls,[]);
});
test("C deletion processing: active job prompts cancellation, no premature purge",async()=>{
 reset({db:async(c)=>c.table==="renderlab_account_lifecycle"?[lifecycleRow()]:
  c.table==="generation_jobs"?[{id:S1,status:"queued"}]:[]});
 const result=await lifecycle.processAccountDeletion(A);
 assert.deepEqual(result,{state:"active-jobs",activeJobs:1});
 assert.deepEqual(st.cancelled,[["cancel",A,S1]]);
 assert.equal(st.deleted.length,0);
});
test("C deletion processing: quiescence guard precedes irreversible storage sweep",async()=>{
 reset({db:async(c)=>c.table==="renderlab_account_lifecycle"?[lifecycleRow({quiescence_until:"2026-11-23T12:01:00.000Z"})]:[]});
 const result=await lifecycle.processAccountDeletion(A);
 assert.deepEqual(result,{state:"quiescing",quiescenceUntil:"2026-11-23T12:01:00.000Z"});
 assert.equal(st.deleted.length,0);assert.equal(st.authCalls.some(c=>c[0]==="deleteUser"),false);
});
test("C deletion processing: storage residue fails closed, records safe retry",async()=>{
 reset({exists:true,db:async(c)=>{
  if(c.table==="renderlab_account_lifecycle"&&c.method==="GET")return [lifecycleRow()];
  if(c.table==="renderlab_account_lifecycle"&&c.method==="PATCH")return [{retry_count:1}];
  return [];
 }});
 const result=await lifecycle.processAccountDeletion(A);
 assert.deepEqual(result,{state:"retry",code:"account_storage_residue"});
 assert.equal(st.authCalls.some(c=>c[0]==="deleteUser"),false);
 const retry=st.calls.find(c=>c.table==="renderlab_account_lifecycle"&&c.method==="PATCH");
 assert.equal(retry.query.get("user_id"),"eq."+A);
 assert.equal(retry.body.last_error_code,"account_storage_residue");
});
test("C deletion processing: zero residue purges owner avatar and deletes Auth identity last",async()=>{
 reset({db:async(c)=>c.table==="renderlab_account_lifecycle"?[lifecycleRow()]:[]});
 const result=await lifecycle.processAccountDeletion(A);
 assert.deepEqual(result,{state:"complete"});
 assert.deepEqual(st.deleted,["avatar/"+A]);
 assert.deepEqual(st.authCalls.filter(c=>c[0]==="deleteUser"),[["deleteUser",A]]);
 assert(st.calls.some(c=>c.path==="rpc/renderlab_finalize_account_product_deletion"));
 assert(st.diagnostics.some(c=>c.phase==="deletion-complete"));
});
test("C maintenance: stale processing failure and scan caps are bounded",async()=>{
 reset({db:async()=>[]});
 const result=await lifecycle.runAccountDataLifecycleMaintenance(999);
 assert.deepEqual(result.exports,{scanned:0,ready:0,failed:0});
 assert.deepEqual(result.deletions,{scanned:0,complete:0,retry:0});
 assert.equal(st.calls.find(c=>c.table==="renderlab_account_exports"&&c.method==="PATCH").body.error_code,"account_export_interrupted");
 assert(st.calls.filter(c=>c.query.has("limit")).every(c=>Number(c.query.get("limit"))<=8));
});
