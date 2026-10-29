/**
 * Pure M2 native authentication gates; no Supabase client, credentials,
 * persisted session, device transport or production request is wired here.
 * All external responses are injected by synthetic tests. A 200 result does
 * NOT establish that React Native blocked a redirect before bearer forwarding.
 */
export type NativeAuthStage =
  | 'signed_out'
  | 'restoring_session'
  | 'verifying_password'
  | 'checking_factors'
  | 'mfa_required'
  | 'verifying_totp'
  | 'checking_admission'
  | 'authorized'
  | 'access_denied'
  | 'unavailable';

export type NativeAuthState = Readonly<{
  stage: NativeAuthStage;
  factorId?: string;
}>;

export type NativeAuthEvent =
  | Readonly<{ type: 'begin_restore' }>
  | Readonly<{ type: 'session_restored' }>
  | Readonly<{ type: 'session_missing' }>
  | Readonly<{ type: 'begin_sign_in' }>
  | Readonly<{ type: 'password_verified' }>
  | Readonly<{ type: 'password_rejected' }>
  | Readonly<{ type: 'factors_checked'; snapshot: unknown }>
  | Readonly<{ type: 'begin_totp'; code: unknown }>
  | Readonly<{ type: 'totp_verified' }>
  | Readonly<{ type: 'totp_rejected' }>
  | Readonly<{ type: 'admission_checked'; response: unknown }>
  | Readonly<{ type: 'connection_failed' }>
  | Readonly<{ type: 'sign_out' }>
  | Readonly<{ type: 'session_invalidated' }>;

export type NativeMfaGate =
  | Readonly<{ decision: 'ready' }>
  | Readonly<{ decision: 'challenge'; factorId: string }>
  | Readonly<{ decision: 'blocked' }>;

export type NativeAdmissionDecision =
  | 'admitted'
  | 'authentication_required'
  | 'mfa_required'
  | 'access_denied'
  | 'unavailable';

const ACCOUNT_PROFILE_URL = 'https://renderlab.faresuniform.uk/api/account/profile';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SIGNED_OUT: NativeAuthState = Object.freeze({ stage: 'signed_out' });

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

/** Fail closed on ambiguous assurance/factor state, including extra factors. */
export function decideNativeMfaGate(snapshot: unknown): NativeMfaGate {
  const value = record(snapshot);
  if (!value || !Array.isArray(value.totpFactors)
    || value.totpFactors.length > 1
    || value.otherVerifiedFactorCount !== 0
    || (value.currentLevel !== 'aal1' && value.currentLevel !== 'aal2')
    || (value.nextLevel !== 'aal1' && value.nextLevel !== 'aal2')) {
    return { decision: 'blocked' };
  }
  const factors = value.totpFactors;
  if (factors.length === 0) {
    return value.currentLevel === 'aal1' && value.nextLevel === 'aal1'
      ? { decision: 'ready' } : { decision: 'blocked' };
  }
  const factor = record(factors[0]);
  if (!factor || factor.status !== 'verified'
    || typeof factor.id !== 'string' || !UUID.test(factor.id)
    || value.nextLevel !== 'aal2') {
    return { decision: 'blocked' };
  }
  if (value.currentLevel === 'aal2') return { decision: 'ready' };
  return { decision: 'challenge', factorId: factor.id };
}

/**
 * Shape-only check for the fixed existing first-party profile route.
 * MUST NOT be called on a bearer transport unless an independently verified
 * native adapter rejects redirects before any network follow.
 */
export function inspectNativeAdmission(response: unknown): NativeAdmissionDecision {
  const value = record(response);
  if (!value || value.url !== ACCOUNT_PROFILE_URL
    || !Number.isInteger(value.status)) return 'access_denied';
  const status = value.status as number;
  if (status === 401) return 'authentication_required';
  if (status === 503) return 'unavailable';
  if (status === 403) {
    const envelope = record(value.body);
    const error = record(envelope?.error);
    return envelope?.ok === false && error?.code === 'mfa_required'
      ? 'mfa_required' : 'access_denied';
  }
  if (status !== 200) return 'access_denied';
  const body = record(value.body);
  if (!body || body.ok !== true || !record(body.profile) || !record(body.policy)) {
    return 'access_denied';
  }
  // The server, not a locally decoded JWT or a mutable UI config, owns admission.
  return 'admitted';
}

/**
 * A pure UI transition reducer. No access token, password or TOTP code
 * is stored in any state; the code is validated and immediately discarded.
 * Unexpected transitions never grant authorization.
 */
export function transitionNativeAuth(
  previous: NativeAuthState, event: NativeAuthEvent,
): NativeAuthState {
  if (event.type === 'sign_out' || event.type === 'session_invalidated' || event.type === 'session_missing') return SIGNED_OUT;
  if (event.type === 'begin_restore') return { stage: 'restoring_session' };
  if (previous.stage === 'restoring_session' && event.type === 'session_restored') {
    return { stage: 'checking_factors' };
  }
  if (event.type === 'connection_failed') return { stage: 'unavailable' };
  if (event.type === 'begin_sign_in') {
    return previous.stage === 'signed_out' || previous.stage === 'access_denied'
      || previous.stage === 'unavailable'
      ? { stage: 'verifying_password' } : previous;
  }
  if (previous.stage === 'verifying_password' && event.type === 'password_rejected') return { stage: 'access_denied' };
  if (previous.stage === 'verifying_password' && event.type === 'password_verified') {
    return { stage: 'checking_factors' };
  }
  if (previous.stage === 'checking_factors' && event.type === 'factors_checked') {
    const gate = decideNativeMfaGate(event.snapshot);
    if (gate.decision === 'ready') return { stage: 'checking_admission' };
    if (gate.decision === 'challenge') return { stage: 'mfa_required', factorId: gate.factorId };
    return { stage: 'access_denied' };
  }
  if (previous.stage === 'mfa_required' && event.type === 'begin_totp') {
    return typeof event.code === 'string' && /^[0-9]{6}$/.test(event.code)
      ? { stage: 'verifying_totp', factorId: previous.factorId }
      : previous;
  }
  if (previous.stage === 'verifying_totp' && event.type === 'totp_rejected') {
    return { stage: 'mfa_required', factorId: previous.factorId };
  }
  if (previous.stage === 'verifying_totp' && event.type === 'totp_verified') {
    return { stage: 'checking_admission' };
  }
  if (previous.stage === 'checking_admission' && event.type === 'admission_checked') {
    const verdict = inspectNativeAdmission(event.response);
    if (verdict === 'admitted') return { stage: 'authorized' };
    if (verdict === 'unavailable') return { stage: 'unavailable' };
    return { stage: 'access_denied' };
  }
  // Explicitly reject skipped password/factor/TOTP/admission stages.
  return previous;
}
