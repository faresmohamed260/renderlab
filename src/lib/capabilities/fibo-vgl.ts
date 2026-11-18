/**
 * Manual FIBO visual-genome-language JSON is a bounded, explicit worker input.
 * Validate it independently of browser state; only source-owned aliases may be
 * converted into ComfyUI's one-based <image_N> reference tokens.
 */
export const fiboVglCharacterLimit = 8192;

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function normalizeFiboVgl(value: unknown, attachedAliases: readonly string[]): string | null {
  if (typeof value !== "string") return null;
  const source = value.trim();
  if (!source || Array.from(source).length > fiboVglCharacterLimit) return null;

  let json: unknown;
  try {
    json = JSON.parse(source);
  } catch {
    return null;
  }
  if (!isObject(json) || Object.keys(json).length === 0) return null;

  // Check references in string *values*, not JSON keys or escaped syntax.
  const allowed = new Set(attachedAliases);
  let valid = true;
  const inspect = (item: unknown): void => {
    if (!valid) return;
    if (typeof item === "string") {
      for (const match of item.matchAll(/@image\d+\b/g)) {
        if (!allowed.has(match[0].slice(1))) valid = false;
      }
      for (const match of item.matchAll(/<image_(\d+)>/g)) {
        const slot = Number(match[1]);
        if (!Number.isSafeInteger(slot) || slot < 1 || slot > attachedAliases.length) valid = false;
      }
    } else if (Array.isArray(item)) {
      item.forEach(inspect);
    } else if (isObject(item)) {
      Object.values(item).forEach(inspect);
    }
  };
  inspect(json);
  return valid ? source : null;
}

/** Convert attached aliases within VGL string values while retaining JSON keys. */
export function resolveFiboVglReferences(vgl: string, attachedAliases: readonly string[]): string {
  const indices = new Map(attachedAliases.map((alias, index) => [alias, index + 1]));
  const rewrite = (value: unknown): unknown => {
    if (typeof value === "string") {
      return value.replace(/@image\d+\b/g, (match) => {
        const index = indices.get(match.slice(1));
        return index ? `<image_${index}>` : match;
      });
    }
    if (Array.isArray(value)) return value.map(rewrite);
    if (isObject(value)) {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rewrite(item)]));
    }
    return value;
  };
  return JSON.stringify(rewrite(JSON.parse(vgl)));
}
