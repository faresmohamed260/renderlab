/** Bounded opt-in for an authenticated production smoke account. */
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function allowsFiboMaskTest(
  ownerId: string | null | undefined,
  scope: string | undefined,
  now: number,
): boolean {
  if (!ownerId || !scope) return false;
  const [subject, expiresAt, ...extra] = scope.split(",");
  if (extra.length || !uuid.test(subject) || subject !== ownerId
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(expiresAt ?? "")) return false;
  const remaining = Date.parse(expiresAt) - now;
  return remaining > 0 && remaining <= 60 * 60 * 1000;
}
