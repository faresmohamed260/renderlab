import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  classifyGenerationProviderRejection, createGenerationTraceparent,
  generationHistogramBucketsSeconds, generationMetricAlertThreshold,
  generationMetricDefinitions, normalizeGenerationMetric, recordGenerationMetric,
  validGenerationTraceparent,
} from "../../src/server/observability/generation-metrics.ts";

const submit = {
  name: "renderlab_generation_submit_duration_seconds",
  labels: { operation: "create-image", outcome: "accepted" },
  value: 0.3,
};
const privateMarker = "secret-user-private-job-provider-token-prompt";

test("nine fixed instruments with finite cardinality and fixed histogram buckets", () => {
  assert.equal(Object.keys(generationMetricDefinitions).length, 9);
  assert.deepEqual(generationHistogramBucketsSeconds, [0.25, 0.5, 1, 2, 5, 10, 30, 60, 120, 300, 900, 3600]);
  for (const definition of Object.values(generationMetricDefinitions)) {
    assert(["counter", "gauge", "histogram"].includes(definition.kind));
    for (const values of Object.values(definition.labels)) {
      assert(values.length > 0 && values.length <= 6);
      assert(values.every((item) => /^[a-z0-9_-]+$/.test(item)));
    }
    for (const key of Object.keys(definition.labels)) {
      assert(!/job|owner|handle|prompt|trace|token|user|request|route/.test(key));
    }
  }
});

test("closed label schema strips all extra payload and rejects arbitrary label values", () => {
  const metric = normalizeGenerationMetric({
    ...submit,
    ownerId: privateMarker, jobId: privateMarker, secret: privateMarker, prompt: privateMarker,
  }, "2026-11-24T00:00:00.000Z");
  assert.equal(metric.bucketLeSeconds, 0.5);
  assert.equal(metric.kind, "histogram");
  assert.deepEqual(metric.labels, submit.labels);
  assert.equal(metric.timestamp, "2026-11-24T00:00:00.000Z");
  assert(validGenerationTraceparent(metric.traceparent));
  assert(!JSON.stringify(metric).includes(privateMarker));
  for (const labels of [
    { operation: privateMarker, outcome: "accepted" },
    { operation: "create-image", outcome: "accepted", jobId: privateMarker },
    { operation: "create-image" },
  ]) assert.equal(normalizeGenerationMetric({ ...submit, labels }), null);
  assert.equal(normalizeGenerationMetric({ ...submit, value: Number.NaN }), null);
  assert.equal(normalizeGenerationMetric({ ...submit, value: -1 }), null);
  assert.equal(normalizeGenerationMetric({ ...submit, value: Number.POSITIVE_INFINITY }), null);
  assert.equal(normalizeGenerationMetric({ ...submit, value: 60 * 60 * 24 * 32 }), null);
});

test("histogram bucket upper edges, +Inf, counter strictness and private correlation", () => {
  for (const [value, bucketLeSeconds] of [
    [0.25, 0.25], [0.251, 0.5], [3600, 3600], [3601, "+Inf"],
  ]) assert.equal(normalizeGenerationMetric({ ...submit, value }).bucketLeSeconds, bucketLeSeconds);
  const counter = {
    name: "renderlab_generation_admission_release_total",
    labels: { outcome: "released", path: "terminal" },
    value: 1,
  };
  assert.equal(normalizeGenerationMetric(counter).kind, "counter");
  assert.equal(normalizeGenerationMetric({ ...counter, value: 2 }), null);
  assert.equal(normalizeGenerationMetric({ ...submit, linkCorrelation: privateMarker }).correlation, undefined);
  assert.equal(normalizeGenerationMetric({ ...submit, linkCorrelation: "a".repeat(24) }).correlation, "a".repeat(24));
  assert(!Object.keys(normalizeGenerationMetric(counter).labels).includes("correlation"));
});

test("W3C traceparent accepts only bounded valid IDs and fresh server roots", () => {
  const first = createGenerationTraceparent();
  const second = createGenerationTraceparent();
  assert(validGenerationTraceparent(first));
  assert(validGenerationTraceparent(second));
  assert.notEqual(first, second);
  for (const invalid of [
    null, privateMarker, "00-" + "0".repeat(32) + "-" + "a".repeat(16) + "-01",
    "00-" + "a".repeat(32) + "-" + "0".repeat(16) + "-01",
    "ff-" + "a".repeat(32) + "-" + "b".repeat(16) + "-01",
    "00-" + "A".repeat(32) + "-" + "b".repeat(16) + "-01",
    "00-" + "a".repeat(32) + "-" + "b".repeat(16) + "-03",
  ]) assert.equal(validGenerationTraceparent(invalid), false);
});

test("provider rejection classification is closed and never infers browser 401 provenance", () => {
  assert.deepEqual(classifyGenerationProviderRejection(401), { category: "auth", status_class: "4xx" });
  assert.deepEqual(classifyGenerationProviderRejection(403), { category: "auth", status_class: "4xx" });
  assert.deepEqual(classifyGenerationProviderRejection(429), { category: "capacity", status_class: "4xx" });
  assert.deepEqual(classifyGenerationProviderRejection(504), { category: "timeout", status_class: "5xx" });
  assert.deepEqual(classifyGenerationProviderRejection(null, true), { category: "transport", status_class: "none" });
});

test("all simulated sink and serialization failures are fail-open", () => {
  let attempts = 0;
  assert.doesNotThrow(() => recordGenerationMetric(submit, () => { attempts++; throw Error(privateMarker); }));
  assert.equal(attempts, 1);
  assert.doesNotThrow(() => recordGenerationMetric({ ...submit, value: NaN }, () => { throw Error("should skip"); }));
  const cyclic = {}; cyclic.self = cyclic;
  assert.doesNotThrow(() => recordGenerationMetric({ ...submit, labels: cyclic }, () => { throw Error("should skip"); }));
});

test("observe-only alert predicates require sample floor and use proposed boundaries", () => {
  const measure = (name, values, outcome) => generationMetricAlertThreshold(name, { values, outcome });
  assert.equal(measure(submit.name, [], undefined), "no_data");
  assert.equal(measure(submit.name, Array(9).fill(20)), "no_data");
  assert.equal(measure(submit.name, Array(10).fill(5)), "ok");
  assert.equal(measure(submit.name, Array(10).fill(5.01)), "warning");
  assert.equal(measure("renderlab_generation_dispatch_latency_seconds", Array(10).fill(61)), "warning");
  assert.equal(measure("renderlab_generation_provider_duration_seconds", Array(10).fill(241)), "warning");
  assert.equal(measure("renderlab_generation_finalization_duration_seconds", Array(10).fill(31)), "warning");
  assert.equal(measure("renderlab_generation_provider_to_settle_seconds", Array(10).fill(121)), "warning");
  assert.equal(measure("renderlab_generation_active_age_seconds", [3600]), "warning");
  assert.equal(measure("renderlab_generation_terminal_held_reservations", [301]), "critical");
  assert.equal(measure("renderlab_generation_provider_rejections_total", [1], "auth"), "critical");
  assert.equal(measure("renderlab_generation_admission_release_total", [1], "failed"), "critical");
  assert.equal(measure("renderlab_generation_provider_rejections_total", [1], "other"), "ok");
});

test("instrumentation does not create paid exporter, public route or provider-bound context", async () => {
  const files = [
    "src/server/observability/generation-metrics.ts",
    "src/app/api/generation/jobs/route.ts",
    "src/server/generation/native-generation-lifecycle.ts",
    "src/server/generation/generation-admission.ts",
    "src/server/generation/atomic-terminalization.ts",
  ];
  const bodies = await Promise.all(files.map((path) => readFile(new URL("../../" + path, import.meta.url), "utf8")));
  assert(!/OTLP|prometheus|instrumentationHook|api\/metrics/.test(bodies.join("\n")));
  assert.match(bodies[1], /recordGenerationMetric/);
  assert.match(bodies[2], /recordGenerationMetric/);
  assert.match(bodies[3], /recordGenerationMetric/);
  assert.match(bodies[4], /recordGenerationMetric/);
});
