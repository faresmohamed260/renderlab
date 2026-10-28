import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const configure = require('../app.config.js');
const base = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo;

function inVariant(variant, fn) {
  const before = process.env.RENDERLAB_ANDROID_DEV_VARIANT;
  try {
    if (variant === undefined) delete process.env.RENDERLAB_ANDROID_DEV_VARIANT;
    else process.env.RENDERLAB_ANDROID_DEV_VARIANT = variant;
    return fn();
  } finally {
    if (before === undefined) delete process.env.RENDERLAB_ANDROID_DEV_VARIANT;
    else process.env.RENDERLAB_ANDROID_DEV_VARIANT = before;
  }
}
test('the default M0 app is still unprovisioned; no unwanted signing or OTA', () => {
  assert.equal(base.android.package, undefined);
  assert.equal(base.updates?.url, undefined);
  inVariant(undefined, () => assert.deepEqual(configure({ config: base }), base));
  inVariant('false', () => assert.deepEqual(configure({ config: base }), base));
});
test('opted-in development Android identity is stable, isolated and package-safe', () => {
  inVariant('1', () => {
    const dev = configure({ config: base });
    assert.equal(dev.name, 'RenderLab Dev');
    assert.equal(dev.slug, 'renderlab-dev');
    assert.equal(dev.scheme, 'renderlab-dev');
    assert.equal(dev.android.package, 'uk.faresuniform.renderlab.dev');
    assert.equal(dev.android.versionCode, 1);
    assert.equal(dev.updates?.url, undefined);
    assert.equal(dev.extra?.eas?.projectId, undefined);
    assert.equal(base.android.package, undefined);
    assert.deepEqual(dev.android.adaptiveIcon, base.android.adaptiveIcon);
  });
});
test('opted-in variant refuses already-provisioned identity or EAS/OTA metadata', () => {
  inVariant('1', () => {
    for (const override of [
      { ...base, android: { ...base.android, package: 'com.other.app' } },
      { ...base, updates: { url: 'https://wrong.example.test' } },
      { ...base, extra: { eas: { projectId: 'fake' } } },
    ]) assert.throws(() => configure({ config: override }));
  });
});
test('opted-in dev variant never includes Supabase URL or public Auth keys', () => {
  inVariant('1', () => {
    for (const name of [
      'EXPO_PUBLIC_SUPABASE_URL',
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      'EXPO_PUBLIC_SUPABASE_ANON_KEY',
      'EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY',
    ]) {
      const prev = process.env[name];
      try {
        process.env[name] = 'synthetic-no-real-config';
        assert.throws(() => configure({ config: base }));
      } finally {
        if (prev === undefined) delete process.env[name];
        else process.env[name] = prev;
      }
    }
  });
});
