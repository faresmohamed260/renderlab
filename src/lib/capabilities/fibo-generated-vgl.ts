/** Public-node generated VGL is distinct from user-authored manual VGL.
 * Generated JSON must be validated before durable job/media provenance.
 * No private Studio prompt or external provider is part of this contract.
 */
export const fiboGeneratedVglCharacterLimit = 8192;

export function normalizeGeneratedFiboVgl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const source = value.trim();
  if (!source || Array.from(source).length > fiboGeneratedVglCharacterLimit) return null;
  let object: unknown;
  try {
    object = JSON.parse(source);
  } catch {
    return null;
  }
  if (!object || typeof object !== "object" || Array.isArray(object)) return null;
  const record = object as Record<string, unknown>;
  const description = record.short_description;
  if (typeof description !== "string" || !description.trim()
    || Array.from(description).length > 1000 || "edit_instruction" in record) return null;
  return source;
}

/** Private signed gateway response. Never accept caller-supplied provider URLs,
 * owner identity, model names or partial worker state as a generated caption.
 */
export function parseGeneratedFiboSidecar(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== 1 || !("vgl" in record)) return null;
  return normalizeGeneratedFiboVgl(record.vgl);
}
