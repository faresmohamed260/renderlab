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

export function validateSameOriginMutation(
  request: Pick<Request, "headers" | "url">,
): SameOriginMutationDecision {
  const fetchSite = request.headers.get("sec-fetch-site")?.trim().toLowerCase();
  if (fetchSite && fetchSite !== "same-origin") return blockedDecision;

  const origin = request.headers.get("origin")?.trim();
  if (!origin) return { ok: true };

  try {
    if (new URL(origin).origin !== new URL(request.url).origin) return blockedDecision;
  } catch {
    return blockedDecision;
  }

  return { ok: true };
}
