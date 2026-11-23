import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

// PR A: run red baseline with RENDERLAB_SECURITY_SENTINEL_ENFORCE=1.
// Skip expected failures on tests-only merge; PR B removes this guard.
const pendingFix = false; // P0-03a PR B: sentinel assertions are mandatory.
const pendingReason = "P0-03a expected failure before sanitizer PR B";
const verify = (name, fn) => test(name, { skip: pendingFix ? pendingReason : false }, fn);
const markers = ["SQL_DETAIL_SENTINEL", "PRIVILEGED_TOKEN_SENTINEL", "OWNER_B_SENTINEL"];
const sentinel = markers.join(" | ");
const ownerId = "10000000-0000-4000-8000-000000000000";
const id = "20000000-0000-4000-8000-000000000000";
function stub(source) { return { url: "data:text/javascript," + encodeURIComponent(source), shortCircuit: true }; }
registerHooks({
  resolve(spec, context, next) {
    if (spec === "server-only") return stub("export {};");
    if (spec === "next/server") return stub("export const NextResponse=Response;");
    if (spec === "@supabase/supabase-js") return stub("export function createClient(){return {auth:{admin:{getUserById:async()=>({data:{user:null},error:null})}}}};");
    if (spec === "@/lib/supabase/config") return stub("export function getSupabaseAuthConfig(){return {url: 'https://db.example.invalid'};}");
    if (spec === "@/lib/supabase/server") return stub("export async function getCurrentRenderLabAccount(){return {id:" + JSON.stringify(ownerId) + "};}");
    if (spec === "@/server/security/same-origin-mutation") return stub("export function enforceSameOriginMutation(){return null;}");
    if (spec === "@/server/generation/poll-generation") return stub("export async function pollGenerationJob(){throw Error(" + JSON.stringify(sentinel) + ");}");
    if (spec === "@/server/media/media-assets") return stub(
      "const failure=" + JSON.stringify(sentinel) + ";"
      + "export async function getMediaAsset(){throw Error(failure);}"
      + "export async function getMediaAssetDownloadUrl(){throw Error(failure);}"
      + "export async function renameMediaAsset(){throw Error(failure);}"
      + "export async function deleteMediaAsset(){throw Error(failure);}"
      + "export function publicMediaAsset(x){return x;}"
      + "export async function ensureMediaAssetThumbnail(){}"
      + "export async function getMediaAssetContentUrl(){throw Error(failure);}"
      + "export async function setMediaAssetFavorite(){throw Error(failure);}"
      + "export async function listMediaAssets(){throw Error(failure);}"
    );
    if (spec === "@/server/media/media-collections") return stub(
      "const failure=" + JSON.stringify(sentinel) + ";"
      + "export async function listMediaCollections(){throw Error(failure);}"
      + "export async function createMediaCollection(){throw Error(failure);}"
      + "export async function renameMediaCollection(){throw Error(failure);}"
      + "export async function deleteMediaCollection(){throw Error(failure);}"
      + "export async function setMediaCollectionMembership(){throw Error(failure);}"
      + "export function publicMediaCollection(x){return x;}"
    );
    if (spec === "@/server/media/upload-admission") return stub(
      "export async function reserveUploadAdmission(){return {id:'fixture-reservation',kind:'media'};}"
      + "export async function bindUploadAdmission(){return true;}"
      + "export async function releaseUploadAdmission(){return true;}"
      + "export function injectUploadAdmissionSigningTestFault(){}"
      + "export class UploadAdmissionLimitError extends Error {code='upload_active_limit_reached';}"
    );
    if (spec === "@/server/storage/r2") return stub(
      "export function isR2Configured(){return true;}"
      + "export async function createSignedUploadUrl(){throw Error(" + JSON.stringify(sentinel) + ");}"
      + "export async function deleteR2Object(){}"
      + "export async function headR2Object(){return null;}"
      + "export async function readR2Object(){return new Uint8Array();}"
    );
    if (spec === "@/server/media/image-upload-validation") return stub("export function inspectUploadedImageBytes(){return {ok:true};}");
    if (spec === "@/lib/api/media-upload-contract") return stub("export const maxMediaUploadBytes=10485760;export const isMediaUploadMimeType=()=>true;");
    if (spec === "@/server/account/account-data-lifecycle-test-faults") return stub("export function injectAccountDataLifecycleTestFault(){}");
    if (spec.startsWith("@/")) return next(new URL("../../src/" + spec.slice(2) + ".ts", import.meta.url).href, context);
    return next(spec, context);
  },
});
Object.assign(process.env,{
  SUPABASE_URL:"https://db.example.invalid",
  SUPABASE_SERVICE_ROLE_KEY:"offline-fixture-only",
  CLOUDFLARE_R2_ACCOUNT_ID:"offline-fixture-only",
  CLOUDFLARE_R2_ACCESS_KEY_ID:"offline-fixture-only",
  CLOUDFLARE_R2_SECRET_ACCESS_KEY:"offline-fixture-only",
  CLOUDFLARE_R2_BUCKET:"offline-fixture-only",
  GITHUB_ACTIONS:"true",
});
const db=await import("../../src/server/data/supabase-rest.ts");
const jobs=await import("../../src/app/api/generation/jobs/[jobId]/route.ts");
const media=await import("../../src/app/api/media/assets/[assetId]/route.ts");
const downloads=await import("../../src/app/api/media/assets/[assetId]/download/route.ts");
const uploads=await import("../../src/server/media/media-uploads.ts");
const mediaList=await import("../../src/app/api/media/assets/route.ts");
const thumbnails=await import("../../src/app/api/media/assets/[assetId]/thumbnail/route.ts");
const contentRoute=await import("../../src/app/api/media/assets/[assetId]/content/route.ts");
const favorites=await import("../../src/app/api/media/assets/[assetId]/favorite/route.ts");
const collectionList=await import("../../src/app/api/media/collections/route.ts");
const collection=await import("../../src/app/api/media/collections/[collectionId]/route.ts");
const membership=await import("../../src/app/api/media/collections/[collectionId]/items/[assetId]/route.ts");
function safe(value){
  const serialized=typeof value==="string"?value:JSON.stringify(value);
  for(const marker of markers)assert.ok(!serialized.includes(marker),"exposed marker "+marker);
}
function capture(t){
  const lines=[];
  for(const name of ["info","warn","error"])t.mock.method(console,name,(...args)=>lines.push(args));
  return lines;
}
async function expectError(response,code){
  assert.equal(response.status,503);
  const raw=await response.text();safe(raw);
  const j=JSON.parse(raw);assert.equal(j.error.code,code);
  assert.equal(typeof j.error.message,"string");
  assert.ok(j.error.message.length>3);
  safe(Object.fromEntries(response.headers));
}
verify("E1 privileged PostgREST response body cannot leak through typed error or logs",async t=>{
  const logs=capture(t);
  t.mock.method(globalThis,"fetch",async()=>new Response(sentinel,{status:503}));
  let error;
  try{await db.supabaseRest("media_assets?select=id")}catch(e){error=e}
  assert.ok(error);
  assert.equal(error.name,"SupabaseRestError");
  assert.equal(error.code,"supabase_backend_unavailable");
  assert.equal(error.upstreamStatus,503);
  assert.match(error.correlationId,/^[a-f0-9-]{36}$/i);
  safe({message:error.message,code:error.code,upstreamStatus:error.upstreamStatus,correlationId:error.correlationId});
  safe(logs);
});
verify("E2 generation GET uses safe stable 503",async t=>{
  const logs=capture(t);
  const r=await jobs.GET(new Request("https://example.invalid/api/generation/jobs/"+id),{params:Promise.resolve({jobId:id})});
  await expectError(r,"generation_backend_unavailable");
  safe(logs);
});
for(const method of ["GET","PATCH","DELETE"]){
  verify("E2 media asset "+method+" uses safe stable 503",async t=>{
    const logs=capture(t);
    const init=method==="PATCH"?{method,body:JSON.stringify({displayName:"Fixture"})}:{method};
    const r=await media[method](new Request("https://example.invalid/api/media/assets/"+id,init),{params:Promise.resolve({assetId:id})});
    await expectError(r,"media_unavailable");safe(logs);
  });
}
verify("E2 download uses stable code and generic message",async t=>{
  const logs=capture(t);
  const r=await downloads.GET(new Request("https://example.invalid/api/media/assets/"+id+"/download"),{params:Promise.resolve({assetId:id})});
  assert.equal(r.status,503);
  const body=await r.json();
  assert.equal(body.code,"media_unavailable");
  assert.equal(body.error,"Media download is unavailable.");
  safe(body);safe(Object.fromEntries(r.headers));safe(logs);
});
verify("E3 upload signing failure stores code only, not upstream text",async t=>{
  const logs=capture(t);let metadata;
  const request={filename:"test.png",displayName:"Test",mimeType:"image/png",sizeBytes:128};
  t.mock.method(globalThis,"fetch",async(url,init)=>{
    const u=new URL(url);assert.ok(u.pathname.endsWith("/rest/v1/media_upload_sessions"));
    if(init.method==="POST")return Response.json([{id,owner_id:ownerId,filename:"test.png",storage_key:"fake",status:"pending"}]);
    if(init.method==="PATCH"){metadata=JSON.parse(init.body).metadata;return Response.json([])}
    throw Error("Unexpected fake transport");
  });
  await assert.rejects(uploads.createMediaUploadTicket(ownerId,request));
  assert.ok(metadata);
  assert.equal(metadata.signingError,"upload_signing_failed");
  safe(metadata);safe(logs);
});
test("E3 alert fanout cannot include privileged upstream error body",async t=>{
  const log=capture(t);
  t.mock.method(globalThis,"fetch",async()=>new Response(sentinel,{status:503}));
  const m=await import("../../src/server/observability/operational-alert-notification.ts");
  let fanouts=0;
  const alert={alert_key:"synthetic",family:"generation_provider_degradation",severity:"warning",first_seen_at:"2026-11-23T00:00:00Z",last_seen_at:"2026-11-23T00:00:00Z",occurrence_count:1,last_event:"synthetic",last_code:"provider-unconfirmed",last_notified_at:null};
  const result=await m.sendOperationalAlertNotification(alert,{
    resolveRecipients:async()=>{await db.supabaseRest("renderlab_account_access?select=user_id");return []},
    sendEmail:async()=>{fanouts++;return true}
  });
  assert.equal(result.accepted,0);assert.equal(fanouts,0);safe(log);
});

test("E1 safe Postgres classifications survive, without raw DB error content", async t => {
  const messages = [
    [{ code: "P0001", message: "renderlab_generation_active_limit_reached " + sentinel }, "renderlab_generation_active_limit_reached"],
    [{ code: "23505", message: "duplicate " + sentinel }, "23505"],
    [{ code: "INVALID_" + sentinel, message: sentinel }, ""],
  ];
  for (const [body, expected] of messages) {
    t.mock.method(globalThis, "fetch", async () => Response.json(body, { status: 409 }));
    let err;try { await db.supabaseRest("fixture?select=id"); } catch (caught) { err = caught; }
    assert.equal(db.supabaseErrorClassification(err), expected);
    assert.equal(err.code, "supabase_backend_unavailable");
    safe({message:err.message, classification:db.supabaseErrorClassification(err), correlationId:err.correlationId});
    t.mock.restoreAll();
  }
});
for (const [label, handler] of [
  ["thumbnail GET", thumbnails.GET],
  ["content GET", contentRoute.GET],
]) {
  test("E2 " + label + " emits a stable, sanitized failure", async () => {
    const res = await handler(new Request("https://example.invalid/api/media/assets/" + id), {params:Promise.resolve({assetId:id})});
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(body.code, "media_unavailable");
    assert.equal(typeof body.error, "string");
    safe(body);safe(Object.fromEntries(res.headers));
  });
}
for (const method of ["PUT", "DELETE"]) {
  test("E2 media favorite " + method + " failure stays sanitized", async () => {
    const res = await favorites[method](new Request("https://example.invalid/api/media/assets/" + id + "/favorite",{method}),
      {params:Promise.resolve({assetId:id})});
    await expectError(res, "media_unavailable");
  });
}
test("E2 media library list privileged failure stays sanitized", async () => {
  const res = await mediaList.GET(new Request("https://example.invalid/api/media/assets"));
  await expectError(res, "media_unavailable");
});
for (const method of ["GET","POST"]) {
  test("E2 collections " + method + " privileged failure stays sanitized", async () => {
    const init = method==="POST"?{method,body:JSON.stringify({name:"Fixture"})}:{method};
    const res = await collectionList[method](new Request("https://example.invalid/api/media/collections",init));
    await expectError(res,"media_unavailable");
  });
}
for (const method of ["PATCH","DELETE"]) {
  test("E2 collection " + method + " privileged failure stays sanitized", async () => {
    const init=method==="PATCH"?{method,body:JSON.stringify({name:"Fixture"})}:{method};
    const res=await collection[method](new Request("https://example.invalid/api/media/collections/"+id,init),{params:Promise.resolve({collectionId:id})});
    await expectError(res,"media_unavailable");
  });
}
for (const method of ["PUT","DELETE"]) {
  test("E2 collection membership " + method + " privileged failure stays sanitized", async () => {
    const res=await membership[method](new Request("https://example.invalid/api/media/collections/"+id+"/items/"+ownerId,{method}),
      {params:Promise.resolve({collectionId:id,assetId:ownerId})});
    await expectError(res,"media_unavailable");
  });
}
