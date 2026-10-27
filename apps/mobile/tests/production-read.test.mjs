import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RENDERLAB_PRODUCTION_ORIGIN,
  createRenderLabProductionReader,
  libraryReadPath,
} from '../src/services/api/production-read.ts';

test('read-only endpoints resolve exclusively to the existing production RenderLab origin', async () => {
  const requests = [];
  const reader = createRenderLabProductionReader(async request => {
    requests.push(request);
    return { url: request.url, status: 200, body: { ok: true, items: [] } };
  });
  const token = 'synthetic-fake-opaque-token';
  const results = await Promise.all([
    reader.library(token, { origin: 'uploaded', kind: 'video', sort: 'oldest', limit: 24, offset: 0 }),
    reader.collections(token),
    reader.profile(token),
  ]);
  assert.equal(RENDERLAB_PRODUCTION_ORIGIN, 'https://renderlab.faresuniform.uk');
  assert.ok(results.every(x => x.state === 'ok'));
  assert.equal(requests.length, 3);
  assert.ok(requests.every(x => x.method === 'GET' && x.redirect === 'error' && x.bearer === token));
  assert.ok(requests.every(x => new URL(x.url).origin === RENDERLAB_PRODUCTION_ORIGIN));
  assert.match(requests[0].url, /\/api\/media\/assets\?/);
  assert.match(requests[0].url, /origin=uploaded/);
  assert.match(requests[0].url, /kind=video/);
  assert.equal(requests[1].url, RENDERLAB_PRODUCTION_ORIGIN + '/api/media/collections');
  assert.equal(requests[2].url, RENDERLAB_PRODUCTION_ORIGIN + '/api/account/profile');
});

test('never forwards credentials across an unexpected redirect', async () => {
  const token = 'synthetic-testing-only';
  const reader = createRenderLabProductionReader(async r => ({
    url: 'https://external-storage.example.test/redirect',
    status: 200,
    body: { ok: true },
  }));
  await assert.rejects(() => reader.library(token), /Unsafe API redirect rejected/);
  const redirect = createRenderLabProductionReader(async r => ({
    url: r.url,
    status: 302,
    body: null,
  }));
  await assert.rejects(() => redirect.collections(token), /Unsafe API redirect rejected/);
});

test('correctly treats production auth denial as signed-out, without local fixture fallback', async () => {
  const reader = createRenderLabProductionReader(async request => ({
    url: request.url,
    status: 401,
    body: { ok: false, error: { code: 'authentication_required' } },
  }));
  assert.deepEqual(await reader.library('synthetic-only'), { state: 'authentication_required' });
});

test('requires a fresh nonempty bearer and does not silently reach production anonymously', async () => {
  let calls = 0;
  const reader = createRenderLabProductionReader(async r => {
    calls++;
    return { url: r.url, status: 200, body: { ok: true } };
  });
  for (const t of ['', 'Bearer token', 'abc\nInjection', ' x ', 'a'.repeat(8193)]) {
    await assert.rejects(() => reader.profile(t), /bearer unavailable or invalid/);
  }
  assert.equal(calls, 0);
});

test('only accepts the production routes and server-bounded media filters', () => {
  const ok = libraryReadPath({ origin: 'generated', limit: 48, offset: 0 });
  assert.match(ok, /^\/api\/media\/assets\?/);
  assert.match(ok, /origin=generated/);
  for (const query of [
    { origin: 'firebase' }, { kind: 'file' }, { sort: 'popular' },
    { limit: 0 }, { limit: 49 }, { offset: -1 }, { offset: 3.7 },
  ]) {
    assert.throws(() => libraryReadPath(query));
  }
});

test('fails closed on malformed or unavailable production replies', async () => {
  const cases = [
    { status: 503, body: null, expected: { state: 'unavailable' } },
    { status: 200, body: { available: false }, expectedError: /unsuccessful response/ },
    { status: 200, body: { ok: false }, expectedError: /unsuccessful response/ },
    { status: 200, body: '', expectedError: /Invalid production API response/ },
  ];
  for (const c of cases) {
    const reader = createRenderLabProductionReader(async req => ({ url: req.url, status: c.status, body: c.body }));
    if (c.expectedError) await assert.rejects(() => reader.collections('synthetic-token'), c.expectedError);
    else assert.deepEqual(await reader.collections('synthetic-token'), c.expected);
  }
});
