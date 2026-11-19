import assert from "node:assert/strict";
import test from "node:test";
import { loadCreateResultSource } from "../../src/features/create/create-result-source.ts";

test("hosted source resolves through the owner-scoped endpoint, not base64 decoding", async (t) => {
  const signal = new AbortController().signal;
  const request = t.mock.method(globalThis, "fetch", async () => new Response(
    new Uint8Array([1, 2, 3]), { headers: { "Content-Type": "image/png" } },
  ));
  const file = await loadCreateResultSource({
    assetId: "fixture", image_data: "/api/media/assets/fixture/content", filename: "output.png",
  }, signal, (type) => type === "image/png");
  assert.deepEqual(request.mock.calls[0].arguments, [
    "/api/media/assets/fixture/content?source=1", { signal, cache: "no-store" },
  ]);
  assert.equal(file.name, "output.png");
  assert.deepEqual([...new Uint8Array(await file.arrayBuffer())], [1, 2, 3]);

  request.mock.mockImplementation(async () => new Response("not signed in", { status: 401 }));
  await assert.rejects(
    loadCreateResultSource({ assetId: "fixture", image_data: "" }, signal, () => true),
    /unavailable/,
  );
});

test("the private inline result remains reusable without a network request", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch");
  const file = await loadCreateResultSource(
    { image_data: "data:image/png;base64,AQID" }, new AbortController().signal, () => true,
  );
  assert.equal(fetch.mock.callCount(), 0);
  assert.deepEqual([...new Uint8Array(await file.arrayBuffer())], [1, 2, 3]);
});
