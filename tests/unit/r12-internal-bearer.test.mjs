import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isAuthorizedInternalBearer } from "../../src/server/security/internal-bearer-secret.ts";

const secret = "a".repeat(32);
test("R12 internal bearer accepts exact 32+ character configured secrets", () => {
  assert.equal(isAuthorizedInternalBearer("Bearer " + secret, secret), true);
  assert.equal(isAuthorizedInternalBearer("Bearer " + "b".repeat(64), "b".repeat(64)), true);
  assert.equal(isAuthorizedInternalBearer("Bearer "+secret+"x",secret), false);
  assert.equal(isAuthorizedInternalBearer("bearer " + secret, secret), false);
  assert.equal(isAuthorizedInternalBearer("Bearer "+"b".repeat(32), secret), false);
  assert.equal(isAuthorizedInternalBearer(null, secret), false);
});
test("R12 internal bearer rejects missing or short secrets even on exact match", () => {
  for (const weak of [null, undefined, "", "a", "a".repeat(31), "  " + "a".repeat(30)]) {
    assert.equal(isAuthorizedInternalBearer(weak ? "Bearer " + weak.trim() : null, weak), false);
  }
});
test("R12 internal routes share hash-based comparison, never direct string equality", () => {
  const base = "src/app/api/internal/";
  for (const route of [base+"maintenance/route.ts",base+"generation/reconcile/route.ts"]) {
    const source = readFileSync(route, "utf8");
    assert.match(source, /isAuthorizedInternalBearer\(/);
    assert.doesNotMatch(source, /authorization"\)\s*===/);
  }
  const source=readFileSync("src/server/security/internal-bearer-secret.ts","utf8");
  assert.match(source,/timingSafeEqual\(/);
  assert.match(source,/createHash\("sha256"\)/);
});
