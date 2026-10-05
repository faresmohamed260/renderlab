import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  generationNegativePromptWithinLimit,
  generationPromptWithinLimit,
  generationTextLimits,
} from "../../src/lib/api/generation-text-limits.ts";

const generationContractSource = await readFile(
  new URL("../../src/lib/api/generation-contract.ts", import.meta.url),
  "utf8",
);

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

test("server generation parser wires both text bounds before persistence or dispatch", () => {
  assert.ok(generationContractSource.includes("generationPromptWithinLimit(value.prompt)"));
  assert.ok(
    generationContractSource.includes("generationNegativePromptWithinLimit(value.negativePrompt)"),
  );
  assert.ok(generationContractSource.includes("const prompt = value.prompt.trim()"));
});
