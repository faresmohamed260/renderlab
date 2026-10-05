import assert from "node:assert/strict";
import test from "node:test";

import { validateSameOriginMutation } from "../../src/server/security/same-origin-validation.ts";

function mutationRequest(headers = {}) {
  return new Request("https://renderlab.example/api/media/uploads/upload-tickets", {
    method: "POST",
    headers,
  });
}

test("matching Origin is accepted", () => {
  assert.deepEqual(
    validateSameOriginMutation(mutationRequest({ Origin: "https://renderlab.example" })),
    { ok: true },
  );
});

test("mismatched and invalid Origin values are rejected without echoing header details", () => {
  for (const origin of ["https://evil.example", "null", "not a URL"]) {
    const decision = validateSameOriginMutation(mutationRequest({ Origin: origin }));
    assert.equal(decision.ok, false);
    assert.equal(decision.error.code, "cross_origin_request_blocked");
    assert(!decision.error.message.includes(origin));
  }
});

test("Sec-Fetch-Site only accepts same-origin when present", () => {
  assert.deepEqual(
    validateSameOriginMutation(mutationRequest({ "Sec-Fetch-Site": "same-origin" })),
    { ok: true },
  );
  for (const fetchSite of ["same-site", "cross-site", "none"]) {
    const decision = validateSameOriginMutation(mutationRequest({ "Sec-Fetch-Site": fetchSite }));
    assert.equal(decision.ok, false, `${fetchSite} must be rejected`);
  }
});

test("non-browser callers without Origin or fetch metadata remain compatible", () => {
  assert.deepEqual(validateSameOriginMutation(mutationRequest({ Authorization: "Bearer test" })), { ok: true });
});

test("explicit fetch metadata and Origin must both satisfy the boundary", () => {
  const decision = validateSameOriginMutation(mutationRequest({
    Origin: "https://renderlab.example",
    "Sec-Fetch-Site": "cross-site",
  }));
  assert.equal(decision.ok, false);
});

test("rejection contract remains stable and header-safe", () => {
  const decision = validateSameOriginMutation(mutationRequest({ Origin: "https://evil.example" }));
  assert.deepEqual(decision, {
    ok: false,
    error: {
      code: "cross_origin_request_blocked",
      message: "Cross-origin state-changing requests are not allowed.",
    },
  });
});
