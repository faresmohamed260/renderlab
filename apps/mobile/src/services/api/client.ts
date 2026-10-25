import { resolveApiUrl, validateApiOrigin } from './url-policy';

/**
 * Phase M0 typed boundary. No fetch, authentication, private data, or service keys.
 * Later phases must separately verify mobile bearer/CSRF and signed-R2 redirects
 * before implementing any request method.
 */
export type RenderLabApiClient = Readonly<{
  origin: string;
  urlFor: (absolutePath: string) => string;
}>;

export function createRenderLabApiClient(origin: string): RenderLabApiClient {
  const trustedOrigin = validateApiOrigin(origin);
  return Object.freeze({
    origin: trustedOrigin,
    urlFor: (path: string) => resolveApiUrl(trustedOrigin, path),
  });
}
