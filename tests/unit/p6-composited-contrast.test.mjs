import test from "node:test";
import assert from "node:assert/strict";
import { contrastRatio, compositeForeground, measurePixels, measureBoundarySamples } from "../components/composited-contrast.ts";

test("contrast uses WCAG sRGB luminance and translucent foreground composition", () => {
  assert.equal(contrastRatio([255,255,255],[0,0,0]), 21);
  assert.equal(contrastRatio([40,40,40],[40,40,40]), 1);
  assert.deepEqual(compositeForeground([255,255,255,0],[30,40,50]), [30,40,50]);
  assert.deepEqual(compositeForeground([255,255,255,255],[30,40,50]), [255,255,255]);
});

test("composited collector detects worst actual background and unstable or missing paint", () => {
  const before = Uint8Array.from([255,255,255,255,255,255,30,30,30]);
  const hidden = Uint8Array.from([0,0,0,200,200,200,30,30,30]);
  const rect = [{x:0,y:0,width:3,height:1}];
  const result = measurePixels(before, hidden, hidden, 3, 1, rect, [255,255,255,255]);
  assert.equal(result.pixels, 2);
  assert.ok(result.ratio < 4.5);
  assert.equal(result.ratio, contrastRatio([255,255,255],[200,200,200]));
  assert.equal(result.unstable, false);
  const shifted = Uint8Array.from([10,0,0,200,200,200,30,30,30]);
  assert.equal(measurePixels(before, hidden, shifted, 3, 1, rect, [255,255,255,255]).unstable, true);
  assert.equal(measurePixels(hidden, hidden, hidden, 3, 1, rect, [255,255,255,255]).ratio, null);
  assert.throws(() => measurePixels(before, hidden, shifted, 4, 1, rect, [255,255,255,255]));
});

test("boundary pixel comparisons use the weakest actual adjacent pair and flag clipped samples", () => {
 const data=Uint8Array.from([255,255,255,0,0,0,200,200,200]);
 assert.equal(measureBoundarySamples(data,3,1,[{a:[0,0],b:[1,0]},{a:[0,0],b:[2,0]}]).ratio,contrastRatio([255,255,255],[200,200,200]));
 assert.equal(measureBoundarySamples(data,3,1,[{a:[0,0],b:[-1,0]}]).ratio,null);
});
