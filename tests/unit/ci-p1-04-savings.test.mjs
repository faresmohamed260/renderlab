import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  classifyCiChangePaths, isEvidenceOnlyMarkdownPath, validCiCommitSha,
} from "../../scripts/lib/ci-change-scope.mjs";

test("evidence-only Markdown is explicitly narrow, never public docs, policy or executable input", () => {
  for (const value of [
    "docs/audits/P1_04_RELEASE_EVIDENCE_2026-11-24.md",
    "docs/history/contracts/2026-11-23-plan.md",
    "docs/archive/2026-11-20-record.md",
  ]) assert.equal(isEvidenceOnlyMarkdownPath(value), true);
  for (const value of [
    "README.md", "PROJECT.md", "AGENTS.md", "GOVERNANCE.md",
    "docs/INDEX.md", "docs/STATUS.md", "docs/architecture/INFRASTRUCTURE.md",
    "docs/governance/documents.json", "docs/production/current.json",
    "docs/api/generation-compatibility.v1.json",
    ".github/workflows/developer-portability.yml", "package-lock.json",
    "supabase/migrations/0031_atomic_generation_terminalize_release.sql",
    "src/app/page.tsx", "tests/unit/ci-p1-04-savings.test.mjs",
    "docs/audits/../scripts/evil.md", "docs/audits/./nothing.md",
    "docs/audits/evil.md/second", "docs/audits/secret.txt",
    "docs/audits/../project.md", "docs/audits/bad name.md",
  ]) assert.equal(isEvidenceOnlyMarkdownPath(value), false, value);
  assert.equal(classifyCiChangePaths(["docs/audits/GOOD.md"]).docsOnly, true);
  assert.equal(classifyCiChangePaths(["docs/audits/GOOD.md", "src/app/page.tsx"]).docsOnly, false);
  assert.equal(classifyCiChangePaths(["docs/audits/GOOD.md", "package-lock.json"]).docsOnly, false);
  assert.equal(classifyCiChangePaths(["docs/audits/GOOD.md", ".github/workflows/codeql.yml"]).docsOnly, false);
  assert.equal(classifyCiChangePaths(["docs/audits/GOOD.md", "docs/audits/GOOD.md"]).docsOnly, false);
  assert.equal(classifyCiChangePaths([]).docsOnly, false);
  assert.equal(classifyCiChangePaths(["docs/audits/GOOD.md"], { isRegularFile: () => false }).docsOnly, false);
  assert.equal(classifyCiChangePaths(["docs/audits/GOOD.md"], { isReferenced: () => true }).docsOnly, false);
  assert.equal(validCiCommitSha("0".repeat(40)), false);
  assert.equal(validCiCommitSha("a".repeat(40)), true);
  assert.equal(validCiCommitSha("A".repeat(40)), false);
  assert.equal(validCiCommitSha("a".repeat(39)), false);
});

function git(cwd, args) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(r.status, 0, `git ${args[0]}: ${r.stderr}`);
  return r.stdout.trim();
}
function runClassifier(cwd, env) {
  const output = path.join(cwd, "ci-output.txt");
  writeFileSync(output, "");
  const cli = new URL("../../scripts/ci-classify-changes.mjs", import.meta.url);
  const result = spawnSync(process.execPath, [fileURLToPath(cli)], {
    cwd, encoding: "utf8",
    env: { ...process.env, GITHUB_OUTPUT: output, ...env },
    timeout: 20_000,
  });
  assert.equal(result.status, 0, result.stderr);
  const text = readFileSync(output, "utf8");
  assert.match(text, /^docs_only=(true|false)\nmode=(docs-only|full)\n$/);
  return text.includes("docs_only=true");
}

test("git exact-object positive and mixed-path negative integration with safe fallback", () => {
  const root = mkdtempSync(path.join(tmpdir(), "renderlab-ci-p104-"));
  try {
    git(root, ["init", "-q"]);
    git(root, ["config", "user.email", "ci@example.invalid"]);
    git(root, ["config", "user.name", "CI Test"]);
    for (const dir of ["docs/audits", ".github/workflows", "src", "scripts", "tests"]) {
      mkdirSync(path.join(root, dir), { recursive: true });
      writeFileSync(path.join(root, dir, ".keep"), "fixture\n");
    }
    const evidence = path.join(root, "docs/audits/P1_04_FIXTURE.md");
    writeFileSync(evidence, "# record 1\n");
    git(root, ["add", "."]); git(root, ["commit", "-qm", "base"]);
    const base = git(root, ["rev-parse", "HEAD"]);
    writeFileSync(evidence, "# record 2\n");
    git(root, ["add", "."]); git(root, ["commit", "-qm", "audit-only"]);
    const docs = git(root, ["rev-parse", "HEAD"]);
    const vars = { CI_EVENT_NAME: "pull_request", CI_BASE_SHA: base, CI_HEAD_SHA: docs };
    assert.equal(runClassifier(root, vars), true, "known regular audit Markdown change is eligible");
    assert.equal(runClassifier(root, { ...vars, CI_HEAD_SHA: base }), false, "head mismatch fails closed");
    assert.equal(runClassifier(root, { ...vars, CI_BASE_SHA: "0".repeat(40) }), false, "deleted-base fails closed");
    assert.equal(runClassifier(root, { ...vars, CI_EVENT_NAME: "workflow_dispatch" }), false, "manual always full");
    writeFileSync(path.join(root, "src", "change.ts"), "export const changed = true;\n");
    git(root, ["add", "src/change.ts"]); git(root, ["commit", "-qm", "runtime-mixed"]);
    const mixed = git(root, ["rev-parse", "HEAD"]);
    assert.equal(runClassifier(root, { ...vars, CI_HEAD_SHA: mixed }), false);
    git(root, ["rm", "src/change.ts"]); git(root, ["commit", "-qm", "remove-runtime"]);
    const deleted = git(root, ["rev-parse", "HEAD"]);
    assert.equal(runClassifier(root, { ...vars, CI_HEAD_SHA: deleted }), true, "net diff contains only evidence");
    writeFileSync(path.join(root, "scripts", "consumer.mjs"), "const audit = 'docs/audits/P1_04_FIXTURE.md';\n");
    git(root, ["add", "scripts/consumer.mjs"]); git(root, ["commit", "-qm", "consumer"]);
    assert.equal(runClassifier(root, {
      CI_EVENT_NAME: "pull_request", CI_BASE_SHA: base, CI_HEAD_SHA: git(root, ["rev-parse", "HEAD"]),
    }), false, "source change forces full run");
    const referencedBase = git(root, ["rev-parse", "HEAD"]);
    writeFileSync(evidence, "# record 3\n");
    git(root, ["add", "docs/audits/P1_04_FIXTURE.md"]);
    git(root, ["commit", "-qm", "only-referenced-evidence"]);
    assert.equal(runClassifier(root, {
      CI_EVENT_NAME: "pull_request", CI_BASE_SHA: referencedBase,
      CI_HEAD_SHA: git(root, ["rev-parse", "HEAD"]),
    }), false, "unchanged source reference to audit Markdown forces full run");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

const requiredNames = [
  "engineering-quality.yml",
  "unit-coverage.yml",
  "developer-portability.yml",
];

test("all six required names and CodeQL triggers survive CI P1-04 changes", () => {
  const base = ".github/workflows/";
  const quality = readFileSync(base + "engineering-quality.yml", "utf8");
  const coverage = readFileSync(base + "unit-coverage.yml", "utf8");
  const portability = readFileSync(base + "developer-portability.yml", "utf8");
  for (const name of requiredNames) {
    const yaml = readFileSync(base + name, "utf8");
    assert.match(yaml, /pull_request:/);
    assert.match(yaml, /push:/);
    assert.match(yaml, /workflow_dispatch:/);
    assert.doesNotMatch(yaml, /paths-ignore:|paths:/);
    assert.match(yaml, /CI_BASE_SHA: \$\{\{ github\.event\.pull_request\.base\.sha \|\| github\.event\.before \}\}/);
    assert.match(yaml, /id: ci-scope/);
    assert.match(yaml, /run: node scripts\/ci-classify-changes\.mjs/);
    assert.match(yaml, /if: steps\.ci-scope\.outputs\.docs_only == 'true'\n\s+run: npm run verify:docs-governance/);
    assert.match(yaml, /- name: Install dependencies\n\s+if: steps\.ci-scope\.outputs\.docs_only != 'true'\n\s+run: npm ci --no-audit --no-fund/);
    assert.match(yaml, /(^  (?:quality|unit-coverage|clean-room):)|name: clean-room/m);
  }
  assert.match(portability, /matrix:\s*\n\s*os: \[ubuntu-latest, windows-latest\]/);
  assert.match(portability, /- name: Production build\n\s+if: steps\.ci-scope\.outputs\.docs_only != 'true' && matrix\.os == 'windows-latest'\n\s+run: npm run build/);
  assert.match(quality, /- name: Production build\n\s+if: steps\.ci-scope\.outputs\.docs_only != 'true'\n\s+run: npm run build/);
  assert.match(coverage, /- name: Upload bounded unit coverage evidence\n\s+if: steps\.ci-scope\.outputs\.docs_only != 'true'/);
  for (const file of ["docs-governance.yml", "codeql.yml"]) {
    const yaml = readFileSync(base + file, "utf8");
    assert.match(yaml, /pull_request:/);
    assert.match(yaml, /push:/);
    assert.doesNotMatch(yaml, /paths-ignore:|paths:/);
  }
});

test("docs-only eliminates four installs and three builds; runtime still has two OS builds", () => {
  const q = readFileSync(".github/workflows/engineering-quality.yml", "utf8");
  const u = readFileSync(".github/workflows/unit-coverage.yml", "utf8");
  const p = readFileSync(".github/workflows/developer-portability.yml", "utf8");
  const all = q + u + p;
  assert.equal((all.match(/run: npm ci --no-audit --no-fund/g) || []).length, 3);
  assert.equal((all.match(/run: npm run build/g) || []).length, 2);
  assert.match(q, /- name: Unit tests\n\s+if: steps\.ci-scope\.outputs\.docs_only != 'true'/);
  assert.match(p, /- name: Unit tests\n\s+if: steps\.ci-scope\.outputs\.docs_only != 'true'/);
  // All heavy steps still execute on mixed, lockfile, runtime, or workflow edits.
  for (const yaml of [q, u, p]) {
    assert(!yaml.includes("cancel-in-progress: false"));
    assert.match(yaml, /cancel-in-progress: true/);
  }
});
