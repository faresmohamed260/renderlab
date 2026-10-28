import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decideNativeMfaGate, inspectNativeAdmission, transitionNativeAuth,
} from '../src/services/auth/native-auth-boundary.ts';

const ID = '22222222-2222-4222-8222-222222222222';
const URL = 'https://renderlab.faresuniform.uk/api/account/profile';
const factors = (currentLevel, nextLevel, totpFactors = [], otherVerifiedFactorCount = 0) =>
  ({ currentLevel, nextLevel, totpFactors, otherVerifiedFactorCount });
const factor = { id: ID, status: 'verified' };
const accepted = { url: URL, status: 200, body: { ok: true, profile: { displayName: 'Synthetic' }, policy: {} } };

test('only supported factor and assurance combinations continue', () => {
  assert.deepEqual(decideNativeMfaGate(factors('aal1', 'aal1')), { decision: 'ready' });
  assert.deepEqual(decideNativeMfaGate(factors('aal1', 'aal2', [factor])),
    { decision: 'challenge', factorId: ID });
  assert.deepEqual(decideNativeMfaGate(factors('aal2', 'aal2', [factor])),
    { decision: 'ready' });
  for (const state of [
    factors('aal2', 'aal2'), factors('aal1', 'aal2'),
    factors('aal1', 'aal1', [factor]),
    factors('aal1', 'aal2', [factor, { ...factor, id: '33333333-3333-4333-8333-333333333333' }]),
    factors('aal1', 'aal2', [{ ...factor, status: 'unverified' }]),
    factors('aal1', 'aal2', [{ ...factor, id: 'not-an-uuid' }]),
    factors('aal1', 'aal2', [factor], 1),
    factors('unexpected', 'aal2', [factor]), null, {},
  ]) assert.equal(decideNativeMfaGate(state).decision, 'blocked');
});

test('only validated first-party server profile shape is accepted', () => {
  assert.equal(inspectNativeAdmission(accepted), 'admitted');
  for (const response of [
    { ...accepted, url: 'https://malicious.invalid/api/account/profile' },
    { ...accepted, status: 302 },
    { ...accepted, status: 200, body: { ok: true, profile: {} } },
    { ...accepted, status: 200, body: { ok: false, profile: {}, policy: {} } },
    { ...accepted, status: 200, body: { ok: true, profile: [], policy: {} } },
    { ...accepted, status: 200, body: { ok: true, profile: {}, policy: null } },
    null,
  ]) assert.equal(inspectNativeAdmission(response), 'access_denied');
  assert.equal(inspectNativeAdmission({ url: URL, status: 401 }), 'authentication_required');
  assert.equal(inspectNativeAdmission({ url: URL, status: 503 }), 'unavailable');
  assert.equal(inspectNativeAdmission({
    url: URL, status: 403, body: { ok: false, error: { code: 'mfa_required' } },
  }), 'mfa_required');
  assert.equal(inspectNativeAdmission({
    url: URL, status: 403, body: { ok: false, error: { code: 'renderlab_access_required' } },
  }), 'access_denied');
});

test('password and MFA challenge alone never unlock private UI', () => {
  let state = { stage: 'signed_out' };
  state = transitionNativeAuth(state, { type: 'admission_checked', response: accepted });
  assert.equal(state.stage, 'signed_out');
  state = transitionNativeAuth(state, { type: 'begin_sign_in' });
  state = transitionNativeAuth(state, { type: 'admission_checked', response: accepted });
  assert.equal(state.stage, 'verifying_password');
  state = transitionNativeAuth(state, { type: 'password_verified' });
  assert.equal(state.stage, 'checking_factors');
  state = transitionNativeAuth(state, { type: 'factors_checked', snapshot: factors('aal1', 'aal2', [factor]) });
  assert.equal(state.stage, 'mfa_required');
  assert.equal(state.factorId, ID);
  assert.equal(transitionNativeAuth(state, { type: 'totp_verified' }).stage, 'mfa_required');
  assert.equal(transitionNativeAuth(state, { type: 'begin_totp', code: '12345' }).stage, 'mfa_required');
  state = transitionNativeAuth(state, { type: 'begin_totp', code: '123456' });
  assert.equal(state.stage, 'verifying_totp');
  assert.equal(JSON.stringify(state).includes('123456'), false);
  state = transitionNativeAuth(state, { type: 'totp_rejected' });
  assert.equal(state.stage, 'mfa_required');
  state = transitionNativeAuth(state, { type: 'begin_totp', code: '654321' });
  state = transitionNativeAuth(state, { type: 'totp_verified' });
  assert.equal(state.stage, 'checking_admission');
  state = transitionNativeAuth(state, { type: 'admission_checked', response: accepted });
  assert.equal(state.stage, 'authorized');
  assert.deepEqual(transitionNativeAuth(state, { type: 'session_invalidated' }), { stage: 'signed_out' });
});

test('AAL1 without factor still requires a server authorization response', () => {
  let state = transitionNativeAuth({ stage: 'signed_out' }, { type: 'begin_sign_in' });
  state = transitionNativeAuth(state, { type: 'password_verified' });
  state = transitionNativeAuth(state, { type: 'factors_checked', snapshot: factors('aal1', 'aal1') });
  assert.equal(state.stage, 'checking_admission');
  assert.equal(transitionNativeAuth(state, { type: 'admission_checked', response: { ...accepted, status: 401 } }).stage, 'access_denied');
  assert.equal(transitionNativeAuth(state, { type: 'admission_checked', response: { ...accepted, status: 503 } }).stage, 'unavailable');
  assert.equal(transitionNativeAuth(state, { type: 'admission_checked', response: accepted }).stage, 'authorized');
  assert.deepEqual(transitionNativeAuth(state, { type: 'sign_out' }), { stage: 'signed_out' });
});

test('unsupported MFA states never advance to a server-admission check', () => {
  let state = transitionNativeAuth({ stage: 'signed_out' }, { type: 'begin_sign_in' });
  state = transitionNativeAuth(state, { type: 'password_verified' });
  state = transitionNativeAuth(state, { type: 'factors_checked', snapshot: factors('aal2', 'aal2') });
  assert.equal(state.stage, 'access_denied');
  assert.equal(transitionNativeAuth(state, { type: 'admission_checked', response: accepted }).stage, 'access_denied');
  assert.equal(transitionNativeAuth(state, { type: 'begin_sign_in' }).stage, 'verifying_password');
});
