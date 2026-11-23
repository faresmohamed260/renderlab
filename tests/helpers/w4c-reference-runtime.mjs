import {registerHooks} from "node:module";
export const A="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",B="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const SOURCE="11111111-1111-4111-8111-111111111111",OTHER="22222222-2222-4222-8222-222222222222";
const KEY=Symbol.for("w4c.references"),st=globalThis[KEY]={};
const NativeDate=Date;
globalThis.Date=class FixedDate extends NativeDate{constructor(...args){if(args.length)super(...args);else super("2026-11-23T12:00:00.000Z");}static now(){return NativeDate.parse("2026-11-23T12:00:00.000Z");}};
export function reset(changes={}){
 Object.assign(st,{calls:[],reserved:[],bound:[],released:[],deleted:[],signedRead:[],signedUpload:[],
  headKeys:[],readKeys:[],validated:[],masks:[],uuid:1,bindOk:true,signError:false,
  object:{sizeBytes:10,contentType:"image/png",etag:"etag-a"},bytes:Uint8Array.from({length:10},()=>1),
  verified:{mimeType:"image/png",sizeBytes:10,width:128,height:128},verifyError:false,maskError:false,
  db:async()=>[],...changes});
 return st;
}
export const state=reset();
const stub=code=>({url:"data:text/javascript,"+encodeURIComponent(code),shortCircuit:true});
const S='const S=()=>globalThis[Symbol.for("w4c.references")];';
registerHooks({resolve(spec,context,next){
 if(spec==="node:crypto"&&String(context.parentURL).includes("/src/server/media/reference-uploads.ts"))return stub(S+
  'export function randomUUID(){return "10000000-0000-4000-8000-"+String(S().uuid++).padStart(12,"0");}');
 if(spec==="@/server/data/supabase-rest")return stub(S+
  'export function isSupabaseConfigured(){return true;}'+
  'export async function supabaseRest(path,init={}){const url=new URL("https://db.invalid/rest/v1/"+path);const c={path,table:url.pathname.split("/").at(-1),query:url.searchParams,method:init.method||"GET",body:init.body?JSON.parse(init.body):null};S().calls.push(c);return S().db(c);}');
 if(spec==="@/server/media/image-upload-validation")return stub(S+
  'export async function inspectUploadedImageBytes(bytes,mime){S().validated.push([bytes.byteLength,mime]);if(S().verifyError)throw Error("BAD_IMAGE");return S().verified;}');
 if(spec==="@/server/media/fibo-mask-image-validation")return stub(S+
  'export async function inspectFiboMaskSelection(bytes){S().masks.push(bytes.byteLength);if(S().maskError)throw Error("EMPTY_MASK");return true;}');
 if(spec==="@/server/media/upload-admission")return stub(S+
  'export async function reserveUploadAdmission(owner,kind){S().reserved.push([owner,kind]);return {id:"reservation-a",kind};}'+
  'export async function bindUploadAdmission(owner,r,id){S().bound.push([owner,r.id,id]);return S().bindOk;}'+
  'export async function releaseUploadAdmission(owner,id){S().released.push([owner,id]);return true;}'+
  'export function injectUploadAdmissionSigningTestFault(){}');
 if(spec==="@/server/storage/r2")return stub(S+
  'export function isR2Configured(){return true;}'+
  'export async function createSignedReadUrl(key,seconds){S().signedRead.push([key,seconds]);return "https://signed.invalid/read";}'+
  'export async function createSignedUploadUrl(args){S().signedUpload.push(args);if(S().signError)throw Error("SECRET_PROVIDER_KEY");return "https://signed.invalid/write";}'+
  'export async function deleteR2Object(key){S().deleted.push(key);}'+
  'export async function headR2Object(key){S().headKeys.push(key);return S().object;}'+
  'export async function readR2Object(key){S().readKeys.push(key);return {contentType:S().object.contentType,bytes:S().bytes};}');
 if(spec.startsWith("@/"))return next(new URL("../../src/"+spec.slice(2)+".ts",import.meta.url).href,context);
 return next(spec,context);
}});
export const source=(extras={})=>({id:SOURCE,owner_id:A,storage_key:"sources/owner-a.png",filename:"portrait.png",mime_type:"image/png",size_bytes:10,width:128,height:128,status:"ready",metadata:{},...extras});
