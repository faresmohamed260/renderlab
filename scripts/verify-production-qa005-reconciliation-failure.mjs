import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import {
  configuredTestAccountIdentity,
  createConfiguredTestAccount,
  deleteConfiguredTestAccount,
  routeLocalAppRequestsWithAccount,
  withAccountAuthorization,
} from "./lib/configured-test-account.mjs";

const cleanupOnly = process.argv.includes("--cleanup-only");
const liveUrl = (process.env.RENDERLAB_TEST_BASE_URL || "").replace(/\/$/, "");
const localUrl = (process.env.RENDERLAB_QA005_LOCAL_BASE_URL || "").replace(/\/$/, "");
const mockUrl = (process.env.RENDERLAB_QA005_MOCK_WORKER_URL || "").replace(/\/$/, "");
const outDir = process.env.RENDERLAB_QA005_ARTIFACT_DIR || "artifacts/qa005-production-reconciliation-failure";
const expectedSha = process.env.RENDERLAB_EXPECTED_PRODUCTION_SHA || "";
const localSha = process.env.RENDERLAB_QA005_LOCAL_SOURCE_SHA || "";
const fixture = configuredTestAccountIdentity("qa005-reconciliation-failure");
const providerPrompt = "QA-005 bounded provider-status failure";
const orchestrationPrompt = "QA-005 bounded orchestration failure";
const internalMarker = "phase14-internal-provider-detail-must-not-leak";
const evidenceFiles = [];
const outputKeys = new Set();

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for QA-005.`);
  return value;
}

const supabaseUrl = required("SUPABASE_URL").replace(/\/$/, "");
const serviceKey = required("SUPABASE_SERVICE_ROLE_KEY");
const reconcilerSecret = required("RENDERLAB_GENERATION_RECONCILER_SECRET");
const bucket = required("R2_BUCKET_NAME");

if (!/^[0-9a-f]{40}$/i.test(expectedSha) || localSha !== expectedSha) throw new Error("QA-005 exact production SHA verification failed.");
if (liveUrl !== "https://renderlab.faresuniform.uk") throw new Error("QA-005 must use the production custom domain.");
if (!localUrl.startsWith("http://127.0.0.1:") || !mockUrl.startsWith("http://127.0.0.1:")) throw new Error("QA-005 local services must be loopback-only.");
if (process.env.RENDERLAB_CONFIRM_FIXTURE_ONLY_FAILURE_WORK !== "true") throw new Error("QA-005 fixture-only acknowledgement is required.");
if (process.env.RENDERLAB_CONFIRM_ZERO_REAL_PROVIDER_WORK !== "true") throw new Error("QA-005 zero-real-provider acknowledgement is required.");
if (process.env.RENDERLAB_TEST_RECONCILER_OWNER_SCOPE !== "true" || process.env.RENDERLAB_TEST_RECONCILER_OWNER_ID !== fixture.id) {
  throw new Error("QA-005 reconciler is not scoped to the exact run-owned fixture.");
}
if (process.env.RENDERLAB_TEST_NATIVE_WORKER_OVERRIDE !== "true" || (process.env.RENDERLAB_TEST_NATIVE_WORKER_GATEWAY_URL || "").replace(/\/$/, "") !== mockUrl) {
  throw new Error("QA-005 worker routing is not isolated to the run-local mock.");
}

const db = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${required("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: required("R2_ACCESS_KEY_ID"), secretAccessKey: required("R2_SECRET_ACCESS_KEY") },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

async function oneJob(id) {
  const { data, error } = await db.from("generation_jobs").select("*").eq("owner_id", fixture.id).eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}
async function updateJob(id, patch) {
  const { error } = await db.from("generation_jobs").update(patch).eq("owner_id", fixture.id).eq("id", id);
  if (error) throw error;
}
async function jobAssets(id) {
  const { data, error } = await db.from("media_assets").select("id").eq("owner_id", fixture.id).eq("generation_job_id", id);
  if (error) throw error;
  return data || [];
}
async function reservations(id) {
  const { data, error } = await db.from("generation_admission_reservations").select("id,released_at").eq("owner_id", fixture.id).eq("job_id", id);
  if (error) throw error;
  return data || [];
}
function assetId(jobId) {
  const b = Buffer.from(createHash("sha256").update(`renderlab:generation-output:${jobId}:0`).digest().subarray(0,16));
  b[6]=(b[6]&15)|80; b[8]=(b[8]&63)|128;
  const h=b.toString("hex");
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
function imageKey(job) {
  const d=new Date(job.created_at);
  return `renderlab/generations/${d.getUTCFullYear()}/${String(d.getUTCMonth()+1).padStart(2,"0")}/${assetId(job.id)}.png`;
}
async function keyExists(key) {
  try { await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key })); return true; }
  catch (e) { if (e?.$metadata?.httpStatusCode===404 || e?.name==="NotFound" || e?.name==="NoSuchKey") return false; throw e; }
}
async function reconcile() {
  const response = await fetch(`${localUrl}/api/internal/generation/reconcile`, {
    method: "POST", headers: { authorization: `Bearer ${reconcilerSecret}` },
  });
  const body = await response.json().catch(() => null);
  if (response.status !== 200 || body?.ok !== true) throw new Error(`Owner-scoped exact-source reconciliation failed (${response.status}).`);
}
async function submitMockJob(account) {
  const response = await fetch(`${localUrl}/api/generation/jobs`, withAccountAuthorization(account, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ prompt: providerPrompt, output: { kind: "image", aspectRatio: "1:1" }, inputs: [] }),
  }));
  const body = await response.json().catch(() => null);
  if (response.status !== 202 || !body?.job?.id) throw new Error(`QA-005 mock submission failed (${response.status}).`);
  return body.job.id;
}
async function insertStaleJob() {
  const id=randomUUID(), at=new Date(Date.now()-20*60*1000).toISOString();
  const { error } = await db.from("generation_jobs").insert({
    id, owner_id: fixture.id, status: "queued", operation: "create-image", output_kind: "image",
    prompt: orchestrationPrompt, workflow_id: "flux2-klein-image-generate",
    model: "FLUX.2 Klein 9B · DarkBeast V2 BFS", ecosystem: "flux2-klein-9b",
    inputs: [], parameters: { output: { kind: "image", aspectRatio: "1:1" }, advanced: {} },
    worker_id: null, provider_job_id: null, worker_state: null, created_at: at, updated_at: at, started_at: null,
  });
  if (error) throw error;
  return id;
}
async function assertNoOutputs(jobId) {
  if ((await jobAssets(jobId)).length) throw new Error("QA-005 failed fixture unexpectedly created durable media.");
}
async function assertR2Absent() {
  for (const key of outputKeys) if (await keyExists(key)) throw new Error("QA-005 failed fixture unexpectedly created an R2 output.");
}
async function trackKnownFailureOutputKeys() {
  const { data, error } = await db
    .from("generation_jobs")
    .select("id,created_at,output_kind")
    .eq("owner_id", fixture.id);
  if (error) throw error;
  for (const job of data || []) {
    if (job.output_kind === "image") outputKeys.add(imageKey(job));
  }
}
async function independentAbsence() {
  for (const [table,column] of [
    ["generation_admission_reservations","owner_id"],["generation_jobs","owner_id"],["generation_sources","owner_id"],
    ["media_upload_sessions","owner_id"],["media_assets","owner_id"],["renderlab_account_access","user_id"],
    ["renderlab_account_profiles","owner_id"],["renderlab_account_preferences","owner_id"],
  ]) {
    const { data, error } = await db.from(table).select("*").eq(column, fixture.id).limit(1);
    if (error) throw error;
    if (data?.length) throw new Error(`QA-005 cleanup left fixture residue in ${table}.`);
  }
  const { data: authUser, error: authError } = await db.auth.admin.getUserById(fixture.id);
  if (authError && !/not found/i.test(String(authError.message || ""))) throw authError;
  if (authUser?.user) throw new Error("QA-005 cleanup left the fixture Auth user.");
  await assertR2Absent();
  return { verified: true, contractedDbAuthResidue: 0, trackedR2ObjectsChecked: outputKeys.size };
}
async function clean() {
  await trackKnownFailureOutputKeys();
  await deleteConfiguredTestAccount(fixture);
  return independentAbsence();
}
async function shot(page,name) {
  await page.screenshot({ path:path.join(outDir,name), fullPage:true });
  evidenceFiles.push(name);
}
async function assertActivity(page, jobs) {
  await page.goto(`${liveUrl}/activity`, { waitUntil:"networkidle" });
  for (const item of jobs) {
    const row=page.locator('li[data-activity-status="failed"]').filter({hasText:item.prompt});
    if (await row.count()!==1 || await row.getAttribute("data-active")!=="false") throw new Error(`Activity did not show stable failed state for ${item.prompt}.`);
    for (const text of ["Failed","Needs action","Generation did not complete. Retry when you’re ready."]) {
      if (await row.getByText(text,{exact:true}).count()!==1) throw new Error(`Activity missing "${text}" for ${item.prompt}.`);
    }
    if (await row.getByRole("button",{name:"Retry"}).count()!==1) throw new Error(`Activity Retry missing for ${item.prompt}.`);
    const visible=await row.innerText();
    for (const secret of [internalMarker,item.job.error_code,item.job.worker_id,item.job.provider_job_id].filter(Boolean)) {
      if (visible.includes(String(secret))) throw new Error("Activity leaked internal failure data.");
    }
  }
  if (await page.locator('[data-activity-live="true"]').count()) throw new Error("Activity still shows LIVE refresh after failure terminalization.");
}
async function visualProof(account, jobs) {
  const browser=await chromium.launch({headless:true});
  try {
    const desktop=await browser.newContext({viewport:{width:1440,height:1000}});
    const page=await desktop.newPage();
    await routeLocalAppRequestsWithAccount(page, liveUrl, account);
    await assertActivity(page,jobs); await shot(page,"00-activity-failed-desktop.png");
    const retry=page.locator('li[data-activity-status="failed"]').filter({hasText:providerPrompt}).getByRole("button",{name:"Retry"});
    await page.keyboard.press("Tab"); await retry.focus();
    const focus=await retry.evaluate(el=>{const s=getComputedStyle(el);return s.outlineStyle!=="none"||s.boxShadow!=="none";});
    if (!focus) throw new Error("Retry focus is not visibly styled.");
    await shot(page,"01-activity-retry-focus-desktop.png");
    await page.waitForTimeout(6500); await assertActivity(page,jobs); await shot(page,"02-activity-post-refresh-interval-desktop.png");
    await desktop.close();

    const mobile=await browser.newContext({viewport:{width:390,height:844},reducedMotion:"reduce",isMobile:true,hasTouch:true});
    const mp=await mobile.newPage();
    await routeLocalAppRequestsWithAccount(mp, liveUrl, account);
    await assertActivity(mp,jobs);
    const overflow=await mp.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    if (overflow>1) throw new Error(`Activity overflows 390px by ${overflow}px.`);
    await shot(mp,"03-activity-failed-mobile-reduced.png"); await mobile.close();
  } finally { await browser.close(); }
}
async function manifest(body) {
  await mkdir(outDir,{recursive:true});
  await writeFile(path.join(outDir,"manifest.json"),JSON.stringify(body,null,2)+"\n");
}

await mkdir(outDir,{recursive:true});
if (cleanupOnly) {
  const cleanup=await clean();
  console.log(`QA-005 fixture cleanup verified. r2=${cleanup.trackedR2ObjectsChecked}`);
  process.exit(0);
}

let account, providerJob, orchestrationJob, cleanup={verified:false}, failure=null;
try {
  await clean();
  account=await createConfiguredTestAccount("qa005-reconciliation-failure");

  const providerId=await submitMockJob(account);
  let row=await oneJob(providerId);
  if (!row?.provider_job_id || !row?.worker_id) throw new Error("Mock fixture lacks local dispatch identity.");
  outputKeys.add(imageKey(row));
  const unavailable=await fetch(`${mockUrl}/jobs/${encodeURIComponent(row.provider_job_id)}/unavailable`,{method:"POST"});
  if (!unavailable.ok) throw new Error("Could not mark run-local mock provider unavailable.");
  await updateJob(providerId,{updated_at:new Date(Date.now()-3*60*60*1000).toISOString()});
  await reconcile();
  providerJob=await oneJob(providerId);
  if (providerJob?.status!=="failed" || providerJob?.error_code!=="generation_provider_stalled") throw new Error("Provider outage did not reach generation_provider_stalled.");
  if (String(providerJob.error_message||"").includes(internalMarker) || !JSON.stringify(providerJob.failover_history||[]).includes(internalMarker)) throw new Error("Provider diagnostic sanitization boundary failed.");
  const providerReservations=await reservations(providerId);
  if (providerReservations.length!==1 || !providerReservations[0].released_at) throw new Error("Provider failure did not release admission.");
  await assertNoOutputs(providerId);

  const orchestrationId=await insertStaleJob();
  row=await oneJob(orchestrationId); outputKeys.add(imageKey(row));
  await reconcile();
  orchestrationJob=await oneJob(orchestrationId);
  if (orchestrationJob?.status!=="failed" || orchestrationJob?.error_code!=="generation_orchestration_stalled") throw new Error("Stale orchestration did not reach generation_orchestration_stalled.");
  await assertNoOutputs(orchestrationId); await assertR2Absent();

  const jobs=[
    {prompt:providerPrompt,job:providerJob,label:"provider-status-outage"},
    {prompt:orchestrationPrompt,job:orchestrationJob,label:"stale-orchestration"},
  ];
  await visualProof(account,jobs);
  await deleteConfiguredTestAccount(account); account=null;
  cleanup=await independentAbsence();
} catch (e) {
  failure=e instanceof Error?e.message:String(e);
  try { await deleteConfiguredTestAccount(account||fixture); account=null; cleanup=await independentAbsence(); }
  catch (ce) { cleanup={verified:false,error:ce instanceof Error?ce.message:String(ce)}; }
}

const passed=!failure && cleanup.verified===true;
await manifest({
  audit:"QA-005",runId:process.env.GITHUB_RUN_ID||null,runAttempt:process.env.GITHUB_RUN_ATTEMPT||null,
  baseUrl:liveUrl,expectedProductionSource:expectedSha,harnessSource:process.env.GITHUB_SHA||null,
  localExactProductionSource:localSha,fixtureOnlyFailureWorkAcknowledged:true,zeroRealProviderWorkAcknowledged:true,
  providerBackedGenerationDispatched:false,runOwnedMockWorkerUsed:true,
  jobs:[
    ...(providerJob?[{label:"provider-status-outage",id:providerJob.id,status:providerJob.status,terminalCode:providerJob.error_code}]:[]),
    ...(orchestrationJob?[{label:"stale-orchestration",id:orchestrationJob.id,status:orchestrationJob.status,terminalCode:orchestrationJob.error_code}]:[]),
  ],
  evidenceFiles,cleanup,passed,...(failure?{failure}:{}),completedAt:new Date().toISOString(),
});
if (!passed) throw new Error(`QA-005 audit failed: ${failure||"cleanup failed"}`);
console.log("QA-005 production reconciliation failure audit passed with zero real provider work.");
