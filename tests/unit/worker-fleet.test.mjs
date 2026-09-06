import assert from "node:assert/strict";
import test from "node:test";

import {
  findWorker,
  generationWorkers,
  workersForEcosystem,
} from "../../src/server/generation/worker-fleet.ts";

test("disabled fleet registrations remain historical but are excluded from new routing", () => {
  assert.equal(findWorker("flux-primary-01")?.routingStatus, "disabled");
  assert.equal(findWorker("ltx-primary-01")?.routingStatus, "disabled");

  assert.deepEqual(
    workersForEcosystem("flux2-klein-9b").map((worker) => worker.id),
    ["flux-standby-01"],
  );
  assert.deepEqual(
    workersForEcosystem("ltx25-redgraft").map((worker) => worker.id),
    ["ltx-standby-01"],
  );
});

test("healthy Qwen routing preserves primary then standby order", () => {
  assert.deepEqual(
    workersForEcosystem("qwen-image-edit-2511").map((worker) => worker.id),
    ["qwen-primary-01", "qwen-standby-01"],
  );
});

test("all routed workers are explicitly active", () => {
  for (const worker of generationWorkers) {
    if (worker.routingStatus === "disabled") continue;
    assert.equal(worker.routingStatus, "active");
  }

  for (const ecosystem of ["flux2-klein-9b", "ltx25-redgraft", "qwen-image-edit-2511"]) {
    for (const worker of workersForEcosystem(ecosystem)) {
      assert.equal(worker.routingStatus, "active");
    }
  }
});
