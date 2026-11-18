import assert from "node:assert/strict";
import test from "node:test";

import {
  findWorker,
  generationWorkers,
  workersForEcosystem,
} from "../../src/server/generation/worker-fleet.ts";

test("disabled fleet registrations remain historical and FLUX routes only through the recovered primary", () => {
  assert.equal(findWorker("flux-primary-01")?.routingStatus, "active");
  assert.equal(findWorker("flux-standby-01")?.routingStatus, "disabled");
  assert.equal(findWorker("ltx-primary-01")?.routingStatus, "disabled");
  assert.equal(findWorker("ltx-standby-01")?.routingStatus, "disabled");

  assert.deepEqual(
    workersForEcosystem("flux2-klein-9b").map((worker) => worker.id),
    ["flux-primary-01"],
  );
  assert.deepEqual(
    workersForEcosystem("ltx25-redgraft").map((worker) => worker.id),
    ["ltx-primary-02", "ltx-standby-02"],
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

test("FIBO gateway fails closed without complete credentials or a Modal HTTPS origin", () => {
  const names = ["RENDERLAB_FIBO_GATEWAY_URL", "RENDERLAB_FIBO_MODAL_KEY", "RENDERLAB_FIBO_MODAL_SECRET"];
  const before = names.map((name) => process.env[name]);
  try {
    for (const name of names) delete process.env[name];
    assert.equal(findWorker("renderlab-fibo-native-01"), null);
    process.env.RENDERLAB_FIBO_MODAL_KEY = "test-key";
    process.env.RENDERLAB_FIBO_MODAL_SECRET = "test-secret";
    for (const origin of ["http://localhost:3000", "https://worker.modal.run/redirect", "https://modal.run.example.org"]) {
      process.env.RENDERLAB_FIBO_GATEWAY_URL = origin;
      assert.equal(findWorker("renderlab-fibo-native-01"), null);
    }
    process.env.RENDERLAB_FIBO_GATEWAY_URL = "https://test-worker.modal.run/";
    const worker = findWorker("renderlab-fibo-native-01");
    assert.equal(worker?.gatewayUrl, "https://test-worker.modal.run");
    assert.doesNotMatch(JSON.stringify(worker), /test-secret|test-key/);
    assert.deepEqual(workersForEcosystem("fibo2-edit-turbo"), []);
  } finally {
    for (const [i, name] of names.entries()) {
      if (before[i] === undefined) delete process.env[name];
      else process.env[name] = before[i];
    }
  }
});
