import assert from "node:assert/strict";
import test from "node:test";
import { installRiskHarness, fakeDb, fixedIso } from "../helpers/w4-fixture.mjs";

installRiskHarness();
const store = await import("../../src/server/observability/diagnostic-store.ts");
const diagnostics = await import("../../src/server/observability/diagnostics.ts");
const nowMs = Date.parse(fixedIso);
const diagnosticRow = (more = {}) => ({
  id: 1,occurred_at:fixedIso,event:"generation.reconciliation",level:"warn",
  correlation_id:"opaque",job_id:"SECRET_JOB",operation:null,phase:"provider-outcome",
  status:"running",code:"provider-unconfirmed",duration_ms:null,count:401,
  success_count:null,failure_count:null,attempt:null,
  prompt:"SECRET_PROMPT",owner_id:"SECRET_OWNER",...more,
});

test("W4 diagnostics: privileged admin projection omits owner, job, prompt and maps gateway-auth status",()=>{
  const projected=store.adminDiagnosticProjection(diagnosticRow());
  assert.equal(projected.code,"gateway_auth_rejected");
  assert.equal(projected.upstreamStatus,401);
  assert.equal(projected.count,null);
  assert.equal(projected.correlationId,"opaque");
  const text=JSON.stringify(projected);
  for(const value of ["SECRET_JOB","SECRET_PROMPT","SECRET_OWNER"])assert(!text.includes(value));
});

test("W4 diagnostics: ordinary provider status 404 is not misclassified as gateway 401",()=>{
  const projected=store.adminDiagnosticProjection(diagnosticRow({count:404}));
  assert.equal(projected.code,"provider-unconfirmed");
  assert.equal(projected.upstreamStatus,undefined);
  assert.equal(projected.count,404);
});

test("W4 diagnostics: query clamps lookback to 720h, row cap to 100, and selects bounded fields",async(t)=>{
  const calls=fakeDb(t,()=>Array.from({length:101},(_,i)=>diagnosticRow({id:i})));
  const result=await store.listRecentDiagnosticEvents({lookbackHours:99999,limit:99999,event:"generation.reconciliation",level:"warn"},nowMs);
  assert.equal(result.limit,100);
  assert.equal(result.lookbackHours,720);
  assert.equal(result.rows.length,100);
  assert.equal(result.truncated,true);
  const q=calls[0].query;
  assert.equal(q.get("limit"),"101");
  assert.equal(q.get("event"),"eq.generation.reconciliation");
  assert.equal(q.get("level"),"eq.warn");
  assert.equal(q.get("occurred_at"),"gte."+new Date(nowMs-720*60*60*1000).toISOString());
  assert(!q.get("select").includes("prompt"));
  assert(!q.get("select").includes("owner_id"));
});

test("W4 diagnostics: gateway-auth code filter requires event, phase and 401/403 match",async(t)=>{
  const calls=fakeDb(t,()=>[]);
  await store.listRecentDiagnosticEvents({code:"gateway_auth_rejected",lookbackHours:0,limit:0},nowMs);
  assert.equal(calls[0].query.get("lookbackHours"),null);
  assert.match(calls[0].query.get("and"),/phase.eq.provider-outcome/);
  assert.match(calls[0].query.get("and"),/count.in.\(401,403\)/);
  assert.equal(calls[0].query.get("limit"),"2");
});

test("W4 diagnostics: ordinary diagnostic insert never persists unexpected sensitive fields",async(t)=>{
  const calls=fakeDb(t,()=>null);
  const event=diagnostics.normalizeDiagnosticEvent({
    event:"generation.submission",level:"info",timestamp:fixedIso,
    correlationId:"safe-correlation",prompt:"SECRET_PROMPT",storageKey:"SECRET_KEY",
    durationMs:25,count:1,
  });
  assert.equal(await store.persistDiagnosticEvent(event),null);
  assert.equal(calls.length,1);
  assert.equal(calls[0].path,"renderlab_diagnostic_events");
  assert.equal(calls[0].method,"POST");
  assert.equal(calls[0].body.correlation_id,"safe-correlation");
  assert(!JSON.stringify(calls[0].body).includes("SECRET_PROMPT"));
  assert(!JSON.stringify(calls[0].body).includes("SECRET_KEY"));
});

test("W4 diagnostics: gateway 401 is stored as bounded provider-unconfirmed tuple, not raw error",async(t)=>{
  const calls=fakeDb(t,()=>[]);
  const event=diagnostics.normalizeDiagnosticEvent({
    event:"generation.reconciliation",level:"warn",timestamp:fixedIso,
    correlationId:"gateway-failure",phase:"provider-outcome",status:"running",
    code:"gateway_auth_rejected",upstreamStatus:401,
    rawProviderBody:"SECRET_UPSTREAM_RESPONSE",
  });
  await store.persistDiagnosticEvent(event);
  assert.equal(calls[0].body.code,"provider-unconfirmed");
  assert.equal(calls[0].body.count,401);
  assert(!JSON.stringify(calls[0].body).includes("SECRET_UPSTREAM_RESPONSE"));
  assert(calls.every(c=>c.path.startsWith("renderlab_diagnostic_events")||c.path==="rpc/renderlab_record_operational_alert"));
});

test("W4 diagnostics: old-job warning persists a non-email alert with stable key",async(t)=>{
  const calls=fakeDb(t,({path})=>path.startsWith("rpc/") ? [{
    alert_key:"generation-oldest-active-job",state:"open",should_notify:false,
  }] : null);
  const event=diagnostics.normalizeDiagnosticEvent({
    event:"generation.reconciliation",level:"warn",timestamp:fixedIso,
    correlationId:"old-job-signal",phase:"provider-outcome",status:"running",
  });
  const result=await store.recordOldestActiveJobAlert(event);
  assert.equal(result.alert_key,"generation-oldest-active-job");
  assert.equal(calls.length,2);
  assert.equal(calls[0].path,"renderlab_diagnostic_events");
  assert.equal(calls[1].path,"rpc/renderlab_record_operational_alert");
  assert.equal(calls[1].body.p_alert_key,"generation-oldest-active-job");
  assert.equal(calls[1].body.p_family,"generation-provider-degradation");
  assert.equal(calls[1].body.p_code,null);
});

test("W4 diagnostics: alert resolution uses stable key and bounded explicit timestamp",async(t)=>{
  const calls=fakeDb(t,()=>true);
  assert.equal(await store.resolveOldestActiveJobAlert(fixedIso),true);
  assert.equal(await store.resolveGenerationDispatchHealthAlert(fixedIso),true);
  assert.deepEqual(calls.map(c=>c.path),[
    "rpc/renderlab_resolve_operational_alert",
    "rpc/renderlab_resolve_operational_alert",
  ]);
  assert.deepEqual(calls.map(c=>c.body.p_alert_key),[
    "generation-oldest-active-job","generation-dispatch-health",
  ]);
  assert(calls.every(c=>c.body.p_resolved_at===fixedIso));
});

test("W4 diagnostics: pruning and active-alert list enforce hard maximum/minimum",async(t)=>{
  const calls=fakeDb(t,({path})=>path.startsWith("rpc/")?0:[]);
  await store.pruneDiagnosticEvents(99999);
  await store.pruneDiagnosticEvents(-100);
  await store.listOperationalAlerts(99999);
  await store.listOperationalAlerts(-100);
  assert.deepEqual(calls.slice(0,2).map(c=>c.body.p_limit),[2000,1]);
  assert.deepEqual(calls.slice(2).map(c=>c.query.get("limit")),["50","1"]);
});
