/**
 * First-party read-only admission probe, NOT YET APPROVED for production bearer.
 * Accepts only the existing RenderLab GET /api/account/profile endpoint.
 *
 * Native SDK58 Android emulator separately proved a single local 302 was NOT
 * followed when fetch used redirect:'error' (CI run 40628610677). That is not
 * universal proof for HTTPS/physical devices; do not open the Auth gate yet.
 */
import type { NativeServerAdmissionPort } from './native-auth-coordinator.ts';
export const NATIVE_PROFILE_ADMISSION_URL =
  'https://renderlab.faresuniform.uk/api/account/profile' as const;
const MAX_BODY_BYTES = 16384;
const TIMEOUT_MS = 8500;
type FetchPort = typeof fetch;

function validToken(token: string) {
  return typeof token === 'string' && token.length > 0 && token.length <= 8192
    && token.trim() === token && !/\s/.test(token);
}

/** Injectable fetch permits exhaustive negative tests without network calls. */
export function createNativeProfileAdmissionProbe(
  request: FetchPort,
): NativeServerAdmissionPort {
  return async (token: string) => {
    if (!validToken(token)) return null;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await request(NATIVE_PROFILE_ADMISSION_URL, {
        method: 'GET',
        redirect: 'error',
        credentials: 'omit',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer ' + token,
        },
        signal: controller.signal,
      });
      // A native redirect-follow is a transport failure even if it has
      // already dropped the bearer; never treat final 200 as first-party.
      if (response.url !== NATIVE_PROFILE_ADMISSION_URL || response.redirected ||
          response.status >= 300 && response.status < 400) return null;
      if (![200, 401, 403, 503].includes(response.status)) return null;
      const sizeHeader = response.headers.get('content-length');
      if (sizeHeader !== null &&
          (!/^\d+$/.test(sizeHeader) || Number(sizeHeader) > MAX_BODY_BYTES)) return null;
      const contentType = response.headers.get('content-type');
      if (!contentType || !/^application\/json(?:\s*;|$)/i.test(contentType)) return null;
      const raw = await response.text();
      if (typeof raw !== 'string' || raw.length > MAX_BODY_BYTES) return null;
      const body: unknown = JSON.parse(raw);
      return { url: NATIVE_PROFILE_ADMISSION_URL, status: response.status, body };
    } catch {
      return null; // offline, malformed body, timeout: admission stays locked
    } finally {
      clearTimeout(timeout);
    }
  };
}
