import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGuardedNativeSessionStore, MAX_NATIVE_SESSION_BYTES,
  NativeSessionStorageUnavailable, RENDERLAB_NATIVE_SESSION_KEY,
} from '../src/services/auth/native-session-storage.ts';

function makeAdapter() {
  const records = new Map();
  const calls = [];
  return { records, calls, adapter: {
    async getItemAsync(key) { calls.push('get:' + key); return records.get(key) ?? null; },
    async setItemAsync(key, value) { calls.push('set:' + key); records.set(key, value); },
    async deleteItemAsync(key) { calls.push('delete:' + key); records.delete(key); },
  } };
}

test('session values use only a namespaced injected protected adapter', async () => {
  const { records, calls, adapter } = makeAdapter();
  const store = createGuardedNativeSessionStore(adapter);
  assert.equal(await store.read(), null);
  await store.write('synthetic-only-no-credentials');
  assert.equal(await store.read(), 'synthetic-only-no-credentials');
  assert.deepEqual([...records.keys()], [RENDERLAB_NATIVE_SESSION_KEY]);
  await store.clear();
  assert.equal(await store.read(), null);
  assert.ok(calls.includes('delete:' + RENDERLAB_NATIVE_SESSION_KEY));
});

test('missing adapter or invalid payload fails closed', async () => {
  assert.throws(() => createGuardedNativeSessionStore(null), NativeSessionStorageUnavailable);
  const { adapter } = makeAdapter();
  const store = createGuardedNativeSessionStore(adapter);
  for (const value of ['', 'x'.repeat(MAX_NATIVE_SESSION_BYTES + 1), '\ud800', '🎨'.repeat(451)]) {
    await assert.rejects(() => store.write(value), NativeSessionStorageUnavailable);
  }
  const { records, adapter: oversizedAdapter } = makeAdapter();
  records.set(RENDERLAB_NATIVE_SESSION_KEY, 'x'.repeat(MAX_NATIVE_SESSION_BYTES + 1));
  await assert.rejects(() => createGuardedNativeSessionStore(oversizedAdapter).read(), NativeSessionStorageUnavailable);
});

test('storage read/write/delete errors never silently fall back to plaintext', async () => {
  const adapter = {
    async getItemAsync() { throw new Error('device unavailable: sensitive platform details'); },
    async setItemAsync() { throw new Error('device unavailable: sensitive platform details'); },
    async deleteItemAsync() { throw new Error('device unavailable: sensitive platform details'); },
  };
  const store = createGuardedNativeSessionStore(adapter);
  for (const operation of [() => store.read(), () => store.write('synthetic'), () => store.clear()]) {
    await assert.rejects(operation, err =>
      err instanceof NativeSessionStorageUnavailable && !/sensitive platform details/.test(err.message));
  }
});

test('silent write or delete failures are caught by read-back', async () => {
  const adapter = {
    async getItemAsync() { return null; },
    async setItemAsync() {},
    async deleteItemAsync() {},
  };
  const store = createGuardedNativeSessionStore(adapter);
  await assert.rejects(() => store.write('synthetic'), NativeSessionStorageUnavailable);
  const leftover = {
    async getItemAsync() { return 'still persisted'; },
    async setItemAsync() {},
    async deleteItemAsync() {},
  };
  await assert.rejects(
    () => createGuardedNativeSessionStore(leftover).clear(), NativeSessionStorageUnavailable);
});
