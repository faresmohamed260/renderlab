import test from 'node:test';
import assert from 'node:assert/strict';
import { probeRenderLabProductionGuest } from '../src/services/api/production-guest.ts';

const URL = 'https://renderlab.faresuniform.uk/api/media/assets?limit=1';
function reply(status, body, type = 'application/json', url = URL) {
  return {
    status, url, headers: { get: name => name.toLowerCase() === 'content-type' ? type : null },
    json: async () => body,
  };
}

test('live production guest check only issues an unauthenticated first-party GET', async () => {
  const seen = [];
  const outcome = await probeRenderLabProductionGuest(async (url, opts) => {
    seen.push({ url, opts });
    return reply(401, { ok: false, error: { code: 'authentication_required' } });
  });
  assert.deepEqual(outcome, { state: 'protected', detail: 'authentication_required' });
  assert.equal(seen.length, 1);
  assert.equal(seen[0].url, URL);
  assert.equal(seen[0].opts.method, 'GET');
  assert.equal(seen[0].opts.credentials, 'omit');
  assert.equal(seen[0].opts.redirect, 'error');
  assert.equal(seen[0].opts.headers.Accept, 'application/json');
  assert.ok(!Object.keys(seen[0].opts.headers).some(k => /authorization|cookie|api.?key/i.test(k)));
});

test('unexpected data, wrong origin and HTML are not a valid protected connection', async () => {
  const cases = [
    reply(200, { ok: true, items: [] }),
    reply(401, { ok: false, error: { code: 'wrong' } }),
    reply(401, { ok: false, error: { code: 'authentication_required' } }, 'text/html'),
    reply(401, { ok: false, error: { code: 'authentication_required' } }, 'application/json', 'https://evil.test/data'),
  ];
  for (const res of cases) {
    const result = await probeRenderLabProductionGuest(async () => res);
    assert.deepEqual(result, { state: 'unexpected' });
  }
});

test('network and blocked redirects report unavailable, never fake private media', async () => {
  const result = await probeRenderLabProductionGuest(async () => {
    throw new Error('simulated network failure');
  });
  assert.deepEqual(result, { state: 'unavailable' });
});
