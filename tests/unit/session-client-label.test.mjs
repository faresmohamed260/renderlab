import assert from "node:assert/strict";
import test from "node:test";
import { normalizeRenderLabSessionClient } from "../../src/lib/auth/session-client-label.ts";

test("normalizes common browser/platform user agents without versions", () => {
  assert.equal(
    normalizeRenderLabSessionClient("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151.0.0.0 Safari/537.36"),
    "Chrome on Windows",
  );
  assert.equal(
    normalizeRenderLabSessionClient("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/19.0 Safari/605.1.15"),
    "Safari on macOS",
  );
  assert.equal(
    normalizeRenderLabSessionClient("Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:143.0) Gecko/20100101 Firefox/143.0"),
    "Firefox on Linux",
  );
  assert.equal(
    normalizeRenderLabSessionClient("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0"),
    "Edge on Windows",
  );
});

test("normalizes mobile and unknown user agents conservatively", () => {
  assert.equal(
    normalizeRenderLabSessionClient("Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 Version/19.0 Mobile/15E148 Safari/604.1"),
    "Safari on iPhone",
  );
  assert.equal(
    normalizeRenderLabSessionClient("Mozilla/5.0 (Linux; Android 16; Pixel) AppleWebKit/537.36 Chrome/151.0.0.0 Mobile Safari/537.36"),
    "Chrome on Android",
  );
  assert.equal(normalizeRenderLabSessionClient("custom-client Linux"), "Unknown browser on Linux");
  assert.equal(normalizeRenderLabSessionClient("custom-client"), "Unknown browser");
  assert.equal(normalizeRenderLabSessionClient(null), "Unknown browser");
});
