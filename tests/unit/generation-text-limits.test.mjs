import assert from "node:assert/strict";
import test from "node:test";

import {
  generationNegativePromptWithinLimit,
  generationPromptWithinLimit,
  generationTextLimits,
} from "../../src/lib/api/generation-text-limits.ts";

test("generation prompt text has explicit product resource bounds", () => {
  assert.equal(generationTextLimits.promptCharacters, 8_000);
  assert.equal(generationTextLimits.negativePromptCharacters, 8_000);
  assert.equal(generationPromptWithinLimit("x".repeat(generationTextLimits.promptCharacters)), true);
  assert.equal(generationPromptWithinLimit("x".repeat(generationTextLimits.promptCharacters + 1)), false);
  assert.equal(
    generationNegativePromptWithinLimit("x".repeat(generationTextLimits.negativePromptCharacters)),
    true,
  );
  assert.equal(
    generationNegativePromptWithinLimit("x".repeat(generationTextLimits.negativePromptCharacters + 1)),
    false,
  );
});
