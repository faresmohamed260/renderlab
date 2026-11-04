/** Pure URL rules for the future native API client; no credentials or network traffic. */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export function validateApiOrigin(input: string): string {
  const url = new URL(input);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('API base must be an origin without credentials, path, query or fragment');
  }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname))) {
    throw new Error('API origin requires HTTPS (HTTP allowed only for loopback development)');
  }
  return url.origin;
}

export function resolveApiUrl(origin: string, path: string): string {
  const trustedOrigin = validateApiOrigin(origin);
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
    throw new Error('API paths must be same-origin absolute paths');
  }
  const url = new URL(path, trustedOrigin);
  if (url.origin !== trustedOrigin) throw new Error('Cross-origin API requests are forbidden');
  return url.toString();
}

/** A future client must strip Authorization on any redirect to a media/CDN origin. */
export function canForwardBearer(apiOrigin: string, candidateUrl: string): boolean {
  try {
    return new URL(candidateUrl).origin === validateApiOrigin(apiOrigin);
  } catch {
    return false;
  }
}
