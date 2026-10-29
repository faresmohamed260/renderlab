import {
  MAX_NATIVE_SESSION_BYTES,
  NativeSessionStorageUnavailable,
  type NativeProtectedStorage,
} from './native-session-storage.ts';

/**
 * Supabase Auth's JSON can exceed a single secure-store entry. The SDK sees
 * the standard asynchronous storage interface, but EVERY chunk stays inside
 * encrypted Expo SecureStore. No plaintext / AsyncStorage fallback.
 *
 * A tombstone is committed before writes and before deletion: interrupted
 * writes lose the session instead of restoring a stale privileged session.
 * This adapter is NOT attached to the app until Auth config/approval/device QA.
 */
const PREFIX = 'renderlab.m2.auth.v1';
const MANIFEST = PREFIX + '.manifest';
const LIMIT = MAX_NATIVE_SESSION_BYTES;
const MAX_PARTS = 32;
export const NATIVE_SUPABASE_AUTH_STORAGE_KEY = 'sb-rashyleshocuvpgcooxy-auth-token';

type Manifest = { v: 1; mode: 'empty' } |
  { v: 1; mode: 'ready'; slot: 0 | 1; parts: number; bytes: number };
const EMPTY: Manifest = { v: 1, mode: 'empty' };

function utf8Size(s: string): number {
  let size = 0;
  for (const c of s) {
    const code = c.codePointAt(0)!;
    if (code >= 0xd800 && code <= 0xdfff) throw new NativeSessionStorageUnavailable();
    size += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
  }
  return size;
}
function chunksOf(value: string): string[] {
  if (!value) throw new NativeSessionStorageUnavailable();
  const chunks: string[] = [];
  let current = '', size = 0;
  for (const c of value) {
    const n = utf8Size(c);
    if (size + n > LIMIT) {
      chunks.push(current); current = ''; size = 0;
    }
    current += c; size += n;
    if (chunks.length >= MAX_PARTS) throw new NativeSessionStorageUnavailable();
  }
  if (current) chunks.push(current);
  if (chunks.length === 0 || chunks.length > MAX_PARTS) throw new NativeSessionStorageUnavailable();
  return chunks;
}
function part(slot: 0 | 1, index: number) {
  return PREFIX + '.' + slot + '.' + index;
}
function parseManifest(raw: string | null): Manifest {
  if (raw === null) return EMPTY;
  let data: unknown;
  try { data = JSON.parse(raw); } catch { throw new NativeSessionStorageUnavailable(); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new NativeSessionStorageUnavailable();
  const m = data as Record<string, unknown>;
  if (m.v !== 1) throw new NativeSessionStorageUnavailable();
  if (m.mode === 'empty' && Object.keys(m).length === 2) return EMPTY;
  if (m.mode !== 'ready' || Object.keys(m).length !== 5 ||
      (m.slot !== 0 && m.slot !== 1) ||
      !Number.isInteger(m.parts) || (m.parts as number) < 1 || (m.parts as number) > MAX_PARTS ||
      !Number.isInteger(m.bytes) || (m.bytes as number) < 1 ||
      (m.bytes as number) > MAX_PARTS * LIMIT) throw new NativeSessionStorageUnavailable();
  return m as Manifest;
}

/** Serial operations prevent races between refresh, logout, reads and writes. */
export function createNativeSupabaseSecureStorage(storage: NativeProtectedStorage | null) {
  if (!storage || typeof storage.getItemAsync !== 'function' ||
      typeof storage.setItemAsync !== 'function' || typeof storage.deleteItemAsync !== 'function') {
    throw new NativeSessionStorageUnavailable();
  }
  let last: Promise<void> = Promise.resolve();
  function serial<T>(fn: () => Promise<T>): Promise<T> {
    const op = last.then(fn, fn);
    last = op.then(() => undefined, () => undefined);
    return op;
  }
  function requireKey(key: string) {
    if (key !== NATIVE_SUPABASE_AUTH_STORAGE_KEY) throw new NativeSessionStorageUnavailable();
  }
  async function readManifest() {
    return parseManifest(await storage!.getItemAsync(MANIFEST));
  }
  async function markEmpty() {
    const raw = JSON.stringify(EMPTY);
    await storage!.setItemAsync(MANIFEST, raw);
    if (await storage!.getItemAsync(MANIFEST) !== raw) throw new NativeSessionStorageUnavailable();
  }
  async function purgeSlot(slot: 0 | 1) {
    for (let n = 0; n < MAX_PARTS; n++) await storage!.deleteItemAsync(part(slot, n));
  }
  function wrap<T>(fn: () => Promise<T>): Promise<T> {
    return serial(async () => {
      try { return await fn(); }
      catch { throw new NativeSessionStorageUnavailable(); }
    });
  }
  return Object.freeze({
    getItem(key: string): Promise<string | null> {
      return wrap(async () => {
        requireKey(key);
        const m = await readManifest();
        if (m.mode === 'empty') return null;
        const values: string[] = [];
        for (let i = 0; i < m.parts; i++) {
          const value = await storage!.getItemAsync(part(m.slot, i));
          if (typeof value !== 'string' || utf8Size(value) === 0 || utf8Size(value) > LIMIT) {
            throw new NativeSessionStorageUnavailable();
          }
          values.push(value);
        }
        const joined = values.join('');
        if (utf8Size(joined) !== m.bytes) throw new NativeSessionStorageUnavailable();
        return joined;
      });
    },
    setItem(key: string, value: string): Promise<void> {
      return wrap(async () => {
        requireKey(key);
        if (typeof value !== 'string') throw new NativeSessionStorageUnavailable();
        const pieces = chunksOf(value);
        // Invalidate old sessions BEFORE writing, so crashes fail signed-out.
        await markEmpty();
        try {
          await purgeSlot(0); await purgeSlot(1);
          for (let n = 0; n < pieces.length; n++) {
            await storage!.setItemAsync(part(0, n), pieces[n]);
            if (await storage!.getItemAsync(part(0, n)) !== pieces[n]) {
              throw new NativeSessionStorageUnavailable();
            }
          }
          const manifest: Manifest = {
            v: 1, mode: 'ready', slot: 0, parts: pieces.length, bytes: utf8Size(value),
          };
          const raw = JSON.stringify(manifest);
          await storage!.setItemAsync(MANIFEST, raw);
          if (await storage!.getItemAsync(MANIFEST) !== raw) throw new NativeSessionStorageUnavailable();
        } catch {
          // Best effort; caller remains locked out on any failure.
          try { await markEmpty(); } catch { /* no fallback */ }
          throw new NativeSessionStorageUnavailable();
        }
      });
    },
    removeItem(key: string): Promise<void> {
      return wrap(async () => {
        requireKey(key);
        await markEmpty();
        await purgeSlot(0); await purgeSlot(1);
      });
    },
  });
}
