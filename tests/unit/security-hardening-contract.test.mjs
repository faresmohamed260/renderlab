import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const configSource = await readFile(new URL("../../next.config.ts", import.meta.url), "utf8");

test("Next config keeps the application HTTP hardening baseline", () => {
  assert.ok(configSource.includes("poweredByHeader: false"));
  for (const header of [
    "Content-Security-Policy",
    "X-Frame-Options",
    "X-Content-Type-Options",
    "Referrer-Policy",
    "Permissions-Policy",
  ]) {
    assert.ok(configSource.includes(header), `next.config.ts must configure ${header}`);
  }
  assert.ok(configSource.includes("frame-ancestors 'none'"));
  assert.ok(configSource.includes("object-src 'none'"));
  assert.ok(configSource.includes("base-uri 'self'"));
});
