import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  assertCrossRepoModalOwnership,
  findCrossRepoModalOwnershipProblems,
  MODAL_ACCOUNT_UNIVERSE,
} from "../../scripts/lib/modal-cross-repo-ownership.mjs";

const renderLabManifest = JSON.parse(fs.readFileSync("config/modal-project-ownership.json", "utf8"));
const sagaOwned = Array.from({ length: 39 }, (_, index) => `modal-${String(index + 3).padStart(2, "0")}`);
const sagaManifest = {
  project: "saga",
  ownedAccountLabels: sagaOwned,
  reservedForOtherProjects: { renderlab: [...renderLabManifest.ownedAccountLabels] },
};

test("reciprocal Modal manifests cover all 47 accounts exactly once", () => {
  assert.equal(MODAL_ACCOUNT_UNIVERSE.length, 47);
  assert.doesNotThrow(() => assertCrossRepoModalOwnership({ renderLabManifest, sagaManifest }));
});

test("counterpart reservation drift fails closed", () => {
  const drifted = structuredClone(sagaManifest);
  drifted.reservedForOtherProjects.renderlab = drifted.reservedForOtherProjects.renderlab.slice(1);
  assert.ok(findCrossRepoModalOwnershipProblems({ renderLabManifest, sagaManifest: drifted }).some((problem) => problem.includes("disagree")));
});

test("cross-project overlap and incomplete coverage fail closed", () => {
  const drifted = structuredClone(sagaManifest);
  drifted.ownedAccountLabels[0] = "modal-01";
  const problems = findCrossRepoModalOwnershipProblems({ renderLabManifest, sagaManifest: drifted });
  assert.ok(problems.some((problem) => problem.includes("overlaps")));
  assert.ok(problems.some((problem) => problem.includes("modal-01 through modal-47")));
});
