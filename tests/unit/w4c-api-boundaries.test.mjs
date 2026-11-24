import assert from "node:assert/strict";
import test from "node:test";
import {s,reset,req,A,B,ID,OTHER} from "../helpers/w4c-route-runtime.mjs";
const {UploadAdmissionLimitError}=await import("@/server/media/upload-admission");
const ticket=await import("../../src/app/api/media/uploads/upload-tickets/route.ts");
const complete=await import("../../src/app/api/media/uploads/upload-completions/route.ts");
const download=await import("../../src/app/api/media/assets/[assetId]/download/route.ts");
const batch=await import("../../src/app/api/media/assets/batch-delete/route.ts");
const exportFile=await import("../../src/app/api/account/data-export/download/route.ts");
const profile=await import("../../src/server/account/account-profile-request.ts");
const valid={filename:"photo.png",mimeType:"image/png",sizeBytes:25*1024*1024};
const mediaDownload=id=>download.GET(new Request("https://app.invalid/download"),{params:Promise.resolve({assetId:id})});
const noSecret=value=>assert(!JSON.stringify(value).includes("SECRET_SQL"));
test("C profile: anonymous and MFA deny before account lookup",async()=>{
 reset({auth:null});assert.deepEqual(await profile.getRenderLabProfileRequestOwner(),{ok:false,status:401,code:"authentication_required"});
 assert.deepEqual(s.calls,[["fresh-auth"]]);
 reset({auth:{identity:{id:A},assurance:{challengeRequired:true}}});
 assert.deepEqual(await profile.getRenderLabProfileRequestOwner(),{ok:false,status:403,code:"mfa_required"});
 assert.equal(s.calls.some(c=>c[0]==="access"),false);
});
test("C profile: unknown, failed and admitted account map to safe results",async()=>{
 reset({access:null});assert.equal((await profile.getRenderLabProfileRequestOwner()).code,"renderlab_access_required");
 reset({access:Error("SECRET_SQL")});assert.deepEqual(await profile.getRenderLabProfileRequestOwner(),{ok:false,status:503,code:"account_profile_unavailable"});
 reset();assert.deepEqual(await profile.getRenderLabProfileRequestOwner(),{ok:true,ownerId:A});
 assert.deepEqual(s.calls,[["fresh-auth"],["access",A]]);
});
test("C tickets: capability, origin denial and malformed inputs never mint URL",async()=>{
 reset({configured:false});assert.deepEqual(await (await ticket.GET()).json(),{available:false});
 reset({blocked:true});assert.equal((await ticket.POST(req(valid))).status,403);assert.deepEqual(s.calls,[["origin"]]);
 for(const bad of [{...valid,sizeBytes:0},{...valid,sizeBytes:25*1024*1024+1},{...valid,mimeType:"image/svg+xml"},{...valid,filename:""},{...valid,displayName:"a".repeat(241)}]){
  reset();const r=await ticket.POST(req(bad));assert.equal(r.status,400);
  assert.equal(s.calls.some(c=>c[0]==="account"),false);
 }
});
test("C tickets: anonymous or missing backend must deny without admission",async()=>{
 reset({account:null});assert.equal((await ticket.POST(req(valid))).status,401);
 reset({configured:false});assert.equal((await ticket.POST(req(valid))).status,503);
 assert.equal(s.calls.some(c=>c[0]==="ticket"),false);
});
test("C tickets: actor-bound max byte admission and 201 result",async()=>{
 reset();const r=await ticket.POST(req(valid));assert.equal(r.status,201);
 assert.equal((await r.json()).ticket.method,"PUT");
 assert.deepEqual(s.calls.find(c=>c[0]==="ticket"),["ticket",A,valid]);
});
for(const code of ["upload_active_limit_reached","upload_rate_limit_reached"]){
 test("C tickets: limit denial "+code+" maps 429, without unauthorized upload",async()=>{
  reset({ticket:async()=>{throw new UploadAdmissionLimitError(code,"Admission threshold.");}});
  const r=await ticket.POST(req(valid));assert.equal(r.status,429);assert.equal((await r.json()).error.code,code);
 });
}
test("C tickets: opaque upstream error maps safe 503",async()=>{
 reset({ticket:async()=>{throw Error("SECRET_SQL");}});
 const r=await ticket.POST(req(valid));assert.equal(r.status,503);noSecret(await r.json());
});
test("C completion: origin, invalid ID, anonymous and missing backend deny early",async()=>{
 reset({blocked:true});assert.equal((await complete.POST(req({uploadId:ID}))).status,403);
 reset();assert.equal((await complete.POST(req({uploadId:"forged"}))).status,400);
 assert.equal(s.calls.some(c=>c[0]==="account"),false);
 reset({account:null});assert.equal((await complete.POST(req({uploadId:ID}))).status,401);
 reset({configured:false});assert.equal((await complete.POST(req({uploadId:ID}))).status,503);
 assert.equal(s.calls.some(c=>c[0]==="complete"),false);
});
test("C completion: foreign upload ID read is owner-bound and 404",async()=>{
 reset({complete:async()=>null});
 const r=await complete.POST(req({uploadId:OTHER}));assert.equal(r.status,404);
 assert.equal((await r.json()).error.code,"upload_not_found");
 assert.deepEqual(s.calls.find(c=>c[0]==="complete"),["complete",A,{uploadId:OTHER}]);
});
test("C completion: successful replay uses actor and optional dimensions",async()=>{
 reset();const r=await complete.POST(req({uploadId:ID,width:100,height:200}));
 assert.equal(r.status,200);assert.deepEqual(await r.json(),{ok:true,asset:{id:ID}});
 assert.deepEqual(s.calls.find(c=>c[0]==="complete"),["complete",A,{uploadId:ID,width:100,height:200}]);
});
test("C completion: failed verification redacts upstream on 409",async()=>{
 reset({complete:async()=>{throw Error("SECRET_SQL");}});
 const r=await complete.POST(req({uploadId:ID}));assert.equal(r.status,409);noSecret(await r.json());
});
test("C media download: unauthenticated and foreign never sign",async()=>{
 reset({account:null});assert.equal((await mediaDownload(ID)).status,401);
 assert.equal(s.calls.some(c=>c[0]==="get"),false);
 reset();const r=await mediaDownload(OTHER);assert.equal(r.status,404);
 assert.deepEqual(s.calls.find(c=>c[0]==="get"),["get",A,OTHER]);
 assert.equal(s.calls.some(c=>c[0]==="sign"),false);
});
test("C media download: actor-owned redirect is private and no-store",async()=>{
 reset();const r=await mediaDownload(ID);assert.equal(r.status,302);
 assert.equal(r.headers.get("location"),"https://signed.invalid/download");
 assert.equal(r.headers.get("cache-control"),"private, no-store");
 assert.deepEqual(s.calls.find(c=>c[0]==="sign"),["sign",ID]);
});
test("C media download: signing errors map sanitized 503",async()=>{
 reset({download:async()=>{throw Error("SECRET_SQL");}});
 const r=await mediaDownload(ID);assert.equal(r.status,503);noSecret(await r.json());
});
test("C export download: anonymous and MFA deny before signing",async()=>{
 reset({auth:null});assert.equal((await exportFile.GET()).status,401);
 assert.equal(s.calls.some(c=>c[0]==="export"),false);
 reset({auth:{identity:{id:A},assurance:{challengeRequired:true}}});
 assert.equal((await exportFile.GET()).status,403);assert.equal(s.calls.some(c=>c[0]==="export"),false);
});
test("C export download: actor-only redirect, expired 404 and safe 503",async()=>{
 reset();const r=await exportFile.GET();assert.equal(r.status,302);
 assert.equal(r.headers.get("location"),"https://signed.invalid/export");
 assert.deepEqual(s.calls.find(c=>c[0]==="export"),["export",A]);
 reset({exportDownload:async()=>null});assert.equal((await exportFile.GET()).status,404);
 reset({exportDownload:async()=>{throw Error("SECRET_SQL");}});
 const e=await exportFile.GET();assert.equal(e.status,503);noSecret(await e.json());
});
test("C batch deletion: denied origin/anonymous before deletion",async()=>{
 reset({blocked:true});assert.equal((await batch.POST(req({assetIds:[ID]}))).status,403);
 assert.deepEqual(s.calls,[["origin"]]);
 reset({account:null});assert.equal((await batch.POST(req({assetIds:[ID]}))).status,401);
 assert.equal(s.calls.some(c=>c[0]==="delete"),false);
});
test("C batch deletion: malformed, empty, overlimit and forged IDs rejected before delete",async()=>{
 for(const bad of [{},null,{assetIds:[]},{assetIds:Array.from({length:25},()=>ID)},{assetIds:["../../other"]}]){
  reset();const r=await batch.POST(req(bad));assert.equal(r.status,400);
  assert.equal(s.calls.some(c=>c[0]==="delete"),false);
 }
});
test("C batch deletion: unique IDs, mixed-owner not-found and correct cleanup counts",async()=>{
 reset({delete:async(owner,id)=>{assert.equal(owner,A);return id===ID?{cleanupPending:true}:null;}});
 const r=await batch.POST(req({assetIds:[ID,OTHER,ID]}));const body=await r.json();
 assert.equal(r.status,200);assert.deepEqual(body.summary,{requested:2,deleted:1,cleanupPending:1,failed:1});
 assert.deepEqual(s.calls.filter(c=>c[0]==="delete").map(c=>c[2]),[ID,OTHER]);
 assert.equal(body.results[1].error.code,"asset_not_found");
});
test("C batch deletion: one failing delete is sanitized and does not abort another",async()=>{
 reset({delete:async(owner,id)=>{if(id===OTHER)throw Error("SECRET_SQL");return {cleanupPending:false};}});
 const r=await batch.POST(req({assetIds:[OTHER,ID]}));const body=await r.json();
 assert.equal(r.status,200);assert.deepEqual(body.summary,{requested:2,deleted:1,cleanupPending:0,failed:1});
 assert.equal(body.results[0].error.code,"media_unavailable");noSecret(body);
});

const preferences = await import("../../src/app/api/account/preferences/route.ts");
for (const [method, invoke, service] of [
  ["GET", () => preferences.GET(), "preferences-get"],
  ["PUT", () => preferences.PUT(req({create:{imageAspectRatio:"1:1"}})), "preferences-put"],
  ["DELETE", () => preferences.DELETE(req(null)), "preferences-delete"],
]) {
  test("C F2 preferences " + method + " MFA challenge denies before account or preference I/O", async () => {
    reset({auth:{identity:{id:A},assurance:{challengeRequired:true}}});
    const response = await invoke();
    assert.equal(response.status,403);
    assert.equal((await response.json()).error.code,"mfa_required");
    assert.deepEqual(s.calls,method === "GET" ? [["fresh-auth"]] : [["origin"],["fresh-auth"]]);
    reset({access:{userId:A,status:"active"}});
    assert.equal((await invoke()).status,200);
    assert(s.calls.some(c=>c[0]===service&&c[1]===A));
  });
}
