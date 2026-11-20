import assert from "node:assert/strict";
import test from "node:test";

import {
  acceptedWorkerCallId,
  findWorker,
  workerGatewayOptions,
  workerSupportsCancellation,
  generationWorkers,
  workersForEcosystem,
} from "../../src/server/generation/worker-fleet.ts";

test("retired FLUX, Qwen, and LTX workers cannot be resolved or routed", () => {
  for (const id of ["flux-primary-01", "qwen-primary-01", "ltx-primary-02"]) {
    assert.equal(findWorker(id), null);
  }
  for (const ecosystem of ["flux2-klein-9b", "ltx25-redgraft", "qwen-image-edit-2511"]) {
    assert.deepEqual(workersForEcosystem(ecosystem), []);
  }
});

test("all routed workers are explicitly active", () => {
  for (const worker of generationWorkers) {
    if (worker.routingStatus === "disabled") continue;
    assert.equal(worker.routingStatus, "active");
  }

});

test("FIBO gateway fails closed without complete credentials or a Modal HTTPS origin", () => {
  const names = ["RENDERLAB_GENERATION_GATEWAY_URL", "RENDERLAB_FIBO_GENERATION", "RENDERLAB_FIBO_GATEWAY_URL", "RENDERLAB_FIBO_MODAL_KEY", "RENDERLAB_FIBO_MODAL_SECRET"];
  const before = names.map((name) => process.env[name]);
  try {
    for (const name of names) delete process.env[name];
    assert.equal(findWorker("renderlab-fibo-native-01"), null);
    assert.equal(findWorker("fibo"), null);
    process.env.RENDERLAB_FIBO_MODAL_KEY = "test-key";
    process.env.RENDERLAB_FIBO_MODAL_SECRET = "test-secret";
    for (const origin of ["http://localhost:3000", "https://worker.modal.run/redirect", "https://modal.run.example.org"]) {
      process.env.RENDERLAB_FIBO_GATEWAY_URL = origin;
      assert.equal(findWorker("renderlab-fibo-native-01"), null);
    }
    process.env.RENDERLAB_FIBO_GATEWAY_URL = "https://test-worker.modal.run/";
    assert.equal(findWorker("renderlab-fibo-native-01")?.gatewayUrl, "https://test-worker.modal.run");
    process.env.RENDERLAB_GENERATION_GATEWAY_URL = "https://invalid.example.org";
    assert.equal(findWorker("renderlab-fibo-native-01"), null);
    process.env.RENDERLAB_GENERATION_GATEWAY_URL = "https://neutral-config.modal.run/";
    assert.equal(findWorker("renderlab-fibo-native-01")?.gatewayUrl, "https://neutral-config.modal.run");
    delete process.env.RENDERLAB_GENERATION_GATEWAY_URL;
    const worker = findWorker("renderlab-fibo-native-01");
    assert.equal(worker?.gatewayUrl, "https://test-worker.modal.run");
    assert.doesNotMatch(JSON.stringify(worker), /test-secret|test-key/);
    assert.deepEqual(workersForEcosystem("fibo2-edit-turbo"), []);
    process.env.RENDERLAB_FIBO_GENERATION = "1";
    assert.deepEqual(workersForEcosystem("fibo2-edit-turbo"), [worker]);
    assert.equal(worker.role, "primary");
    assert.equal(worker.policy.reassignment, false);
    assert.equal(worker.policy.retryAmbiguousSubmit, false);
    assert.equal(workerSupportsCancellation(worker), true);
    const options = workerGatewayOptions(worker);
    assert.equal(options.redirect, "error");
    assert.equal(options.headers["Modal-Key"], "test-key");
    assert.equal(options.headers["Modal-Secret"], "test-secret");
    assert.ok(options.signal instanceof AbortSignal);
    const signed = "fc-" + "a".repeat(26) + "." + "f".repeat(64);
    assert.equal(acceptedWorkerCallId(worker, 202, signed), true);
    assert.equal(acceptedWorkerCallId(worker, 200, signed), false);
    assert.equal(acceptedWorkerCallId(worker, 202, "fc-unsigned"), false);
    delete process.env.RENDERLAB_FIBO_GENERATION;
    assert.deepEqual(workersForEcosystem("fibo2-edit-turbo"), []);
    assert.deepEqual(findWorker("renderlab-fibo-native-01"), worker);
    assert.deepEqual(findWorker("fibo"), worker);
  } finally {
    for (const [i, name] of names.entries()) {
      if (before[i] === undefined) delete process.env[name];
      else process.env[name] = before[i];
    }
  }
});
