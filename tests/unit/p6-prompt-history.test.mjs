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
  const page = await readPromptHistory(owner, { limit: 2 }, async (path, init) => {
    calls++; assert.equal(init.method, "GET"); assert.match(path, /^generation_jobs\?/); return rows;
  });
  assert.equal(calls, 1);
  assert.deepEqual(page.items.map(x => x.status), ["failed", "succeeded"]);
  assert.deepEqual(Object.keys(page.items[0]).sort(), ["createdAt", "id", "operation", "prompt", "status"]);
  assert.deepEqual(page.nextCursor, { createdAt: timestamp, id: rows[1].id });
  const empty = await readPromptHistory(owner, {}, async () => []);
  assert.deepEqual(empty, { items: [], nextCursor: null });
});
