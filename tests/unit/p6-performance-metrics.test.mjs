import test from "node:test";
import assert from "node:assert/strict";
import { largestLayoutShiftWindow, interactionDurations, median } from "../components/performance-metrics.ts";
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
