import { resolveApiUrl } from './url-policy.ts';

/**
 * Verified-shape, owner-scoped *read* contract for the existing RenderLab API.
 * This module performs no network requests and never acquires or persists tokens.
 * A separately approved native transport must reject redirects BEFORE credentials
 * could leave the first-party origin. Response-URL checking alone is insufficient.
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

export type PublicMediaAsset = Readonly<{
  id: string;
  generationJobId: string | null;
  origin: MediaOrigin;
  kind: MediaKind;
  mimeType: string;
  originalFilename: string | null;
  displayName: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  prompt: string | null;
  model: string | null;
  operation: string | null;
  createdAt: string;
  isFavorite: boolean;
  /** First-party authenticated 302 routes, NOT media URLs ready for Image/Video. */
  contentUrl: string;
  thumbnailUrl: string | null;
}>;

export type LibraryPage = Readonly<{
  limit: number;
  offset: number;
  hasMore: boolean;
}>;
export type LibraryReadData = Readonly<{ items: PublicMediaAsset[]; page: LibraryPage }>;

export type PublicCollection = Readonly<{
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  containsAsset: boolean;
}>;
export type CollectionsReadData = Readonly<{ collections: PublicCollection[] }>;

export type PrivateReadRequest = Readonly<{
  url: string;
  method: 'GET';
  bearer: string;
  /** MUST reject redirects at the HTTP layer, before following them. */
  redirect: 'error';
}>;
export type PrivateReadResponse = Readonly<{
  url: string;
  status: number;
  body: unknown;
}>;

/** Only implemented AFTER native/Auth/MFA/redirect/secure-storage device QA. */
export type ApprovedNativePrivateTransport = (
  request: PrivateReadRequest,
) => Promise<PrivateReadResponse>;

export type AuthenticatedReadResult<T = unknown> =
  | Readonly<{ state: 'ok'; data: T }>
  | Readonly<{ state: 'authentication_required' }>
  | Readonly<{ state: 'mfa_required' }>
  | Readonly<{ state: 'account_access_required' }>
  | Readonly<{ state: 'access_denied' }>
  | Readonly<{ state: 'unavailable' }>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid production API response');
  }
  return value as Record<string, unknown>;
}
function str(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(`Invalid ${label}`);
  return value;
}
function optionalString(value: unknown, label: string): string | null {
  return value === null ? null : str(value, label);
}
function nonnegativeNumberOrNull(value: unknown, label: string): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid ${label}`);
  }
  return value;
}
function assertToken(token: string): string {
  if (typeof token !== 'string' || token.length === 0 || token.length > 8192
    || token.trim() !== token || /\s/.test(token)) {
    throw new Error('Native session bearer unavailable or invalid');
  }
  return token;
}
function boundedInteger(value: number | undefined, fallback: number, lower: number, upper: number) {
  const v = value ?? fallback;
  if (!Number.isInteger(v) || v < lower || v > upper) {
    throw new Error('Invalid Library paging parameter');
  }
  return v;
}

export function libraryReadPath(query: LibraryReadQuery = {}): string {
  const limit = boundedInteger(query.limit, 24, 1, 48);
  const offset = boundedInteger(query.offset, 0, 0, 1_000_000);
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
 * Media endpoints return first-party paths which 302 to signed R2 storage.
 * DO NOT render these paths in an Image/Video while sending Authorization.
 * A future safe resolver must receive a verified owner-scoped signed URL
 * with no bearer passed to the final media request.
 */
export function validateMediaAssetPaths(value: unknown): PublicMediaAsset {
  const v = record(value);
  const id = str(v.id, 'media ID');
  if (!UUID.test(id)) throw new Error('Invalid media ID');
  const origin = v.origin;
  const kind = v.kind;
  if (origin !== 'generated' && origin !== 'uploaded') throw new Error('Invalid media origin');
  if (kind !== 'image' && kind !== 'video') throw new Error('Invalid media kind');
  const prefix = `/api/media/assets/${id}`;
  if (v.contentUrl !== prefix + '/content') throw new Error('Unsafe media content URL');
  if (v.thumbnailUrl !== null && v.thumbnailUrl !== prefix + '/thumbnail') {
    throw new Error('Unsafe media thumbnail URL');
  }
  const isFavorite = v.isFavorite;
  if (typeof isFavorite !== 'boolean') throw new Error('Invalid favorite state');
  const op = v.operation === null ? null : str(v.operation, 'operation');
  const mimeType = str(v.mimeType, 'mime type');
  if (!/^(image|video)\/[A-Za-z0-9.+-]+$/.test(mimeType)) throw new Error('Invalid media MIME type');
  if (v.generationJobId !== null && !UUID.test(str(v.generationJobId, 'job ID'))) {
    throw new Error('Invalid media job ID');
  }
  return {
    id,
    generationJobId: v.generationJobId as string | null,
    origin,
    kind,
    mimeType,
    originalFilename: optionalString(v.originalFilename, 'original filename'),
    displayName: optionalString(v.displayName, 'display name'),
    sizeBytes: nonnegativeNumberOrNull(v.sizeBytes, 'media size'),
    width: nonnegativeNumberOrNull(v.width, 'width'),
    height: nonnegativeNumberOrNull(v.height, 'height'),
    durationMs: nonnegativeNumberOrNull(v.durationMs, 'duration'),
    prompt: optionalString(v.prompt, 'prompt'),
    model: optionalString(v.model, 'model'),
    operation: op,
    createdAt: str(v.createdAt, 'creation timestamp'),
    isFavorite,
    contentUrl: v.contentUrl as string,
    thumbnailUrl: v.thumbnailUrl as string | null,
  };
}

function decodeLibrary(value: Record<string, unknown>): LibraryReadData {
  if (!Array.isArray(value.items) || value.items.length > 48) {
    throw new Error('Invalid Library items response');
  }
  const page = record(value.page);
  if (!Number.isInteger(page.limit) || (page.limit as number) < 1
    || (page.limit as number) > 48 || !Number.isInteger(page.offset)
    || (page.offset as number) < 0 || typeof page.hasMore !== 'boolean') {
    throw new Error('Invalid Library pagination response');
  }
  return {
    items: value.items.map(validateMediaAssetPaths),
    page: { limit: page.limit as number, offset: page.offset as number, hasMore: page.hasMore },
  };
}

function decodeCollections(value: Record<string, unknown>): CollectionsReadData {
  if (!Array.isArray(value.collections) || value.collections.length > 1000) {
    throw new Error('Invalid Collections response');
  }
  return { collections: value.collections.map(item => {
    const c = record(item);
    if (!UUID.test(str(c.id, 'collection ID'))) throw new Error('Invalid collection ID');
    if (typeof c.containsAsset !== 'boolean') throw new Error('Invalid collection membership');
    return {
      id: c.id as string,
      name: str(c.name, 'collection name'),
      createdAt: str(c.createdAt, 'collection creation'),
      updatedAt: str(c.updatedAt, 'collection update'),
      containsAsset: c.containsAsset,
    };
  }) };
}

function accessDenied(body: unknown): AuthenticatedReadResult {
  const r = body && typeof body === 'object' && !Array.isArray(body)
    ? body as Record<string, unknown> : {};
  const error = r.error && typeof r.error === 'object' && !Array.isArray(r.error)
    ? r.error as Record<string, unknown> : {};
  if (error.code === 'mfa_required') return { state: 'mfa_required' };
  if (error.code === 'renderlab_access_required') return { state: 'account_access_required' };
  return { state: 'access_denied' };
}

/**
 * A deliberately unimplemented authenticated production transport is injected.
 * Do not pass ordinary RN fetch until no-auth-on-302 behavior is device-proven.
 */
export function createRenderLabProductionReader(transport: ApprovedNativePrivateTransport) {
  async function read<T>(
    path: string, token: string, decode: (record: Record<string, unknown>) => T,
  ): Promise<AuthenticatedReadResult<T>> {
    const url = resolveApiUrl(RENDERLAB_PRODUCTION_ORIGIN, path);
    const response = await transport({ url, method: 'GET', bearer: assertToken(token), redirect: 'error' });
    if (response.url !== url || (response.status >= 300 && response.status < 400)) {
      throw new Error('Unsafe API redirect rejected');
    }
    if (response.status === 401) return { state: 'authentication_required' };
    if (response.status === 403) return accessDenied(response.body);
    if (response.status === 503) return { state: 'unavailable' };
    if (response.status !== 200) throw new Error('Production API read failed');
    const envelope = record(response.body);
    if (envelope.ok !== true) throw new Error('Production API returned an unsuccessful response');
    return { state: 'ok', data: decode(envelope) };
  }
  return Object.freeze({
    library: (token: string, query: LibraryReadQuery = {}) =>
      read(libraryReadPath(query), token, decodeLibrary),
    collections: (token: string) => read('/api/media/collections', token, decodeCollections),
    profile: (token: string) => read('/api/account/profile', token, (envelope) => {
      if (!envelope.profile || typeof envelope.profile !== 'object' || Array.isArray(envelope.profile)) {
        throw new Error('Invalid profile response');
      }
      return { profile: envelope.profile };
    }),
  });
}
