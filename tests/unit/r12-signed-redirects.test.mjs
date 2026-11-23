import assert from "node:assert/strict";
import test from "node:test";
import { reset, s, ID } from "../helpers/w4c-route-runtime.mjs";

const content = await import("../../src/app/api/media/assets/[assetId]/content/route.ts");
const download = await import("../../src/app/api/media/assets/[assetId]/download/route.ts");
const thumbnail = await import("../../src/app/api/media/assets/[assetId]/thumbnail/route.ts");
const reference = await import("../../src/app/api/assets/reference/[sourceId]/content/route.ts");
const exported = await import("../../src/app/api/account/data-export/download/route.ts");

const req = () => new Request("https://app.invalid/api/media");
const media = [
  ["content", (id) => content.GET(req(), {params:Promise.resolve({assetId:id})})],
  ["download", (id) => download.GET(req(), {params:Promise.resolve({assetId:id})})],
  ["thumbnail", (id) => thumbnail.GET(req(), {params:Promise.resolve({assetId:id})})],
];

for (const [name, invoke] of media) {
  test("R12 " + name + ": invalid UUID is rejected before auth, lookup and signing", async () => {
    reset();
    const r=await invoke("not-a-uuid");
    assert.equal(r.status,404);
    assert.deepEqual(s.calls,[]);
  });
  test("R12 " + name + ": signed redirect is private and non-cacheable", async () => {
    reset();
    const r=await invoke(ID);
    assert.equal(r.status,302);
    assert.match(r.headers.get("cache-control")??"",/no-store/);
    assert.equal(r.headers.get("location")?.startsWith("https://signed.invalid/"),true);
  });
}
test("R12 reference content and account export redirects are non-cacheable",async()=>{
  reset();
  const r=await reference.GET(req(),{params:Promise.resolve({sourceId:ID})});
  assert.equal(r.status,302);
  assert.match(r.headers.get("cache-control")??"",/no-store/);
  reset();
  const e=await exported.GET();
  assert.equal(e.status,302);
  assert.match(e.headers.get("cache-control")??"",/no-store/);
});
