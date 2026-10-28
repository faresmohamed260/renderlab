import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EMBEDDED_ANDROID_UI_CONFIG,
  fetchAndroidUiConfig,
  parseAndroidUiConfig,
} from '../src/features/runtime-ui/runtime-ui-config.ts';

const URL = 'https://renderlab.faresuniform.uk/api/mobile/ui-config';
const copy = () => structuredClone(EMBEDDED_ANDROID_UI_CONFIG);
const reply = (value, overrides = {}) => ({
  status: 200,
  url: URL,
  headers: { get: key => key === 'content-type' ? 'application/json' : null },
  text: async () => JSON.stringify(value),
  ...overrides,
});

test('embedded config maintains the same safe startup tabs when the network is absent', () => {
  assert.deepEqual(parseAndroidUiConfig(EMBEDDED_ANDROID_UI_CONFIG), EMBEDDED_ANDROID_UI_CONFIG);
  assert.deepEqual(EMBEDDED_ANDROID_UI_CONFIG.tabs.map(x => x.id), [
    'index', 'library', 'activity', 'settings',
  ]);
});

test('a runtime reordering and icon/text edit keeps all existing routes', async () => {
  const current = copy();
  current.revision = 'v1-new-tab-order';
  current.brand = 'RenderLab Studio';
  current.tabs = [current.tabs[1], current.tabs[0], current.tabs[2], current.tabs[3]];
  current.tabs[0].label = 'Media';
  current.tabs[0].icon = 'grid-outline';
  const req = [];
  const result = await fetchAndroidUiConfig(async (url, init) => {
    req.push({ url, init });
    return reply(current);
  });
  assert.deepEqual(result, current);
  assert.equal(req.length, 1);
  assert.equal(req[0].url, URL);
  assert.equal(req[0].init.credentials, 'omit');
  assert.equal(req[0].init.redirect, 'error');
  assert.equal(req[0].init.method, 'GET');
  assert.ok(!Object.keys(req[0].init.headers).some(k => /cookie|auth|api.?key/i.test(k)));
});

test('payloads cannot add routes, arbitrary URLs, action handlers or unexpected props', () => {
  const corruptions = [
    c => { c.tabs.push({ id: 'admin', label: 'Admin', icon: 'settings-outline' }); },
    c => { c.tabs.pop(); },
    c => { c.tabs[2].id = 'settings'; },
    c => { c.tabs[0].icon = 'javascript:evil'; },
    c => { c.tabs[0].icon = 'settings-outline'; },
    c => { c.apiOrigin = 'https://attacker.example'; },
    c => { c.tabs[0].onPress = 'eval(1)'; },
    c => { c.brand = 'RenderLab\u2066'; },
    c => { c.version = 99; },
  ];
  for (const modify of corruptions) {
    const invalid = copy();
    modify(invalid);
    assert.throws(() => parseAndroidUiConfig(invalid));
  }
});

test('response URL, content type, status and size must be trusted', async () => {
  for (const response of [
    reply(copy(), { url: 'https://attacker.example' }),
    reply(copy(), { status: 302 }),
    reply(copy(), { status: 401 }),
    reply(copy(), { headers: { get: () => 'text/html' } }),
    reply(copy(), { text: async () => 'x'.repeat(4096) }),
  ]) {
    await assert.rejects(() => fetchAndroidUiConfig(async () => response));
  }
});

test('network unavailability is handled by caller preserving embedded or last safe state', async () => {
  await assert.rejects(() => fetchAndroidUiConfig(async () => { throw new Error('offline'); }));
  assert.equal(EMBEDDED_ANDROID_UI_CONFIG.brand, 'RenderLab');
});
