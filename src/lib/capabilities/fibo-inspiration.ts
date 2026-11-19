import type { GenerationInputSource } from "@/lib/capabilities/generation";

/** A FIBO inspiration image is owner-scoped but is not an edit slot. */
export const fiboInspirationInputRole = "fibo-inspiration" as const;
export type FiboInspirationSource = GenerationInputSource;
export type PersistedFiboInspirationInput = {
  role: typeof fiboInspirationInputRole;
  source: FiboInspirationSource;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseFiboInspirationSource(raw: unknown): FiboInspirationSource | null {
  if (!isRecord(raw) || Object.keys(raw).length !== 2
    || (raw.type !== "temporary-source" && raw.type !== "media-asset")
    || typeof raw.id !== "string" || !uuid.test(raw.id)) return null;
  return { type: raw.type, id: raw.id.toLowerCase() };
}

/** Keep the inspiration object alive through staging cleanup without making it
 * an ordered edit reference. Mask persistence, when present, remains last.
 */
export function persistFiboInspirationInputs(
  inputs: readonly unknown[],
  inspiration?: FiboInspirationSource,
): unknown[] {
  return inspiration
    ? [...inputs, { role: fiboInspirationInputRole, source: inspiration }]
    : [...inputs];
}

export function splitPersistedFiboInspirationInputs(raw: unknown):
  | { inputs: unknown[]; inspiration?: FiboInspirationSource }
  | null {
  if (!Array.isArray(raw)) return null;
  const candidates = raw.filter((input) => isRecord(input) && input.role === fiboInspirationInputRole);
  if (!candidates.length) return { inputs: raw };
  if (candidates.length !== 1 || raw[raw.length - 1] !== candidates[0]) return null;
  const entry = candidates[0];
  if (!isRecord(entry) || Object.keys(entry).length !== 2) return null;
  const inspiration = parseFiboInspirationSource(entry.source);
  if (!inspiration) return null;
  return { inputs: raw.slice(0, -1), inspiration };
}
