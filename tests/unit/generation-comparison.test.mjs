import assert from "node:assert/strict";
import test from "node:test";

import { comparisonSourceAssetId } from "../../src/lib/capabilities/generation-comparison.ts";

const primary = { alias: "image1", role: "primary-image", source: { type: "media-asset", id: " source-owned " } };
const second = { alias: "image2", role: "reference", source: { type: "media-asset", id: "reference-owned" } };

test("historical image edits remain source-comparable without model eligibility", () => {
  assert.equal(comparisonSourceAssetId("edit-image", [primary, second]), "source-owned");
  assert.equal(comparisonSourceAssetId("edit-image", [second, primary]), "source-owned");
  assert.equal(comparisonSourceAssetId("animate-image", [{
    alias: "image1", role: "first-frame", source: { type: "media-asset", id: "video-source-owned" },
  }]), "video-source-owned");
});

test("comparison never resolves missing, temporary, duplicate or mismatched primary assets", () => {
  for (const inputs of [
    [],
    [second],
    [{ ...primary, source: { type: "temporary-source", id: "not-durable" } }],
    [{ ...primary, source: { type: "media-asset", id: " " } }],
    [primary, primary],
    null,
    "not-inputs",
    [{ role: "primary-image", source: { type: "media-asset", id: 42 } }],
  ]) {
    assert.equal(comparisonSourceAssetId("edit-image", inputs), null, JSON.stringify(inputs));
  }
  assert.equal(comparisonSourceAssetId("create-image", [primary]), null);
  assert.equal(comparisonSourceAssetId("upscale-image", [primary]), null);
  assert.equal(comparisonSourceAssetId("animate-image", [primary]), null);
});
