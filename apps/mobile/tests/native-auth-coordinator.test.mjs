import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createNativeAuthCoordinator, normalizeNativeSupabaseFactorSnapshot,
} from '../src/services/auth/native-auth-coordinator.ts';

const URL = 'https://renderlab.faresuniform.uk/api/account/profile';
const FACTOR_ID = '22222222-2222-4222-8222-222222222222';
const FACTOR = { id: FACTOR_ID, status: 'verified', factor_type: 'totp' };
const factors = (xs = []) => ({ all: xs, totp: xs.filter(x => x.factor_type === 'totp') });
const assurance = (currentLevel, nextLevel) => ({ currentLevel, nextLevel });
const admitted = { url: URL, status: 200, body: { ok: true, profile: {}, policy: {} } };

function setup({ factorList = factors(), level = assurance('aal1', 'aal1'), response = admitted } = {}) {
  const events = [], callbacks = [];
  let bearer = 'SYNTHETIC-TOKEN-NEVER-PRODUCTION';
  const auth = {
    async signIn(input) { assert.ok(input.email && input.password); events.push('password'); return true; },
    async getAssurance() { events.push('assurance'); return level; },
    async listFactors() { events.push('factors'); return factorList; },
    async verifyTotp(factorId, code) {
      assert.equal(factorId, FACTOR_ID);
      assert.match(code, /^[0-9]{6}$/);
      events.push('verify');
      level = assurance('aal2', 'aal2');
      return true;
    },
    async getAccessToken() { events.push('bearer'); return bearer; },
    async signOutRemote() { events.push('remote'); },
    async clearProtectedSession() { events.push('clear'); },
  };
  const coordinator = createNativeAuthCoordinator(auth, async token => {
    events.push('server');
    assert.equal(token, bearer);
    return response;
  }, x => callbacks.push(x));
  return { coordinator, events, callbacks, auth, setBearer: v => { bearer = v; } };
}

test('no verified MFA requires first-party admission before authorization', async () => {
  const { coordinator, events, callbacks } = setup();
  assert.equal(coordinator.state.stage, 'signed_out');
  await coordinator.signIn({ email: 'synthetic@example.test', password: 'not-real' });
  assert.equal(coordinator.state.stage, 'authorized');
  assert.deepEqual(events, ['password', 'assurance', 'factors', 'bearer', 'server']);
  assert.equal(callbacks[0].stage, 'verifying_password');
  assert.equal(callbacks.at(-2).stage, 'checking_admission');
  assert.ok(callbacks.every(x => !JSON.stringify(x).includes('not-real')));
  const out = await coordinator.signOut();
  assert.deepEqual(out, { localSignedOut: true, remoteRevocationConfirmed: true });
  assert.equal(coordinator.state.stage, 'signed_out');
  assert.deepEqual(events.slice(-2), ['remote', 'clear']);
});

test('verified TOTP challenge cannot bypass AAL2 or server admission', async () => {
  const { coordinator, events, callbacks } = setup({
    factorList: factors([FACTOR]),
    level: assurance('aal1', 'aal2'),
  });
  await coordinator.signIn({ email: 'synthetic@example.test', password: 'not-real' });
  assert.equal(coordinator.state.stage, 'mfa_required');
  assert.equal(events.includes('server'), false);
  await coordinator.verifyTotp('12345');
  assert.equal(coordinator.state.stage, 'mfa_required');
  await coordinator.verifyTotp('123456');
  assert.equal(coordinator.state.stage, 'authorized');
  assert.equal(events.filter(x => x === 'server').length, 1);
  assert.ok(callbacks.every(x => !JSON.stringify(x).includes('123456')));
});

test('untrusted/extra factor states and malformed assurance fail closed', async () => {
  for (const { fs, level } of [
    { fs: factors([{ ...FACTOR }, { ...FACTOR, id: '33333333-3333-4333-8333-333333333333' }]), level: assurance('aal1', 'aal2') },
    { fs: factors([{ ...FACTOR, factor_type: 'phone' }]), level: assurance('aal1', 'aal2') },
    { fs: factors([FACTOR]), level: assurance('unknown', 'aal2') },
    { fs: { all: [], totp: [FACTOR] }, level: assurance('aal1', 'aal2') },
  ]) {
    const { coordinator, events } = setup({ factorList: fs, level });
    await coordinator.signIn({ email: 'synthetic@example.test', password: 'not-real' });
    assert.equal(coordinator.state.stage, 'access_denied');
    assert.equal(events.includes('server'), false);
  }
  assert.equal(normalizeNativeSupabaseFactorSnapshot(null, factors()), null);
});

test('200 from foreign URL, 403, and missing bearer never grant authorization', async () => {
  for (const response of [
    { ...admitted, url: 'https://not-renderlab.test/api/account/profile' },
    { ...admitted, status: 403 }, { ...admitted, status: 302 },
  ]) {
    const { coordinator } = setup({ response });
    await coordinator.signIn({ email: 'synthetic@example.test', password: 'not-real' });
    assert.equal(coordinator.state.stage, 'access_denied');
  }
  const { coordinator, events, setBearer } = setup();
  setBearer(null);
  await coordinator.signIn({ email: 'synthetic@example.test', password: 'not-real' });
  assert.equal(coordinator.state.stage, 'access_denied');
  assert.equal(events.includes('server'), false);
});

test('sign-out invalidates pending sign-in and clears storage after it settles', async () => {
  let resolve;
  const entered = new Promise(r => { resolve = r; });
  const events = [];
  const gateway = {
    async signIn() { events.push('login-begin'); await entered; events.push('login-return'); return true; },
    async getAssurance() { throw Error('stale attempt must never continue'); },
    async listFactors() { throw Error('stale attempt must never continue'); },
    async verifyTotp() { throw Error('stale attempt must never continue'); },
    async getAccessToken() { throw Error('stale attempt must never continue'); },
    async signOutRemote() { events.push('remote'); },
    async clearProtectedSession() { events.push('clear'); },
  };
  const stateLog = [];
  const c = createNativeAuthCoordinator(gateway, async () => {
    throw Error('server must not run for interrupted sign-in');
  }, x => stateLog.push(x.stage));
  const signIn = c.signIn({ email: 'synthetic@example.test', password: 'never-real' });
  const signOut = c.signOut();
  assert.equal(c.state.stage, 'signed_out');
  resolve();
  await Promise.all([signIn, signOut]);
  assert.deepEqual(events, ['login-begin', 'login-return', 'remote', 'clear']);
  assert.equal(c.state.stage, 'signed_out');
  assert.equal(stateLog.includes('authorized'), false);
});

test('remote sign-out failure reports unconfirmed revocation, local clear remains mandatory', async () => {
  const { coordinator, auth, events } = setup();
  await coordinator.signIn({ email: 'synthetic@example.test', password: 'never-real' });
  auth.signOutRemote = async () => { events.push('remote-failed'); throw Error('private remote data'); };
  assert.deepEqual(await coordinator.signOut(), { localSignedOut: true, remoteRevocationConfirmed: false });
  assert.equal(coordinator.state.stage, 'signed_out');
  assert.ok(events.includes('clear'));
  auth.clearProtectedSession = async () => { throw Error('private secure store data'); };
  await assert.rejects(() => coordinator.signOut(), /Unable to clear protected native session/);
  assert.equal(coordinator.state.stage, 'unavailable');
});

test('local protected session is wiped before slow remote revocation settles', async () => {
  let resolveRemote;
  const remotePending = new Promise(resolve => { resolveRemote = resolve; });
  const events = [];
  const gateway = {
    async signIn() { return true; },
    async getAssurance() { return assurance('aal1', 'aal1'); },
    async listFactors() { return factors(); },
    async verifyTotp() { return false; },
    async getAccessToken() { return 'synthetic'; },
    async signOutRemote() { events.push('remote-start'); await remotePending; events.push('remote-done'); },
    async clearProtectedSession() { events.push('clear-local'); },
  };
  const coordinator = createNativeAuthCoordinator(gateway, async () => admitted, () => {});
  await coordinator.signIn({ email: 'synthetic@example.test', password: 'test-only' });
  const pending = coordinator.signOut();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(coordinator.state.stage, 'signed_out');
  assert.deepEqual(events, ['remote-start', 'clear-local']);
  resolveRemote();
  const outcome = await pending;
  assert.equal(outcome.remoteRevocationConfirmed, true);
  assert.deepEqual(events, ['remote-start', 'clear-local', 'remote-done']);
});

test('restored session is never authorized until fresh identity, factors and first-party admission pass',async()=>{
  const events=[];
  const auth={
    async verifySession(){events.push('getUser');return true;},
    async signIn(){throw Error('restore must not request password');},
    async getAssurance(){events.push('assurance');return assurance('aal1','aal1');},
    async listFactors(){events.push('factors');return factors();},
    async verifyTotp(){throw Error('no MFA factor');},
    async getAccessToken(){events.push('session');return 'synthetic-token';},
    async signOutRemote(){},async clearProtectedSession(){},
  };
  const states=[];
  const c=createNativeAuthCoordinator(auth,async(token)=>{
    assert.equal(token,'synthetic-token');
    events.push('server');return admitted;
  },state=>states.push(state.stage));
  await c.restore();
  assert.deepEqual(events,['getUser','assurance','factors','session','server']);
  assert.deepEqual(states,['restoring_session','checking_factors','checking_admission','authorized']);
});
test('unverified or revoked restored session fails signed out before contacting RenderLab',async()=>{
  const {coordinator,auth,events}=setup();
  auth.verifySession=async()=>false;
  await coordinator.restore();
  assert.equal(coordinator.state.stage,'signed_out');
  assert.equal(events.length,0);
});
test('restored session with MFA factor remains locked until current TOTP and server admission',async()=>{
  const {coordinator,auth,events}=setup({
    factorList:factors([FACTOR]),level:assurance('aal1','aal2'),
  });
  auth.verifySession=async()=>true;
  await coordinator.restore();
  assert.equal(coordinator.state.stage,'mfa_required');
  assert.equal(events.includes('server'),false);
  await coordinator.verifyTotp('123456');
  assert.equal(coordinator.state.stage,'authorized');
});

test('rejected password remains eligible for an explicit safe retry',async()=>{
  const ctx=setup();
  let attempts=0;
  ctx.auth.signIn=async()=>{attempts++;return attempts>1};
  await ctx.coordinator.signIn({email:'synthetic@example.test',password:'wrong-synthetic'});
  assert.equal(ctx.coordinator.state.stage,'access_denied');
  assert.equal(ctx.events.includes('server'),false);
  await ctx.coordinator.signIn({email:'synthetic@example.test',password:'synthetic-retry'});
  assert.equal(ctx.coordinator.state.stage,'authorized');
  assert.equal(attempts,2);
});
test('refresh during a pending Auth request invalidates old admission and queues fresh restore',async()=>{
  let unblock;
  const gate=new Promise(r=>{unblock=r});
  const events=[],states=[];
  const auth={
    async signIn(){events.push('start-signin');await gate;return true;},
    async verifySession(){events.push('verify-session');return true;},
    async getAssurance(){events.push('assurance');return assurance('aal1','aal1');},
    async listFactors(){events.push('factors');return factors();},
    async verifyTotp(){return false;},
    async getAccessToken(){return 'synthetic';},
    async signOutRemote(){},async clearProtectedSession(){}
  };
  const c=createNativeAuthCoordinator(auth,async()=>{events.push('server');return admitted;},
    s=>states.push(s.stage));
  const first=c.signIn({email:'synthetic@example.test',password:'synthetic-only'});
  c.invalidate();
  c.requestRestore();
  assert.equal(c.state.stage,'signed_out');
  unblock();
  await first;
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(events,['start-signin','verify-session','assurance','factors','server']);
  assert.equal(c.state.stage,'authorized');
  assert.equal(states.filter(x=>x==='authorized').length,1);
});
