import assert from "node:assert/strict";
import test from "node:test";
import { reset, s, OWNER, JOB, request } from "../helpers/r4-generation-route-runtime.mjs";

const submit = await import("../../src/app/api/generation/jobs/route.ts");
const cancel = await import("../../src/app/api/generation/jobs/[jobId]/cancel/route.ts");
const retry = await import("../../src/app/api/generation/jobs/[jobId]/retry/route.ts");
const runAgain = await import("../../src/app/api/generation/jobs/[jobId]/run-again/route.ts");

const mutations = [
  ["submit", () => submit.POST(request())],
  ["cancel", () => cancel.POST(request(), { params: Promise.resolve({jobId:JOB}) })],
  ["retry", () => retry.POST(request(), { params: Promise.resolve({jobId:JOB}) })],
  ["run-again", () => runAgain.POST(request(), { params: Promise.resolve({jobId:JOB}) })],
];

for (const [name, invoke] of mutations) {
  for (const session of ["aal1-enrolled", "suspended", "revoked"]) {
    test("R4 " + name + ": " + session + " session is denied before job I/O", async () => {
      reset({ session });
      const response = await invoke();
      assert.equal(response.status, 401);
      assert.equal((await response.json()).error.code, "authentication_required");
      assert(s.calls.some(c => c[0] === "account"), name + " bypassed the strong account helper");
      assert(!s.calls.some(c => c[0] === "identity-only"), name + " called identity-only helper");
      assert(!s.calls.some(c => c[0] === name), name + " performed job mutation after denial");
    });
  }
  test("R4 " + name + ": admitted, AAL2-satisfied owner reaches only owner-bound service", async () => {
    reset({ session: "active" });
    const response = await invoke();
    assert.equal(response.status, 202);
    assert.deepEqual(s.calls.filter(c => c[0] === name).map(c => c[1]), [OWNER]);
    assert(!s.calls.some(c => c[0] === "identity-only"));
  });
}
