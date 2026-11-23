import assert from "node:assert/strict";
import {registerHooks} from "node:module";
import test from "node:test";
const stub=code=>({url:"data:text/javascript,"+encodeURIComponent(code),shortCircuit:true});
registerHooks({resolve(spec,context,next){
 if(spec==="server-only")return stub("export {};");
 if(spec.startsWith("@/"))return next(new URL("../../src/"+spec.slice(2)+".ts",import.meta.url).href,context);
 return next(spec,context);
}});
process.env.GITHUB_ACTIONS="true";
delete process.env.RENDERLAB_TEST_OBSERVABILITY_PERSIST;
globalThis.fetch=async()=>{throw Error("W4C_NO_NETWORK");};
const diag=await import("../../src/server/observability/diagnostics.ts");
const mail=await import("../../src/server/account/account-deletion-notification.ts");
const fixed="2026-11-23T12:00:00.000Z";
const event=(overrides={})=>({event:"generation.reconciliation",correlationId:"corr.safe",phase:"provider-outcome",status:"running",code:"gateway_auth_rejected",upstreamStatus:401,...overrides});
test("C diagnostics: event and level must be recognized before emission",()=>{
 for(const invalid of [{event:"unknown"},{level:"fatal"},{correlationId:"  "}])
  assert.throws(()=>diag.normalizeDiagnosticEvent(event(invalid),fixed));
});
test("C diagnostics: privileged gateway auth tuple requires reconciliation + provider phase + HTTP 401/403",()=>{
 for(const input of [{event:"maintenance.pass"},{phase:"polled"},{upstreamStatus:400},{upstreamStatus:500},{upstreamStatus:undefined}])
  assert.throws(()=>diag.normalizeDiagnosticEvent(event(input),fixed),/Gateway auth diagnostics/);
 for(const status of [401,403]){
  const actual=diag.normalizeDiagnosticEvent(event({upstreamStatus:status}),fixed);
  assert.equal(actual.upstreamStatus,status);assert.equal(actual.code,"gateway_auth_rejected");
 }
});
test("C diagnostics: bounded counters clamp negatives, large counts, truncate floats and reject infinities",()=>{
 const actual=diag.normalizeDiagnosticEvent(event({
  code:"timeout",durationMs:-15,count:Number.MAX_SAFE_INTEGER*2,successCount:2.9,failureCount:Infinity,attempt:NaN,
 }),fixed);
 assert.equal(actual.durationMs,0);assert.equal(actual.count,Number.MAX_SAFE_INTEGER);
 assert.equal(actual.successCount,2);assert.equal(actual.failureCount,undefined);
 assert.equal(actual.attempt,undefined);assert.equal(actual.upstreamStatus,undefined);
});
test("C diagnostics: unknown code and raw provider fields never reach stored event projection",()=>{
 const actual=diag.normalizeDiagnosticEvent(event({
  code:"SECRET_SQL",jobId:" ../../attacker_path ",phase:"unknown",status:"injected",
  providerPayload:"SECRET_SQL",rawText:"SECRET_TOKEN",
 }),fixed);
 assert.equal(actual.code,undefined);assert.equal(actual.phase,undefined);assert.equal(actual.status,undefined);
 assert(!JSON.stringify(actual).includes("SECRET_SQL"));
 assert(!JSON.stringify(actual).includes("SECRET_TOKEN"));
});
test("C diagnostics: lifecycle and job correlation are stable hashes, not raw owner identifiers",()=>{
 const id="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
 const a=diag.correlationIdForAccountLifecycle(id);
 assert.equal(a.length,24);assert.equal(a,diag.correlationIdForAccountLifecycle(id));
 assert.notEqual(a,diag.correlationIdForGenerationJob(id));assert(!a.includes(id));
});
test("C diagnostics: test namespace sanitization and long identifier hash cannot bypass maximum",()=>{
 const original=process.env.RENDERLAB_TEST_OBSERVABILITY_NAMESPACE;
 try{
  process.env.RENDERLAB_TEST_OBSERVABILITY_NAMESPACE="  W4C/Scope??  ";
  assert.equal(diag.currentObservabilityTestPrefix(),"test.w4c_scope__."); 
  const long=diag.scopeObservabilityIdentifier("A".repeat(500),64);
  assert.equal(long.length,64);assert(long.startsWith("test.w4c_scope__."));
  assert.equal(long,diag.scopeObservabilityIdentifier("A".repeat(500),64));
  assert(!long.includes("A".repeat(30)));
 }finally{if(original===undefined)delete process.env.RENDERLAB_TEST_OBSERVABILITY_NAMESPACE;else process.env.RENDERLAB_TEST_OBSERVABILITY_NAMESPACE=original;}
});
test("C diagnostics: observation sink failure never changes product correctness",async()=>{
 const warnings=[];
 await diag.emitDiagnosticEvent(event({code:"timeout"}),async x=>{warnings.push(x);throw Error("SECRET_SQL");});
 assert.equal(warnings.length,1);assert.equal(warnings[0].code,"timeout");
});
test("C diagnostics: selected classifications deny unrelated strings and 401/403 type only",()=>{
 assert.equal(diag.isDiagnosticCode("SECRET_SQL"),false);
 assert.equal(diag.isDiagnosticEventName("generation.reconciliation"),true);
 assert.equal(diag.isDiagnosticLevel("warn"),true);
 assert.equal(diag.isGatewayAuthRejectionStatus(401),true);
 assert.equal(diag.isGatewayAuthRejectionStatus(403),true);
 assert.equal(diag.isGatewayAuthRejectionStatus(404),false);
});
test("C account deletion notice: missing key fails safely with zero network",async()=>{
 delete process.env.RESEND_API_KEY;
 const actual=await mail.sendAccountDeletionNotification("owner@example.invalid");
 assert.deepEqual(actual,{state:"failed",errorCode:"account_deletion_mail_unconfigured"});
});
test("C account deletion notice: accepted synthetic response preserves recipient and no private account details",async t=>{
 process.env.RESEND_API_KEY="synthetic-w4c-not-a-secret";
 let requests=0;
 t.mock.method(globalThis,"fetch",async(url,init)=>{
  requests++;
  assert.equal(url,"https://api.resend.com/emails");
  assert.equal(init.method,"POST");assert.equal(init.cache,"no-store");
  assert.equal(init.headers.authorization,"Bearer synthetic-w4c-not-a-secret");
  const b=JSON.parse(init.body);
  assert.deepEqual(b.to,["owner@example.invalid"]);
  assert.match(b.subject,/account deletion was accepted/i);
  assert(!b.html.includes("SECRET_SQL"));
  assert(!b.html.includes("owner@example.invalid"));
  return Response.json({id:"synthetic-notification"},{status:200});
 });
 assert.deepEqual(await mail.sendAccountDeletionNotification("owner@example.invalid"),{state:"accepted",errorCode:null});
 assert.equal(requests,1);delete process.env.RESEND_API_KEY;
});
test("C account deletion notice: failed HTTP/invalid receipt/transport all remain generic",async t=>{
 process.env.RESEND_API_KEY="synthetic-w4c-not-a-secret";
 for(const [label,response] of [
  ["http500",()=>Response.json({secret:"SECRET_SQL"},{status:500})],
  ["empty-id",()=>Response.json({id:""},{status:200})],
  ["missing-body",()=>new Response(null,{status:204})],
  ["network-error",()=>{throw Error("SECRET_TOKEN");}],
 ]){
  const mock=t.mock.method(globalThis,"fetch",async()=>response());
  assert.deepEqual(await mail.sendAccountDeletionNotification("owner@example.invalid"),
   {state:"failed",errorCode:"account_deletion_mail_send_failed"},label);
  mock.mock.restore();
 }
 delete process.env.RESEND_API_KEY;
});
