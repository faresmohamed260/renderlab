import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";

const owner="10000000-0000-4000-8000-000000000000";
const job="20000000-0000-4000-8000-000000000000";
const reservation="30000000-0000-4000-8000-000000000000";
const attempt="40000000-0000-4000-8000-000000000000";
const created="2026-11-23T20:00:00.000Z";
const request={prompt:"Test sphere",output:{kind:"image",aspectRatio:"1:1"},inputs:[]};
const accepted={id:job,owner_id:owner,status:"queued",operation:"create-image",
  output_kind:"image",created_at:created,updated_at:created,output_asset_ids:[]};
const key="test-r8-0123456789abcdef";
const symbol=Symbol.for("renderlab.r8.app.test");
const settleSymbol=Symbol.for("renderlab.r8.settle.test");

function stub(text){return {url:"data:text/javascript,"+encodeURIComponent(text),shortCircuit:true};}
registerHooks({
  resolve(specifier,context,nextResolve){
    if(specifier==="server-only")return stub("export {};");
    if(specifier==="next/server")return stub(
      "export const NextResponse=Response; export function after(callback) {"
      +"return globalThis[Symbol.for('renderlab.r8.app.test')].push(callback);}");
    if(specifier==="@/lib/supabase/server")return stub(
      "export async function getCurrentRenderLabAccount(){return {id:"+JSON.stringify(owner)+"};}");
    if(specifier==="@/server/generation/owner-generation-settlement")return stub(
      "export async function settleOwnerGenerationWithinResponse(owner,source){return globalThis[Symbol.for('renderlab.r8.settle.test')](owner,source);}");
    if(specifier.startsWith("@/"))return nextResolve(
      new URL("../../src/"+specifier.slice(2)+".ts",import.meta.url).href,context);
    return nextResolve(specifier,context);
  },
});
Object.assign(process.env,{
  SUPABASE_URL:"https://database.example.invalid",SUPABASE_SERVICE_ROLE_KEY:"offline-only",
  RENDERLAB_GENERATION_GATEWAY_URL:"https://fixture.modal.run",
  RENDERLAB_FIBO_MODAL_KEY:"offline-only",RENDERLAB_FIBO_MODAL_SECRET:"offline-only",
  RENDERLAB_FIBO_GENERATION:"1",
  CLOUDFLARE_R2_ACCOUNT_ID:"offline-only",CLOUDFLARE_R2_ACCESS_KEY_ID:"offline-only",
  CLOUDFLARE_R2_SECRET_ACCESS_KEY:"offline-only",CLOUDFLARE_R2_BUCKET:"offline-only",
  GITHUB_ACTIONS:"true",
});
const {POST}=await import("../../src/app/api/generation/jobs/route.ts");
function submit(idempotencyKey=key, body=request){
  const headers={origin:"https://renderlab.example.invalid","content-type":"application/json"};
  if(idempotencyKey!==null)headers["idempotency-key"]=idempotencyKey;
  return POST(new Request("https://renderlab.example.invalid/api/generation/jobs",{
    method:"POST",headers,body:JSON.stringify(body)
  }));
}
function fixture(t,{mode="accepted",lookup="accepted",read=true,settles=false}={}){
  const calls=[],tasks=[],settlements=[];
  let accepts=0;
  globalThis[settleSymbol]=(ownerId,source)=>{settlements.push({ownerId,source});return settles;};
  globalThis[symbol]=tasks;
  t.after(()=>{delete globalThis[symbol];delete globalThis[settleSymbol];});
  t.mock.method(console,"warn",()=>{});
  t.mock.method(console,"info",()=>{});
  t.mock.method(globalThis,"fetch",async(input,init)=>{
    const url=new URL(input), path=url.pathname;
    calls.push({path,method:init.method,body:init.body?JSON.parse(init.body):null});
    if(path.endsWith("/generation_admission_reservations"))return Response.json([]);
    if(path.endsWith("/rpc/renderlab_accept_generation_dispatch_idempotent")){
      if(mode==="missing")return Response.json({code:"PGRST202",message:"RPC missing"}, {status:404});
      if(mode==="ambiguous")return Response.json({code:"57014",message:"SECRET_SQL_URL"}, {status:503});
      accepts++;
      if(mode==="denied" || (mode==="denied-once" && accepts===1))return Response.json({code:"P0001",message:"renderlab_generation_active_limit_reached"}, {status:400});
      return Response.json([{
        outcome:mode==="conflict"?"conflict":mode==="replayed"?"replayed":"accepted",
        job_id:mode==="conflict"?null:job,attempt_id:mode==="conflict"?null:attempt,
        reservation_id:mode==="conflict"?null:reservation,
        admission_deadline:mode==="conflict"?null:new Date(Date.now()+600000).toISOString()
      }]);
    }
    if(path.endsWith("/rpc/renderlab_lookup_generation_request_acceptance")){
      return Response.json([{outcome:lookup,job_id:lookup==="accepted"?job:null,
        attempt_id:lookup==="accepted"?attempt:null,
        reservation_id:lookup==="accepted"?reservation:null,
        admission_deadline:lookup==="accepted"?created:null}]);
    }
    if(path.endsWith("/generation_jobs")){
      return Response.json(read?[accepted]:[]);
    }
    // The old unkeyed path is exercised independently by existing tests.
    if(path.endsWith("/dispatch/wake"))return new Response(null,{status:202});
    assert.fail("Unexpected SQL or provider request "+url.href);
  });
  return {calls,tasks,settlements};
}
test("R8 first keyed acceptance creates a single SQL transaction, owner-scoped read and one wake",async t=>{
  const f=fixture(t);
  const response=await submit();
  assert.equal(response.status,202);
  assert.equal((await response.json()).job.id,job);
  assert.deepEqual(f.calls.map(c=>c.path),[
    "/rest/v1/rpc/renderlab_accept_generation_dispatch_idempotent",
    "/rest/v1/generation_jobs"]);
  assert.equal(f.tasks.length,1);
  const body=f.calls[0].body;
  assert.equal(body.p_request_key,key);
  assert.equal(body.p_owner_id,owner);
  assert.match(body.p_request_digest,/^[0-9a-f]{64}$/);
  assert.equal(body.p_attempt_id.length,36);
});
test("R8 replay gives same job, no wake, no new admission",async t=>{
  const f=fixture(t,{mode:"replayed"});
  const response=await submit();
  assert.equal(response.status,202);
  assert.equal((await response.json()).job.id,job);
  assert.equal(f.tasks.length,0);
  assert.deepEqual(f.calls.map(c=>c.path),[
    "/rest/v1/rpc/renderlab_accept_generation_dispatch_idempotent",
    "/rest/v1/generation_jobs"]);
});
test("R8 changed key digest yields sanitized 409 and no existing job identity",async t=>{
  const f=fixture(t,{mode:"conflict"});
  const response=await submit();
  assert.equal(response.status,409);
  const result=await response.json();
  assert.equal(result.error.code,"generation_idempotency_conflict");
  assert.ok(!JSON.stringify(result).includes(job));
  assert.equal(f.tasks.length,0);
});
test("R8 missing migration returns safe 503; never silently switches to non-idempotent acceptance",async t=>{
  const f=fixture(t,{mode:"missing"});
  const response=await submit();
  assert.equal(response.status,503);
  assert.equal((await response.json()).error.code,"generation_idempotency_unavailable");
  assert.equal(f.calls.some(c=>c.path.endsWith("/rpc/renderlab_accept_generation_dispatch")),false);
  assert.equal(f.tasks.length,0);
});
for(const lookup of ["accepted","in_flight","not_found","conflict"]){
  test("R8 ambiguous accept lookup="+lookup+" never releases or allocates a new attempt",async t=>{
    const f=fixture(t,{mode:"ambiguous",lookup});
    const response=await submit();
    const result=await response.json();
    assert.equal(response.status,lookup==="accepted"?202:lookup==="conflict"?409:503);
    assert.equal(result.ok,lookup==="accepted");
    assert.deepEqual(f.calls.map(c=>c.path),lookup==="accepted"?[
      "/rest/v1/rpc/renderlab_accept_generation_dispatch_idempotent",
      "/rest/v1/rpc/renderlab_lookup_generation_request_acceptance",
      "/rest/v1/generation_jobs"
    ]:[
      "/rest/v1/rpc/renderlab_accept_generation_dispatch_idempotent",
      "/rest/v1/rpc/renderlab_lookup_generation_request_acceptance"
    ]);
    assert.equal(f.calls.filter(c=>c.path.includes("release_generation_admission")).length,0);
    assert.equal(f.tasks.length,0);
  });
}
test("R8 malformed idempotency keys are rejected before database",async t=>{
  const f=fixture(t);
  for(const invalid of ["short","bad:key"," ".repeat(18),"x".repeat(129)]){
    assert.equal((await submit(invalid)).status,400);
  }
  assert.deepEqual(f.calls,[]);
});
test("R8 invalid parsed request remains 400 without creating a row",async t=>{
  const f=fixture(t);
  assert.equal((await submit(key,{prompt:"",output:{kind:"image",aspectRatio:"1:1"},inputs:[]})).status,400);
  assert.deepEqual(f.calls,[]);
});

test("N5 keyed active limit settles owner once and retries the same intent key once",async t=>{
  const f=fixture(t,{mode:"denied-once",settles:true});
  const response=await submit();
  assert.equal(response.status,202);
  assert.deepEqual(f.settlements,[{ownerId:owner,source:"submit"}]);
  const accepts=f.calls.filter(c=>c.path.endsWith("/rpc/renderlab_accept_generation_dispatch_idempotent"));
  assert.equal(accepts.length,2);
  assert.equal(accepts[0].body.p_request_key,key);
  assert.equal(accepts[1].body.p_request_key,key);
  assert.equal(accepts[0].body.p_request_digest,accepts[1].body.p_request_digest);
  assert.equal(f.tasks.length,1);
  assert.ok(!f.calls.some(c=>c.path.includes("release_generation_admission")||c.path.includes("reserve_generation_admission")));
});
test("N5 keyed active limit with no settled job stays 429 and never retries",async t=>{
  const f=fixture(t,{mode:"denied",settles:false});
  assert.equal((await submit()).status,429);
  assert.deepEqual(f.settlements,[{ownerId:owner,source:"submit"}]);
  assert.equal(f.calls.filter(c=>c.path.endsWith("/rpc/renderlab_accept_generation_dispatch_idempotent")).length,1);
  assert.equal(f.tasks.length,0);
});
test("N5 repeated denial stops after exactly one owner settlement and one retry",async t=>{
  const f=fixture(t,{mode:"denied",settles:true});
  assert.equal((await submit()).status,429);
  assert.equal(f.settlements.length,1);
  assert.equal(f.calls.filter(c=>c.path.endsWith("/rpc/renderlab_accept_generation_dispatch_idempotent")).length,2);
  assert.equal(f.tasks.length,0);
});

test("F4: keyed non-FIBO service submission rejects before admission or provider work", async t => {
  const f = fixture(t);
  const { submitGeneration } = await import("../../src/server/generation/submit-generation.ts");
  const nonFibo = { ...request, model: "qwen-image-edit-2511" };
  const result = await submitGeneration(owner, nonFibo, key);
  assert.deepEqual(result, {
    ok: false, error: { code: "invalid_request", message: "Idempotency-Key is supported only for FIBO image generation." }
  });
  assert.deepEqual(f.calls, []);
  assert.deepEqual(f.tasks, []);
  assert.ok(!JSON.stringify(result).includes(key));
});

test("F4: non-FIBO public request with an intent key is a sanitized 400", async t => {
  const f = fixture(t);
  const response = await submit(key, { ...request, model: "qwen-image-edit-2511" });
  assert.equal(response.status, 400);
  const result = await response.json();
  assert.equal(result.error.code, "invalid_request");
  assert.ok(!JSON.stringify(result).includes(key));
  assert.deepEqual(f.calls, []);
  assert.deepEqual(f.tasks, []);
});

test("N4 keyed admission leaves 420 seconds plus 30 seconds before job cutoff",async t=>{
  const now=Date.now();
  const f=fixture(t);
  assert.equal((await submit()).status,202);
  const accept=f.calls.find(c=>c.path.endsWith("/rpc/renderlab_accept_generation_dispatch_idempotent"));
  const delta=Date.parse(accept.body.p_admission_deadline)-now;
  assert.ok(delta>=750000 && delta<=751000, "13-minute admission budget must leave render and settlement margin");
});

test("N6 headerless POST gets a new opaque server key and single atomic accept",async t=>{
  const f=fixture(t);
  const first=await submit(null);
  assert.equal(first.status,202);
  const second=await submit(null);
  assert.equal(second.status,202);
  const accepts=f.calls.filter(c=>c.path.endsWith("/rpc/renderlab_accept_generation_dispatch_idempotent"));
  assert.equal(accepts.length,2);
  assert.match(accepts[0].body.p_request_key,/^[A-Za-z0-9_-]{16,128}$/);
  assert.notEqual(accepts[0].body.p_request_key,accepts[1].body.p_request_key);
  assert.equal(accepts[0].body.p_request_digest,accepts[1].body.p_request_digest);
  assert.ok(!f.calls.some(c=>c.path.includes("reserve_generation_admission")||c.path.includes("release_generation_admission")||c.path.endsWith("/rpc/renderlab_accept_generation_dispatch")));
  assert.equal(f.tasks.length,2);
});
test("N6 headerless lost acceptance response recovers using same generated key without release or another accept",async t=>{
  const f=fixture(t,{mode:"ambiguous",lookup:"accepted"});
  const response=await submit(null);
  assert.equal(response.status,202);
  assert.equal((await response.json()).job.id,job);
  const accepts=f.calls.filter(c=>c.path.endsWith("/rpc/renderlab_accept_generation_dispatch_idempotent"));
  const lookups=f.calls.filter(c=>c.path.endsWith("/rpc/renderlab_lookup_generation_request_acceptance"));
  assert.equal(accepts.length,1);
  assert.equal(lookups.length,1);
  assert.equal(lookups[0].body.p_request_key,accepts[0].body.p_request_key);
  assert.equal(lookups[0].body.p_request_digest,accepts[0].body.p_request_digest);
  assert.ok(!f.calls.some(c=>c.path.includes("release_generation_admission")));
  assert.equal(f.tasks.length,0);
});
test("N6 headerless active-limit settlement retries with exactly the same generated key",async t=>{
  const f=fixture(t,{mode:"denied-once",settles:true});
  assert.equal((await submit(null)).status,202);
  const accepts=f.calls.filter(c=>c.path.endsWith("/rpc/renderlab_accept_generation_dispatch_idempotent"));
  assert.equal(accepts.length,2);
  assert.equal(accepts[0].body.p_request_key,accepts[1].body.p_request_key);
  assert.equal(f.settlements.length,1);
  assert.equal(f.tasks.length,1);
});
test("N6 headerless unconfirmed acceptance does not promise a client replay key",async t=>{
  const f=fixture(t,{mode:"ambiguous",lookup:"in_flight"});
  const response=await submit(null);
  assert.equal(response.status,503);
  const body=await response.json();
  assert.equal(body.error.code,"generation_acceptance_unconfirmed");
  assert.doesNotMatch(body.error.message,/same Idempotency-Key/);
  assert.match(body.error.message,/Activity/);
  const accept=f.calls.find(c=>c.path.endsWith("/rpc/renderlab_accept_generation_dispatch_idempotent"));
  assert.ok(!JSON.stringify(body).includes(accept.body.p_request_key));
  assert.ok(!f.calls.some(c=>c.path.includes("release_generation_admission")));
  assert.equal(f.tasks.length,0);
});
