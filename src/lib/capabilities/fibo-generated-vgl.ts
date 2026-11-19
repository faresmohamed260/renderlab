/** Worker-generated VGL is distinct from user-authored manual VGL.
 * Generated JSON must be validated before durable job/media provenance.
 * Scene and edit responses have different required semantic fields.
 */
export const fiboGeneratedVglCharacterLimit = 8192;

export type GeneratedFiboVglMode = "scene" | "edit";

export function normalizeGeneratedFiboVgl(
  value: unknown,
  mode: GeneratedFiboVglMode = "scene",
): string | null {
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
  const requiredField = mode === "edit" ? "edit_instruction" : "short_description";
  const requiredText = record[requiredField];
  if (typeof requiredText !== "string" || !requiredText.trim()
    || Array.from(requiredText).length > 1000) return null;
  if (mode === "scene" && "edit_instruction" in record) return null;
  return source;
}

/** Private signed gateway response. Never accept caller-supplied provider URLs,
 * owner identity, model names or partial worker state as a generated caption.
 */
export function parseGeneratedFiboSidecar(
  value: unknown,
  mode: GeneratedFiboVglMode = "scene",
): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== 1 || !("vgl" in record)) return null;
  return normalizeGeneratedFiboVgl(record.vgl, mode);
}
