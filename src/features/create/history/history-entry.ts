// Shared pure compatibility parser. No owner or destination can come from the URL.
export type HistoryEntryParams = Record<string, string | string[] | undefined>;
function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function offset(value: string | undefined) {
  const parsed = value && /^\d+$/.test(value) ? Number(value) : 0;
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}
export function parseHistoryEntry(params: HistoryEntryParams) {
  return { open: first(params.history) === "jobs", offset: offset(first(params.historyOffset)) };
}
export function activityRedirect(request: Request): Response {
  const incoming = new URL(request.url).searchParams;
  const outgoing = new URLSearchParams({ history: "jobs" });
  const pageOffset = offset(incoming.get("offset") ?? undefined);
  if (pageOffset) outgoing.set("historyOffset", String(pageOffset));
  for (const key of ["recipe", "source", "action"]) {
    const value = incoming.get(key);
    if (value !== null) outgoing.set(key, value);
  }
  return new Response(null, { status: 307, headers: {
    Location: "/create?" + outgoing.toString(),
    "Cache-Control": "private, no-store",
  } });
}
