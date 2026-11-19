import "server-only";

import sharp from "sharp";
import { headers } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PublicMediaAsset } from "@/lib/api/media-assets-contract";
import type { RenderLabCreatePreferences } from "@/server/account/account-preferences";
import { validateSameOriginMutation } from "@/server/security/same-origin-validation";

const production = "https://renderlab.faresuniform.uk";
const loopback = "127.0.0.1:3000";
const assetId = "[a-f0-9-]{36}";
const routes: Record<string, RegExp> = {
  GET: new RegExp("^/api/(generation/jobs(?:/" + assetId + ")?|media/assets(?:/" + assetId + "(?:/content|/thumbnail)?)?|media/uploads/upload-tickets)$"),
  POST: new RegExp("^/api/(generation/jobs(?:/" + assetId + "/cancel)?|media/uploads/upload-(?:tickets|completions))$"),
};

function enabled(host: string | null) {
  return process.env.NODE_ENV === "development"
    && process.env.RENDERLAB_HOSTED_CREATE === "1" && host === loopback;
}

async function hostedFetch(path: string, init: RequestInit = {}, accessToken?: string) {
  // Production verifies this normal user token and owns all access decisions.
  let token = accessToken;
  if (token === undefined) {
    const supabase = await createServerSupabaseClient();
    const session = await supabase?.auth.getSession();
    token = session?.data.session?.access_token;
  }
  const requestHeaders = new Headers(init.headers);
  if (token) requestHeaders.set("authorization", "Bearer " + token);
  return fetch(production + path, {
    ...init, headers: requestHeaders, cache: "no-store", redirect: "manual",
    signal: AbortSignal.timeout(20000),
  });
}

export async function getHostedCreateState() {
  if (!enabled((await headers()).get("host"))) return null;
  const session = await (await createServerSupabaseClient())?.auth.getSession();
  const token = session?.data.session?.access_token ?? "";
  const [generation, media, upload] = await Promise.all([
    hostedFetch("/api/generation/jobs", {}, token).then((r) => r.ok ? r.json() : null).catch(() => null),
    hostedFetch("/api/media/assets?limit=1", {}, token).then((r) => r.ok ? r.json() : null).catch(() => null),
    hostedFetch("/api/media/uploads/upload-tickets", {}, token).then((r) => r.ok ? r.json() : null).catch(() => null),
  ]);
  return { generationAvailable: generation?.available === true, fiboAvailable: generation?.fiboAvailable === true, accountAvailable: media?.ok === true, mediaUploadAvailable: upload?.available === true };
}

export async function getHostedCreateMedia(id: string): Promise<PublicMediaAsset | null> {
  if (!enabled((await headers()).get("host")) || !new RegExp("^" + assetId + "$", "i").test(id)) return null;
  const response = await hostedFetch("/api/media/assets/" + id);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Hosted media could not be loaded.");
  const payload = await response.json() as { ok: boolean; asset?: PublicMediaAsset };
  return payload.ok ? payload.asset ?? null : null;
}

export async function getHostedCreatePreferences(): Promise<RenderLabCreatePreferences | null> {
  if (!enabled((await headers()).get("host"))) return null;
  const response = await hostedFetch("/api/account/preferences");
  if (!response.ok) return null;
  const payload = await response.json() as { ok: boolean; preferences?: { create: RenderLabCreatePreferences } };
  return payload.ok ? payload.preferences?.create ?? null : null;
}

const previewAvatarTtlMs = 15_000;
const previewAvatarCacheLimit = 32;
const previewAvatarCache = new Map<string, { thumbnail: Buffer; expiresAt: number }>();

async function getPreviewAvatarThumbnail(url: URL) {
  // Only reached after the hosted endpoint authorizes this read and returns a
  // signed source. The object path stays the same on replacement, so bound staleness.
  const key = url.origin + url.pathname;
  const now = Date.now();
  for (const [path, entry] of previewAvatarCache) {
    if (entry.expiresAt <= now) previewAvatarCache.delete(path);
  }
  const cached = previewAvatarCache.get(key);
  if (cached) return cached.thumbnail;

  const source = await fetch(url, {
    cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000),
  });
  if (!source.ok || !source.body) throw new Error("Avatar unavailable");
  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of source.body as unknown as AsyncIterable<Uint8Array>) {
    total += chunk.byteLength;
    if (total > 1024 * 1024) throw new Error("Avatar exceeds download limit");
    chunks.push(chunk);
  }
  const thumbnail = await sharp(Buffer.concat(chunks), { limitInputPixels: 512 * 512 })
    .resize(64, 64, { fit: "cover", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
  previewAvatarCache.delete(key);
  if (previewAvatarCache.size >= previewAvatarCacheLimit) {
    const oldest = previewAvatarCache.keys().next().value;
    if (oldest !== undefined) previewAvatarCache.delete(oldest);
  }
  previewAvatarCache.set(key, { thumbnail, expiresAt: now + previewAvatarTtlMs });
  return thumbnail;
}

async function relayPreviewAvatar(upstream: Response) {
  const location = upstream.headers.get("location");
  if (upstream.status !== 307 || !location) return new Response(null, {
    status: upstream.ok || upstream.status < 400 ? 502 : upstream.status,
    headers: { "cache-control": "private, no-store" },
  });

  // The existing, fixed RenderLab endpoint issues a short-lived signed avatar URL.
  const url = new URL(location);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Invalid avatar URL");
  const thumbnail = await getPreviewAvatarThumbnail(url);
  return new Response(new Uint8Array(thumbnail), {
    headers: { "content-type": "image/webp", "cache-control": "private, no-store" },
  });
}

export async function relayHostedCreate(request: Request, path: string) {
  if (!enabled(request.headers.get("host"))) return null;
  const url = new URL(request.url);
  // Profile reads are preview-only; the upstream still enforces account ownership and MFA.
  const isPreviewProfile = process.env.RENDERLAB_CREATE_PREVIEW === "1" && request.method === "GET"
    && (path === "/api/account/profile" || path === "/api/account/profile/avatar");
  if (!isPreviewProfile && !routes[request.method]?.test(path)) return null;
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
    if (isPreviewProfile && path === "/api/account/profile/avatar") return await relayPreviewAvatar(upstream);
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

/** A real Supabase user whose normal session passes hosted RenderLab admission. */
export async function getCreatePreviewOwner() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return null;
  // Both authorities verify the same token independently; neither result is cached.
  const [verified, admission] = await Promise.all([
    supabase.auth.getUser(session.access_token),
    hostedFetch("/api/media/assets?limit=1", {}, session.access_token),
  ]);
  if (!verified.data.user || verified.error) return null;
  if (!admission.ok || (await admission.json()).ok !== true) return null;
  return verified.data.user.id;
}
