import { registerHooks } from "node:module";
export const OWNER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const key=Symbol.for("renderlab.r12.account.writes");
const state=globalThis[key]={};
export function reset(changes={}) {
 Object.assign(state,{calls:[],auth:{identity:{id:OWNER},assurance:{challengeRequired:false}},
   access:{status:"active",userId:OWNER}, ...changes});
 return state;
}
export const s=reset();
const stub=src=>({url:"data:text/javascript,"+encodeURIComponent(src),shortCircuit:true});
const C='const S=()=>globalThis[Symbol.for("renderlab.r12.account.writes")];';
registerHooks({resolve(spec,ctx,next){
 if(spec==="server-only")return stub("export {};");
 if(spec==="next/server")return stub('export const NextRequest=Request;export const NextResponse={json:(b,i)=>Response.json(b,i),redirect:(url,status)=>new Response(null,{status,headers:{location:String(url)}})};');
 if(spec==="@/server/security/same-origin-mutation")return stub(C+'export function enforceSameOriginMutation(){S().calls.push(["origin"]);return null;}');
 if(spec==="@/lib/auth/mfa-assurance")return stub('export function isRenderLabMfaChallengeRequired(a){return Boolean(a?.challengeRequired);}');
 if(spec==="@/lib/supabase/server")return stub(C+'export async function getFreshCurrentRenderLabAuthentication(){S().calls.push(["auth"]);return S().auth;}');
 if(spec==="@/server/account/account-access")return stub(C+'export async function getRenderLabAccountAccess(id){S().calls.push(["access",id]);return S().access;}');
 if(spec==="@/server/account/account-profile")return stub(C+
   'export const renderLabAccountProfilePolicy={};'+
   'export async function getRenderLabAccountProfile(id){S().calls.push(["profile-read",id]);return {id};}'+
   'export async function updateRenderLabDisplayName(id,name){S().calls.push(["profile-write",id,name]);return {id};}'+
   'export async function getRenderLabAccountAvatarReadUrl(id){S().calls.push(["avatar-read",id]);return "https://signed.invalid/avatar";}'+
   'export async function removeRenderLabAccountAvatar(id){S().calls.push(["avatar-delete",id]);return {id};}'+
   'export async function replaceRenderLabAccountAvatar(id,image){S().calls.push(["avatar-write",id,image]);return {id};}');
 if(spec==="@/server/account/account-preferences")return stub(C+
   'export async function getRenderLabAccountPreferences(id){S().calls.push(["prefs-read",id]);return {id};}'+
   'export async function updateRenderLabAccountPreferences(id,p){S().calls.push(["prefs-write",id,p]);return {id};}'+
   'export async function resetRenderLabAccountPreferences(id){S().calls.push(["prefs-delete",id]);return {id};}');
 if(spec.startsWith("@/"))return next(new URL("../../src/"+spec.slice(2)+".ts",import.meta.url).href,ctx);
 return next(spec,ctx);
}});
export function request(body={displayName:"Test"}){return new Request("https://app.invalid/api/account",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(body)});}
