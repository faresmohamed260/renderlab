import { resolveApiUrl } from './url-policy.ts';

/**
 * Native production API read contract for an eventual approved M1 transport.
 *
 * No default fetch implementation or bearer persistence is intentionally provided:
 * React Native redirect behavior and secure token acquisition/storage must be proved
 * on device before any production credential is handed to a transport.
 *
 * These are existing RenderLab Next.js product routes, not direct Supabase/R2 APIs.
 */
export const RENDERLAB_PRODUCTION_ORIGIN = 'https://renderlab.faresuniform.uk' as const;

export type MediaOrigin = 'generated' | 'uploaded';
export type MediaKind = 'image' | 'video';
export type MediaSort = 'newest' | 'oldest';

export type LibraryReadQuery = Readonly<{
  origin?: MediaOrigin;
  kind?: MediaKind;
  sort?: MediaSort;
  limit?: number;
  offset?: number;
}>;

export type PrivateReadRequest = Readonly<{
  url: string;
  method: 'GET';
  bearer: string;
  /** Transport MUST reject all redirects before forwarding any Authorization. */
  redirect: 'error';
}>;

export type PrivateReadResponse = Readonly<{
  /** Effective request URL: must be the same first-party URL as the request. */
  url: string;
  status: number;
  body: unknown;
}>;

/** Supplied only after native Auth, MFA, redirect and secure storage QA. */
export type ApprovedNativePrivateTransport = (
  request: PrivateReadRequest,
) => Promise<PrivateReadResponse>;

export type AuthenticatedReadResult =
  | Readonly<{ state: 'ok'; data: unknown }>
  | Readonly<{ state: 'authentication_required' }>
  | Readonly<{ state: 'unavailable' }>;

function assertToken(token: string): string {
  if (typeof token !== 'string' || token.length === 0 || token.length > 8192
    || token.trim() !== token || /\s/.test(token)) {
    throw new Error('Native session bearer unavailable or invalid');
  }
  return token;
}

function positiveBoundedInteger(value: number | undefined, defaultValue: number, max: number) {
  if (value == null) return defaultValue;
  if (!Number.isInteger(value) || value < 0 || value > max) {
    throw new Error('Invalid Library paging parameter');
  }
  return value;
}

export function libraryReadPath(query: LibraryReadQuery = {}): string {
  const limit = positiveBoundedInteger(query.limit, 24, 48);
  if (limit < 1) throw new Error('Library limit must be positive');
  const offset = positiveBoundedInteger(query.offset, 0, 1_000_000);
  if (query.origin != null && query.origin !== 'generated' && query.origin !== 'uploaded') {
    throw new Error('Invalid Library origin');
  }
  if (query.kind != null && query.kind !== 'image' && query.kind !== 'video') {
    throw new Error('Invalid Library media kind');
  }
  if (query.sort != null && query.sort !== 'newest' && query.sort !== 'oldest') {
    throw new Error('Invalid Library sort');
  }
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (query.origin) params.set('origin', query.origin);
  if (query.kind) params.set('kind', query.kind);
  if (query.sort) params.set('sort', query.sort);
  return `/api/media/assets?${params.toString()}`;
}

/**
 * The M1 transport must enforce no-redirect itself; this wrapper fails closed
 * on redirected response metadata as defense in depth. It does not yet approve
 * React Native fetch to carry production tokens.
 */
export function createRenderLabProductionReader(transport: ApprovedNativePrivateTransport) {
  async function read(path: string, token: string): Promise<AuthenticatedReadResult> {
    const url = resolveApiUrl(RENDERLAB_PRODUCTION_ORIGIN, path);
    const response = await transport({
      url,
      method: 'GET',
      bearer: assertToken(token),
      redirect: 'error',
    });
    if (response.url !== url || response.status >= 300 && response.status < 400) {
      throw new Error('Unsafe API redirect rejected');
    }
    if (response.status === 401 || response.status === 403) {
      return { state: 'authentication_required' };
    }
    if (response.status === 503) return { state: 'unavailable' };
    if (response.status !== 200) throw new Error('Production API read failed');
    if (!response.body || typeof response.body !== 'object' || Array.isArray(response.body)) {
      throw new Error('Invalid production API response');
    }
    const obj = response.body as Record<string, unknown>;
    if (obj.ok !== true) throw new Error('Production API returned an unsuccessful response');
    return { state: 'ok', data: response.body };
  }
  return Object.freeze({
    library: (token: string, query: LibraryReadQuery = {}) => read(libraryReadPath(query), token),
    collections: (token: string) => read('/api/media/collections', token),
    profile: (token: string) => read('/api/account/profile', token),
  });
}
