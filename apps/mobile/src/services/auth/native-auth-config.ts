/** Native Auth is deliberately inert until the owner/security/device gates.
 * EXPO_PUBLIC values (when eventually provided) are PUBLIC build metadata.
 * No server secrets or real project key are committed or read by this draft.
 */
export const NATIVE_AUTH_RUNTIME_ENABLED = false as boolean;
export const NATIVE_SUPABASE_HOST = 'rashyleshocuvpgcooxy.supabase.co';
export type NativePublicAuthConfig = Readonly<{ url: string; publishableKey: string }>;

export function parseNativePublicAuthConfig(input: unknown): NativePublicAuthConfig | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const obj = input as Record<string, unknown>;
  if (typeof obj.url !== 'string' || typeof obj.publishableKey !== 'string') return null;
  if (!/^sb_publishable_[a-zA-Z0-9_-]{16,256}$/.test(obj.publishableKey)) return null;
  try {
    const u = new URL(obj.url);
    if (u.protocol !== 'https:' || u.hostname !== NATIVE_SUPABASE_HOST ||
      u.port || u.username || u.password || u.pathname !== '/' || u.search || u.hash ||
      obj.url !== u.origin && obj.url !== u.origin + '/') return null;
    return Object.freeze({ url: u.origin, publishableKey: obj.publishableKey });
  } catch {
    return null;
  }
}

/** Explicitly disabled at compile time; environment strings cannot enable Auth. */
export function getApprovedNativeAuthConfig(): NativePublicAuthConfig | null {
  if (!NATIVE_AUTH_RUNTIME_ENABLED) return null;
  return parseNativePublicAuthConfig({
    url: process.env.EXPO_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
