import assert from "node:assert/strict";
import test from "node:test";

import {
  advancedDefaultsForOutput,
  continuationActionForMedia,
  generationInputAlias,
  generationInputRoleForIndex,
  generationPromptReferenceAliases,
  isPromptGenerationOperation,
  maxGenerationInputsForOutput,
  resolveCreativeOperation,
  unresolvedGenerationPromptReferenceAliases,
} from "../../src/lib/capabilities/generation.ts";
import {
  createUpscaleImageCommand,
  imageUpscaleScale,
} from "../../src/lib/capabilities/upscale.ts";

test("generation aliases and prompt references remain deterministic", () => {
  assert.equal(generationInputAlias(1), "image1");
  assert.equal(generationInputAlias(12), "image12");
  assert.throws(() => generationInputAlias(0), RangeError);
  assert.deepEqual(
    generationPromptReferenceAliases("Use @image2 with @image1, then @image2 again."),
    ["image2", "image1"],
  );
  assert.deepEqual(
    unresolvedGenerationPromptReferenceAliases("Use @image1 and @image3", ["image1", "image2"]),
    ["image3"],
  );
});

test("generation input capabilities preserve bounded roles", () => {
  assert.equal(maxGenerationInputsForOutput("image"), 2);
  assert.equal(maxGenerationInputsForOutput("video"), 1);
  assert.equal(generationInputRoleForIndex("image", 0), "primary-image");
  assert.equal(generationInputRoleForIndex("image", 1), "reference");
  assert.equal(generationInputRoleForIndex("image", 2), null);
  assert.equal(generationInputRoleForIndex("video", 0), "first-frame");
  assert.equal(generationInputRoleForIndex("video", 1), null);
});

test("creative operation resolution follows prompt-generation input intent", () => {
  const base = {
    prompt: "test",
    output: { kind: "image", aspectRatio: "1:1" },
    inputs: [],
  };

  assert.equal(resolveCreativeOperation(base), "create-image");
  assert.equal(
    resolveCreativeOperation({
      ...base,
      inputs: [{ alias: "image1", role: "primary-image", source: { type: "media-asset", id: "asset" } }],
    }),
    "edit-image",
  );
  assert.equal(
    resolveCreativeOperation({ ...base, output: { kind: "video", aspectRatio: "16:9" } }),
    "create-video",
  );
  assert.equal(
    resolveCreativeOperation({
      ...base,
      output: { kind: "video", aspectRatio: "16:9" },
      inputs: [{ alias: "image1", role: "first-frame", source: { type: "media-asset", id: "asset" } }],
    }),
    "animate-image",
  );
  assert.equal(isPromptGenerationOperation("create-image"), true);
  assert.equal(isPromptGenerationOperation("upscale-image"), false);
});

test("upscale command is promptless, fixed 2x, and uses one durable primary image", () => {
  assert.equal(imageUpscaleScale, 2);
  assert.deepEqual(createUpscaleImageCommand(" asset-123 "), {
    operation: "upscale-image",
    outputKind: "image",
    prompt: null,
    inputs: [
      {
        alias: "image1",
        role: "primary-image",
        source: { type: "media-asset", id: "asset-123" },
      },
    ],
    parameters: { upscale: { scale: 2 } },
  });
  assert.throws(() => createUpscaleImageCommand("   "), RangeError);
});

test("continuation and advanced defaults stay capability-derived", () => {
  assert.equal(continuationActionForMedia("image", "edit-image")?.inputRole, "primary-image");
  assert.equal(continuationActionForMedia("image", "animate-image")?.inputRole, "first-frame");
  assert.equal(continuationActionForMedia("video", "edit-image"), null);
  assert.deepEqual(advancedDefaultsForOutput("image"), { seed: 42, steps: 4, guidance: 1 });
  assert.deepEqual(advancedDefaultsForOutput("video"), { seed: 42, frameRate: 24 });
});
