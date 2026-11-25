import "server-only";

// Next Server Actions already compare Origin to Host / forwarded host. Keep
// History's settlement-bearing action fail-closed on missing Origin and
// reject cross-site Fetch Metadata, just as ordinary mutation routes do.
// Do not accept a caller-supplied origin/owner argument.
export function isHistoryActionSameOrigin(headers: Pick<Headers, "get">): boolean {
  const site = headers.get("sec-fetch-site")?.trim().toLowerCase();
  if (site && site !== "same-origin") return false;
  const origin = headers.get("origin")?.trim();
  const host = headers.get("host")?.trim() || headers.get("x-forwarded-host")?.split(",", 1)[0]?.trim();
  if (!origin || !host) return false;
  try {
    const parsed = new URL(origin);
    if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || origin !== parsed.origin) return false;
    const proto = headers.get("x-forwarded-proto")?.split(",", 1)[0]?.trim().toLowerCase().replace(/:$/, "");
    if (proto && proto + ":" !== parsed.protocol) return false;
    return parsed.host === new URL(parsed.protocol + "//" + host).host;
  } catch {
    return false;
  }
}
