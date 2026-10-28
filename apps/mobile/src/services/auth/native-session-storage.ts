/**
 * Testable, fail-closed interface for a future Expo SecureStore adapter.
 * No native module is imported and this does NOT enable session persistence.
 * The app must separately prove backup exclusions, Android recovery and
 * native-storage behavior before allowing a real Supabase Auth session.
 */
export const RENDERLAB_NATIVE_SESSION_KEY = 'renderlab.m2.session.v1';
export const MAX_NATIVE_SESSION_BYTES = 1800;

export type NativeProtectedStorage = Readonly<{
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
}>;

export class NativeSessionStorageUnavailable extends Error {
  constructor() {
    super('Protected native session storage unavailable');
    this.name = 'NativeSessionStorageUnavailable';
  }
}

function sizeUtf8(value: string) {
  let bytes = 0;
  for (let i = 0; i < value.length; i++) {
    const u = value.charCodeAt(i);
    if (u >= 0xd800 && u <= 0xdbff) {
      const next = value.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff)) throw new NativeSessionStorageUnavailable();
      bytes += 4;
    } else if (u >= 0xdc00 && u <= 0xdfff) {
      throw new NativeSessionStorageUnavailable();
    } else {
      bytes += u < 0x80 ? 1 : u < 0x800 ? 2 : 3;
    }
    if (bytes > MAX_NATIVE_SESSION_BYTES) throw new NativeSessionStorageUnavailable();
  }
  return bytes;
}

export function createGuardedNativeSessionStore(adapter: NativeProtectedStorage | null) {
  if (!adapter || typeof adapter.getItemAsync !== 'function'
    || typeof adapter.setItemAsync !== 'function'
    || typeof adapter.deleteItemAsync !== 'function') {
    throw new NativeSessionStorageUnavailable();
  }
  return Object.freeze({
    async read(): Promise<string | null> {
      try {
        const result = await adapter.getItemAsync(RENDERLAB_NATIVE_SESSION_KEY);
        if (result === null) return null;
        if (typeof result !== 'string' || sizeUtf8(result) === 0) throw new NativeSessionStorageUnavailable();
        return result;
      } catch {
        throw new NativeSessionStorageUnavailable();
      }
    },
    async write(value: string): Promise<void> {
      if (typeof value !== 'string' || sizeUtf8(value) === 0) {
        throw new NativeSessionStorageUnavailable();
      }
      try {
        await adapter.setItemAsync(RENDERLAB_NATIVE_SESSION_KEY, value);
        // Reject silent/no-op storage implementations rather than claiming persistence.
        const confirmation = await adapter.getItemAsync(RENDERLAB_NATIVE_SESSION_KEY);
        if (confirmation !== value) throw new NativeSessionStorageUnavailable();
      } catch {
        // Best effort cleanup; caller must stay signed out even if deletion fails.
        try { await adapter.deleteItemAsync(RENDERLAB_NATIVE_SESSION_KEY); } catch { /* fail closed */ }
        throw new NativeSessionStorageUnavailable();
      }
    },
    async clear(): Promise<void> {
      try {
        await adapter.deleteItemAsync(RENDERLAB_NATIVE_SESSION_KEY);
        const after = await adapter.getItemAsync(RENDERLAB_NATIVE_SESSION_KEY);
        if (after !== null) throw new NativeSessionStorageUnavailable();
      } catch {
        throw new NativeSessionStorageUnavailable();
      }
    },
  });
}
