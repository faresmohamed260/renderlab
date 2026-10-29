import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NATIVE_AUTH_RUNTIME_ENABLED, NATIVE_SUPABASE_HOST,
  parseNativePublicAuthConfig, getApprovedNativeAuthConfig,
} from '../src/services/auth/native-auth-config.ts';

const publicKey = 'sb_publishable_' + 'A'.repeat(32);
const valid = { url: 'https://' + NATIVE_SUPABASE_HOST, publishableKey: publicKey };

test('native Auth remains compile-disabled even with environment-provided project identifiers', () => {
  assert.equal(NATIVE_AUTH_RUNTIME_ENABLED, false);
  assert.equal(getApprovedNativeAuthConfig(), null);
  assert.deepEqual(parseNativePublicAuthConfig(valid), valid);
});

test('never accept other Supabase project, URL injection, embedded key or secret key', () => {
  for (const cfg of [
    null, {},
    { ...valid, url: 'http://' + NATIVE_SUPABASE_HOST },
    { ...valid, url: 'https://' + NATIVE_SUPABASE_HOST + '.attacker.test' },
    { ...valid, url: 'https://evil.supabase.co' },
    { ...valid, url: 'https://' + NATIVE_SUPABASE_HOST + ':8443' },
    { ...valid, url: 'https://' + NATIVE_SUPABASE_HOST + '/auth/v1' },
    { ...valid, url: 'https://user:password@' + NATIVE_SUPABASE_HOST },
    { ...valid, url: 'https://' + NATIVE_SUPABASE_HOST + '/?token=secret' },
    { ...valid, url: 'https://' + NATIVE_SUPABASE_HOST + '#secret' },
    { ...valid, publishableKey: 'sb_secret_' + 'A'.repeat(32) },
    { ...valid, publishableKey: 'service_role-secret' },
    { ...valid, publishableKey: 'ey.legacy.jwt' },
    { ...valid, publishableKey: '' },
    { ...valid, publishableKey: 'sb_publishable_too-short' },
  ]) assert.equal(parseNativePublicAuthConfig(cfg), null);
});
