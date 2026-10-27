import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RENDERLAB_PRODUCTION_ORIGIN,
  createRenderLabProductionReader,
  libraryReadPath,
  validateMediaAssetPaths,
} from '../src/services/api/production-read.ts';

const ID = '11111111-1111-4111-8111-111111111111';
const CID = '22222222-2222-4222-8222-222222222222';
const MEDIA = {
  id: ID, generationJobId: null, origin: 'generated', kind: 'image',
  mimeType: 'image/png', originalFilename: null, displayName: 'Image concept',
  sizeBytes: 100, width: 256, height: 256, durationMs: null,
  prompt: 'Architectural interior', model: 'qwen', operation: 'generate-image',
  createdAt: '2026-10-27T00:00:00Z', isFavorite: false,
  contentUrl: `/api/media/assets/${ID}/content`,
  thumbnailUrl: `/api/media/assets/${ID}/thumbnail`,
};
const LIBRARY = { ok: true, items: [MEDIA], page: { limit: 24, offset: 0, hasMore: false } };
const COLLECTIONS = {
  ok: true, collections: [{
    id: CID, name: 'Landscapes', createdAt: '2026-10-27T00:00:00Z',
    updatedAt: '2026-10-27T01:00:00Z', containsAsset: false,
  }],
};
const PROFILE = { ok: true, profile: { displayName: 'Test User' }, policy: {} };

test('only first-party, owner-scoped production read routes are issued (no live network)', async () => {
  const requests = [];
  const reader = createRenderLabProductionReader(async request => {
    requests.push(request);
    const body = request.url.includes('/media/assets?') ? LIBRARY
      : request.url.endsWith('/media/collections') ? COLLECTIONS : PROFILE;
    return { url: request.url, status: 200, body };
  });
  const token = 'synthetic-fake-opaque-token';
  const results = await Promise.all([
    reader.library(token, { origin: 'uploaded', kind: 'video', sort: 'oldest', limit: 24, offset: 0 }),
    reader.collections(token),
    reader.profile(token),
  ]);
  assert.equal(RENDERLAB_PRODUCTION_ORIGIN, 'https://renderlab.faresuniform.uk');
  assert.equal(results[0].state, 'ok');
  assert.equal(results[0].data.items[0].id, ID);
  assert.equal(results[1].state, 'ok');
  assert.equal(results[1].data.collections[0].name, 'Landscapes');
  assert.equal(results[2].state, 'ok');
  assert.equal(results[2].data.profile.displayName, 'Test User');
  assert.equal(requests.length, 3);
  assert.ok(requests.every(x => x.method === 'GET' && x.redirect === 'error' && x.bearer === token));
  assert.ok(requests.every(x => new URL(x.url).origin === RENDERLAB_PRODUCTION_ORIGIN));
  assert.match(requests[0].url, /\/api\/media\/assets\?/);
  assert.match(requests[0].url, /origin=uploaded/);
  assert.match(requests[0].url, /kind=video/);
  assert.equal(requests[1].url, RENDERLAB_PRODUCTION_ORIGIN + '/api/media/collections');
  assert.equal(requests[2].url, RENDERLAB_PRODUCTION_ORIGIN + '/api/account/profile');
});

test('no redirect may be reported after a bearer-bearing request', async () => {
  const reader = createRenderLabProductionReader(async req => ({
    url: 'https://external-storage.example.test/signed',
    status: 200,
    body: LIBRARY,
  }));
  await assert.rejects(() => reader.library('synthetic-only'), /Unsafe API redirect rejected/);
  const redirect = createRenderLabProductionReader(async req => ({
    url: req.url, status: 302, body: null,
  }));
  await assert.rejects(() => redirect.collections('synthetic-only'), /Unsafe API redirect rejected/);
});

test('protected media paths are owner-gated relative paths, not direct R2 URLs', () => {
  const a = validateMediaAssetPaths(MEDIA);
  assert.equal(a.id, ID);
  assert.equal(a.contentUrl, `/api/media/assets/${ID}/content`);
  assert.equal(a.thumbnailUrl, `/api/media/assets/${ID}/thumbnail`);
  for (const patch of [
    { contentUrl: 'https://r2.example.test/signed?id=1' },
    { thumbnailUrl: 'https://r2.example.test/signed?id=1' },
    { contentUrl: '/api/media/assets/other/content' },
    { thumbnailUrl: '//foreign.example.test/thumbnail' },
    { mimeType: 'application/javascript' },
    { isFavorite: 'yes' },
  ]) assert.throws(() => validateMediaAssetPaths({ ...MEDIA, ...patch }));
});

test('401 / MFA / suspended account are distinguishable and have no offline fallback', async () => {
  for (const [status, body, expected] of [
    [401, { ok: false, error: { code: 'authentication_required' } }, 'authentication_required'],
    [403, { ok: false, error: { code: 'mfa_required' } }, 'mfa_required'],
    [403, { ok: false, error: { code: 'renderlab_access_required' } }, 'account_access_required'],
    [403, { ok: false, error: { code: 'forbidden' } }, 'access_denied'],
  ]) {
    const reader = createRenderLabProductionReader(async req => ({ url: req.url, status, body }));
    assert.deepEqual(await reader.library('synthetic-only'), { state: expected });
  }
});

test('cannot silently issue a private read with an invalid bearer', async () => {
  let calls = 0;
  const reader = createRenderLabProductionReader(async req => {
    calls++;
    return { url: req.url, status: 200, body: PROFILE };
  });
  for (const t of ['', 'Bearer token', 'abc\nInjection', ' x ', 'a'.repeat(8193)]) {
    await assert.rejects(() => reader.profile(t), /bearer unavailable or invalid/);
  }
  assert.equal(calls, 0);
});

test('only allows server-bounded source, kind, sort and pagination', () => {
  const valid = libraryReadPath({ origin: 'generated', limit: 48, offset: 0 });
  assert.match(valid, /^\/api\/media\/assets\?/);
  assert.match(valid, /origin=generated/);
  for (const query of [
    { origin: 'firebase' }, { kind: 'file' }, { sort: 'popular' },
    { limit: 0 }, { limit: 49 }, { offset: -1 }, { offset: 3.7 },
  ]) assert.throws(() => libraryReadPath(query));
});

test('malformed private data, bad pagination and unexpected media URLs fail closed', async () => {
  for (const body of [
    { ok: true, items: [MEDIA] },
    { ok: true, items: [{ ...MEDIA, thumbnailUrl: 'https://evil.test/tracker' }], page: LIBRARY.page },
    { ok: true, items: [MEDIA], page: { limit: 500, offset: 0, hasMore: false } },
    { ok: true, items: [], page: { limit: 24, offset: 0, hasMore: 'false' } },
    { ok: false, items: [], page: LIBRARY.page },
  ]) {
    const reader = createRenderLabProductionReader(async req => ({ url: req.url, status: 200, body }));
    await assert.rejects(() => reader.library('synthetic-only'));
  }
});

test('unavailable service and malformed profile do not impersonate successful accounts', async () => {
  const unavailable = createRenderLabProductionReader(async req => ({ url: req.url, status: 503, body: null }));
  assert.deepEqual(await unavailable.profile('synthetic-only'), { state: 'unavailable' });
  const badProfile = createRenderLabProductionReader(async req => ({ url: req.url, status: 200, body: { ok: true } }));
  await assert.rejects(() => badProfile.profile('synthetic-only'), /Invalid profile response/);
});
