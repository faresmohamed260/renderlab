import {registerHooks} from "node:module";
process.env.SUPABASE_SERVICE_ROLE_KEY="synthetic-w4c-service-key";
export const A="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",B="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const S1="11111111-1111-4111-8111-111111111111",S2="22222222-2222-4222-8222-222222222222",E1="33333333-3333-4333-8333-333333333333";
export const NOW="2026-11-23T12:00:00.000Z";
const NativeDate=Date,KEY=Symbol.for("w4c.account"),state=globalThis[KEY]={};
globalThis.Date=class FakeDate extends NativeDate{constructor(...args){if(args.length)super(...args);else super(NativeDate.parse(NOW));}static now(){return NativeDate.parse(NOW);}};
export function reset(changes={}){
 Object.assign(state,{calls:[],authCalls:[],signed:[],deleted:[],exists:false,written:[],diagnostics:[],cancelled:[],
  sessionRows:[],sessionError:false,authUser:{id:A,email:"a@example.invalid",created_at:NOW,identities:[]},
  passwordUserId:A,authDeleteError:null,
  notify:{state:"accepted",errorCode:null},profile:null,preferences:null,
  db:async()=>[],...changes});
 state.client={auth:{
  signInWithPassword:async(args)=>{state.authCalls.push(["signInWithPassword",args.email]);return {data:{user:state.passwordUserId?{id:state.passwordUserId}:null},error:null};},
  signOut:async()=>{state.authCalls.push(["signOut"]);return {error:null};},
  admin:{
   getUserById:async(id)=>{state.authCalls.push(["getUserById",id]);return {data:{user:state.authUser},error:null};},
   mfa:{listFactors:async({userId})=>{state.authCalls.push(["listFactors",userId]);return {data:{factors:[]},error:null};}},
   deleteUser:async(id)=>{state.authCalls.push(["deleteUser",id]);return {error:state.authDeleteError};},
  }
 },rpc:async(name,args)=>{state.authCalls.push(["rpc",name,args]);return {data:state.sessionRows,error:state.sessionError?{code:"synthetic"}:null};}};
 return state;
}
export const st=reset();
const stub=code=>({url:"data:text/javascript,"+encodeURIComponent(code),shortCircuit:true});
const S='const S=()=>globalThis[Symbol.for("w4c.account")];';
registerHooks({resolve(spec,context,next){
 if(spec==="server-only")return stub("export {};");
 if(spec==="@supabase/supabase-js")return stub(S+'export function createClient(){return S().client;}');
 if(spec==="@/lib/supabase/config")return stub('export function getSupabaseAuthConfig(){return {url:"https://db.invalid",publishableKey:"synthetic"};}');
 if(spec==="@/server/data/supabase-rest")return stub(S+
  'export async function supabaseRest(path,init={}){const url=new URL("https://db.invalid/rest/v1/"+path);const call={table:url.pathname.split("/").at(-1),path,method:init.method||"GET",query:url.searchParams,body:init.body?JSON.parse(init.body):null};S().calls.push(call);return S().db(call);}');
 if(spec==="@/server/account/account-deletion-notification")return stub(S+
  'export async function sendAccountDeletionNotification(email){S().authCalls.push(["notice",email]);return S().notify;}');
 if(spec==="@/server/account/account-profile")return stub(S+
  'export function accountProfileAvatarKey(id){return "avatar/"+id;}'+
  'export async function getRenderLabAccountProfileRow(){return S().profile;}'+
  'export async function runAccountAvatarPurgeMaintenance(limit){return {scanned:0,settled:0,failed:0};}');
 if(spec==="@/server/account/account-preferences")return stub(S+
  'export async function getRenderLabAccountPreferencesRow(){return S().preferences;}');
 if(spec==="@/server/generation/cancel-generation")return stub(S+
  'export async function requestGenerationCancellation(owner,id){S().cancelled.push(["cancel",owner,id]);}');
 if(spec==="@/server/generation/reconcile-generation")return stub(S+
  'export async function reconcileNativeGeneration(owner,id){S().cancelled.push(["reconcile",owner,id]);}');
 if(spec==="@/server/generation/generation-storage-keys")return stub('export function generationStorageCandidates(){return [];}');
 if(spec==="@/server/observability/diagnostics")return stub(S+
  'export function correlationIdForAccountLifecycle(userId){return "bounded";}'+
  'export async function emitDiagnosticEvent(event){S().diagnostics.push(event);}');
 if(spec==="@/server/account/account-data-lifecycle-test-faults")return stub('export function injectAccountDataLifecycleTestFault(){}');
 if(spec==="@/server/storage/r2")return stub(S+
  'export async function createSignedDownloadUrl(args){S().signed.push(args);return "https://signed.invalid/export";}'+
  'export async function deleteR2Object(key){S().deleted.push(key);}'+
  'export async function r2ObjectExists(key){return S().exists;}'+
  'export async function writeR2Object(args){S().written.push(args);}');
 if(spec.startsWith("@/"))return next(new URL("../../src/"+spec.slice(2)+".ts",import.meta.url).href,context);
 return next(spec,context);
}});
export const lifecycleRow=(overrides={})=>({user_id:A,state:"deleting",requested_at:NOW,quiescence_until:"2026-11-23T11:59:00.000Z",retry_count:0,last_error_code:null,last_attempt_at:null,notification_state:"accepted",notification_attempted_at:null,notification_error_code:null,updated_at:NOW,...overrides});
export const exportRow=(overrides={})=>({id:E1,owner_id:A,status:"ready",storage_key:"owner-a/export.json",content_type:"application/json",size_bytes:80,schema_version:4,requested_at:NOW,generated_at:NOW,expires_at:"2026-11-24T12:00:00.000Z",error_code:null,updated_at:NOW,...overrides});
