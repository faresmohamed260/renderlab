import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const fixtureKey = Symbol.for("renderlab.p003b.principal");
const states = globalThis[fixtureKey] = {
  fresh: true,
  verified: true,
  revoked: false,
  role: "member",
  status: "active",
  currentLevel: "aal1",
  verifiedTotpFactorCount: 0,
  accessQueries: 0,
  adminReads: 0,
  maintenanceRuns: 0,
  reconcilerRuns: 0,
};

const dataUrl = (source) => ({url:"data:text/javascript,"+encodeURIComponent(source),shortCircuit:true});
function stateSource() { return 'const s=globalThis[Symbol.for("renderlab.p003b.principal")];'; }
registerHooks({
  resolve(spec,context,next) {
    if (spec === "server-only") return dataUrl("export {};");
    if (spec === "next/server") return dataUrl("export const NextResponse=Response;export function after(fn){return fn();}");
    if (spec === "@/lib/supabase/server") return dataUrl(stateSource()
      + "export async function getFreshCurrentRenderLabAuthentication(){return !s.fresh||!s.verified||s.revoked ? null : {identity:{id:"
      + JSON.stringify(userId) + ",email:'a@example.invalid'},sessionId:'11111111-1111-4111-8111-111111111111',assurance:{currentLevel:s.currentLevel,nextLevel:s.verifiedTotpFactorCount>0?'aal2':'aal1',verifiedTotpFactorCount:s.verifiedTotpFactorCount,currentAuthenticationMethods:[]}};}");
    if (spec === "@/server/account/account-access") return dataUrl(stateSource()
      + "export async function getRenderLabAccountAccess(id){s.accessQueries++;return id==="
      + JSON.stringify(userId) + "?{userId:id,role:s.role,status:s.status,generationEnabled:true}:null;}");
    if (spec === "@/server/admin/admin-operations") return dataUrl(stateSource()
      + "export class AdminOperationError extends Error{};export async function listAdminAccounts(){s.adminReads++;return [];}");
    if (spec === "@/server/maintenance/renderlab-maintenance") return dataUrl(stateSource()
      + "export async function runRenderLabMaintenance(){s.maintenanceRuns++;return {ok:true};}");
    if (spec === "@/server/account/account-data-lifecycle") return dataUrl(stateSource()
      + "export async function runAccountDataLifecycleMaintenance(){s.maintenanceRuns++;return {ok:true};}");
    if (spec === "@/server/generation/reconcile-generation") return dataUrl(stateSource()
      + "export async function reconcileActiveNativeGenerations(){s.reconcilerRuns++;return {processed:0};}");
    if (spec === "@/server/data/supabase-rest") return dataUrl(
      "export async function supabaseRest(){throw Error('UNAUTHORIZED_SERVICE_ROLE_CALL');}");
    if (spec === "@/server/observability/diagnostics") return dataUrl(
      "export function normalizeDiagnosticEvent(x){return x;}");
    if (spec === "@/server/observability/diagnostic-store") return dataUrl(
      "export async function recordGenerationDispatchHealthAlert(){};"
      + "export async function resolveGenerationDispatchHealthAlert(){};"
      + "export async function recordOldestActiveJobAlert(){};"
      + "export async function resolveOldestActiveJobAlert(){};");
    if (spec === "@/server/observability/operational-alert-notification") return dataUrl(
      "export async function sendOperationalAlertNotification(){return {attempted:0,accepted:0,failed:0};}");
    if (spec === "@/server/observability/oldest-active-job-store") return dataUrl(
      "export async function readOldestActiveJobAge(){return {warning:false};}");
    if (spec === "@/server/observability/dispatch-health") return dataUrl(
      "export function dispatchHealthIsHealthy(){return true;}");
    if (spec.startsWith("@/")) return next(new URL("../../src/"+spec.slice(2)+".ts",import.meta.url).href,context);
    return next(spec,context);
  }
});
Object.assign(process.env,{
  RENDERLAB_MAINTENANCE_SECRET:"synthetic-maintenance-test",
  RENDERLAB_GENERATION_RECONCILER_SECRET:"synthetic-reconciler-test",
  CRON_SECRET:"synthetic-cron-test",
  GITHUB_ACTIONS:"true",
});
const adminAuth=await import("../../src/server/admin/admin-auth.ts");
const adminApi=await import("../../src/app/api/admin/admin-api-authorization.ts");
const adminAccounts=await import("../../src/app/api/admin/accounts/route.ts");
const maintenance=await import("../../src/app/api/internal/maintenance/route.ts");
const reconciliation=await import("../../src/app/api/internal/generation/reconcile/route.ts");

function reset(overrides={}) {
  Object.assign(states,{fresh:true,verified:true,revoked:false,role:"member",status:"active",
    currentLevel:"aal1",verifiedTotpFactorCount:0,accessQueries:0,adminReads:0,
    maintenanceRuns:0,reconcilerRuns:0},overrides);
}
const principals=[
  ["A1 anonymous", {fresh:false}, "denied","admin_access_required"],
  ["A2 suspended", {role:"admin",status:"suspended",currentLevel:"aal2",verifiedTotpFactorCount:1}, "denied","admin_access_required"],
  ["A3 revoked", {role:"admin",revoked:true,currentLevel:"aal2",verifiedTotpFactorCount:1}, "denied","admin_access_required"],
  ["A3 invalid session", {role:"admin",verified:false,currentLevel:"aal2",verifiedTotpFactorCount:1}, "denied","admin_access_required"],
  ["A4 forged admin user metadata, DB says member", {role:"member",currentLevel:"aal2",verifiedTotpFactorCount:1}, "denied","admin_access_required"],
  ["A4 active admin without enrolled MFA", {role:"admin",verifiedTotpFactorCount:0}, "mfa_enrollment_required","admin_mfa_required"],
  ["A4 active admin AAL1 enrolled", {role:"admin",verifiedTotpFactorCount:1,currentLevel:"aal1"}, "mfa_challenge_required","admin_mfa_required"],
  ["A5 verified active admin AAL2", {role:"admin",verifiedTotpFactorCount:1,currentLevel:"aal2"}, "authorized",null],
];

for (const [name,fixture,expectedStatus,errorCode] of principals) {
  test("Admin gate " + name, async () => {
    reset(fixture);
    const state=await adminAuth.getCurrentRenderLabAdminAuthorization();
    assert.equal(state.status,expectedStatus);
    const result=await adminApi.authorizeRenderLabAdminApi();
    assert.equal(result.ok,expectedStatus==="authorized");
    if(errorCode){
      assert.equal(result.response.status,403);
      const json=await result.response.json();
      assert.equal(json.error.code,errorCode);
    }
    const response=await adminAccounts.GET();
    if(errorCode){
      assert.equal(response.status,403);
      assert.equal(states.adminReads,0,"Admin service role must not be reached before AAL2");
    }else{
      assert.equal(response.status,200);
      assert.equal(states.adminReads,1);
    }
    if(!states.fresh||!states.verified||states.revoked)
      assert.equal(states.accessQueries,0,"No privileged access lookup for invalid/revoked/anonymous session");
  });
}

const deniedRequests=[
  ["I1 maintenance POST missing bearer", maintenance.POST,"POST","/api/internal/maintenance",null],
  ["I1 maintenance POST wrong bearer", maintenance.POST,"POST","/api/internal/maintenance","Bearer synthetic-wrong"],
  ["I1 cron GET missing bearer", maintenance.GET,"GET","/api/internal/maintenance",null],
  ["I1 cron GET wrong bearer", maintenance.GET,"GET","/api/internal/maintenance","Bearer synthetic-wrong"],
  ["I2 reconciliation POST missing bearer", reconciliation.POST,"POST","/api/internal/generation/reconcile",null],
  ["I2 reconciliation POST wrong bearer", reconciliation.POST,"POST","/api/internal/generation/reconcile","Bearer synthetic-wrong"],
  ["I2 reconciliation GET missing bearer", reconciliation.GET,"GET","/api/internal/generation/reconcile",null],
  ["I2 reconciliation GET wrong bearer", reconciliation.GET,"GET","/api/internal/generation/reconcile","Bearer synthetic-wrong"],
];
for (const [name,handler,method,path,bearer] of deniedRequests) {
  test(name+" never calls privileged internal service",async()=>{
    reset({role:"admin",currentLevel:"aal2",verifiedTotpFactorCount:1});
    const headers=bearer?{authorization:bearer}:{};
    const response=await handler(new Request("https://example.invalid"+path,{method,headers}));
    assert.equal(response.status,401);
    assert.deepEqual(await response.json(),{ok:false});
    assert.equal(states.maintenanceRuns,0);
    assert.equal(states.reconcilerRuns,0);
  });
}
test("I1 maintenance authorized POST uses only maintenance secret",async()=>{
  reset();const response=await maintenance.POST(new Request(
    "https://example.invalid/api/internal/maintenance",{method:"POST",
      headers:{authorization:"Bearer synthetic-maintenance-test"}}));
  assert.equal(response.status,200);
  assert.equal(states.maintenanceRuns,2);
});
test("I1 cron authorized GET uses only cron secret",async()=>{
  reset();const response=await maintenance.GET(new Request(
    "https://example.invalid/api/internal/maintenance",{method:"GET",
      headers:{authorization:"Bearer synthetic-cron-test"}}));
  assert.equal(response.status,200);
  assert.equal(states.maintenanceRuns,2);
});
test("I2 reconciler authorized POST uses only reconciler secret",async()=>{
  reset();const response=await reconciliation.POST(new Request(
    "https://example.invalid/api/internal/generation/reconcile",{method:"POST",
      headers:{authorization:"Bearer synthetic-reconciler-test"}}));
  assert.equal(response.status,200);
  assert.equal(states.reconcilerRuns,1);
});
