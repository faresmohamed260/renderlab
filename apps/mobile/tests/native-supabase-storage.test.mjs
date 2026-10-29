import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createNativeSupabaseSecureStorage,
  NATIVE_SUPABASE_AUTH_STORAGE_KEY as KEY,
} from '../src/services/auth/native-supabase-storage.ts';
import { NativeSessionStorageUnavailable } from '../src/services/auth/native-session-storage.ts';

function fixture() {
  const map = new Map();
  let failure = '';
  let delay;
  const calls = [];
  const platform = {
    async getItemAsync(k) { calls.push('get'); if (failure === 'get') throw Error('private device info'); return map.get(k) ?? null; },
    async setItemAsync(k, v) { calls.push('set'); if (failure === 'set') throw Error('private device info'); map.set(k, v); },
    async deleteItemAsync(k) { calls.push('delete'); if (failure === 'delete') throw Error('private device info'); map.delete(k); },
  };
  return { map, calls, platform, fail: v => { failure = v; }, resume: () => delay?.() };
}

test('multi-kilobyte token JSON remains encrypted-store-only and restores atomically', async () => {
  const { map, platform } = fixture();
  const store = createNativeSupabaseSecureStorage(platform);
  const large = JSON.stringify({ refresh_token: 'synthetic-only', access_token: 'x'.repeat(7800), user: '🎨'.repeat(320) });
  await store.setItem(KEY, large);
  assert.equal(await store.getItem(KEY), large);
  assert.ok(map.size > 5);
  assert.equal([...map.values()].some(x => x === large), false);
  assert.ok([...map.values()].every(v => new TextEncoder().encode(v).length <= 1800));
  assert.equal(await createNativeSupabaseSecureStorage(platform).getItem(KEY), large);
  await store.removeItem(KEY);
  assert.equal(await store.getItem(KEY), null);
  assert.equal(await createNativeSupabaseSecureStorage(platform).getItem(KEY), null);
});

test('invalid keys, malformed manifests, missing segments and oversized payloads fail closed', async () => {
  const { map, platform } = fixture();
  const store = createNativeSupabaseSecureStorage(platform);
  await assert.rejects(store.setItem('other', 'token'), NativeSessionStorageUnavailable);
  await assert.rejects(store.getItem('other'), NativeSessionStorageUnavailable);
  await assert.rejects(store.removeItem('other'), NativeSessionStorageUnavailable);
  await assert.rejects(store.setItem(KEY, 'x'.repeat(60000)), NativeSessionStorageUnavailable);
  assert.equal(await store.getItem(KEY), null);
  map.set('renderlab.m2.auth.v1.manifest', '{"v":1,"mode":"ready","slot":0,"parts":2,"bytes":12}');
  await assert.rejects(store.getItem(KEY), NativeSessionStorageUnavailable);
  map.set('renderlab.m2.auth.v1.manifest', '{"v":1,"mode":"ready","slot":0,"parts":40,"bytes":12}');
  await assert.rejects(store.getItem(KEY), NativeSessionStorageUnavailable);
  map.set('renderlab.m2.auth.v1.manifest', 'not-json');
  await assert.rejects(store.getItem(KEY), NativeSessionStorageUnavailable);
});

test('interrupted overwrite becomes signed-out instead of restoring stale session', async () => {
  const { map, platform, fail } = fixture();
  const store = createNativeSupabaseSecureStorage(platform);
  await store.setItem(KEY, 'synthetic-old-session');
  const oldManifest = map.get('renderlab.m2.auth.v1.manifest');
  fail('delete');
  await assert.rejects(store.setItem(KEY, 'synthetic-new-session'), NativeSessionStorageUnavailable);
  assert.notEqual(map.get('renderlab.m2.auth.v1.manifest'), oldManifest);
  assert.equal(await createNativeSupabaseSecureStorage(platform).getItem(KEY), null);
  fail('get');
  await assert.rejects(store.getItem(KEY), err => err instanceof NativeSessionStorageUnavailable && !/private device info/.test(err.message));
  fail('');
});

test('failed manifest write and platform unavailability never use plaintext fallback', async () => {
  assert.throws(() => createNativeSupabaseSecureStorage(null), NativeSessionStorageUnavailable);
  const { map, platform, fail } = fixture();
  const store = createNativeSupabaseSecureStorage(platform);
  fail('set');
  await assert.rejects(store.setItem(KEY, 'synthetic'), NativeSessionStorageUnavailable);
  assert.equal(map.size, 0);
  fail('');
  await store.setItem(KEY, 'synthetic');
  fail('delete');
  await assert.rejects(store.removeItem(KEY), NativeSessionStorageUnavailable);
  assert.equal(await store.getItem(KEY), null);
});

test('concurrent session writes and sign-out are serialized; no recovery of signed-out token', async () => {
  const { platform } = fixture();
  const store = createNativeSupabaseSecureStorage(platform);
  await Promise.all([
    store.setItem(KEY, 'session-a'),
    store.setItem(KEY, 'session-b'),
    store.removeItem(KEY),
  ]);
  assert.equal(await store.getItem(KEY), null);
  await store.setItem(KEY, 'session-c');
  assert.equal(await store.getItem(KEY), 'session-c');
});
