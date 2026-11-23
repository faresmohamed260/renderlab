import assert from "node:assert/strict";
import test from "node:test";

import { classifyWorkerFailure } from "../../src/server/generation/worker-failure.ts";

test("stable worker codes take precedence over misleading text", () => {
  assert.deepEqual(
    classifyWorkerFailure(409, { code: "WORKER_UNAVAILABLE", detail: "credit balance wording should not override the code" }),
    { retryable: true, safeToReassign: true, kind: "unavailable", code: "WORKER_UNAVAILABLE" },
  );
  assert.deepEqual(
    classifyWorkerFailure(409, { errorCode: "WORKER_CREDIT_EXHAUSTED", detail: "workspace disabled" }),
    { retryable: true, safeToReassign: true, kind: "credit_exhausted", code: "WORKER_CREDIT_EXHAUSTED" },
  );
});

test("only stable worker codes and statuses establish failure categories", () => {
  assert.deepEqual(classifyWorkerFailure(409, { detail: "workspace budget exhausted" }), {
    retryable: false, safeToReassign: false, kind: "failed", code: "PROVIDER_FAILED",
  });
  assert.deepEqual(classifyWorkerFailure(409, { error: "temporarily unavailable" }), {
    retryable: false, safeToReassign: false, kind: "failed", code: "PROVIDER_FAILED",
  });
  assert.deepEqual(classifyWorkerFailure(402, { detail: "arbitrary gateway body" }), {
    retryable: true, safeToReassign: true, kind: "credit_exhausted", code: "WORKER_CREDIT_EXHAUSTED",
  });
  assert.deepEqual(classifyWorkerFailure(503, { detail: "generic gateway failure" }), {
    retryable: true, safeToReassign: false, kind: "unavailable", code: "WORKER_UNAVAILABLE",
  });
});
