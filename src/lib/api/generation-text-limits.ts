export const generationTextLimits = {
  promptCharacters: 8_000,
  negativePromptCharacters: 8_000,
} as const;

export function generationPromptWithinLimit(value: string) {
  return value.length <= generationTextLimits.promptCharacters;
}

export function generationNegativePromptWithinLimit(value: string) {
  return value.length <= generationTextLimits.negativePromptCharacters;
}
