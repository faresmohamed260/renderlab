import assert from "node:assert/strict";
import test from "node:test";
import {
  RENDERLAB_VERCEL_PROJECT_ID,
  compareProductionLiveState,
} from "../../scripts/lib/production-live-state.mjs";

const applicationSha = "d7571a230b3f1c5719552628db020823adb4da73";
const rollbackSha = "bcb2de305b15f4be15ed42674d22998c30b8c811";
const manifest = {
  schemaVersion: 1,
  applicationSha,
  deploymentId: "dpl_current123",
  deploymentUrl: "https://renderlab-current.vercel.app",
  domain: "renderlab.example.test",
  rollbackDeploymentId: "dpl_rollback123",
  rollbackApplicationSha: rollbackSha,
  releaseQualification: {
    deploymentReadinessRunId: 101,
    releaseMatrixRunId: 102,
    releaseMatrixAttempt: 1,
    acceptedChildren: 23,
    expectedChildren: 23,
    qualifiedAt: "2026-10-09T13:22:15.000Z",
  },
  cutoverAt: "2026-10-09T13:25:40.464Z",
};

function liveState() {
  return {
    manifest,
    deployment: {
      id: manifest.deploymentId,
      readyState: "READY",
      target: "production",
      url: "renderlab-current.vercel.app",
      project: { id: RENDERLAB_VERCEL_PROJECT_ID },
      meta: { githubCommitSha: applicationSha },
    },
    alias: {
      alias: manifest.domain,
      projectId: RENDERLAB_VERCEL_PROJECT_ID,
      deploymentId: manifest.deploymentId,
      updatedAt: Date.parse(manifest.cutoverAt),
    },
    rollbackDeployment: {
      id: manifest.rollbackDeploymentId,
      state: "READY",
      project: { id: RENDERLAB_VERCEL_PROJECT_ID },
      meta: { githubCommitSha: rollbackSha },
    },
    readinessRun: {
      id: manifest.releaseQualification.deploymentReadinessRunId,
      conclusion: "success",
      head_sha: applicationSha,
    },
    releaseMatrixRun: {
      id: manifest.releaseQualification.releaseMatrixRunId,
      conclusion: "success",
      head_sha: applicationSha,
      run_attempt: 1,
      updated_at: "2026-10-09T13:22:15Z",
    },
  };
}

test("live production metadata agrees with the canonical manifest", () => {
  const result = compareProductionLiveState(liveState());
  assert.equal(result.applicationSha, applicationSha);
  assert.equal(result.deploymentId, manifest.deploymentId);
  assert.equal(result.cutoverAt, manifest.cutoverAt);
});

test("live verifier fails closed on a custom-domain target mismatch", () => {
  const state = liveState();
  state.alias.deploymentId = "dpl_other123";
  assert.throws(() => compareProductionLiveState(state), /custom-domain deployment target mismatch/);
});

test("live verifier fails closed on a rollback SHA mismatch", () => {
  const state = liveState();
  state.rollbackDeployment.meta.githubCommitSha = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  assert.throws(() => compareProductionLiveState(state), /rollback Git SHA mismatch/);
});

test("live verifier binds release qualification to the production SHA", () => {
  const state = liveState();
  state.releaseMatrixRun.head_sha = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  assert.throws(() => compareProductionLiveState(state), /Release Candidate Matrix head SHA mismatch/);
});

test("live verifier binds cutover time to the alias update timestamp", () => {
  const state = liveState();
  state.alias.updatedAt += 1_000;
  assert.throws(() => compareProductionLiveState(state), /custom-domain cutover time mismatch/);
});
