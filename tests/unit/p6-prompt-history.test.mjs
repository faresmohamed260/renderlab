import assert from "node:assert/strict";
import test from "node:test";
import { promptHistoryQuery, readPromptHistory } from "../../src/server/generation/history/prompt-history-model.ts";

const owner = "12345678-1234-4234-8234-123456789abc";
const id = "12345678-1234-4234-8234-123456789ab1";
const timestamp = "2026-11-25T01:02:03.123456+00:00";
test("prompt history query is owner scoped, bounded, deterministic and escapes pattern syntax", () => {
  const p = promptHistoryQuery(owner, { search: "  100%_a*b\\c,()  ", limit: 999, cursor: { createdAt: timestamp, id } });
  assert.equal(p.get("owner_id"), "eq." + owner);
  assert.equal(p.get("limit"), "41");
  assert.equal(p.get("order"), "created_at.desc,id.desc");
  assert.equal(p.get("operation"), "in.(create-image,edit-image,create-video,animate-image)");
  assert.equal(p.get("prompt"), "ilike.%100\\%\\_a\\*b\\\\c,()%");
  assert.equal(p.get("or"), "(created_at.lt." + timestamp + ",and(created_at.eq." + timestamp + ",id.lt." + id + "))");
  assert.throws(() => promptHistoryQuery("foreign-filter", {}));
  assert.throws(() => promptHistoryQuery(owner, { search: "x".repeat(129) }));
  assert.throws(() => promptHistoryQuery(owner, { cursor: { createdAt: "x),owner_id.neq.anything", id } }));
  assert.throws(() => promptHistoryQuery(owner, { limit: NaN }));
});
test("read includes failed and succeeded attempts even without assets; no sensitive fields, lookahead cursor", async () => {
  const rows = [
    { id, prompt: "failed", status: "failed", operation: "edit-image", created_at: timestamp, owner_id: owner, parameters: { secret: true } },
    { id: "12345678-1234-4234-8234-123456789ab2", prompt: "success", status: "succeeded", operation: "create-image", created_at: timestamp },
    { id: "12345678-1234-4234-8234-123456789ab3", prompt: "older", status: "cancelled", operation: "create-video", created_at: timestamp },
  ];
  let calls = 0;
  const page = await readPromptHistory(owner, { limit: 2 }, async (params, init) => {
    calls++; assert.equal(init.method, "GET"); assert.deepEqual(params.getAll("owner_id"), ["eq." + owner]); return rows;
  });
  assert.equal(calls, 1);
  assert.deepEqual(page.items.map(x => x.status), ["failed", "succeeded"]);
  assert.deepEqual(Object.keys(page.items[0]).sort(), ["createdAt", "id", "operation", "prompt", "status"]);
  assert.deepEqual(page.nextCursor, { createdAt: timestamp, id: rows[1].id });
  const empty = await readPromptHistory(owner, {}, async () => []);
  assert.deepEqual(empty, { items: [], nextCursor: null });
});

test("cursor rejects impossible calendar dates without normalizing or changing microseconds", () => {
  for (const date of ["2026-02-30", "2026-02-29", "2026-04-31", "2026-00-01", "2026-01-00", "2026-13-01", "1900-02-29", "0000-01-01"]) {
    assert.throws(() => promptHistoryQuery(owner, { cursor: { createdAt: date + "T01:02:03Z", id } }), /Invalid history cursor/);
  }
  for (const createdAt of ["2024-02-29T23:59:59.123456Z", "2000-02-29T01:02:03.000001+02:00", "2026-11-25T01:02:03.123456-05:30"]) {
    const p = promptHistoryQuery(owner, { cursor: { createdAt, id } });
    assert.equal(p.get("or"), "(created_at.lt." + createdAt + ",and(created_at.eq." + createdAt + ",id.lt." + id + "))");
  }
});
test("asterisk is documented as a literal percent alias in PostgREST LIKE, never an unescaped wildcard", () => {
  const filter = promptHistoryQuery(owner, { search: "a*b" }).get("prompt");
  assert.equal(filter, "ilike.%a\\*b%");
  assert.equal(filter.replaceAll("*", "%"), promptHistoryQuery(owner, { search: "a%b" }).get("prompt"));
});
test("pagination consumes lookahead once, advances tied timestamp by ID and preserves the search", async () => {
  const ids = [5,4,3,2,1].map(n => "12345678-1234-4234-8234-123456789ab" + n);
  const records = ids.map((id, i) => ({ id, created_at: i < 3 ? timestamp : "2026-11-24T01:02:03.123455+00:00", prompt: "same phrase", status: "failed", operation: "create-image" }));
  let expectedCursor, start = 0;
  const seen = [];
  do {
    const page = await readPromptHistory(owner, { limit: 2, search: "same phrase", cursor: expectedCursor }, async (p, init) => {
      assert.equal(init.method, "GET");
      assert.deepEqual(p.getAll("owner_id"), ["eq." + owner]);
      assert.equal(p.get("limit"), "3");
      assert.equal(p.get("order"), "created_at.desc,id.desc");
      assert.equal(p.get("prompt"), "ilike.%same phrase%");
      if (expectedCursor) assert.equal(p.get("or"), "(created_at.lt." + expectedCursor.createdAt + ",and(created_at.eq." + expectedCursor.createdAt + ",id.lt." + expectedCursor.id + "))");
      else assert.equal(p.has("or"), false);
      return records.slice(start, start + 3);
    });
    seen.push(...page.items.map(row => row.id));
    start += page.items.length;
    expectedCursor = page.nextCursor;
    assert.ok(start <= records.length);
  } while (expectedCursor);
  assert.deepEqual(seen, ids);
  for (const [limit, fetchLimit] of [[undefined,21],[0,2],[-9,2],[1.9,2],[40,41],[41,41]]) {
    const p = promptHistoryQuery(owner, { limit });
    assert.equal(p.get("limit"), String(fetchLimit));
  }
  const exact = await readPromptHistory(owner, { limit: 2 }, async () => records.slice(0,2));
  assert.equal(exact.nextCursor, null);
});
