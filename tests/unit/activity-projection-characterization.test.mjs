import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";

const key = Symbol.for("renderlab.activity.projection.fixture");
const fixture = globalThis[key] = { rows: [], visible: [], calls: [] };
const stub = source => ({ url: "data:text/javascript," + encodeURIComponent(source), shortCircuit: true });
const state = "const s=globalThis[Symbol.for('renderlab.activity.projection.fixture')];";
const hook = registerHooks({
  resolve(spec, context, nextResolve) {
    if (spec === "@/server/data/supabase-rest") return stub(state + "export async function supabaseRest(path,init){s.calls.push({path,method:init.method});const u=new URL(path,'https://fixture.invalid/');if(u.pathname==='/generation_jobs')return s.rows;if(u.pathname==='/media_assets')return s.visible.map(id=>({id}));throw Error('Unexpected fixture query');}");
    if (spec === "@/server/generation/cancel-generation") return stub("export function isSupportedNativeCancellationWorker(worker){return worker==='fibo';}");
    if (spec === "@/server/generation/generation-recipe") return stub("export async function reconstructAvailableGenerationRecipeRequest(owner,row){return row.parameters?.valid===true?{}:null;}");
    if (spec.startsWith("@/")) return nextResolve(new URL("../../src/" + spec.slice(2) + ".ts", import.meta.url).href, context);
    return nextResolve(spec, context);
  },
});
const { listGenerationActivity } = await import("../../src/server/generation/generation-activity.ts");
hook.deregister();

const owner = "owner-fixture";
const date = "2026-11-25T00:00:00.000Z";
function row(id, status, extra = {}) {
  return { id, status, operation: "create-image", output_kind: "image", prompt: id,
    output_asset_ids: [], inputs: [], parameters: {}, worker_id: null, provider_job_id: null,
    error_code: null, error_message: null, created_at: date, updated_at: date, started_at: null, completed_at: null, ...extra };
}
test("Activity projection keeps surviving outputs, suppresses deleted successes and sanitizes failures", async () => {
  fixture.calls = [];
  fixture.rows = [
    row("deleted", "succeeded", { output_asset_ids: ["gone"] }),
    row("partial", "succeeded", { output_asset_ids: ["gone","surviving"], parameters: { valid:true } }),
    row("failed", "failed", { error_code: "generation_submission_failed", error_message: "RAW_PROVIDER_PRIVATE_DETAIL", worker_id: "fibo", provider_job_id: "private-handle" }),
    row("running", "running", { worker_id: "fibo", provider_job_id: "private-handle" }),
    row("extra", "queued"),
  ];
  fixture.visible = ["surviving"];
  const result = await listGenerationActivity({ ownerId: owner, limit: 4, offset: 20 });
  assert.deepEqual(result.items.map(x=>x.id), ["partial","failed","running"]);
  assert.deepEqual(result.items[0].outputAssetIds, ["surviving"]);
  assert.equal(result.items[0].canRunAgain, true);
  assert.equal(result.items[1].error.message, "Generation could not be started. Retry when you’re ready.");
  assert.equal(result.items[2].canCancel, true);
  assert.equal(result.hasActive, true);
  assert.deepEqual(result.page, { offset:20, limit:4, hasMore:true });
  assert.doesNotMatch(JSON.stringify(result), /RAW_PROVIDER_PRIVATE_DETAIL|private-handle|worker_id|provider_job_id/);
  const q = fixture.calls.map(call=>new URL(call.path,"https://fixture.invalid/"));
  assert.equal(q[0].searchParams.get("owner_id"),"eq."+owner);
  assert.equal(q[0].searchParams.get("order"),"created_at.desc,id.desc");
  assert.equal(q[0].searchParams.get("limit"),"5");
  assert.equal(q[0].searchParams.get("offset"),"20");
  assert.equal(q[1].searchParams.get("owner_id"),"eq."+owner);
  assert.equal(q[1].searchParams.get("deleted_at"),"is.null");
});
test("Activity does not manufacture action eligibility or lose empty-page traversal", async () => {
  fixture.calls = []; fixture.visible = [];
  fixture.rows = [row("deleted", "succeeded", {output_asset_ids:["gone"]}), row("extra","queued")];
  const empty = await listGenerationActivity({ownerId:owner,limit:1});
  assert.deepEqual(empty.items, []);
  assert.equal(empty.page.hasMore,true);
  assert.equal(empty.hasActive,false);
  fixture.rows = [
    row("queued","queued"), row("cancelling","cancelling",{worker_id:"fibo",provider_job_id:"handle"}),
    row("persisting","persisting",{worker_id:"fibo",provider_job_id:"handle"}),
    row("output","running",{worker_id:"fibo",provider_job_id:"handle",output_asset_ids:["gone"]}),
    row("failed","failed",{error_message:"private error"}), row("no-recipe","succeeded"),
  ];
  const result=await listGenerationActivity({ownerId:owner});
  assert.ok(result.items.every(x=>!x.canCancel&&!x.canRunAgain));
  assert.equal(result.items.find(x=>x.id==="failed").error.message,"Generation did not complete. Retry when you’re ready.");
});
