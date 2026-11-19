import assert from "node:assert/strict";
import test from "node:test";
import { allowsFiboMaskTest } from "../../src/lib/capabilities/fibo-mask-test-access.ts";

const owner = "88888888-0000-4000-8000-111111111111";
const scope = owner + ",2026-11-19T16:00:00Z";
const now = Date.parse("2026-11-19T15:30:00Z");

test("only the selected authenticated owner within the bounded window can test", () => {
  assert.equal(allowsFiboMaskTest(owner, scope, now), true);
  for (const id of [null, undefined, "99999999-0000-4000-8000-111111111111"]) {
    assert.equal(allowsFiboMaskTest(id, scope, now), false);
  }
  for (const invalid of [undefined, owner, scope + ",extra", "*,2026-11-19T16:00:00Z", owner + ",tomorrow"]) {
    assert.equal(allowsFiboMaskTest(owner, invalid, now), false);
  }
  assert.equal(allowsFiboMaskTest(owner, scope, Date.parse("2026-11-19T16:00:00Z")), false);
  assert.equal(allowsFiboMaskTest(owner, scope, Date.parse("2026-11-19T14:59:59Z")), false);
});
