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

test("placeholder capture waits for stable pixels, rejects persistent drift and never retries a low ratio", async () => {
  const { captureStableTextFrame } = await import("../components/composited-contrast.ts");
  const frame = (r,g,b) => ({data:Uint8Array.from([r,g,b,0,0,0]),info:{width:2,height:1,channels:3}});
  const rect = [{x:0,y:0,width:1,height:1}];
  let i=0;
  const sequence=[frame(20,20,20),frame(40,40,40),frame(40,40,40)];
  const settled=await captureStableTextFrame(async()=>sequence[i++],rect,async()=>{});
  assert.equal(settled.attempts,3);
  assert.equal(settled.stable,true);
  assert.equal(settled.frame.data[0],40);
  assert.equal(settled.deltas[0].changedPixels,1);
  i=0;
  const drifting=await captureStableTextFrame(async()=>frame(++i*10,0,0),rect,async()=>{},4);
  assert.equal(drifting.stable,false);
  assert.equal(drifting.attempts,4);
  const low=measurePixels(frame(255,255,255).data,frame(200,200,200).data,frame(200,200,200).data,2,1,rect,[255,255,255,255]);
  assert.ok(low.ratio<4.5);
  assert.equal(low.unstable,false);
});

test("restored placeholder one-level raster rounding is bounded and both glyph measurements must pass", async () => {
  const { measurePlaceholderFrames } = await import("../components/composited-contrast.ts");
  const frame = (a,b) => ({data:Uint8Array.from([a,a,a,b,b,b]),info:{width:2,height:1,channels:3}});
  const rect = [{x:0,y:0,width:2,height:1}];
  const bg=frame(20,20), painted=frame(190,20), restored=frame(190,21);
  const result=measurePlaceholderFrames(painted,bg,bg,restored,rect,[190,190,190,255]);
  assert.equal(result.unstable,false);
  assert.equal(result.pixels,1);
  assert.ok(result.ratio>=4.5);
  assert.equal(measurePlaceholderFrames(painted,bg,bg,frame(190,22),rect,[190,190,190,255]).unstable,true);
  assert.equal(measurePlaceholderFrames(painted,bg,frame(20,21),restored,rect,[190,190,190,255]).unstable,true);
  const low=measurePlaceholderFrames(frame(255,200),frame(200,200),frame(200,200),frame(254,200),rect,[255,255,255,255]);
  assert.equal(low.unstable,false);
  assert.ok(low.ratio<4.5);
  assert.equal(measurePlaceholderFrames(bg,bg,bg,bg,rect,[190,190,190,255]).ratio,null);
});


test("placeholder paint transaction is atomic, fill-only and preserves original inline style", async () => {
  const { installPlaceholderPaintStyle, setPlaceholderPaintHidden } = await import("../components/composited-contrast.ts");
  const marker = "data-review-hide-placeholder";
  const rule = "[data-review-hide-placeholder]::placeholder { -webkit-text-fill-color: transparent !important; }";
  let installed = null, evaluations = 0, appends = 0, removals = 0, foreignMarker = false;
  const mutations = [];
  const attributes = new Map([["style", "color: var(--rl-text); background: currentColor"]]);
  const doc = {
    querySelectorAll: selector => {
      assert.equal(selector, "[data-review-placeholder-style]");
      return installed ? [installed] : [];
    },
    querySelector: selector => {
      if (selector === "style[data-review-placeholder-style]") return installed;
      assert.equal(selector, "[data-review-hide-placeholder]");
      return attributes.has(marker) || foreignMarker ? {} : null;
    },
    createElement: tag => {
      assert.equal(tag, "style");
      return {
        tagName: "STYLE", textContent: "",
        setAttribute: (name, value) => {
          assert.equal(name, "data-review-placeholder-style");
          assert.equal(value, "");
        },
        remove() { assert.equal(installed, this); installed = null; removals++; },
      };
    },
    head: { appendChild: node => { assert.equal(installed, null); installed = node; appends++; return node; } },
  };
  const element = {
    ownerDocument: doc,
    hasAttribute: name => attributes.has(name),
    getAttribute: name => attributes.get(name) ?? null,
    setAttribute: (name, value) => { assert.equal(name, marker); mutations.push(["set",name,value]); attributes.set(name, value); },
    removeAttribute: name => { assert.equal(name, marker); mutations.push(["remove",name]); attributes.delete(name); },
  };
  const locator = { evaluate: async (fn, arg) => { evaluations++; return fn(element, arg); } };
  const original = attributes.get("style");
  await assert.rejects(() => setPlaceholderPaintHidden(locator, true), /missing/);
  assert.equal(installed, null);
  assert.deepEqual(mutations, []);
  await installPlaceholderPaintStyle(locator);
  const persistent = installed;
  assert.equal(persistent.textContent, rule);
  await installPlaceholderPaintStyle(locator);
  assert.equal(installed, persistent);
  assert.equal(appends, 1, "one stylesheet install per page");
  assert.deepEqual(mutations, [], "installation must not touch the target");
  evaluations = 0;
  await setPlaceholderPaintHidden(locator, true);
  assert.equal(evaluations, 1, "one browser task for the complete hide mutation");
  assert.equal(installed.textContent, rule);
  assert.equal(attributes.get("style"), original);
  assert.equal(attributes.get(marker), "");
  await setPlaceholderPaintHidden(locator, false);
  assert.equal(evaluations, 2, "one browser task for the complete restore mutation");
  // The prior per-transaction removal assertion migrates to lifetime identity:
  // inserting/removing a stylesheet can re-rasterize non-glyph background pixels.
  assert.equal(installed, persistent);
  assert.equal(appends, 1);
  assert.equal(removals, 0);
  assert.deepEqual(mutations, [["set",marker,""],["remove",marker]]);
  assert.deepEqual([...attributes], [["style", original]]);
  attributes.set(marker, "foreign");
  await assert.rejects(() => setPlaceholderPaintHidden(locator, true), /already present/);
  await assert.rejects(() => setPlaceholderPaintHidden(locator, false), /collision/);
  await assert.rejects(() => installPlaceholderPaintStyle(locator), /collision/);
  assert.equal(installed, persistent, "collision must not mutate the existing document");
  assert.equal(attributes.get(marker), "foreign");
  attributes.delete(marker);
  foreignMarker = true;
  await assert.rejects(() => setPlaceholderPaintHidden(locator, true), /already present/);
  foreignMarker = false;
  await assert.rejects(() => setPlaceholderPaintHidden(locator, false), /missing/);
  persistent.textContent = "foreign rule";
  await assert.rejects(() => installPlaceholderPaintStyle(locator), /collision/);
  await assert.rejects(() => setPlaceholderPaintHidden(locator, true), /collision/);
  assert.equal(installed, persistent);
  assert.equal(persistent.textContent, "foreign rule");
  assert.equal(appends, 1);
  assert.equal(removals, 0);
  assert.deepEqual(mutations, [["set",marker,""],["remove",marker]]);
  assert.deepEqual([...attributes], [["style", original]]);
});
