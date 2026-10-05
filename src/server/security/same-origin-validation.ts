export type SameOriginMutationDecision =
  | { ok: true }
  | {
      ok: false;
      error: {
        code: "cross_origin_request_blocked";
        message: string;
      };
    };

const blockedDecision: SameOriginMutationDecision = {
  ok: false,
  error: {
    code: "cross_origin_request_blocked",
    message: "Cross-origin state-changing requests are not allowed.",
  },
};

function firstForwardedValue(value: string | null) {
  return value?.split(",", 1)[0]?.trim() || null;
}

function addCandidateOrigin(origins: Set<string>, protocol: string | null, host: string | null) {
  if (!protocol || !host || (protocol !== "http:" && protocol !== "https:")) return;
  try {
    origins.add(new URL(`${protocol}//${host}`).origin);
  } catch {
    // Invalid proxy/host metadata contributes no trusted destination candidate.
  }
}

function requestDestinationOrigins(request: Pick<Request, "headers" | "url">) {
  const origins = new Set<string>();
  let requestUrl: URL;
  try {
    requestUrl = new URL(request.url);
  } catch {
    return origins;
  }

  origins.add(requestUrl.origin);

  const host = request.headers.get("host")?.trim()
    || firstForwardedValue(request.headers.get("x-forwarded-host"));
  const forwardedProtoValue = firstForwardedValue(request.headers.get("x-forwarded-proto"));
  const forwardedProtocol = forwardedProtoValue ? `${forwardedProtoValue.replace(/:$/, "").toLowerCase()}:` : null;

  // Next/reverse-proxy request.url host/protocol may be normalized differently from
  // the browser-visible destination. Compare Origin against exact server-observed
  // destination origins instead of trusting only request.url. Prefer the ordinary
  // Host header; forwarded host is only a fallback when Host is unavailable.
  addCandidateOrigin(origins, requestUrl.protocol, host);
  addCandidateOrigin(origins, forwardedProtocol, host);

  return origins;
}

export function validateSameOriginMutation(
  request: Pick<Request, "headers" | "url">,
): SameOriginMutationDecision {
  const fetchSite = request.headers.get("sec-fetch-site")?.trim().toLowerCase();
  if (fetchSite && fetchSite !== "same-origin") return blockedDecision;

  const origin = request.headers.get("origin")?.trim();
  if (!origin) return { ok: true };

  let normalizedOrigin: string;
  try {
    normalizedOrigin = new URL(origin).origin;
  } catch {
    return blockedDecision;
  }

  if (!requestDestinationOrigins(request).has(normalizedOrigin)) return blockedDecision;
  return { ok: true };
}
