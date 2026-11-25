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

test("collector samples painted one-CSS-pixel borders and focus rings in native device pixels", async () => {
  const { collectControlBoundary } = await import("../components/composited-contrast.ts");
  const { default: sharp } = await import("sharp");
  for (const scale of [1, 2]) {
    const w = 32 * scale, h = 28 * scale;
    const panel = [16, 16, 16], fill = [28, 28, 28], border = [169, 160, 189], ring = [140, 118, 240];
    const info = { x: 8, y: 8, w: 12, h: 10, outline: 2, offset: 2, style: "solid", focus: false,
      borders: [1, 1, 1, 1], scale, viewportWidth: 32, viewportHeight: 28 };
    const inside = (x,y,left,top,right,bottom) => x >= left && x < right && y >= top && y < bottom;
    const png = async focused => {
      const data = Buffer.alloc(w * h * 3);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const cx = (x + .5) / scale, cy = (y + .5) / scale;
        const color = inside(cx,cy,9,9,19,17) ? fill : inside(cx,cy,8,8,20,18) ? border :
          focused && inside(cx,cy,4,4,24,22) && !inside(cx,cy,6,6,22,20) ? ring : panel;
        data.set(color, (y*w+x)*3);
      }
      return sharp(data,{raw:{width:w,height:h,channels:3}}).png().toBuffer();
    };
    const locator = { scrollIntoViewIfNeeded: async () => {}, evaluate: async () => info };
    for (const focused of [false,true]) {
      info.focus = focused;
      const image = await png(focused);
      const page = { screenshot: async options => {
        // Simulate Playwright's CSS-scale downsampling when requested.
        return options.scale === "css" && scale !== 1 ? sharp(image).resize(32,28,{kernel:"nearest"}).png().toBuffer() : image;
      } };
      const result = await collectControlBoundary(page,locator,"control-boundary","fixture",focused);
      assert.equal(result.status,"PASS", "painted edge or ring must pass at DPR " + scale);
      assert.equal(result.ratio,contrastRatio(focused ? ring : border,panel));
      assert.equal(result.pixels,focused ? 8 : 4);
    }
  }
});
