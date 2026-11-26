import test from "node:test";
import assert from "node:assert/strict";
import { largestLayoutShiftWindow, interactionDurations, median, transferredJavaScript } from "../components/performance-metrics.ts";
test("CLS uses largest gap-bounded session and excludes recent input", () => {
  assert.equal(largestLayoutShiftWindow([
    { startTime: 0, value: .1, hadRecentInput: false },
    { startTime: 800, value: .15, hadRecentInput: false },
    { startTime: 900, value: .9, hadRecentInput: true },
    { startTime: 1800, value: .2, hadRecentInput: false },
  ]), .25);
  assert.equal(largestLayoutShiftWindow([]), 0);
  assert.equal(largestLayoutShiftWindow(Array.from({length: 7}, (_, i) => ({startTime:i*900,value:1,hadRecentInput:false}))), 6);
});
test("event timing groups real interactions and preserves missing samples", () => {
  assert.deepEqual(interactionDurations([{interactionId: 0,duration: 100},{interactionId: 1,duration: 16},{interactionId: 1,duration: 40},{interactionId: 2,duration: 24}]), [40,24]);
  assert.equal(median([null,null]), null);
  assert.equal(median([20,40,null]), 30);
  assert.equal(median([40,20,30]), 30);
});

test("cold transferred JS includes script and preloaded chunks, not HTML, CSS, RSC or external resources", () => {
  const origin = "http://127.0.0.1:4173";
  const entry = (name, initiatorType, transferSize) => ({name: origin + name, initiatorType, transferSize});
  assert.deepEqual(transferredJavaScript([
    entry("/_next/static/a.js?version=1", "script", 1400), entry("/_next/static/b.js", "link", 800),
    entry("/_next/static/b.js", "script", 0), entry("/create?_rsc=abc", "fetch", 400),
    entry("/style.css", "link", 100), entry("/create", "navigation", 200),
    { name: "https://other.invalid/a.js", initiatorType: "script", transferSize: 700 },
  ], origin), {bytes: 2200, resources: 3});
  assert.deepEqual(transferredJavaScript([], origin), {bytes:0,resources:0});
});
