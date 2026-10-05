import assert from "node:assert/strict";
import test from "node:test";

import { validateSameOriginMutation } from "../../src/server/security/same-origin-validation.ts";

function mutationRequest(headers = {}, url = "https://renderlab.example/api/media/uploads/upload-tickets") {
  return new Request(url, {
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

test("server-observed Host accepts a genuine same-origin browser request when request.url host is normalized", () => {
  const request = mutationRequest(
    {
      Host: "127.0.0.1:3000",
      Origin: "http://127.0.0.1:3000",
      "Sec-Fetch-Site": "same-origin",
    },
    "http://localhost:3000/api/media/uploads/upload-tickets",
  );
  assert.deepEqual(validateSameOriginMutation(request), { ok: true });
});

test("forwarded protocol preserves the browser-visible HTTPS destination behind a reverse proxy", () => {
  const request = mutationRequest(
    {
      Host: "renderlab.example",
      Origin: "https://renderlab.example",
      "Sec-Fetch-Site": "same-origin",
      "X-Forwarded-Proto": "https",
    },
    "http://localhost:3000/api/media/uploads/upload-tickets",
  );
  assert.deepEqual(validateSameOriginMutation(request), { ok: true });
});

test("mismatched and invalid Origin values are rejected without echoing header details", () => {
  for (const origin of ["https://evil.example", "null", "not a URL"]) {
    const decision = validateSameOriginMutation(mutationRequest({ Origin: origin, Host: "renderlab.example" }));
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
  const crossSite = validateSameOriginMutation(mutationRequest({
    Origin: "https://renderlab.example",
    "Sec-Fetch-Site": "cross-site",
  }));
  assert.equal(crossSite.ok, false);

  const mismatchedOrigin = validateSameOriginMutation(mutationRequest({
    Host: "renderlab.example",
    Origin: "https://evil.example",
    "Sec-Fetch-Site": "same-origin",
  }));
  assert.equal(mismatchedOrigin.ok, false);
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
