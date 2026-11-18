/**
 * Historical source comparison is a read-only media operation, not a request
 * to replay retired generation settings. Find one durable primary source
 * without re-validating the old model, guidance, steps, or output parameters.
 * The server still reloads the asset with the current owner ID.
 */
export function comparisonSourceAssetId(
  operation: string,
  inputs: unknown,
): string | null {
  const role = operation === "edit-image"
    ? "primary-image"
    : operation === "animate-image"
      ? "first-frame"
      : null;
  if (!role || !Array.isArray(inputs)) return null;

  const sources = inputs.filter((input): input is { role: string; source?: unknown } => (
    input !== null && typeof input === "object" && !Array.isArray(input)
    && "role" in input && input.role === role
  ));
  if (sources.length !== 1) return null;
  const source = sources[0]?.source;
  if (!source || typeof source !== "object" || Array.isArray(source)
    || !("type" in source) || source.type !== "media-asset"
    || !("id" in source) || typeof source.id !== "string" || !source.id.trim()) return null;
  return source.id.trim();
}
