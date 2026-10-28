/**
 * Local-only, secret-free smoke test of the Next.js Android UI config endpoint.
 * CI starts its own temporary Next server. No production API/backend is called.
 */
import assert from 'node:assert/strict';

const origin = process.env.ANDROID_UI_TEST_ORIGIN || 'http://127.0.0.1:3198';
const url = new URL('/api/mobile/ui-config', origin);
if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.protocol !== 'http:') {
  throw new Error('The Android UI test must run against a local server');
}
const response = await fetch(url, {
  method: 'GET',
  redirect: 'manual',
  headers: { Accept: 'application/json' },
  signal: AbortSignal.timeout(10_000),
});
assert.equal(response.status, 200, 'The app should expose anonymous public config');
assert.equal(response.url, url.href);
assert.match(response.headers.get('content-type') ?? '', /application\/json/i);
assert.match(response.headers.get('cache-control') ?? '', /no-store/i);
const json = await response.json();
assert.equal(json.version, 1);
assert.equal(json.revision, 'v1-initial');
assert.equal(json.brand, 'RenderLab');
assert.deepEqual(json.tabs.map(t => t.id), ['index', 'library', 'activity', 'settings']);
assert.deepEqual(Object.keys(json).sort(), ['brand', 'revision', 'tabs', 'version']);
console.log('PASS: local Next.js Android config endpoint returned public, strict, uncached JSON');
