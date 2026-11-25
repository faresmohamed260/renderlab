import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

// P0-03b: all user IDs and resources here are synthetic; there is no
// network access to Supabase, R2, Modal, or the production project.
const ownerA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ownerB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const foreignId = "bbbbbbbb-0000-4000-8000-bbbbbbbbbbbb";
const state = { storageCalls: 0 };
const promptAuth = globalThis[Symbol.for("renderlab.prompt-history.owner")] = { account: { id: ownerA }, reads: 0 };
function stub(source) {
  return { url: "data:text/javascript," + encodeURIComponent(source), shortCircuit: true };
}
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/lib/supabase/server") return stub('export async function getCurrentRenderLabAccount(){const s=globalThis[Symbol.for("renderlab.prompt-history.owner")];s.reads++;return s.account;}');
    if (specifier === "server-only") return stub("export {};");
    if (specifier === "next/server") return stub("export const NextResponse=Response;export function after(fn){return fn();}");
    if (specifier === "@/server/storage/r2") return stub(
      "export function isR2Configured(){return true;}"
      + "export async function createSignedReadUrl(){throw Error('UNEXPECTED_STORAGE');}"
      + "export async function createSignedUploadUrl(){throw Error('UNEXPECTED_STORAGE');}"
      + "export async function createSignedDownloadUrl(){throw Error('UNEXPECTED_STORAGE');}"
      + "export async function headR2Object(){throw Error('UNEXPECTED_STORAGE');}"
      + "export async function readR2Object(){throw Error('UNEXPECTED_STORAGE');}"
      + "export async function writeR2Object(){throw Error('UNEXPECTED_STORAGE');}"
      + "export async function deleteR2Object(){throw Error('UNEXPECTED_STORAGE');}"
      + "export async function r2ObjectExists(){throw Error('UNEXPECTED_STORAGE');}"
    );
    if (specifier === "@/server/account/account-data-lifecycle-test-faults") {
      return stub("export function injectAccountDataLifecycleTestFault(){}");
    }
    if (specifier === "@/server/media/image-upload-validation") {
      return stub("export function inspectUploadedImageBytes(){throw Error('UNEXPECTED_IMAGE');}");
    }
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL("../../src/" + specifier.slice(2) + ".ts", import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});
Object.assign(process.env, {
  SUPABASE_URL: "https://db.example.invalid",
  SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-role-value-not-a-secret",
  CLOUDFLARE_R2_ACCOUNT_ID: "synthetic",
  CLOUDFLARE_R2_ACCESS_KEY_ID: "synthetic",
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: "synthetic",
  CLOUDFLARE_R2_BUCKET: "synthetic",
  GITHUB_ACTIONS: "true",
});

const jobs = await import("../../src/server/generation/generation-recipe.ts");
const activity = await import("../../src/server/generation/generation-activity.ts");
const promptHistory = await import("../../src/server/generation/history/prompt-history.ts");
const admission = await import("../../src/server/generation/generation-admission.ts");
const asset = await import("../../src/server/media/media-assets.ts");
const collection = await import("../../src/server/media/media-collections.ts");
const uploads = await import("../../src/server/media/media-uploads.ts");
const references = await import("../../src/server/media/reference-uploads.ts");
const lifecycle = await import("../../src/server/account/account-data-lifecycle.ts");

const denied = (value) => {
  assert.ok(!JSON.stringify(value).includes(ownerB), "Foreign owner data returned to A");
  assert.ok(!JSON.stringify(value).includes(foreignId), "Foreign resource data returned to A");
};
function fakeDB(t, family, targetId) {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, init = {}) => {
    const u = new URL(url);
    assert.equal(u.host, "db.example.invalid");
    assert.ok(u.pathname.startsWith("/rest/v1/"), "Only PostgREST fake endpoint may be called");
    const method = init.method || "GET";
    const body = init.body ? JSON.parse(init.body) : null;
    const ownerQuery = u.searchParams.get("owner_id") === "eq." + ownerA
      || u.searchParams.get("user_id") === "eq." + ownerA
      || u.searchParams.get("claimed_user_id") === "eq." + ownerA;
    const ownerRpc = body && (body.p_owner_id === ownerA || body.p_user_id === ownerA);
    const ownerPayload = body && (body.owner_id === ownerA || body.user_id === ownerA);
    const authorized = ownerQuery || ownerRpc || ownerPayload;
    calls.push({ family, method, path: u.pathname, search: u.search, body, authorized });
    if (!authorized) {
      // Emulate a service-role DB bypassing RLS: a missing owner predicate
      // makes B's existing row visible to the requesting A.
      return Response.json(u.pathname.includes("/rpc/")
        ? [{ reservation_id: foreignId }]
        : [{ id: foreignId, owner_id: ownerB, user_id: ownerB,
          status: "ready", job_id: foreignId, kind: "image", mime_type: "image/png",
          metadata: null, storage_key: "foreign-owner-storage-key", display_name: "Foreign" }]);
    }
    return Response.json([]);
  });
  return calls;
}

// The registry declares all 77 owner-scoped call sites. These data-driven
// adversarial tests exercise representative public service entry points
// from every family, including their derived query/column predicates and RPC
// owner binding. Registry enforcement prevents unnoticed new call sites.
const samples = [
  { family: "jobs", name: "foreign recipe job", invoke: () => jobs.loadGenerationRecipeJob(ownerA, foreignId) },
  { family: "jobs", name: "foreign activity list", invoke: () => activity.listGenerationActivity({ ownerId: ownerA, limit: 12 }) },
  { family: "admission", name: "bound reservation lookup", invoke: () => admission.listActiveBoundGenerationJobIds(ownerA, new AbortController().signal) },
  { family: "media-assets", name: "foreign media asset", invoke: () => asset.getMediaAsset(ownerA, foreignId) },
  { family: "media-assets", name: "foreign collection-associated assets", invoke: () => asset.listMediaAssets({ownerId: ownerA, collectionId: foreignId}) },
  { family: "collections", name: "foreign collection", invoke: () => collection.getMediaCollection(ownerA, foreignId) },
  { family: "collections", name: "foreign collection membership", invoke: () => collection.listMediaCollections(ownerA, foreignId) },
  { family: "uploads", name: "foreign media upload completion", invoke: () => uploads.completeMediaUpload(ownerA, { uploadId: foreignId }) },
  { family: "references", name: "foreign reference", invoke: () => references.getReadyReferenceSource(ownerA, foreignId) },
  { family: "references", name: "foreign mask reference", invoke: () => references.getReadyFiboMaskSource(ownerA, foreignId) },
  { family: "references", name: "foreign reference upload completion", invoke: () => references.completeReferenceUpload(ownerA, { sourceId: foreignId }) },
  { family: "account-lifecycle", name: "foreign account export", invoke: () => lifecycle.getAccountExport(ownerA) },
  { family: "account-lifecycle", name: "foreign deletion lifecycle", invoke: () => lifecycle.getAccountDeletionLifecycle(ownerA) },
];

for (const sample of samples) {
  test("owner A cannot access B via " + sample.family + ": " + sample.name, async (t) => {
    const calls = fakeDB(t, sample.family, foreignId);
    const response = await sample.invoke();
    denied(response);
    assert.ok(calls.length >= 1, "Expected the real service to attempt a privileged query");
    for (const call of calls) {
      assert.ok(call.authorized, "Unscoped service-role " + sample.family + " call: "
        + call.method + " " + call.path + call.search);
    }
    assert.equal(state.storageCalls, 0);
  });
}

for (const [name, operation, method] of [
  ["generation admission reservation", () => admission.reserveGenerationAdmission(ownerA), "rpc/renderlab_reserve_generation_admission"],
  ["generation admission release", () => admission.releaseGenerationAdmission(ownerA, foreignId), "rpc/renderlab_release_generation_admission"],
]) {
  test("O3/O8: authenticated owner A bound to " + name + " even with B resource", async (t) => {
    const calls = fakeDB(t, "admission", foreignId);
    const result = await operation();
    denied(result);
    assert.ok(calls.some((x) => x.path.endsWith("/" + method)), "Expected operation-specific RPC");
    for (const call of calls) {
      assert.equal(call.body?.p_owner_id, ownerA);
      assert.equal(call.authorized, true);
    }
  });
}

for(const [name,invoke,expectedMethod,expectedTable] of [
 ["foreign media rename",()=>asset.renameMediaAsset(ownerA,foreignId,"Safe name"),"PATCH","media_assets"],
 ["foreign media deletion",()=>asset.deleteMediaAsset(ownerA,foreignId),"GET","media_assets"],
 ["foreign media favorite",()=>asset.setMediaAssetFavorite(ownerA,foreignId,true),"GET","media_assets"],
 ["foreign collection member insert",()=>collection.setMediaCollectionMembership(ownerA,foreignId,foreignId,true),"GET","media_collections"],
]) {
 test("O2/O4/O5: owner A cannot mutate B via "+name,async(t)=>{
  const calls=fakeDB(t,"media-mutation",foreignId);
  const outcome=await invoke();
  denied(outcome);
  assert.ok(calls.length>=1);
  assert.ok(calls.some(call=>call.method===expectedMethod&&call.path.endsWith("/"+expectedTable)));
  for(const call of calls)assert.equal(call.authorized,true,"Mutation attempted outside authenticated owner filter");
  assert.ok(calls.every(call=>call.method==="GET"||call.method==="PATCH"),"Unexpected unscoped destructive action");
 });
}

test("O5: creating a collection binds owner_id in the write payload",async(t)=>{
 const calls=fakeDB(t,"collections",foreignId);
 const result=await collection.createMediaCollection(ownerA,"Own collection");
 denied(result);
 const insert=calls.find(x=>x.method==="POST"&&x.path.endsWith("/media_collections"));
 assert.ok(insert,"Expected service role collection insert");
 assert.equal(insert.body.owner_id,ownerA);
 assert.equal(insert.authorized,true);
 denied(insert.body);
});

test("O7: account export creation is bound to the authenticated owner",async(t)=>{
 const calls=fakeDB(t,"account-lifecycle",foreignId);
 await assert.rejects(()=>lifecycle.requestAccountExport(ownerA),/unavailable|export/i);
 const insert=calls.find(x=>x.method==="POST"&&x.path.endsWith("/renderlab_account_exports"));
 assert.ok(insert,"Expected account export insert");
 assert.equal(insert.body.owner_id,ownerA);
 assert.ok(calls.every(x=>x.authorized));
 denied(insert.body);
});

test("O7: account deletion RPC binds verified user_id, never caller-supplied B",async(t)=>{
 const calls=fakeDB(t,"account-lifecycle",foreignId);
 await assert.rejects(()=>lifecycle.beginAccountDeletion(ownerA),/deletion|unavailable/i);
 const rpc=calls.find(x=>x.path.endsWith("/rpc/renderlab_begin_account_deletion"));
 assert.ok(rpc);
 assert.equal(rpc.body.p_user_id,ownerA);
 assert.equal(rpc.authorized,true);
 denied(rpc.body);
});

test("O1/O3: prompt history derives its GET owner filter from the admitted session, not query data", async (t) => {
  const calls = fakeDB(t, "jobs", foreignId);
  promptAuth.account = { id: ownerA };
  promptAuth.reads = 0;
  try {
    const malicious = { ownerId: ownerB, owner_id: ownerB, search: "x&owner_id=eq." + ownerB };
    const first = await promptHistory.listPromptHistory(malicious);
    const max = await promptHistory.listPromptHistory({ ...malicious, limit: 999, cursor: { createdAt: "2026-11-25T01:02:03Z", id: foreignId } });
    denied(first); denied(max);
    assert.equal(promptAuth.reads, 2);
    assert.equal(calls.length, 2);
    for (const [index, call] of calls.entries()) {
      const params = new URLSearchParams(call.search);
      assert.equal(call.method, "GET");
      assert.equal(call.path, "/rest/v1/generation_jobs");
      assert.equal(call.body, null);
      assert.equal(call.authorized, true);
      assert.deepEqual(params.getAll("owner_id"), ["eq." + ownerA]);
      assert.equal(params.get("limit"), index === 0 ? "21" : "41");
      assert.equal(params.get("prompt"), "ilike.%x&owner\\_id=eq." + ownerB + "%");
    }
    await assert.rejects(() => promptHistory.listPromptHistory({ cursor: { createdAt: "x),owner_id.eq." + ownerB, id: foreignId } }), /Invalid history cursor/);
    assert.equal(calls.length, 2);
    promptAuth.account = null; // denied by the existing fresh session/MFA/admission gate
    assert.equal(await promptHistory.listPromptHistory(malicious), null);
    assert.equal(calls.length, 2, "denied account must not reach service-role DB");
  } finally { promptAuth.account = { id: ownerA }; }
});
