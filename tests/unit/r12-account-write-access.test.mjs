import assert from "node:assert/strict";
import test from "node:test";
import { reset, s, request } from "../helpers/r12-account-write-runtime.mjs";
const guard=await import("../../src/server/account/account-profile-request.ts");
const profile=await import("../../src/app/api/account/profile/route.ts");
const avatar=await import("../../src/app/api/account/profile/avatar/route.ts");
const prefs=await import("../../src/app/api/account/preferences/route.ts");

const mutations=[
  ["profile PATCH",()=>profile.PATCH(request()),"profile-write"],
  ["avatar POST",()=>avatar.POST(request()),"avatar-write"],
  ["avatar DELETE",()=>avatar.DELETE(request()),"avatar-delete"],
  ["preferences PUT",()=>prefs.PUT(request()),"prefs-write"],
  ["preferences DELETE",()=>prefs.DELETE(request()),"prefs-delete"],
];
for(const [name,invoke,mutation] of mutations){
 test("R12 suspended "+name+" blocked before write",async()=>{
  reset({access:{status:"suspended"}});
  const r=await invoke();
  assert.equal(r.status,403);
  assert.equal((await r.json()).error.code,"renderlab_access_required");
  assert.equal(s.calls.some(c=>c[0]===mutation),false);
  assert(s.calls.some(c=>c[0]==="access"));
 });
}
test("R12 profile guard enforces active status on writes, but keeps recovery read",async()=>{
 reset({access:{status:"suspended"}});
 assert.equal((await guard.getRenderLabProfileRequestOwner({requireActive:true})).status,403);
 assert.equal((await guard.getRenderLabProfileRequestOwner()).ok,true);
 reset({access:{status:"active"}});
 assert.equal((await guard.getRenderLabProfileRequestOwner({requireActive:true})).ok,true);
});
test("R12 suspended profile and preferences GET remain readable",async()=>{
 reset({access:{status:"suspended"}});
 assert.equal((await profile.GET()).status,200);
 assert.equal((await prefs.GET()).status,200);
 assert(!s.calls.some(c=>c[0].includes("-write")||c[0].includes("-delete")));
});
