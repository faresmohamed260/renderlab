import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

const ownerA="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ownerB="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const liveSessionId="11111111-1111-4111-8111-111111111111";
const s=globalThis[Symbol.for("renderlab.p003b.live-auth")] = {
  anonymous:false,userId:ownerA,claimsUserId:ownerA,sessionId:liveSessionId,
  userError:false,claimsError:false,sessionLive:true,role:"member",
  accountStatus:"active",accessFails:false,verifiedFactors:1,
  aal:"aal2",nextAal:"aal2",accessQueries:0,sessionChecks:0,
};
const stub=(body)=>({url:"data:text/javascript,"+encodeURIComponent(body),shortCircuit:true});
const stateSource='const s=globalThis[Symbol.for("renderlab.p003b.live-auth")];';
registerHooks({
  resolve(spec,context,next) {
    if(spec==="server-only")return stub("export {};");
    if(spec==="next/headers")return stub(
      "export async function cookies(){return {getAll(){return []},set(){}}};"
      + "export async function headers(){return new Headers({'authorization':'Bearer fake-user-token'});}");
    if(spec==="@supabase/ssr")return stub(stateSource
      + "export function createServerClient(){return {auth:{"
      + "getUser:async()=>({data:{user:{id:s.userId,email:'a@example.invalid',is_anonymous:s.anonymous}},error:s.userError?{code:'auth_failed'}:null}),"
      + "getClaims:async()=>({data:{claims:{sub:s.claimsUserId,session_id:s.sessionId}},error:s.claimsError?{code:'claims_failed'}:null}),"
      + "mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:s.aal,nextLevel:s.nextAal},error:null})}}}};");
    if(spec==="@supabase/supabase-js")return stub(stateSource
      + "export function createClient(){return {auth:{admin:{mfa:{listFactors:async()=>({data:{factors:Array.from({length:s.verifiedFactors},()=>({factor_type:'totp',status:'verified'}))},error:null})}}}};}");
    if(spec==="@/lib/supabase/config")return stub(
      "export function getSupabaseAuthConfig(){return {url:'https://db.example.invalid',publishableKey:'synthetic-publishable-key'};}");
    if(spec==="@/server/account/account-access")return stub(stateSource
      + "export function isRenderLabAccessEnforcementEnabled(){return true;}"
      + "export async function getRenderLabAccountAccess(id){s.accessQueries++;"
      + "if(s.accessFails)throw Error('SYNTHETIC_DATABASE_ERROR');"
      + "return id===s.userId?{userId:id,role:s.role,status:s.accountStatus}:null;}");
    if(spec==="@/server/account/account-sessions")return stub(stateSource
      + "export async function isRenderLabAuthSessionLive(userId,sessionId){s.sessionChecks++;return s.sessionLive&&userId===s.userId&&sessionId===s.sessionId;}");
    if(spec.startsWith("@/"))return next(new URL("../../src/"+spec.slice(2)+".ts",import.meta.url).href,context);
    return next(spec,context);
  }
});
Object.assign(process.env,{
  SUPABASE_URL:"https://db.example.invalid",
  SUPABASE_SERVICE_ROLE_KEY:"synthetic-service-role-fixture",
  GITHUB_ACTIONS:"true",
});
const identity=await import("../../src/lib/supabase/server.ts");
function reset(changes={}){
  Object.assign(s,{anonymous:false,userId:ownerA,claimsUserId:ownerA,sessionId:liveSessionId,
    userError:false,claimsError:false,sessionLive:true,role:"member",
    accountStatus:"active",accessFails:false,verifiedFactors:1,
    aal:"aal2",nextAal:"aal2",accessQueries:0,sessionChecks:0},changes);
}
const cases=[
 ["A1 anonymous Auth user", {anonymous:true},false,false],
 ["A1 missing authorized getUser", {userError:true},false,false],
 ["A2 suspended account", {accountStatus:"suspended"},false,true],
 ["A3 revoked session", {sessionLive:false},false,false],
 ["A3 forged claims subject from B", {claimsUserId:ownerB},false,false],
 ["A3 malformed session ID", {sessionId:"forged-session"},false,false],
 ["A3 invalid claims", {claimsError:true},false,false],
 ["A4 enrolled MFA, AAL1 cannot bypass challenge", {aal:"aal1",nextAal:"aal2"},false,false],
 ["A5 live AAL2 + admitted account", {},true,true],
 ["A5 fail-closed account-access database error", {accessFails:true},false,true],
];
for(const [name,overrides,allowed,queriesAccess] of cases){
  test("authenticated session gate "+name,async()=>{
    reset(overrides);
    const account=await identity.getCurrentRenderLabAccount();
    assert.equal(Boolean(account),allowed);
    if(allowed)assert.equal(account.id,ownerA);
    assert.equal(s.accessQueries>0,queriesAccess,"Access lookup order did not follow fresh Auth and MFA gates");
    if(!s.sessionLive && s.sessionChecks>0)assert.equal(account,null);
  });
}
