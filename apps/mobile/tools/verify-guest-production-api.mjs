/**
 * Read-only, secret-free production contract probe.
 *
 * This is NOT native user authentication or an authorized account test.
 * It checks production reachability plus fail-closed private endpoints only.
 * Never add cookies, tokens, query secrets or mutating methods here.
 */
import assert from 'node:assert/strict';

const ORIGIN = 'https://renderlab.faresuniform.uk';
const cases = [
  { path: '/api/media/assets?limit=1', expected: 401, code: 'authentication_required' },
  { path: '/api/media/collections', expected: 401, code: 'authentication_required' },
  { path: '/api/account/profile', expected: 401, code: 'authentication_required' },
  { path: '/api/generation/jobs', expected: 200, publicAvailability: true },
];

async function main() {
  for (const entry of cases) {
    const url = ORIGIN + entry.path;
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(response.url, url, `Unexpected response URL at ${entry.path}`);
    assert.equal(response.status, entry.expected, `Unexpected status at ${entry.path}`);
    assert.match(response.headers.get('content-type') ?? '', /application\/json/i);
    const body = await response.json();
    assert.ok(body && typeof body === 'object' && !Array.isArray(body));
    if (entry.code) {
      assert.equal(body.ok, false);
      assert.equal(body.error?.code, entry.code, `Unexpected denial at ${entry.path}`);
    }
    if (entry.publicAvailability) assert.equal(typeof body.available, 'boolean');
    console.log(`PASS production GET ${entry.path} — HTTP ${response.status}; private data absent`);
  }
  console.log('PASS production guest contract (no authorization header or account access attempted).');
}

main().catch(e => { console.error('Production guest contract FAILED:', e.message); process.exitCode = 1; });
