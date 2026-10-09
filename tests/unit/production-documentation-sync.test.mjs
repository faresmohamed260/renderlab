import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  PRODUCTION_DOCUMENTATION_AUTHORITIES,
  PRODUCTION_MANIFEST_PATH,
  PRODUCTION_STATUS_SUMMARY,
  readProductionManifest,
  verifyProductionDocumentationSync,
} from "../../scripts/lib/production-documentation-sync.mjs";

const currentSha = "d7571a230b3f1c5719552628db020823adb4da73";
const oldSha = "d18ef8833d46c812dac6b43572b3f4f7069990f8";
const manifest = {
  schemaVersion: 1,
  applicationSha: currentSha,
  deploymentId: "dpl_current123",
  deploymentUrl: "https://renderlab-current.vercel.app",
  domain: "renderlab.example.test",
  rollbackDeploymentId: "dpl_rollback123",
  rollbackApplicationSha: "bcb2de305b15f4be15ed42674d22998c30b8c811",
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

function mirrorLines() {
  return [
    `Canonical manifest: \`${PRODUCTION_MANIFEST_PATH}\`.`,
    `Source \`${manifest.applicationSha}\`.`,
    `Deployment \`${manifest.deploymentId}\` at ${manifest.deploymentUrl}.`,
    `Domain ${manifest.domain}.`,
    `Rollback \`${manifest.rollbackDeploymentId}\` / \`${manifest.rollbackApplicationSha}\`.`,
    `Qualification ${manifest.releaseQualification.deploymentReadinessRunId} and ${manifest.releaseQualification.releaseMatrixRunId} at ${manifest.releaseQualification.qualifiedAt}.`,
    `Cutover ${manifest.cutoverAt}.`,
  ];
}

async function fixture(overrides = {}) {
  const root = await mkdtemp(join(tmpdir(), "renderlab-prod-doc-sync-"));
  await mkdir(dirname(join(root, PRODUCTION_MANIFEST_PATH)), { recursive: true });
  await writeFile(join(root, PRODUCTION_MANIFEST_PATH), JSON.stringify(overrides.manifest ?? manifest, null, 2), "utf8");

  for (const path of PRODUCTION_DOCUMENTATION_AUTHORITIES) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    const body =
      overrides[path] ??
      [
        "# Authority",
        "",
        "## Current production",
        `<!-- RENDERLAB_CURRENT_PRODUCTION_SHA: ${currentSha} -->`,
        ...mirrorLines(),
        "",
        "## Historical rollout",
        `Historical source \`${oldSha}\` remains preserved.`,
        "",
      ].join("\n");
    await writeFile(join(root, path), body, "utf8");
  }

  await mkdir(dirname(join(root, PRODUCTION_STATUS_SUMMARY)), { recursive: true });
  await writeFile(
    join(root, PRODUCTION_STATUS_SUMMARY),
    overrides[PRODUCTION_STATUS_SUMMARY] ?? ["# Status", "", "## Production", ...mirrorLines(), "", "## Other"].join("\n"),
    "utf8",
  );
  return root;
}

test("manifest is canonical and all human production mirrors agree", async () => {
  const rootDir = await fixture();
  const result = await verifyProductionDocumentationSync({ expectedSha: currentSha, rootDir });
  assert.equal(result.results.length, 5);
  assert.equal(result.manifest.applicationSha, currentSha);
  assert.equal(result.manifest.deploymentId, manifest.deploymentId);
});

test("a stale authority marker fails even when the manifest is correct", async () => {
  const rootDir = await fixture({
    "PROJECT.md": [
      "# Project",
      "## Current production",
      `<!-- RENDERLAB_CURRENT_PRODUCTION_SHA: ${oldSha} -->`,
      ...mirrorLines(),
    ].join("\n"),
  });
  await assert.rejects(
    verifyProductionDocumentationSync({ expectedSha: currentSha, rootDir }),
    /does not match expected production SHA/,
  );
});

test("a matching marker cannot hide a stale deployment mirror", async () => {
  const rootDir = await fixture({
    "PROJECT.md": [
      "# Project",
      "## Current production",
      `<!-- RENDERLAB_CURRENT_PRODUCTION_SHA: ${currentSha} -->`,
      ...mirrorLines().map((line) => line.replace(manifest.deploymentId, "dpl_stale123")),
    ].join("\n"),
  });
  await assert.rejects(
    verifyProductionDocumentationSync({ expectedSha: currentSha, rootDir }),
    /does not mirror .*deploymentId|does not mirror .*dpl_current123/,
  );
});

test("STATUS is a checked production mirror", async () => {
  const rootDir = await fixture({
    [PRODUCTION_STATUS_SUMMARY]: [
      "# Status",
      "## Production",
      ...mirrorLines().filter((line) => !line.includes(manifest.rollbackDeploymentId)),
    ].join("\n"),
  });
  await assert.rejects(
    verifyProductionDocumentationSync({ expectedSha: currentSha, rootDir }),
    /docs\/STATUS\.md: current-production section does not mirror/,
  );
});

test("duplicate or malformed authority markers fail closed", async () => {
  const duplicate = await fixture({
    "PROJECT.md": [
      "# Project",
      "## Current production",
      `<!-- RENDERLAB_CURRENT_PRODUCTION_SHA: ${currentSha} -->`,
      `<!-- RENDERLAB_CURRENT_PRODUCTION_SHA: ${currentSha} -->`,
      ...mirrorLines(),
    ].join("\n"),
  });
  await assert.rejects(
    verifyProductionDocumentationSync({ expectedSha: currentSha, rootDir: duplicate }),
    /expected exactly one production SHA marker token/,
  );

  const malformed = await fixture({
    "PROJECT.md": [
      "# Project",
      "## Current production",
      "<!-- RENDERLAB_CURRENT_PRODUCTION_SHA: not-a-sha -->",
      ...mirrorLines(),
    ].join("\n"),
  });
  await assert.rejects(
    verifyProductionDocumentationSync({ expectedSha: currentSha, rootDir: malformed }),
    /marker is malformed/,
  );
});

test("expected SHA must agree with the canonical manifest", async () => {
  const rootDir = await fixture();
  await assert.rejects(
    verifyProductionDocumentationSync({ expectedSha: oldSha, rootDir }),
    /applicationSha .* does not match expected production SHA/,
  );
});

test("manifest rejects impossible release chronology", async () => {
  const rootDir = await fixture({
    manifest: {
      ...manifest,
      cutoverAt: "2026-10-09T13:20:00.000Z",
    },
  });
  await assert.rejects(readProductionManifest({ rootDir }), /cutoverAt cannot precede release qualification/);
});

test("checked-in manifest and human production mirrors agree", async () => {
  const checkedIn = await readProductionManifest();
  const result = await verifyProductionDocumentationSync({ expectedSha: checkedIn.applicationSha });
  assert.equal(result.results.length, 5);
});

test("permanent production verification remains explicit and read-only", () => {
  const body = readFileSync(".github/workflows/production-documentation-sync.yml", "utf8").replace(/\r\n/g, "\n");
  assert.match(body, /workflow_dispatch:/);
  assert.match(body, /workflow_call:/);
  assert.doesNotMatch(body, /\npush:/);
  assert.doesNotMatch(body, /\npull_request:/);
  assert.match(body, /expected_production_sha:/);
  assert.match(body, /contents: read/);
  assert.match(body, /actions: read/);
  assert.match(body, /VERCEL_TOKEN:/);
  assert.match(body, /node scripts\/verify-production-documentation-sync\.mjs/);
  assert.match(body, /node scripts\/verify-production-live-state\.mjs/);
  assert.doesNotMatch(body, /vercel\s+deploy|alias\s+set|assign_alias|request_promote/);
});
