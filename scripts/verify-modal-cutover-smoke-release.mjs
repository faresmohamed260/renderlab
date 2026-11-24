import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, writeFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { readProductionManifest } from "./lib/production-documentation-sync.mjs";
import { verifyModalCutoverSmokeRelease } from "./lib/production-live-state.mjs";
import { githubReader, verifyCutoverDispatchInputs, verifyCutoverQualification, stageReceiptFromProviders,
  validateStageReceipt, verifyReceiptArtifact } from "./lib/cutover-smoke-gate.mjs";

const env = process.env;
const sha = env.RENDERLAB_EXPECTED_PRODUCTION_SHA?.toLowerCase();
const deploymentId = env.RENDERLAB_CUTOVER_DEPLOYMENT_ID;
const cutoverAt = env.RENDERLAB_CUTOVER_ALIAS_UPDATED_AT;
const exclusiveWindow = env.RENDERLAB_CONFIRM_EXCLUSIVE_RELEASE_WINDOW === "true";
const vercelToken = env.VERCEL_TOKEN;
const github = githubReader(env.GITHUB_TOKEN);

function assert(condition, message) { if (!condition) throw new Error(message); }
function checkoutGuard() {
  assert(/^[0-9a-f]{40}$/.test(sha ?? ""), "Exact source required.");
  assert(execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim() === sha, "Checkout SHA mismatch.");
  assert(execFileSync("git", ["status", "--porcelain", "--untracked-files=no"], { encoding: "utf8" }).trim() === "", "Tracked checkout is dirty.");
  if (env.GITHUB_ACTIONS === "true") {
    assert(env.GITHUB_REF === "refs/heads/main" && env.GITHUB_SHA === sha && env.GITHUB_EVENT_NAME === "workflow_dispatch",
      "Cutover workflow requires manual protected-main checkout.");
  }
}

async function readReceipt(artifactId) {
  const artifact = await github("/actions/artifacts/" + artifactId);
  assert(Number.isSafeInteger(artifact?.workflow_run?.id), "Missing stage receipt run.");
  const run = await github("/actions/runs/" + artifact.workflow_run.id);
  const digest = verifyReceiptArtifact({ artifact, run, artifactId, sha });
  // Never forward the GitHub token to the signed storage redirect.
  const response = await fetch("https://api.github.com/repos/faresmohamed260/renderlab/actions/artifacts/" + artifactId + "/zip",
    { redirect: "manual", signal: AbortSignal.timeout(15000), headers: { Authorization: "Bearer " + env.GITHUB_TOKEN, "User-Agent": "renderlab-cutover-verifier" } });
  assert(response.status === 302, "Stage receipt download did not redirect.");
  const url = new URL(response.headers.get("location"));
  assert(url.protocol === "https:" && !url.username && !url.password && !url.port &&
    /\.(blob\.core\.windows\.net|actions\.githubusercontent\.com|actions\.github\.com)$/.test(url.hostname), "Unexpected receipt storage host.");
  const download = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(15000) });
  assert(download.ok && Number.isSafeInteger(artifact.size_in_bytes) && artifact.size_in_bytes > 0 && artifact.size_in_bytes <= 65536, "Invalid receipt archive size.");
  const reader = download.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      assert(total <= 65536, "Receipt archive too large.");
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  const bytes = Buffer.concat(chunks);
  assert("sha256:" + createHash("sha256").update(bytes).digest("hex") === digest, "Receipt artifact digest mismatch.");
  const directory = await mkdtemp(join(tmpdir(), "renderlab-cutover-"));
  try {
    const archive = join(directory, "receipt.zip");
    await writeFile(archive, bytes);
    const listing = execFileSync("unzip", ["-Z1", archive], { encoding: "utf8", maxBuffer: 65536 }).trim();
    assert(listing === "receipt.json", "Unexpected receipt archive entries.");
    const receipt = JSON.parse(execFileSync("unzip", ["-p", archive, "receipt.json"], { encoding: "utf8", maxBuffer: 65536 }));
    assert(Number.isFinite(Date.parse(run.created_at)) && Number.isFinite(Date.parse(run.updated_at)) &&
      Date.parse(receipt.observedAt) >= Date.parse(run.created_at) && Date.parse(receipt.observedAt) <= Date.parse(run.updated_at), "Receipt observation outside producer run.");
    return { receipt, digest, producerRunId: run.id };
  } finally { await rm(directory, { recursive: true, force: true }); }
}

try {
  checkoutGuard();
  const prior = await readProductionManifest();
  if (process.argv.includes("--stage")) {
    assert(env.GITHUB_ACTIONS === "true", "Stage receipts are produced by the protected workflow only.");
    const receipt = await stageReceiptFromProviders({ sha, deploymentId, readinessRunId: Number(env.RENDERLAB_READINESS_RUN_ID),
      prior, authorizationRef: env.RENDERLAB_RELEASE_AUTHORIZATION_REF, workerEvidenceRef: env.RENDERLAB_WORKER_EVIDENCE_REF,
      exclusiveWindow, vercelToken, github });
    await mkdir("artifacts/cutover-stage", { recursive: true });
    await writeFile("artifacts/cutover-stage/receipt.json", JSON.stringify(receipt, null, 2) + "\n");
    console.log("Staged release receipt captured; no provider mutation.");
  } else {
    const artifactId = env.RENDERLAB_CUTOVER_RECEIPT_ARTIFACT_ID;
    assert(verifyCutoverDispatchInputs({ deploymentId, artifactId, cutoverAt, exclusiveWindow,
      runAttempt: env.GITHUB_RUN_ATTEMPT || "1" }), "Cutover receipt required.");
    const { receipt, digest, producerRunId } = await readReceipt(Number(artifactId));
    const qualification = await verifyCutoverQualification({ sha, readinessRunId: receipt.qualification?.readinessRunId,
      github, before: receipt.observedAt, expected: receipt.qualification });
    // Verify rollback remains READY and unchanged by re-reading the prior deployment, without requiring it to remain live.
    const { cutoverReadJson, validateCutoverDeployment, RENDERLAB_VERCEL_TEAM_ID } = await import("./lib/production-live-state.mjs");
    const rollback = validateCutoverDeployment(await cutoverReadJson(
      "https://api.vercel.com/v13/deployments/" + prior.deploymentId + "?withGitRepoInfo=true&teamId=" + RENDERLAB_VERCEL_TEAM_ID, vercelToken),
      prior.deploymentId, prior.applicationSha);
    assert(rollback.deploymentUrl === prior.deploymentUrl, "Rollback URL mismatch.");
    const live = await verifyModalCutoverSmokeRelease({ expectedSha: sha, deploymentId, cutoverAt, exclusiveWindow,
      scenario: env.RENDERLAB_FIBO_SMOKE_SCENARIO, vercelToken });
    validateStageReceipt({ receipt, live, prior, qualification });
    if (env.RENDERLAB_CUTOVER_EVIDENCE_PATH) {
      await mkdir(dirname(env.RENDERLAB_CUTOVER_EVIDENCE_PATH), { recursive: true });
      await writeFile(env.RENDERLAB_CUTOVER_EVIDENCE_PATH, JSON.stringify({ live, digest, producerRunId, artifactId, qualification,
        rollbackDeploymentId: prior.deploymentId, authorizationRef: receipt.authorizationRef, workerEvidenceRef: receipt.workerEvidenceRef,
        verifiedAt: new Date().toISOString() }, null, 2) + "\n");
    }
    console.log("CUTOVER_SMOKE_RELEASE " + live.sha + " " + live.deploymentId + " " + live.cutoverAt);
  }
} catch {
  // No provider bodies, signed redirect URLs or credentials may reach logs.
  console.error("Cutover verification failed closed; inspect authorized read-only evidence and reconcile before retry.");
  process.exitCode = 1;
}
