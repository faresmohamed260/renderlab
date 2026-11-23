import {registerHooks} from "node:module";
export const A="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", B="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const ID="11111111-1111-4111-8111-111111111111", OTHER="22222222-2222-4222-8222-222222222222";
const KEY=Symbol.for("w4c.routes"),state=globalThis[KEY]={};
export function reset(changes={}) {
 Object.assign(state,{calls:[],account:{id:A},auth:{identity:{id:A},assurance:{challengeRequired:false}},
  access:{userId:A},blocked:false,configured:true,
  lookup:async(owner,id)=>owner===A&&id===ID?{id:ID}:null,
  download:async()=>"https://signed.invalid/download",
  exportDownload:async()=>"https://signed.invalid/export",
  delete:async(owner,id)=>owner===A&&id===ID?{cleanupPending:false}:null,
  ticket:async()=>({uploadId:ID,method:"PUT",uploadUrl:"https://signed.invalid/upload",expiresInSeconds:300}),
  complete:async()=>({id:ID}),...changes});
 return state;
}
export const s=reset();
const stub=code=>({url:"data:text/javascript,"+encodeURIComponent(code),shortCircuit:true});
const stateCode='const S=()=>globalThis[Symbol.for("w4c.routes")];';
registerHooks({resolve(spec,context,next){
 if(spec==="server-only")return stub("export {};");
 if(spec==="next/server")return stub('export const NextResponse={json:(b,i)=>Response.json(b,i),redirect:(u,s)=>new Response(null,{status:s,headers:{location:String(u)}})};');
 if(spec==="@/server/security/same-origin-mutation")return stub(stateCode+
   'export function enforceSameOriginMutation(){S().calls.push(["origin"]);return S().blocked?Response.json({error:{code:"origin_denied"}},{status:403}):null;}');
 if(spec==="@/lib/supabase/server")return stub(stateCode+
   'export async function getCurrentRenderLabAccount(){S().calls.push(["account"]);return S().account;}'+
   'export async function getFreshCurrentRenderLabAuthentication(){S().calls.push(["fresh-auth"]);return S().auth;}');
 if(spec==="@/lib/auth/mfa-assurance")return stub('export function isRenderLabMfaChallengeRequired(a){return Boolean(a?.challengeRequired);}');
 if(spec==="@/server/account/account-access")return stub(stateCode+
   'export async function getRenderLabAccountAccess(id){S().calls.push(["access",id]);if(S().access instanceof Error)throw S().access;return S().access;}');
 if(spec==="@/server/media/media-assets")return stub(stateCode+
   'export async function getMediaAsset(owner,id){S().calls.push(["get",owner,id]);return S().lookup(owner,id);}'+
   'export async function getMediaAssetDownloadUrl(a){S().calls.push(["sign",a.id]);return S().download(a);}'+
   'export async function deleteMediaAsset(owner,id){S().calls.push(["delete",owner,id]);return S().delete(owner,id);}'+
   'export function publicMediaAsset(a){return {id:a.id};}');
 if(spec==="@/server/media/media-uploads")return stub(stateCode+
   'export function isMediaUploadConfigured(){return S().configured;}'+
   'export async function createMediaUploadTicket(owner,req){S().calls.push(["ticket",owner,req]);return S().ticket(owner,req);}'+
   'export async function completeMediaUpload(owner,req){S().calls.push(["complete",owner,req]);return S().complete(owner,req);}');
 if(spec==="@/server/media/upload-admission")return stub(
   'export class UploadAdmissionLimitError extends Error{constructor(code,message){super(message);this.code=code;}}');
 if(spec==="@/server/account/account-data-lifecycle")return stub(stateCode+
   'export async function accountExportDownloadUrl(owner){S().calls.push(["export",owner]);return S().exportDownload(owner);}');
 if(spec.startsWith("@/"))return next(new URL("../../src/"+spec.slice(2)+".ts",import.meta.url).href,context);
 return next(spec,context);
}});
export function req(body){return new Request("https://app.invalid/api/test",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});}
