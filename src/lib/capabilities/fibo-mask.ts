/** Production-only FIBO mask identity: a separately uploaded, owner-scoped
 * temporary PNG source. No client-controlled storage keys or provider IDs.
 */
export const fiboMaskMaxBytes = 8 * 1024 * 1024;
export const fiboMaskUsage = "fibo-mask" as const;
export const fiboMaskInputRole = "fibo-mask" as const;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type FiboMaskSource = { type: "temporary-source"; id: string };
export type PersistedFiboMaskInput = { role: typeof fiboMaskInputRole; source: FiboMaskSource };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseFiboMaskSource(raw: unknown): FiboMaskSource | null {
  if (!isRecord(raw) || Object.keys(raw).length !== 2
    || raw.type !== "temporary-source" || typeof raw.id !== "string"
    || !uuid.test(raw.id)) return null;
  return { type: "temporary-source", id: raw.id.toLowerCase() };
}

/** The extra job.inputs record protects mask bytes from staging cleanup.
 * It is not a creative reference, and is never sent to FIBO as an image slot.
 */
export function persistFiboMaskInputs(inputs: readonly unknown[], mask?: FiboMaskSource): unknown[] {
  return mask ? [...inputs, { role: fiboMaskInputRole, source: mask }] : [...inputs];
}

export function splitPersistedFiboMaskInputs(raw: unknown):
  | { inputs: unknown[]; mask?: FiboMaskSource }
  | null {
  if (!Array.isArray(raw)) return null;
  const candidates = raw.filter((input) => isRecord(input) && input.role === fiboMaskInputRole);
  if (!candidates.length) return { inputs: raw };
  if (candidates.length !== 1 || raw[raw.length - 1] !== candidates[0]) return null;
  const entry = candidates[0];
  if (!isRecord(entry) || Object.keys(entry).length !== 2) return null;
  const mask = parseFiboMaskSource(entry.source);
  if (!mask) return null;
  return { inputs: raw.slice(0, -1), mask };
}
