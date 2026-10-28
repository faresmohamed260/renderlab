/**
 * M2 native Auth orchestration without network or production credentials.
 * Both Supabase Auth and the first-party server-admission transport are
 * injected. Nothing calls this module from an application screen yet.
 * Authorization is impossible without a validated server profile response.
 */
import {
  decideNativeMfaGate, inspectNativeAdmission, transitionNativeAuth,
  type NativeAuthState,
} from './native-auth-boundary.ts';

type Credentials = Readonly<{ email: string; password: string }>;
type Factor = { id: unknown; status: unknown; factor_type?: unknown };
type Factors = { all: Factor[]; totp: Factor[] };
type Assurance = { currentLevel: unknown; nextLevel: unknown };
export type NativeAuthPort = Readonly<{
  signIn: (credentials: Credentials) => Promise<boolean>;
  verifySession: () => Promise<boolean>;
  getAssurance: () => Promise<unknown>;
  listFactors: () => Promise<unknown>;
  verifyTotp: (factorId: string, code: string) => Promise<boolean>;
  getAccessToken: () => Promise<string | null>;
  signOutRemote: () => Promise<void>;
  clearProtectedSession: () => Promise<void>;
}>;

export type NativeServerAdmissionPort = (accessToken: string) => Promise<unknown>;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

/** Reject unknown factor shapes and inconsistent verified-factor collections. */
export function normalizeNativeSupabaseFactorSnapshot(
  assurance: unknown, factors: unknown,
): unknown {
  const a = record(assurance), f = record(factors);
  if (!a || !f || !Array.isArray(f.all) || !Array.isArray(f.totp)
    || f.all.length > 10 || f.totp.length > 10) return null;
  const all = f.all as unknown[];
  const totp = f.totp as unknown[];
  if (all.some(x => !record(x)) || totp.some(x => !record(x))) return null;
  // An unrecognized verified factor must never be silently ignored.
  const verifiedOthers = all.filter(x => {
    const item = x as Record<string, unknown>;
    return item.status === 'verified' && item.factor_type !== 'totp';
  });
  const verifiedTotp = totp.filter(x => (x as Record<string, unknown>).status === 'verified');
  const verifiedInAll = all.filter(x => {
    const item = x as Record<string, unknown>;
    return item.status === 'verified' && item.factor_type === 'totp';
  });
  if (verifiedInAll.length !== verifiedTotp.length ||
    verifiedInAll.some(x => !verifiedTotp.some(y => (y as Record<string, unknown>).id === (x as Record<string, unknown>).id))) {
    return null;
  }
  return {
    currentLevel: a.currentLevel,
    nextLevel: a.nextLevel,
    totpFactors: verifiedTotp,
    otherVerifiedFactorCount: verifiedOthers.length,
  };
}

export function createNativeAuthCoordinator(
  auth: NativeAuthPort,
  probeServerAdmission: NativeServerAdmissionPort,
  onState: (state: NativeAuthState) => void,
) {
  let current: NativeAuthState = Object.freeze({ stage: 'signed_out' });
  let epoch = 0;
  let inFlight: Promise<void> | null = null;
  let signingOut = false;
  let pendingRestore = false;
  function emit(next: NativeAuthState) {
    current = next;
    onState(next);
  }
  function transition(event: Parameters<typeof transitionNativeAuth>[1]) {
    emit(transitionNativeAuth(current, event));
  }
  function active(myEpoch: number) { return myEpoch === epoch; }
  function settle(operation: Promise<void>) {
    if (inFlight !== operation) return;
    inFlight = null;
    if (pendingRestore && !signingOut) {
      pendingRestore = false;
      void restore();
    }
  }
  function requestRestore(): void {
    if (signingOut) return;
    // Don't lose refresh/account-switch revalidation while a login or
    // MFA request is pending; finish the stale request first.
    if (inFlight) { pendingRestore = true; return; }
    pendingRestore = false;
    void restore();
  }
  async function checkServer(myEpoch: number) {
    if (!active(myEpoch)) return;
    const token = await auth.getAccessToken();
    if (!active(myEpoch)) return;
    if (typeof token !== 'string' || token.length < 1) {
      transition({ type: 'admission_checked', response: null });
      return;
    }
    const response = await probeServerAdmission(token);
    if (!active(myEpoch)) return;
    // Reducer is the final UI gate, never trust factor state or an SDK JWT.
    transition({ type: 'admission_checked', response });
  }
  async function checkFactors(myEpoch: number) {
    const [assurance, factors] = await Promise.all([auth.getAssurance(), auth.listFactors()]);
    if (!active(myEpoch)) return;
    const snapshot = normalizeNativeSupabaseFactorSnapshot(assurance, factors);
    const gate = decideNativeMfaGate(snapshot);
    transition({ type: 'factors_checked', snapshot });
    if (gate.decision === 'ready') await checkServer(myEpoch);
  }
  /** Fresh SDK identity plus MFA plus RenderLab admission on every restore/resume. */
  function restore(): Promise<void> {
    if (signingOut || inFlight) return Promise.resolve();
    const myEpoch = ++epoch;
    transition({ type: 'begin_restore' });
    const operation = (async () => {
      try {
        const verified = await auth.verifySession();
        if (!active(myEpoch)) return;
        if (!verified) {
          transition({ type: 'session_missing' });
          return;
        }
        transition({ type: 'session_restored' });
        await checkFactors(myEpoch);
      } catch {
        if (active(myEpoch)) transition({ type: 'connection_failed' });
      }
    })();
    inFlight = operation;
    void operation.then(() => settle(operation), () => settle(operation));
    return operation;
  }
  function startSignIn(credentials: Credentials): Promise<void> {
    if (signingOut || inFlight || current.stage !== 'signed_out' && current.stage !== 'access_denied'
      && current.stage !== 'unavailable') return Promise.resolve();
    if (!credentials || !credentials.email.trim() || !credentials.password) {
      return Promise.reject(new Error('Invalid sign-in request'));
    }
    const myEpoch = ++epoch;
    transition({ type: 'begin_sign_in' });
    const operation = (async () => {
      try {
        const signedIn = await auth.signIn(credentials);
        if (!active(myEpoch)) return;
        if (!signedIn) {
          transition({ type: 'password_rejected' });
          return;
        }
        transition({ type: 'password_verified' });
        await checkFactors(myEpoch);
      } catch {
        if (active(myEpoch)) transition({ type: 'connection_failed' });
      }
    })();
    inFlight = operation;
    void operation.then(() => settle(operation), () => settle(operation));
    return operation;
  }
  function submitTotp(code: string): Promise<void> {
    if (signingOut || inFlight || current.stage !== 'mfa_required' || !/^[0-9]{6}$/.test(code)) {
      return Promise.resolve();
    }
    const factorId = current.factorId;
    if (!factorId) return Promise.resolve();
    const myEpoch = epoch;
    transition({ type: 'begin_totp', code });
    const operation = (async () => {
      try {
        const verified = await auth.verifyTotp(factorId, code);
        if (!active(myEpoch)) return;
        if (!verified) {
          transition({ type: 'totp_rejected' });
          return;
        }
        const [assurance, factors] = await Promise.all([auth.getAssurance(), auth.listFactors()]);
        if (!active(myEpoch)) return;
        const gate = decideNativeMfaGate(normalizeNativeSupabaseFactorSnapshot(assurance, factors));
        if (gate.decision !== 'ready' || record(assurance)?.currentLevel !== 'aal2') {
          transition({ type: 'connection_failed' });
          return;
        }
        transition({ type: 'totp_verified' });
        await checkServer(myEpoch);
      } catch {
        if (active(myEpoch)) transition({ type: 'connection_failed' });
      }
    })();
    inFlight = operation;
    void operation.then(() => settle(operation), () => settle(operation));
    return operation;
  }
  async function signOut() {
    if (signingOut) throw new Error('Native sign-out already running');
    signingOut = true; // Block new sign-in until protected storage is cleared.
    ++epoch;
    pendingRestore = false;
    transition({ type: 'sign_out' });
    try {
      const pending = inFlight;
      if (pending) await pending.catch(() => undefined);
      // Remote revocation can fail offline; local session MUST still be cleared.
      // Initiate remote revocation, but do not await it while a protected
      // session remains on disk. The UI is already locked above.
      let remoteResult: Promise<boolean>;
      try {
        remoteResult = Promise.resolve(auth.signOutRemote()).then(
          () => true, () => false,
        );
      } catch {
        remoteResult = Promise.resolve(false);
      }
      try {
        await auth.clearProtectedSession();
      } catch {
        transition({ type: 'connection_failed' });
        throw new Error('Unable to clear protected native session');
      }
      const revoked = await remoteResult;
      return { localSignedOut: true, remoteRevocationConfirmed: revoked } as const;
    } finally {
      signingOut = false;
    }
  }
  return Object.freeze({
    get state(): NativeAuthState { return current; },
    signIn: startSignIn,
    restore,
    requestRestore,
    verifyTotp: submitTotp,
    signOut,
    /** Background, auth-user change, token expiration: clear UI admission. */
    invalidate: () => { ++epoch; pendingRestore = false; transition({ type: 'session_invalidated' }); },
  });
}
