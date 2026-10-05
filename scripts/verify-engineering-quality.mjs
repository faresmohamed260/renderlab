import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const executableSuffix = process.platform === "win32" ? ".cmd" : "";
const oxlint = path.join(root, "node_modules", ".bin", `oxlint${executableSuffix}`);
const tsc = path.join(root, "node_modules", ".bin", `tsc${executableSuffix}`);

function expectFailure(result, label) {
  if (result.error) throw result.error;
  if (result.status === 0) {
    throw new Error(`${label} unexpectedly accepted its negative fixture.`);
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
    spawnSync(oxlint, ["--config", path.join(root, ".oxlintrc.json"), lintFixture], {
      cwd: root,
      encoding: "utf8",
    }),
    "Oxlint",
  );

  await writeFile(typeFixture, "const qualityGateNumber: number = 'not-a-number';\n", "utf8");
  expectFailure(
    spawnSync(tsc, ["--noEmit", "--pretty", "false", "--incremental", "false", "-p", "tsconfig.json"], {
      cwd: root,
      encoding: "utf8",
    }),
    "TypeScript",
  );
} finally {
  await rm(lintDirectory, { recursive: true, force: true });
  await rm(typeFixture, { force: true });
}

await verifyWorkflowSecurity();

console.log("Engineering quality negative fixtures and workflow security checks passed.");
