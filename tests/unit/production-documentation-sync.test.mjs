import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  PRODUCTION_DOCUMENTATION_AUTHORITIES,
  verifyProductionDocumentationSync,
} from "../../scripts/lib/production-documentation-sync.mjs";

const currentSha = "2fc64231f8aa0e5a2df8b2698824319a25c4e9f8";
const oldSha = "d18ef8833d46c812dac6b43572b3f4f7069990f8";

async function fixture(overrides = {}) {
  const root = await mkdtemp(join(tmpdir(), "renderlab-prod-doc-sync-"));
  for (const path of PRODUCTION_DOCUMENTATION_AUTHORITIES) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    const body =
      overrides[path] ??
      [
        "# Authority",
        "",
        "## Current production",
        `<!-- RENDERLAB_CURRENT_PRODUCTION_SHA: ${currentSha} -->`,
        `Current production runs exact source \`${currentSha}\`.`,
        "",
        "## Historical rollout",
        `Historical source \`${oldSha}\` remains preserved.`,
        "",
      ].join("\n");
    await writeFile(join(root, path), body, "utf8");
  }
  return root;
}

test("current production markers agree while historical SHAs remain allowed", async () => {
  const rootDir = await fixture();
  const results = await verifyProductionDocumentationSync({ expectedSha: currentSha, rootDir });
  assert.equal(results.length, 4);
  assert.ok(results.every((result) => result.sha === currentSha));
});

test("a stale marker fails even when other authorities are correct", async () => {
  const rootDir = await fixture({
    "PROJECT.md": [
      "# Project",
      "## Current production",
      `<!-- RENDERLAB_CURRENT_PRODUCTION_SHA: ${oldSha} -->`,
      `Current production runs exact source \`${oldSha}\`.`,
    ].join("\n"),
  });
  await assert.rejects(
    verifyProductionDocumentationSync({ expectedSha: currentSha, rootDir }),
    /does not match expected production SHA/,
  );
});

test("matching marker cannot hide stale human-readable current prose", async () => {
  const rootDir = await fixture({
    "PROJECT.md": [
      "# Project",
      "## Current production",
      `<!-- RENDERLAB_CURRENT_PRODUCTION_SHA: ${currentSha} -->`,
      `Current production runs exact source \`${oldSha}\`.`,
    ].join("\n"),
  });
  await assert.rejects(
    verifyProductionDocumentationSync({ expectedSha: currentSha, rootDir }),
    /current-production prose does not contain expected SHA/,
  );
});

test("duplicate or malformed markers fail closed", async () => {
  const duplicate = await fixture({
    "PROJECT.md": [
      "# Project",
      "## Current production",
      `<!-- RENDERLAB_CURRENT_PRODUCTION_SHA: ${currentSha} -->`,
      `<!-- RENDERLAB_CURRENT_PRODUCTION_SHA: ${currentSha} -->`,
      `Current production runs ${currentSha}.`,
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
      `Current production runs ${currentSha}.`,
    ].join("\n"),
  });
  await assert.rejects(
    verifyProductionDocumentationSync({ expectedSha: currentSha, rootDir: malformed }),
    /marker is malformed/,
  );
});

test("malformed expected production SHA fails before reading authorities", async () => {
  await assert.rejects(
    verifyProductionDocumentationSync({ expectedSha: "main", rootDir: "/does/not/matter" }),
    /must be an exact 40-character Git SHA/,
  );
});

test("checked-in authorities currently agree with the verified production SHA", async () => {
  const results = await verifyProductionDocumentationSync({ expectedSha: currentSha });
  assert.equal(results.length, 4);
});

test("permanent production documentation workflow is manual/reusable only", () => {
  const body = readFileSync(".github/workflows/production-documentation-sync.yml", "utf8");
  assert.match(body, /workflow_dispatch:/);
  assert.match(body, /workflow_call:/);
  assert.doesNotMatch(body, /\npush:/);
  assert.doesNotMatch(body, /\npull_request:/);
  assert.match(body, /expected_production_sha:/);
  assert.match(body, /permissions:\n  contents: read/);
  assert.match(body, /node scripts\/verify-production-documentation-sync\.mjs/);
});
