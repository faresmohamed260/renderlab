import "server-only";

import { headers } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateSameOriginMutation } from "@/server/security/same-origin-validation";

const production = "https://renderlab.faresuniform.uk";
const loopback = "127.0.0.1:3000";
const assetId = "[a-f0-9-]{36}";
const routes: Record<string, RegExp> = {
  GET: new RegExp("^/api/(generation/jobs(?:/" + assetId + ")?|media/assets(?:/" + assetId + "(?:/content|/thumbnail)?)?)$"),
  POST: new RegExp("^/api/(generation/jobs(?:/" + assetId + "/cancel)?|media/uploads/upload-(?:tickets|completions))$"),
};

function enabled(host: string | null) {
  return process.env.NODE_ENV === "development"
    && process.env.RENDERLAB_HOSTED_CREATE === "1" && host === loopback;
}

async function hostedFetch(path: string, init: RequestInit = {}) {
  const supabase = await createServerSupabaseClient();
  // Production verifies this normal user token and owns all access decisions.
  const session = await supabase?.auth.getSession();
  const token = session?.data.session?.access_token;
  const requestHeaders = new Headers(init.headers);
  if (token) requestHeaders.set("authorization", "Bearer " + token);
  return fetch(production + path, {
    ...init, headers: requestHeaders, cache: "no-store", redirect: "manual",
    signal: AbortSignal.timeout(20000),
  });
}

export async function getHostedCreateState() {
  if (!enabled((await headers()).get("host"))) return null;
  const [generation, media] = await Promise.all([
    hostedFetch("/api/generation/jobs").then((r) => r.ok ? r.json() : null).catch(() => null),
    hostedFetch("/api/media/assets?limit=1").then((r) => r.ok ? r.json() : null).catch(() => null),
  ]);
  return { generationAvailable: generation?.available === true, accountAvailable: media?.ok === true };
}

export async function relayHostedCreate(request: Request, path: string) {
  if (!enabled(request.headers.get("host"))) return null;
  const url = new URL(request.url);
  if (!routes[request.method]?.test(path)) return null;
  const json = { "content-type": "application/json", "cache-control": "no-store" };
  if (request.method === "POST" && (!validateSameOriginMutation(request).ok
    || request.headers.get("origin") !== "http://" + loopback)) {
    return new Response(JSON.stringify({ error: "Same-origin request required." }), { status: 403, headers: json });
  }
  try {
    const upstream = await hostedFetch(path + url.search, {
      method: request.method,
      ...(request.method === "POST" ? {
        body: await request.text(),
        headers: { "content-type": "application/json", origin: production },
      } : {}),
    });
    const responseHeaders = new Headers({ "cache-control": "private, no-store" });
    for (const name of ["content-type", "location"]) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return new Response(JSON.stringify({ error: "The hosted RenderLab API could not be reached." }), { status: 502, headers: json });
  }
}
