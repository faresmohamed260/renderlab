import { resolveApiUrl } from './url-policy.ts';
import { RENDERLAB_PRODUCTION_ORIGIN } from './production-read.ts';

/**
 * An unauthenticated, read-only live probe. Never includes cookies, credentials,
 * tokens, production keys or media content. It checks protected access only.
 */
export type GuestProductionResult =
  | Readonly<{ state: 'protected'; detail: 'authentication_required' }>
  | Readonly<{ state: 'unavailable' }>
  | Readonly<{ state: 'unexpected' }>;

export async function probeRenderLabProductionGuest(
  fetchImpl: typeof fetch = fetch,
): Promise<GuestProductionResult> {
  const url = resolveApiUrl(RENDERLAB_PRODUCTION_ORIGIN, '/api/media/assets?limit=1');
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      credentials: 'omit',
      headers: { Accept: 'application/json' },
      redirect: 'error',
      signal: controller.signal,
    });
    if (response.url && response.url !== url) return { state: 'unexpected' };
    if (!/application\/json/i.test(response.headers.get('content-type') ?? '')) {
      return { state: 'unexpected' };
    }
    const body: unknown = await response.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return { state: 'unexpected' };
    }
    const data = body as Record<string, unknown>;
    if (response.status !== 401 || data.ok !== false) {
      return { state: 'unexpected' };
    }
    const error = data.error;
    if (!error || typeof error !== 'object' || Array.isArray(error)
      || (error as Record<string, unknown>).code !== 'authentication_required') {
      return { state: 'unexpected' };
    }
    return { state: 'protected', detail: 'authentication_required' };
  } catch {
    // No logs, request headers, credentials or remote errors escape into UI.
    return { state: 'unavailable' };
  } finally {
    clearTimeout(deadline);
  }
}
