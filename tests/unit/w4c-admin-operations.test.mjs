import assert from "node:assert/strict";
import test from "node:test";
import {state,reset,A,B,ID,NOW,accessRow,inviteRow,healthBase} from "../helpers/w4c-admin-runtime.mjs";
const admin=await import("../../src/server/admin/admin-operations.ts");
test("C admin accounts: bounded global projection requires server-only service client; mismatched Auth is hidden",async()=>{
 reset({authUser:{id:B,email:"other@example.invalid"},db:async(c)=>c.table==="renderlab_account_access"?[accessRow()]:[]});
 const rows=await admin.listAdminAccounts();assert.equal(rows.length,1);
 assert.equal(rows[0].email,null,"Mismatched Auth ID must not label different member");
 assert.equal(rows[0].userId,A);assert.deepEqual(state.authCalls,[["getUserById",A]]);
 assert.equal(state.calls[0].query.get("limit"),"100");
 assert(!state.calls[0].query.get("select").includes("password"));
});
test("C admin accounts: correct Auth user preserves only intended email",async()=>{
 reset({db:async(c)=>c.table==="renderlab_account_access"?[accessRow()]:[]});
 const rows=await admin.listAdminAccounts();assert.equal(rows[0].email,"a@example.invalid");
 assert.equal(rows[0].generationEnabled,true);
});
test("C invitations: claims/revocations/expiry filters precede read",async()=>{
 reset({db:async(c)=>c.table==="renderlab_beta_invitations"?[inviteRow()]:[]});
 const result=await admin.listPendingAdminInvitations();assert.equal(result[0].email,"new@example.invalid");
 const q=state.calls[0].query;assert.equal(q.get("claimed_at"),"is.null");
 assert.equal(q.get("revoked_at"),"is.null");assert.equal(q.get("expires_at"),"gt."+NOW);
});
test("C invitation creation: fresh invite is normalized, expires in one hour, and uses generic delivery text",async()=>{
 reset({db:async(c)=>c.table==="renderlab_beta_invitations"?(c.method==="POST"?[inviteRow({...c.body})]:[]):[]});
 const actual=await admin.createAdminInvitation({email:"  NEW@EXAMPLE.INVALID ",role:"member",redirectTo:"https://app.invalid/return"});
 assert.equal(actual.invitation.email,"new@example.invalid");
 assert.equal(state.delivered[0].email,"new@example.invalid");
 assert.equal(state.delivered[0].opts.redirectTo,"https://app.invalid/return");
 const post=state.calls.find(c=>c.method==="POST");assert.equal(post.body.expires_at,"2026-11-23T13:00:00.000Z");
 assert.equal(actual.deliveryMessage.includes("already"),false);
 assert(!JSON.stringify(actual).includes("SECRET_SQL"));
});
test("C invitation creation: mail transport failure cannot become an identity oracle",async()=>{
 reset({deliveryError:true,db:async(c)=>c.method==="POST"?[inviteRow({...c.body})]:[]});
 const actual=await admin.createAdminInvitation({email:"new@example.invalid",role:"member",redirectTo:"https://app.invalid"});
 assert.equal(actual.invitation.id,ID);
 assert.match(actual.deliveryMessage,/If this address can receive/);
 assert(!JSON.stringify(actual).includes("SECRET_SQL"));
});
test("C invitation creation: expired outstanding invite is revoked before replacement",async()=>{
 reset({db:async(c)=>{
  if(c.method==="GET")return [{id:ID,expires_at:"2026-11-23T11:00:00.000Z"}];
  if(c.method==="POST")return [inviteRow({...c.body})];
  return null;
 }});
 const result=await admin.createAdminInvitation({email:"new@example.invalid",role:"member",redirectTo:"https://app.invalid"});
 assert.equal(result.invitation.id,ID);
 assert.deepEqual(state.calls.map(c=>c.method),["GET","PATCH","POST"]);
 assert.equal(state.calls[1].query.get("id"),"eq."+ID);
 assert.equal(state.calls[1].body.revoked_at,NOW);
});
test("C invitation revocation: only open, unclaimed ID can be revoked",async()=>{
 reset({db:async()=>[{id:ID}]});await admin.revokeAdminInvitation(ID);
 const c=state.calls[0];assert.equal(c.method,"PATCH");assert.equal(c.query.get("id"),"eq."+ID);
 assert.equal(c.query.get("claimed_at"),"is.null");assert.equal(c.query.get("revoked_at"),"is.null");
});
test("C admin Health: privileged actor RPC must succeed before global queries",async()=>{
 reset({db:async(c)=>{if(c.path==="rpc/renderlab_admin_health")throw Object.assign(Error("SECRET_SQL"),{classification:"renderlab_admin_required"});return [];}});
 await assert.rejects(()=>admin.getAdminHealth(A),e=>e.code==="admin_access_required");
 assert.deepEqual(state.calls.map(c=>c.path),["rpc/renderlab_admin_health"]);
 assert.deepEqual(state.calls[0].body,{p_actor_user_id:A,p_window_hours:24});
});
test("C admin Health: authorized aggregate scans bounded to 201 and no secret IDs projected",async()=>{
 reset();const value=await admin.getAdminHealth(A);
 assert.equal(value.windowHours,24);assert.equal(value.capacity.activeReservations.count,0);
 assert.equal(value.recentJobs.sampleSize,0);assert.equal(value.recentDiagnostics.limit,20);
 assert.deepEqual(state.calls[0].body,{p_actor_user_id:A,p_window_hours:24});
 assert.equal(state.calls.filter(c=>c.table==="generation_jobs").length,2);
 for(const c of state.calls.filter(c=>["generation_jobs","generation_admission_reservations"].includes(c.table))){
  assert.equal(c.query.get("limit"),"201");assert(!c.query.get("select").includes("prompt"));
  assert(!c.query.get("select").includes("owner_id"));
 }
});
test("C admin Health: scoped synthetic owner only; global fixture reads carry owner filter",async()=>{
 process.env.RENDERLAB_TEST_ADMIN_HEALTH_OWNER_SCOPE="true";
 process.env.RENDERLAB_TEST_ADMIN_HEALTH_OWNER_ID=A;
 try{
  reset();const value=await admin.getAdminHealth(A);assert.equal(value.activeJobs,0);
  for(const c of state.calls.filter(c=>["generation_jobs","generation_admission_reservations"].includes(c.table))){
   assert.equal(c.query.get("owner_id"),"eq."+A);
  }
 }finally{delete process.env.RENDERLAB_TEST_ADMIN_HEALTH_OWNER_SCOPE;delete process.env.RENDERLAB_TEST_ADMIN_HEALTH_OWNER_ID;}
});
test("C admin Health: bounded owner sample overflow fails closed, never returns partial results",async()=>{
 process.env.RENDERLAB_TEST_ADMIN_HEALTH_OWNER_SCOPE="true";
 process.env.RENDERLAB_TEST_ADMIN_HEALTH_OWNER_ID=A;
 try{
  reset({db:async(c)=>c.path==="rpc/renderlab_admin_health"?healthBase:
   c.table==="generation_jobs"?Array.from({length:201},()=>({status:"running",operation:"create-image",created_at:NOW,updated_at:NOW,completed_at:null,failover_history:[],error_code:null})):
   c.path==="rpc/renderlab_generation_dispatch_health"?{}:[]});
  await assert.rejects(()=>admin.getAdminHealth(A),e=>e.code==="admin_backend_unavailable");
 }finally{delete process.env.RENDERLAB_TEST_ADMIN_HEALTH_OWNER_SCOPE;delete process.env.RENDERLAB_TEST_ADMIN_HEALTH_OWNER_ID;}
});
test("C admin Health: upstream failure never forwards SQL details",async()=>{
 reset({db:async()=>{throw Error("SECRET_SQL");}});
 await assert.rejects(()=>admin.getAdminHealth(A),e=>{
  assert.equal(e.code,"admin_backend_unavailable");assert(!e.message.includes("SECRET_SQL"));return true;
 });
});
