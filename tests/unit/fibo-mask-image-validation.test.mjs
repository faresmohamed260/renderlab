import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL("../../src/" + specifier.slice(2) + ".ts", import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});

const { inspectFiboMaskSelection } = await import("../../src/server/media/fibo-mask-image-validation.ts");

async function image(width, height, selected) {
  const raw = Buffer.alloc(width * height * 3);
  if (selected) raw.fill(255, 3, 6);
  return sharp(raw, { raw: { width, height, channels: 3 } }).png().toBuffer();
}

test("real decoded PNG selection accepts nonempty mask and rejects all-black mask", async () => {
  const selected = await image(2, 2, true);
  await assert.doesNotReject(inspectFiboMaskSelection(selected, { width: 2, height: 2 }));
  const empty = await image(2, 2, false);
  await assert.rejects(inspectFiboMaskSelection(empty, { width: 2, height: 2 }), /select/);
});

test("mask validation fails closed for corrupt bytes and oversized stated geometry", async () => {
  const valid = await image(2, 2, true);
  await assert.rejects(inspectFiboMaskSelection(Buffer.from("bad"), { width: 2, height: 2 }));
  for (const geometry of [
    { width: 0, height: 2 }, { width: 2, height: 0 },
    { width: 4097, height: 2 }, { width: 4096, height: 4097 },
  ]) {
    await assert.rejects(inspectFiboMaskSelection(valid, geometry), /bounds/, JSON.stringify(geometry));
  }
});
