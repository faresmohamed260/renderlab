import {registerHooks,stripTypeScriptTypes} from "node:module";
import {readFileSync} from "node:fs";
export const A="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",B="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const ID="11111111-1111-4111-8111-111111111111",NOW="2026-11-23T12:00:00.000Z";
process.env.SUPABASE_URL="https://db.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY="synthetic-w4c-not-a-secret";
const KEY=Symbol.for("w4c.admin"),st=globalThis[KEY]={},NativeDate=Date;
globalThis.Date=class FakeDate extends NativeDate{constructor(...args){if(args.length)super(...args);else super(NativeDate.parse(NOW));}static now(){return NativeDate.parse(NOW);}};
export const accessRow=(rest={})=>({user_id:A,role:"member",status:"active",generation_enabled:true,max_active_jobs:1,max_jobs_per_hour:5,created_at:NOW,updated_at:NOW,...rest});
export const inviteRow=(rest={})=>({id:ID,normalized_email:"new@example.invalid",role:"member",expires_at:"2026-11-23T13:00:00.000Z",created_at:NOW,...rest});
export const healthBase={windowHours:24,since:"2026-11-22T12:00:00.000Z",activeJobs:0,statusCounts:{},operationCounts:{},errorCodeCounts:{}};
export function reset(changes={}){
 Object.assign(st,{calls:[],authCalls:[],delivered:[],authUser:{id:A,email:"a@example.invalid"},
  deliveryError:false,db:async(c)=>c.path==="rpc/renderlab_admin_health"?healthBase:c.path==="rpc/renderlab_generation_dispatch_health"?{oldestDueSeconds:0,expiredClaims:0,unresolved:0,scheduledHeartbeatAgeSeconds:1,scheduledHeartbeatMissing:false}:[],...changes});
 st.client={auth:{admin:{
  getUserById:async(id)=>{st.authCalls.push(["getUserById",id]);return {data:{user:st.authUser},error:null};},
  inviteUserByEmail:async(email,opts)=>{st.delivered.push({email,opts});if(st.deliveryError)throw Error("SECRET_SQL");return {data:{},error:null};},
 }}};
 return st;
}
export const state=reset();
const stub=code=>({url:"data:text/javascript,"+encodeURIComponent(code),shortCircuit:true});
const S='const S=()=>globalThis[Symbol.for("w4c.admin")];';
registerHooks({
 resolve(spec,context,next){
  if(spec==="server-only")return stub("export {};");
  if(spec==="@supabase/supabase-js")return stub(S+'export function createClient(){return S().client;}');
  if(spec==="@/server/data/supabase-rest")return stub(S+
   'export function isSupabaseConfigured(){return true;}'+
   'export function supabaseErrorClassification(e){return e?.classification||"";}'+
   'export async function supabaseRest(path,init={}){const url=new URL("https://db.invalid/rest/v1/"+path);const c={path,table:url.pathname.split("/").at(-1),query:url.searchParams,method:init.method||"GET",body:init.body?JSON.parse(init.body):null};S().calls.push(c);return S().db(c);}');
  if(spec==="@/server/admin/admin-settings")return stub(
   'export async function getAdminGenerationSettings(){return {generationEnabled:true,maxActiveJobs:1,maxJobsPerHour:5,updatedAt:"2026-11-23T12:00:00.000Z"};}');
  if(spec==="@/server/observability/oldest-active-job-store")return stub(
   'export async function readOldestActiveJobAge(){return null;}');
  if(spec==="@/server/maintenance/renderlab-maintenance")return stub(
   'export async function getRenderLabMaintenanceBacklog(){return {pendingJobs:0};}');
  if(spec==="@/server/observability/diagnostic-store")return stub(
   'export async function listRecentDiagnosticEvents(){return {lookbackHours:24,limit:20,eventFilter:null,levelFilter:null,codeFilter:null,truncated:false,rows:[]};}'+
   'export async function listOperationalAlerts(){return [];}'+
   'export function adminDiagnosticProjection(x){return x;}'+
   'export function adminOperationalAlertProjection(x){return x;}');
  if(spec.startsWith("@/"))return next(new URL("../../src/"+spec.slice(2)+".ts",import.meta.url).href,context);
  return next(spec,context);
 },
 load(url,context,nextLoad){
  if(url.endsWith("/src/server/admin/admin-operations.ts")){
   return {format:"module",source:stripTypeScriptTypes(readFileSync(new URL(url),"utf8"),{mode:"transform"}),shortCircuit:true};
  }
  return nextLoad(url,context);
 }
});
