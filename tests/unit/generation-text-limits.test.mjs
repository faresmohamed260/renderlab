import assert from "node:assert/strict";
import test from "node:test";

import { parseGenerationRequest } from "../../src/lib/api/generation-contract.ts";
import {
  generationNegativePromptWithinLimit,
  generationPromptWithinLimit,
  generationTextLimits,
} from "../../src/lib/api/generation-text-limits.ts";

function baseRequest(prompt, advanced) {
  return {
    prompt,
    output: { kind: "image", aspectRatio: "1:1" },
    inputs: [],
    ...(advanced === undefined ? {} : { advanced }),
  };
}

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

test("generation request parser enforces prompt and negative-prompt boundaries", () => {
  const promptAtLimit = parseGenerationRequest(
    baseRequest("x".repeat(generationTextLimits.promptCharacters)),
  );
  assert.equal(promptAtLimit.ok, true);

  const promptOverLimit = parseGenerationRequest(
    baseRequest("x".repeat(generationTextLimits.promptCharacters + 1)),
  );
  assert.equal(promptOverLimit.ok, false);
  assert.equal(promptOverLimit.error.code, "invalid_request");

  const negativeAtLimit = parseGenerationRequest(
    baseRequest("test", { negativePrompt: "x".repeat(generationTextLimits.negativePromptCharacters) }),
  );
  assert.equal(negativeAtLimit.ok, true);

  const negativeOverLimit = parseGenerationRequest(
    baseRequest("test", { negativePrompt: "x".repeat(generationTextLimits.negativePromptCharacters + 1) }),
  );
  assert.equal(negativeOverLimit.ok, false);
  assert.equal(negativeOverLimit.error.code, "invalid_request");
});
