const HTML_ENTITIES = {
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
  "&lt;": "<",
  "&gt;": ">",
};

export function htmlDecode(value) {
  return value.replace(/&(?:amp|quot|#39|lt|gt);/g, (entity) => HTML_ENTITIES[entity]);
}

export function emailChangeLink(html) {
  if (typeof html !== "string") return null;
  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((match) => htmlDecode(match[1]));
  for (const href of [...new Set(hrefs)]) {
    let url;
    try { url = new URL(href); } catch { continue; }
    const type = url.searchParams.get("type");
    if (type !== "email_change") continue;
    const tokenHash = url.searchParams.get("token_hash") || url.searchParams.get("token");
    if (!tokenHash) continue;
    return { url, tokenHash };
  }
  return null;
}

export function scannerSafeConfirmation(link) {
  return Boolean(link) && link.url.origin === "https://renderlab.faresuniform.uk"
    && link.url.pathname === "/auth/confirm"
    && link.url.searchParams.get("type") === "email_change"
    && urlTokenIsUnambiguous(link);
}

function urlTokenIsUnambiguous({ url }) {
  return !url.username && !url.password
    && url.searchParams.getAll("type").length === 1
    && url.searchParams.getAll("token_hash").length === 1
    && Boolean(url.searchParams.get("token_hash"))
    && !url.searchParams.has("token");
}
