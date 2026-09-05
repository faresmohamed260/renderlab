import { mkdtemp, rm, writeFile } from "node:fs/promises";
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

console.log("Engineering quality negative fixtures were rejected as expected.");
