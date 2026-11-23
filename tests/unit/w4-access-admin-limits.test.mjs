import assert from "node:assert/strict";
import test from "node:test";
import { installRiskHarness, fakeDb, ownerA, ownerB, foreignId, fixedIso } from "../helpers/w4-fixture.mjs";

installRiskHarness();

const access = await import("../../src/server/account/account-access.ts");
const admission = await import("../../src/server/media/upload-admission.ts");
const settings = await import("../../src/server/admin/admin-settings.ts");
const admin = await import("../../src/server/admin/admin-operations.ts");
const oldest = await import("../../src/server/observability/oldest-active-job-store.ts");

const accessRow = (more = {}) => ({
  user_id: ownerA, role: "member", status: "active", generation_enabled: true,
  max_active_jobs: 1, max_jobs_per_hour: 5, created_at: fixedIso, updated_at: fixedIso, ...more,
});

test("W4 account access: only actor ID is queried and suspended status is preserved", async (t) => {
  const calls = fakeDb(t, ({query}) => {
    assert.equal(query.get("user_id"), "eq." + ownerA);
    return [accessRow({ status: "suspended", role: "admin", max_jobs_per_hour: 0 })];
  });
  assert.deepEqual(await access.getRenderLabAccountAccess(ownerA), {
    userId: ownerA, role: "admin", status: "suspended", generationEnabled: true,
    maxActiveJobs: 1, maxJobsPerHour: 0, createdAt: fixedIso, updatedAt: fixedIso,
  });
  assert.equal(calls.length, 1);
});

test("W4 invitation: missing email causes no privileged call; normalized email stays actor-bound", async (t) => {
  const calls = fakeDb(t, ({body,path}) => {
    assert.equal(path, "rpc/renderlab_claim_beta_invitation");
    assert.deepEqual(body, { p_user_id: ownerA, p_email: "friend@example.invalid" });
    return [accessRow()];
  });
  assert.equal(await access.claimRenderLabBetaInvitation({id: ownerA, email: "  "}), null);
  assert.equal(await access.claimRenderLabBetaInvitation({id: ownerA, email: null}), null);
  assert.equal(calls.length, 0);
  assert.equal((await access.claimRenderLabBetaInvitation({id: ownerA, email: " Friend@EXAMPLE.INVALID "}))?.userId, ownerA);
  assert.equal(calls.length, 1);
});

test("W4 invitation resolution: existing owner is never overwritten by claim", async (t) => {
  const calls = fakeDb(t, ({path}) => {
    assert.equal(path, "renderlab_account_access");
    return [accessRow()];
  });
  assert.equal((await access.resolveRenderLabAccountAccess({id: ownerA, email: "foreign@example.invalid"}))?.userId, ownerA);
  assert.equal(calls.length, 1);
});

test("W4 invitation resolution: absent owner invokes one scoped claim", async (t) => {
  const calls = fakeDb(t, ({path,body}) => path === "renderlab_account_access" ? [] :
    (assert.deepEqual(body, {p_user_id: ownerA, p_email:"friend@example.invalid"}), [accessRow()]));
  assert.equal((await access.resolveRenderLabAccountAccess({id: ownerA,email:"Friend@Example.Invalid"}))?.userId, ownerA);
  assert.deepEqual(calls.map(c => c.path), ["renderlab_account_access", "rpc/renderlab_claim_beta_invitation"]);
});

for (const [name, code, message] of [
  ["active cap", "renderlab_upload_active_limit_reached", "upload_active_limit_reached"],
  ["hourly cap", "renderlab_upload_rate_limit_reached", "upload_rate_limit_reached"],
]) {
  test("W4 upload admission: " + name + " maps to stable denial without upstream details", async (t) => {
    const calls = fakeDb(t, () => ({__dbError:code, status:429}));
    await assert.rejects(() => admission.reserveUploadAdmission(ownerA, "media"), (error) => {
      assert(error instanceof admission.UploadAdmissionLimitError);
      assert.equal(error.code, message);
      assert(!error.message.includes("SENSITIVE_UPSTREAM_DETAIL_SENTINEL"));
      return true;
    });
    assert.deepEqual(calls[0].body, {p_owner_id:ownerA,p_upload_kind:"media"});
  });
}

test("W4 upload admission: reserve + bind + release use actor owner and returned reservation identity", async (t) => {
  const calls = fakeDb(t, ({path}) =>
    path.includes("reserve_upload") ? [{reservation_id:"reservation-a"}] : true);
  const reservation = await admission.reserveUploadAdmission(ownerA, "reference");
  assert.deepEqual(reservation, {id:"reservation-a",kind:"reference"});
  assert.equal(await admission.bindUploadAdmission(ownerA,reservation,foreignId),true);
  assert.equal(await admission.releaseUploadAdmission(ownerA,reservation.id),true);
  assert.deepEqual(calls.map(c=>c.path),[
    "rpc/renderlab_reserve_upload_admission", "rpc/renderlab_bind_upload_admission",
    "rpc/renderlab_release_upload_admission",
  ]);
  assert.deepEqual(calls[1].body,{p_owner_id:ownerA,p_reservation_id:"reservation-a",p_upload_kind:"reference",p_resource_id:foreignId});
  assert.deepEqual(calls[2].body,{p_owner_id:ownerA,p_reservation_id:"reservation-a"});
});

test("W4 upload admission: failed bind/release fail closed, reserve missing ID never grants slot", async (t) => {
  const calls = fakeDb(t, ({path}) => path.includes("reserve_upload") ? [] : ({__dbError:"synthetic-failure",status:503}));
  await assert.rejects(() => admission.reserveUploadAdmission(ownerA,"media"),/not created/i);
  assert.equal(await admission.bindUploadAdmission(ownerA,{id:"reservation-b",kind:"media"},foreignId),false);
  assert.equal(await admission.releaseUploadAdmission(ownerA,"reservation-b"),false);
  assert.equal(calls.length,3);
});

test("W4 upload admission: test fault is opt-in and cannot trigger on ordinary filenames", () => {
  const original = process.env.RENDERLAB_TEST_UPLOAD_ADMISSION_FAULTS;
  try {
    delete process.env.RENDERLAB_TEST_UPLOAD_ADMISSION_FAULTS;
    admission.injectUploadAdmissionSigningTestFault("media","renderlab-ent004-media-signing-fault.png");
    process.env.RENDERLAB_TEST_UPLOAD_ADMISSION_FAULTS = "true";
    admission.injectUploadAdmissionSigningTestFault("media","normal.png");
    assert.throws(()=>admission.injectUploadAdmissionSigningTestFault("media","renderlab-ent004-media-signing-fault.png"),/Injected ENT-004/);
  } finally {
    if(original===undefined)delete process.env.RENDERLAB_TEST_UPLOAD_ADMISSION_FAULTS;
    else process.env.RENDERLAB_TEST_UPLOAD_ADMISSION_FAULTS=original;
  }
});

test("W4 admin settings: exact integer limit edges accepted, nonintegers/extra fields denied", () => {
  for(const maxActiveJobs of [1,4])for(const maxJobsPerHour of [1,120]) {
    assert.deepEqual(settings.validateAdminGenerationSettings({generationEnabled:false,maxActiveJobs,maxJobsPerHour}),
      {generationEnabled:false,maxActiveJobs,maxJobsPerHour});
  }
  for(const bad of [
    null, [], false, {}, {generationEnabled:"true",maxActiveJobs:1,maxJobsPerHour:1},
    {generationEnabled:true,maxActiveJobs:0,maxJobsPerHour:1},
    {generationEnabled:true,maxActiveJobs:5,maxJobsPerHour:1},
    {generationEnabled:true,maxActiveJobs:1.5,maxJobsPerHour:1},
    {generationEnabled:true,maxActiveJobs:1,maxJobsPerHour:0},
    {generationEnabled:true,maxActiveJobs:1,maxJobsPerHour:121},
    {generationEnabled:true,maxActiveJobs:1,maxJobsPerHour:1.1},
    {generationEnabled:true,maxActiveJobs:1,maxJobsPerHour:1,actorUserId:ownerB},
  ]) assert.throws(()=>settings.validateAdminGenerationSettings(bad),e=>e.code==="invalid_request");
});

test("W4 admin settings: only singleton is read, absent/settings-error never leak data", async (t) => {
  const calls = fakeDb(t, () => []);
  await assert.rejects(()=>settings.getAdminGenerationSettings(), e=>e.code==="admin_backend_unavailable");
  assert.equal(calls[0].query.get("singleton_id"),"eq.1");
});
test("W4 admin settings: actor-bound update success carries validated independent limits", async (t) => {
  const calls = fakeDb(t,()=>[{generation_enabled:false,max_active_jobs:4,max_jobs_per_hour:120,updated_at:fixedIso}]);
  const input=settings.validateAdminGenerationSettings({generationEnabled:false,maxActiveJobs:4,maxJobsPerHour:120});
  assert.deepEqual(await settings.updateAdminGenerationSettings(ownerA,input),
    {generationEnabled:false,maxActiveJobs:4,maxJobsPerHour:120,updatedAt:fixedIso});
  assert.deepEqual(calls[0].body,{p_actor_user_id:ownerA,p_generation_enabled:false,p_max_active_jobs:4,p_max_jobs_per_hour:120});
  assert.equal(calls[0].path,"rpc/renderlab_admin_set_beta_settings");
});
for(const [domain,expected] of [
  ["renderlab_admin_required","admin_access_required"],
  ["renderlab_admin_invalid_request","invalid_request"],
  ["upstream-db-unknown","admin_backend_unavailable"],
]) {
  test("W4 admin settings: domain "+domain+" becomes safe "+expected,async(t)=>{
    fakeDb(t,()=>({__dbError:domain,status:403}));
    await assert.rejects(()=>settings.updateAdminGenerationSettings(ownerA,{generationEnabled:true,maxActiveJobs:1,maxJobsPerHour:1}),e=>{
      assert.equal(e.code,expected);
      assert(!e.message.includes("SENSITIVE_UPSTREAM_DETAIL_SENTINEL"));
      return true;
    });
  });
}

test("W4 admin operations: malformed invitation address denied before privileged read",async(t)=>{
  const calls=fakeDb(t,()=>{throw Error("unexpected DB");});
  for(const email of ["bad","a@b","x".repeat(321)," first @example.com "])
    assert.throws(()=>admin.normalizeAdminInvitationEmail(email),e=>e.code==="invalid_request");
  assert.equal(admin.normalizeAdminInvitationEmail("  FRIEND@Example.Invalid "), "friend@example.invalid");
  assert.equal(calls.length,0);
});

test("W4 admin operations: account RPC separates acting admin/target and explicit patch intent",async(t)=>{
  const calls=fakeDb(t,()=>[accessRow({user_id:ownerB})]);
  const value=await admin.updateAdminAccount(ownerA,ownerB,{generationEnabled:false,maxJobsPerHour:10});
  assert.equal(value.userId,ownerB);
  assert.equal(value.generationEnabled,true); // Returned server row is authoritative; does not infer mutation from input.
  assert.equal(calls[0].body.p_actor_user_id,ownerA);
  assert.equal(calls[0].body.p_target_user_id,ownerB);
  assert.equal(calls[0].body.p_set_generation_enabled,true);
  assert.equal(calls[0].body.p_generation_enabled,false);
  assert.equal(calls[0].body.p_set_max_active_jobs,false);
  assert.equal(calls[0].body.p_max_active_jobs,null);
  assert.equal(calls[0].body.p_set_max_jobs_per_hour,true);
  assert.equal(calls[0].body.p_max_jobs_per_hour,10);
});
for(const [domain,code] of [
  ["renderlab_last_active_admin","last_active_admin"],
  ["renderlab_self_lockout","self_lockout"],
  ["renderlab_account_not_found","account_not_found"],
  ["renderlab_admin_required","admin_access_required"],
  ["renderlab_admin_invalid_request","invalid_request"],
  ["unrecognized-db-error","admin_backend_unavailable"],
]) {
  test("W4 admin operations: mutating account maps "+domain+" to "+code,async(t)=>{
    fakeDb(t,()=>({__dbError:domain,status:409}));
    await assert.rejects(()=>admin.updateAdminAccount(ownerA,ownerB,{role:"member"}),error=>{
      assert.equal(error.code,code);
      assert(!error.message.includes("SENSITIVE_UPSTREAM_DETAIL_SENTINEL"));
      return true;
    });
  });
}

test("W4 admin operations: unknown invitation cannot be revoked, existing is scoped by ID",async(t)=>{
  const calls=fakeDb(t,()=>[]);
  await assert.rejects(()=>admin.revokeAdminInvitation(foreignId),e=>e.code==="invitation_not_found");
  assert.equal(calls[0].method,"PATCH");
  assert.equal(calls[0].query.get("id"),"eq."+foreignId);
  assert.equal(calls[0].query.get("claimed_at"),"is.null");
  assert.equal(calls[0].query.get("revoked_at"),"is.null");
  assert.deepEqual(calls[0].body,{revoked_at:fixedIso});
});

test("W4 admin operations: pending invitations exclude claimed, revoked, and expired",async(t)=>{
  const calls=fakeDb(t,()=>[]);
  assert.deepEqual(await admin.listPendingAdminInvitations(),[]);
  assert.equal(calls[0].query.get("claimed_at"),"is.null");
  assert.equal(calls[0].query.get("revoked_at"),"is.null");
  assert.equal(calls[0].query.get("expires_at"),"gt."+fixedIso);
  assert.equal(calls[0].query.get("limit"),"100");
});

test("W4 oldest-job store: four one-row status reads honor isolated owner and return bounded age",async(t)=>{
  const calls=fakeDb(t,({query}) => query.get("status")==="eq.running" ? [{created_at:"2026-11-23T10:59:59.000Z"}] : []);
  const signal=await oldest.readOldestActiveJobAge(ownerA,Date.parse(fixedIso));
  assert.equal(signal.ageSeconds,3601);
  assert.equal(signal.status,"running");
  assert.equal(signal.warning,true);
  assert.equal(calls.length,4);
  for(const call of calls){
    assert.equal(call.query.get("owner_id"),"eq."+ownerA);
    assert.equal(call.query.get("limit"),"1");
    assert.equal(call.query.get("select"),"created_at");
  }
});

test("W4 admin invitation: invalid role is denied before privileged lookup",async(t)=>{
  const calls=fakeDb(t,()=>{throw Error("Unexpected service-role call");});
  await assert.rejects(()=>admin.createAdminInvitation({
    email:"new@example.invalid",role:"owner",redirectTo:"https://example.invalid/return",
  }),e=>e.code==="invalid_request");
  assert.equal(calls.length,0);
});

test("W4 admin invitation: live pending duplicate blocks delivery and second insert",async(t)=>{
  const calls=fakeDb(t,({path,query})=>{
    assert.equal(path,"renderlab_beta_invitations");
    assert.equal(query.get("normalized_email"),"eq.new@example.invalid");
    return [{id:foreignId,expires_at:"2026-11-23T13:00:00.000Z"}];
  });
  await assert.rejects(()=>admin.createAdminInvitation({
    email:"  NEW@EXAMPLE.INVALID ",role:"member",redirectTo:"https://example.invalid/return",
  }),e=>{
    assert.equal(e.code,"invitation_exists");
    return true;
  });
  assert.equal(calls.length,1,"A still-live duplicate must not create or send a second invite");
  assert.equal(calls[0].query.get("limit"),"1");
});

test("W4 admin invitation: uniqueness collision maps safe domain error, never sends invitation",async(t)=>{
  const calls=fakeDb(t,({method,path})=>{
    assert.equal(path,"renderlab_beta_invitations");
    if(method==="GET")return [];
    return {__dbError:"renderlab_beta_invitations_open_email_idx",status:409};
  });
  await assert.rejects(()=>admin.createAdminInvitation({
    email:"new@example.invalid",role:"admin",redirectTo:"https://example.invalid/return",
  }),e=>{
    assert.equal(e.code,"invitation_exists");
    assert(!e.message.includes("SENSITIVE_UPSTREAM_DETAIL_SENTINEL"));
    return true;
  });
  assert.deepEqual(calls.map(c=>c.method),["GET","POST"]);
  assert.deepEqual(calls[1].body,{
    normalized_email:"new@example.invalid",role:"admin",expires_at:"2026-11-23T13:00:00.000Z",
  });
});
