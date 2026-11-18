import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  assessCiWorkflowContract,
  ciWorkflowContractPaths,
  findImmutableActionRefProblems,
} from "../../scripts/lib/ci-workflow-contract.mjs";

async function currentContractInputs() {
  const setupAction = await readFile(ciWorkflowContractPaths.setupActionPath, "utf8");
  const workflows = Object.fromEntries(
    await Promise.all(
      ciWorkflowContractPaths.cohortFiles.map(async (filename) => [
        filename,
        await readFile(`.github/workflows/${filename}`, "utf8"),
      ]),
    ),
  );
  return { setupAction, workflows };
}

test("ENT-010 CI workflow contract accepts the checked-in cohort", async () => {
  const result = assessCiWorkflowContract(await currentContractInputs());
  assert.equal(result.ok, true, result.problems.join("\n"));
  assert.deepEqual(result.problems, []);
});

test("immutable action verification rejects mutable external action refs", () => {
  const problems = findImmutableActionRefProblems([
    {
      path: ".github/actions/example/action.yml",
      content: "runs:\n  using: composite\n  steps:\n    - uses: actions/setup-node@v4\n",
    },
  ]);

  assert.equal(problems.length, 1);
  assert.match(problems[0], /non-immutable external action ref: actions\/setup-node@v4/);
});
