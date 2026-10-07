import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const oxlint = path.join(root, "node_modules", "oxlint", "bin", "oxlint");
const tsc = path.join(root, "node_modules", "typescript", "bin", "tsc");

function spawnNodeCli(entrypoint, args) {
  return spawnSync(process.execPath, [entrypoint, ...args], {
    cwd: root,
    encoding: "utf8",
  });
}

function expectFailure(result, label) {
  if (result.error) throw result.error;
  if (result.status === 0) {
    throw new Error(`${label} unexpectedly accepted its negative fixture.`);
  }
}

async function verifyMutationOriginCoverage() {
  const apiDirectory = path.join(root, "src", "app", "api");
  const mutationPattern = /export async function (POST|PUT|PATCH|DELETE)\s*\(/g;
  const guardImport = 'from "@/server/security/same-origin-mutation"';
  const exemptionMarker = "ENT-004 same-origin exemption: server-secret internal route authenticated by a dedicated bearer secret.";
  const approvedExemptions = new Set([
    "src/app/api/internal/generation/reconcile/route.ts",
    "src/app/api/internal/maintenance/route.ts",
  ]);
  const routeFiles = [];
  const violations = [];

  async function collect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) await collect(fullPath);
      else if (entry.isFile() && entry.name === "route.ts") routeFiles.push(fullPath);
    }
  }

  await collect(apiDirectory);

  for (const routeFile of routeFiles) {
    const source = await readFile(routeFile, "utf8");
    const mutations = [...source.matchAll(mutationPattern)];
    if (mutations.length === 0) continue;

    const relative = path.relative(root, routeFile).split(path.sep).join("/");
    if (approvedExemptions.has(relative)) {
      if (!source.includes(exemptionMarker)) {
        violations.push(`${relative} is an approved mutation-origin exemption but is missing its security rationale marker`);
      }
      continue;
    }

    if (!source.includes(guardImport)) {
      violations.push(`${relative} has mutation handlers but does not import the shared same-origin guard`);
      continue;
    }

    const guardCalls = source.match(/enforceSameOriginMutation\s*\(/g)?.length ?? 0;
    if (guardCalls < mutations.length) {
      violations.push(`${relative} has ${mutations.length} mutation handler(s) but only ${guardCalls} same-origin guard call(s)`);
    }
  }

  if (violations.length > 0) {
    throw new Error(`Mutation origin coverage verification failed:\n- ${violations.join("\n- ")}`);
  }
}

async function verifyWorkflowSecurity() {
  const workflowsDirectory = path.join(root, ".github", "workflows");
  const workflowFiles = (await readdir(workflowsDirectory)).filter(
    (name) => name.endsWith(".yml") || name.endsWith(".yaml"),
  );
  const violations = [];

  for (const workflowFile of workflowFiles) {
    const workflow = await readFile(path.join(workflowsDirectory, workflowFile), "utf8");
    const lines = workflow.split(/\r?\n/);

    for (const [index, line] of lines.entries()) {
      if (/\bnpm install\b/.test(line) && !/^\s*#/.test(line)) {
        violations.push(`${workflowFile}:${index + 1} uses npm install instead of deterministic npm ci`);
      }

      const usesMatch = line.match(/\buses:\s*([^\s#]+)/);
      if (!usesMatch) continue;

      const actionRef = usesMatch[1];
      if (actionRef.startsWith("./") || actionRef.startsWith("docker://")) continue;

      const atIndex = actionRef.lastIndexOf("@");
      const revision = atIndex >= 0 ? actionRef.slice(atIndex + 1) : "";
      if (!/^[0-9a-f]{40}$/i.test(revision)) {
        violations.push(`${workflowFile}:${index + 1} uses a non-immutable external action ref: ${actionRef}`);
      }
    }
  }

  const dependabot = await readFile(path.join(root, ".github", "dependabot.yml"), "utf8");
  if (!/package-ecosystem:\s*["']?github-actions["']?/.test(dependabot)) {
    violations.push(".github/dependabot.yml must keep the github-actions update ecosystem enabled");
  }

  const codeql = await readFile(path.join(workflowsDirectory, "codeql.yml"), "utf8");
  if (!/languages:\s*javascript-typescript/.test(codeql)) {
    violations.push("codeql.yml must analyze javascript-typescript");
  }
  if (!/security-events:\s*write/.test(codeql)) {
    violations.push("codeql.yml must grant security-events: write for result publication");
  }

  if (violations.length > 0) {
    throw new Error(`Workflow security verification failed:\n- ${violations.join("\n- ")}`);
  }
}

const lintDirectory = await mkdtemp(path.join(tmpdir(), "renderlab-quality-lint-"));
const lintFixture = path.join(lintDirectory, "lint-negative.ts");
const typeFixture = path.join(root, "tests", "unit", `quality-type-negative-${process.pid}.ts`);

try {
  await writeFile(lintFixture, "debugger;\n", "utf8");
  expectFailure(
    spawnNodeCli(oxlint, ["--config", path.join(root, ".oxlintrc.json"), lintFixture]),
    "Oxlint",
  );

  await writeFile(typeFixture, "const qualityGateNumber: number = 'not-a-number';\n", "utf8");
  expectFailure(
    spawnNodeCli(tsc, ["--noEmit", "--pretty", "false", "--incremental", "false", "-p", "tsconfig.json"]),
    "TypeScript",
  );
} finally {
  await rm(lintDirectory, { recursive: true, force: true });
  await rm(typeFixture, { force: true });
}

await verifyWorkflowSecurity();
await verifyMutationOriginCoverage();
await import("./verify-server-boundaries.mjs");

console.log("Engineering quality negative fixtures, workflow security, mutation-origin coverage, and server-boundary checks passed.");
