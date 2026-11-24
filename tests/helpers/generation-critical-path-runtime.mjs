import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import * as realCrypto from "node:crypto";

export const OWNER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const OWNER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const JOB_ID = "10000000-0000-4000-8000-000000000001";
export const RESERVATION_ID = "20000000-0000-4000-8000-000000000001";
export const PROVIDER_ID = "fc-OFFLINEHANDLE000001." + "a".repeat(64);
export const FIXED_TIME = Date.parse("2026-11-23T12:00:00.000Z");
const KEY = Symbol.for("renderlab.p0-05.fake-runtime");
const OriginalDate = Date;

const initial = () => ({
  nowMs: FIXED_TIME, uuidCounter: 1,
  reservations: new Map(), jobs: new Map(), outbox: new Map(), media: new Map(), r2: new Map(), references: new Map(),
  traces: [], diagnostics: [], afterTasks: [], r2Writes: 0, mediaWrites: 0,
  releases: 0, dispatchCalls: 0, wakeCalls: 0, providerPolls: 0, providerCancels: 0,
  admissionFailure: null, providerOutcome: "ready", cancelOutcome: "confirmed", wakeFailure: false, wakeResponseLost: false,
  skipDispatch: false, finalizationFault: null, faultUsed: false, r2WriteFailure: false, mediaInsertFailure: false,
  beforeJobPatch: null, jobPatchMutations: 0, jobPatchAttempts: 0,
  atomicRpcAvailable: true, atomicRpcFailure: false, atomicCommits: 0, atomicAttempts: 0,
  realCrypto, nextUuid() {
    const index = (this.uuidCounter++).toString(16).padStart(12, "0");
    return "00000000-0000-4000-8000-" + index;
  },
});

export const runtime = globalThis[KEY] = initial();

class FixedDate extends OriginalDate {
  constructor(...args) {
    if (args.length === 0) super(globalThis[KEY].nowMs);
    else super(...args);
  }
  static now() { return globalThis[KEY].nowMs; }
}
globalThis.Date = FixedDate;

const stub = (source) => ({ url: "data:text/javascript," + encodeURIComponent(source), shortCircuit: true });
const state = "const s=globalThis[Symbol.for('renderlab.p0-05.fake-runtime')];";

registerHooks({
  resolve(spec, context, nextResolve) {
    if (spec === "server-only") return stub("export {};");
    if (spec === "node:crypto" && String(context.parentURL).includes("/src/")) {
      return stub(state + "export const createHash=s.realCrypto.createHash;"
        + "export function randomUUID(){return s.nextUuid();}");
    }
    if (spec === "next/server") return stub(state
      + "export const NextResponse=Response;export function after(task){s.afterTasks.push(task);}");
    if (spec === "@/lib/supabase/server") return stub(
      "export async function getCurrentRenderLabIdentity(){return {id:" + JSON.stringify(OWNER_A) + "};}"
      + "export async function getCurrentRenderLabAccount(){return {id:" + JSON.stringify(OWNER_A) + "};}");
    if (spec === "@/server/security/same-origin-mutation") {
      return stub("export function enforceSameOriginMutation(){return null;}");
    }
    if (spec === "@/server/media/media-assets") {
      return stub("export async function getMediaAsset(){return null;}");
    }
    if (spec === "@/server/media/reference-uploads") {
      return stub("export async function getReadyFiboMaskSource(){return null;}"
        + "export async function getReadyReferenceSource(){return null;}");
    }
    if (spec === "@/server/generation/geometry") {
      return stub(
        "export async function createImageGenerationCanvas(){return {bytes:Buffer.from([137,80,78,71,13,10,26,10]),contentType:'image/png',filename:'canvas.png'};}"
        + "export async function prepareImageAspectOverride(bytes){return bytes;}"
        + "export async function sourceVideoAspectRatio(){return '1:1';}");
    }
    if (spec === "@/server/generation/fibo-worker-payload") {
      return stub("export function buildFiboWorkerPayload(){return {contentType:'application/json',body:JSON.stringify({prompt:'fixture',images:[]})};}");
    }
    if (spec === "@/server/generation/upscale-output-metadata") {
      return stub("export async function inspectUpscaleOutputMetadata(){return {sizeBytes:8,width:1,height:1};}");
    }
    if (spec === "@/server/generation/finalization-faults") {
      return stub(state + "export function injectGenerationFinalizationFault(stage){"
        + "if(s.finalizationFault===stage&&!s.faultUsed){s.faultUsed=true;throw Error('OFFLINE_FINALIZATION_FAULT');}}");
    }
    if (spec === "@/server/media/image-thumbnail") {
      return stub("export const IMAGE_THUMBNAIL_CONTENT_TYPE='image/png';"
        + "export async function createImageThumbnailBytes(){return Buffer.from([137,80,78,71,13,10,26,10]);}"
        + "export function imageThumbnailStorageKey(id){return 'thumbnail/'+id+'.png';}");
    }
    if (spec === "@/server/storage/r2") {
      return stub(state
        + "export function isR2Configured(){return true;}"
        + "export async function writeR2Object({key,contentType,body}){if(s.r2WriteFailure)throw Error('OFFLINE_R2_WRITE_FAILED');s.r2.set(key,{bytes:Buffer.from(body),contentType});s.r2Writes++;return {key};}"
        + "export async function headR2Object(key){let x=s.r2.get(key);if(!x)throw Error('OFFLINE_NOT_FOUND');return {sizeBytes:x.bytes.length,contentType:x.contentType,etag:'fixed-etag'};}"
        + "export async function readR2Object(key){let x=s.r2.get(key);if(!x)throw Error('OFFLINE_NOT_FOUND');return {bytes:Buffer.from(x.bytes),contentType:x.contentType};}"
        + "export async function deleteR2Object(key){s.r2.delete(key);}"
        + "export async function createSignedReadUrl(){throw Error('UNEXPECTED_SIGNED_URL');}"
        + "export async function createSignedUploadUrl(){throw Error('UNEXPECTED_SIGNED_URL');}"
        + "export async function createSignedDownloadUrl(){throw Error('UNEXPECTED_SIGNED_URL');}"
        + "export async function r2ObjectExists(key){return s.r2.has(key);}");
    }
    if (spec === "@/server/observability/diagnostics") {
      return stub(state
        + "export const gatewayAuthRejectedCode='generation_gateway_auth_rejected';"
        + "export function isGatewayAuthRejectionStatus(code){return code===401||code===403;}"
        + "export function correlationIdForGenerationJob(id){return 'job-'+id;}"
        + "export function createDiagnosticCorrelationId(){return 'fixed-correlation';}"
        + "export async function emitDiagnosticEvent(value){s.diagnostics.push(value);}");
    }
    if (spec.startsWith("@/")) {
      return nextResolve(new URL("../../src/" + spec.slice(2) + ".ts", import.meta.url).href, context);
    }
    return nextResolve(spec, context);
  },
});

Object.assign(process.env, {
  SUPABASE_URL: "https://database.example.invalid",
  SUPABASE_SERVICE_ROLE_KEY: "offline-fixture-only-not-a-secret",
  RENDERLAB_GENERATION_GATEWAY_URL: "https://fixture.modal.run",
  RENDERLAB_FIBO_MODAL_KEY: "offline-fixture-not-a-key",
  RENDERLAB_FIBO_MODAL_SECRET: "offline-fixture-not-a-secret",
  RENDERLAB_FIBO_GENERATION: "1",
  RENDERLAB_FIBO_MASK_ENABLED: "true",
  CLOUDFLARE_R2_ACCOUNT_ID: "offline-fixture",
  CLOUDFLARE_R2_ACCESS_KEY_ID: "offline-fixture",
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: "offline-fixture",
  CLOUDFLARE_R2_BUCKET: "offline-fixture",
  GITHUB_ACTIONS: "true",
});
delete process.env.RENDERLAB_GENERATION_BACKEND_URL;
delete process.env.RENDERLAB_GENERATION_BACKEND_TOKEN;
delete process.env.RENDERLAB_TEST_OBSERVABILITY_PERSIST;

export function resetRuntime(options = {}) {
  Object.assign(runtime, initial(), options);
}

function jobRows(url) {
  const row = runtime.jobs.get(JOB_ID);
  if (!row) return [];
  if (url.searchParams.has("owner_id")
    && url.searchParams.get("owner_id") !== "eq." + OWNER_A) return [];
  if (url.searchParams.has("id") && url.searchParams.get("id") !== "eq." + JOB_ID) return [];
  const filter = url.searchParams.get("status");
  if (filter?.startsWith("eq.") && row.status !== filter.slice(3)) return [];
  if (filter?.startsWith("in.(")
    && !filter.slice(4, -1).split(",").includes(row.status)) return [];
  const token = url.searchParams.get("reconcile_token");
  if (token && token !== "eq." + (row.reconcile_token ?? "")) return [];
  if (!url.searchParams.has("id") && url.searchParams.get("select") === "id") {
    const expiredFibo = row.worker_id === "fibo"
      && Date.now() - Date.parse(row.created_at) >= 20 * 60 * 1000;
    if (row.status !== "persisting" && !(row.worker_id && row.provider_job_id) && !expiredFibo) return [];
  }
  return [{...row}];
}

function mediaRows(url) {
  if (url.searchParams.has("owner_id")
    && url.searchParams.get("owner_id") !== "eq." + OWNER_A) return [];
  return [...runtime.media.values()].filter((row) =>
    (!url.searchParams.has("id") || url.searchParams.get("id") === "eq." + row.id)
    && (!url.searchParams.has("generation_job_id") || url.searchParams.get("generation_job_id") === "eq." + row.generation_job_id)
    && (!url.searchParams.has("generation_output_index")
      || url.searchParams.get("generation_output_index") === "eq." + row.generation_output_index)
  ).map((row) => ({...row}));
}

function reservationRows(url) {
  const rows = [...runtime.reservations.values()].filter((r) =>
    r.owner_id === OWNER_A && !r.released_at
    && (!url.searchParams.has("job_id") || url.searchParams.get("job_id") === "eq." + r.job_id)
  );
  return rows.map((r) => ({ ...r }));
}

function rpcResponse(rpc, body) {
  const job = runtime.jobs.get(JOB_ID);
  const reservation = runtime.reservations.get(RESERVATION_ID);
  switch (rpc) {
    case "renderlab_reserve_generation_admission":
      if (runtime.admissionFailure) {
        return Response.json({code:"P0001",message:"renderlab_"+runtime.admissionFailure},{status:400});
      }
      if (!reservation) runtime.reservations.set(RESERVATION_ID,{
        id:RESERVATION_ID, owner_id:OWNER_A, job_id:null, released_at:null,
        admitted_at:new Date().toISOString(),
      });
      return Response.json([{reservation_id:RESERVATION_ID}]);
    case "renderlab_accept_generation_dispatch_idempotent": {
      if (runtime.admissionFailure) {
        return Response.json({code:"P0001",message:"renderlab_"+runtime.admissionFailure},{status:400});
      }
      // Model one committed atomic RPC. Calls inside this SQL boundary are
      // not separate network requests, and no partial admission can escape.
      rpcResponse("renderlab_reserve_generation_admission",body);
      rpcResponse("renderlab_accept_generation_dispatch",body);
      rpcResponse("renderlab_bind_generation_admission",{...body,p_reservation_id:RESERVATION_ID,p_job_id:JOB_ID});
      return Response.json([{outcome:"accepted",job_id:JOB_ID,attempt_id:body.p_attempt_id,
        reservation_id:RESERVATION_ID,admission_deadline:body.p_admission_deadline}]);
    }
    case "renderlab_accept_generation_dispatch": {
      assert.equal(body.p_owner_id, OWNER_A);
      assert.ok(!job, "Accepted attempt must not be resubmitted as the same job");
      const created = new Date().toISOString();
      const row = {
        id: JOB_ID, owner_id: OWNER_A, status: "queued",
        operation: body.p_operation, output_kind: body.p_output_kind,
        prompt: body.p_prompt, workflow_id: body.p_workflow_id,
        model: body.p_model, ecosystem: "fibo2-edit-turbo",
        inputs: body.p_inputs, parameters: body.p_parameters,
        worker_id: "fibo", provider_job_id:null, worker_state:"queued",
        failover_history:[], output_asset_ids:[],error_code:null,error_message:null,
        created_at:created,updated_at:created,started_at:null,completed_at:null,reconcile_token:null,
      };
      runtime.jobs.set(JOB_ID,row);
      runtime.outbox.set(JOB_ID,{status:"pending",attemptId:body.p_attempt_id,executionStarted:false});
      return Response.json([{...row}]);
    }
    case "renderlab_bind_generation_admission":
      assert.equal(body.p_owner_id, OWNER_A);
      assert.equal(body.p_reservation_id, RESERVATION_ID);
      assert.equal(body.p_job_id, JOB_ID);
      if (!reservation || reservation.released_at) return Response.json(false);
      reservation.job_id=JOB_ID;
      return Response.json(true);
    case "renderlab_release_generation_admission":
      if (!reservation || reservation.released_at) return Response.json(false);
      reservation.released_at=new Date().toISOString();
      runtime.releases++;
      return Response.json(true);
    case "renderlab_claim_generation_reconciliation":
      if (!job || job.owner_id!==body.p_owner_id
        || job.id!==body.p_job_id
        || ["succeeded","failed","cancelled"].includes(job.status)) return Response.json(false);
      if (job.reconcile_token && job.reconcile_token!==body.p_token) return Response.json(false);
      job.reconcile_token=body.p_token;
      return Response.json(true);
    case "renderlab_release_generation_reconciliation":
      if (job && job.reconcile_token===body.p_token) job.reconcile_token=null;
      return Response.json(true);
    case "renderlab_terminalize_generation_and_release": {
      runtime.atomicAttempts++;
      if (!runtime.atomicRpcAvailable) {
        return Response.json({code:"PGRST202",message:"RPC absent from fixture schema cache"},{status:404});
      }
      if (runtime.atomicRpcFailure) {
        return Response.json({code:"P0001",message:"fixture backend failure"},{status:503});
      }
      const answer=(outcome,released=false)=>Response.json([{
        outcome,job_status:job?.status??null,
        output_asset_ids:job?.output_asset_ids??null,reservation_released:released,
      }]);
      if (runtime.beforeJobPatch) {
        const interpose=runtime.beforeJobPatch;runtime.beforeJobPatch=null;
        interpose({url:new URL("https://database.example.invalid/rest/v1/generation_jobs"),
          patch:{status:body.p_terminal_status}});
      }
      if (!job || job.owner_id!==body.p_owner_id || job.id!==body.p_job_id) return answer("not_found");
      const target=body.p_terminal_status,original=job.status;
      const bound=reservation?.job_id===job.id&&reservation.owner_id===job.owner_id&&!reservation.released_at;
      const release=()=>{
        if (!bound || reservation.released_at) return false;
        reservation.released_at=new Date().toISOString();runtime.releases++;return true;
      };
      if (["succeeded","failed","cancelled"].includes(original)) {
        if (target!==original || (original==="succeeded"&&body.p_asset_id
          &&job.output_asset_ids?.[0]!==body.p_asset_id)) return answer("conflict");
        return answer("already_terminal",release());
      }
      const legal=(target==="succeeded"&&original==="persisting")
        ||(target==="failed"&&["queued","preparing","running","persisting"].includes(original))
        ||(target==="cancelled"&&["queued","cancelling"].includes(original));
      if (!legal || body.p_expected_status!==original
        || (job.reconcile_token && job.reconcile_token!==body.p_reconcile_token)) {
        return answer("conflict");
      }
      if (target==="succeeded") {
        const output=[...runtime.media.values()].find(x=>x.id===body.p_asset_id
          && x.owner_id===body.p_owner_id && x.generation_job_id===job.id
          && x.generation_output_index===0);
        if (!output) return answer("conflict");
      } else if (target==="failed") {
        if (!body.p_error_code||!body.p_error_message||job.output_asset_ids.length
          ||[...runtime.media.values()].some(x=>x.generation_job_id===job.id&&x.generation_output_index===0)) return answer("conflict");
      } else if (job.output_asset_ids.length) return answer("conflict");
      const now=new Date().toISOString();
      Object.assign(job,{
        status:target,completed_at:job.completed_at??now,updated_at:now,
        output_asset_ids:target==="succeeded"?[body.p_asset_id]:job.output_asset_ids,
        worker_state:target==="succeeded"?"ready":target==="cancelled"?"cancelled":job.worker_state,
        error_code:target==="failed"?body.p_error_code:null,
        error_message:target==="failed"?body.p_error_message:null,
        failover_history:body.p_failover_history??job.failover_history,
      });
      runtime.atomicCommits++;
      return answer("applied",release());
    }
    case "renderlab_cancel_queued_generation_dispatch": {
      const outbox=runtime.outbox.get(JOB_ID);
      if (!job||job.status!=="queued"||job.owner_id!==body.p_owner_id
        ||!outbox||outbox.executionStarted ||!["pending","claimed","retry_wait","unresolved"].includes(outbox.status)) {
        return Response.json([]);
      }
      outbox.status="cancelled";
      Object.assign(job,{status:"cancelled",worker_state:"cancelled",completed_at:new Date().toISOString(),updated_at:new Date().toISOString()});
      return Response.json([{...job}]);
    }
    default:
      throw new Error("Unexpected fake RPC " + rpc);
  }
}

function handleDatabase(url, init) {
  const method = init?.method ?? "GET";
  const content = init?.body ? JSON.parse(init.body) : null;
  const tail = url.pathname.replace("/rest/v1/","");
  const [table] = tail.split("/");
  runtime.traces.push({side:"db",method,table:tail,search:url.search,body:content});
  if (tail.startsWith("rpc/")) return rpcResponse(tail.slice(4),content);
  if (tail === "generation_jobs") {
    if (method === "GET") return Response.json(jobRows(url));
    if (method === "PATCH") {
      runtime.jobPatchAttempts++;
      if (runtime.beforeJobPatch) {
        const interpose=runtime.beforeJobPatch; runtime.beforeJobPatch=null;
        interpose({url,patch:content});
      }
      const existing=jobRows(url)[0];
      if (!existing) return Response.json([]);
      const row=runtime.jobs.get(JOB_ID);
      Object.assign(row,content);
      runtime.jobPatchMutations++;
      return Response.json([{...row}]);
    }
  }
  if (tail === "generation_admission_reservations") {
    if (method === "GET") return Response.json(reservationRows(url));
    if (method === "PATCH") {
      const eligible=reservationRows(url);
      for (const row of eligible) {
        const stored=runtime.reservations.get(row.id);
        if (stored && !stored.released_at) {
          stored.released_at=content.released_at;
          runtime.releases++;
        }
      }
      return Response.json(eligible.map((r)=>({...r,released_at:content.released_at})));
    }
  }
  if (tail === "generation_sources") {
    if (method === "GET") {
      const owner=url.searchParams.get("owner_id");
      const id=url.searchParams.get("id")?.replace(/^eq\./, "");
      return Response.json(owner === "eq." + OWNER_A && runtime.references.has(id)
        ? [{...runtime.references.get(id)}] : []);
    }
  }  if (tail === "media_assets") {
    if (method === "GET") return Response.json(mediaRows(url));
    if (method === "POST") {
      if(runtime.mediaInsertFailure) return Response.json({code:"23514",message:"fixture media insert rejected"},{status:400});
      const duplicate=[...runtime.media.values()].find((x)=>
        x.generation_job_id === content.generation_job_id
        && x.generation_output_index === content.generation_output_index);
      if (duplicate) return Response.json({code:"23505",message:"fixture unique conflict"},{status:409});
      runtime.media.set(content.id,{...content});
      runtime.mediaWrites++;
      return Response.json([]);
    }
  }
  throw new Error("Unexpected fake PostgREST route " + method + " " + url.pathname + url.search);
}

function handleProvider(url, init) {
  const method=init?.method??"GET";
  runtime.traces.push({side:"provider",method,path:url.pathname});
  if (url.pathname==="/dispatch/wake" && method==="POST") {
    runtime.wakeCalls++;
    if(runtime.wakeFailure) return new Response(null,{status:503});
    const job=runtime.jobs.get(JOB_ID);
    const outbox=runtime.outbox.get(JOB_ID);
    if(job && outbox && job.status==="queued" && outbox.status==="pending"
      && !runtime.skipDispatch) {
      runtime.dispatchCalls++;
      outbox.status="dispatched";outbox.executionStarted=true;
      Object.assign(job,{status:"running",worker_id:"fibo",provider_job_id:PROVIDER_ID,
        worker_state:"generating",started_at:new Date().toISOString(),updated_at:new Date().toISOString()});
    }
    if (runtime.wakeResponseLost) {
      runtime.wakeResponseLost=false;
      return new Response(null,{status:503});
    }
    return new Response(null,{status:202});
  }
  if (url.pathname==="/jobs" && method==="DELETE") {
    runtime.providerCancels++;
    return new Response(null,{status:runtime.cancelOutcome==="retryable"?503:runtime.cancelOutcome==="not-running"?404:200});
  }
  if (url.pathname==="/jobs" && method==="GET") {
    runtime.providerPolls++;
    switch(runtime.providerOutcome) {
      case "pending": return Response.json({worker_state:"generating"},{status:202});
      case "retryable": return Response.json({detail:"temporary upstream issue"},{status:503});
      case "terminal": return Response.json({detail:"FIBO rejected the render inputs"},{status:422});
      case "process-exited": return Response.json({detail:"FIBO_PROCESS_EXITED"},{status:409});
      case "render-timeout": return Response.json({detail:"FIBO_RENDER_TIMED_OUT"},{status:409});
      case "expired-result": return Response.json({detail:"FIBO result expired"},{status:410});
      case "transport-timeout": throw new DOMException("Offline provider timeout","TimeoutError");
      case "ambiguous": return Response.json({detail:"Unknown FIBO job"},{status:404});
      case "ready": return new Response(Buffer.from([137,80,78,71,13,10,26,10]),
        {status:200,headers:{"content-type":"image/png"}});
      default: throw new Error("Unexpected fake provider scenario "+runtime.providerOutcome);
    }
  }
  throw new Error("Unexpected fake provider route " + method + " "+url.pathname);
}

export async function fakeFetch(input, init) {
  const url=new URL(input);
  if (url.origin==="https://database.example.invalid") return handleDatabase(url,init);
  if (url.origin==="https://fixture.modal.run") return handleProvider(url,init);
  throw new Error("OFFLINE NETWORK BLOCKED: "+url.origin+url.pathname);
}

export async function flushAfter() {
  while (runtime.afterTasks.length) {
    const batch=runtime.afterTasks.splice(0);
    for (const task of batch) await task();
  }
}
export function currentJob() {return runtime.jobs.get(JOB_ID)??null;}
export function heldReservation() {
  const r=runtime.reservations.get(RESERVATION_ID);
  return Boolean(r&&!r.released_at);
}
export function setAge(milliseconds) {
  const row=currentJob();
  assert.ok(row,"Expected job before setting age");
  row.updated_at=new OriginalDate(runtime.nowMs-milliseconds).toISOString();
}
