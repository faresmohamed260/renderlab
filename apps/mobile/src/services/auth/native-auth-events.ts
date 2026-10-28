/**
 * Sync-only Supabase onAuthStateChange observer. Never invoke/await Auth SDK
 * methods from the callback itself (Supabase GoTrue lock-deadlock hazard).
 * Auth events immediately revoke private UI/cache, then defer revalidation
 * outside the event callback and only while Android is in the foreground.
 */
import type { NativeAuthState } from './native-auth-boundary.ts';
type Subscription = Readonly<{ unsubscribe: () => void }>;
type AuthEvents = Readonly<{
  onAuthStateChange: (callback: (event: string, session: unknown) => void) =>
    { data: { subscription: Subscription } };
}>;
type Controller = Readonly<{
  invalidate: () => void;
  requestRestore: () => void;
  getState: () => NativeAuthState;
}>;
const EXPECTED_PASSWORD_STAGES = new Set(['verifying_password']);
const EXPECTED_TOTP_STAGES = new Set(['verifying_totp']);
const SESSION_CHANGED = new Set([
  'SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED', 'MFA_CHALLENGE_VERIFIED',
]);
export function createNativeAuthEventBridge(
  auth: AuthEvents,
  coordinator: Controller,
  isForeground: () => boolean,
  clearPrivateCache: () => void,
) {
  let started = false;
  let subscription: Subscription | null = null;
  let queued = false;
  function lock() {
    coordinator.invalidate();
    clearPrivateCache();
  }
  function scheduleRestore() {
    if (queued) return;
    queued = true;
    void Promise.resolve().then(() => {
      queued = false;
      if (started && isForeground()) coordinator.requestRestore();
    });
  }
  function eventReceived(event: string) {
    if (!started || event === 'INITIAL_SESSION') return;
    const stage = coordinator.getState().stage;
    if (event === 'SIGNED_OUT' || event === 'PASSWORD_RECOVERY') {
      lock(); // Never auto-resume an explicitly revoked/recovery session.
      return;
    }
    if (!SESSION_CHANGED.has(event)) {
      lock(); // Unknown security-relevant event: deny, don't guess.
      return;
    }
    if (event === 'SIGNED_IN' && EXPECTED_PASSWORD_STAGES.has(stage)) return;
    if (event === 'MFA_CHALLENGE_VERIFIED' && EXPECTED_TOTP_STAGES.has(stage)) return;
    lock();
    scheduleRestore();
  }
  return Object.freeze({
    start() {
      if (started) return;
      started = true;
      try {
        subscription = auth.onAuthStateChange((event) => {
          // No token or session is read, persisted, emitted or logged.
          eventReceived(event);
        }).data.subscription;
      } catch {
        started = false;
        lock();
      }
    },
    stop() {
      if (!started) return;
      started = false;
      queued = false;
      subscription?.unsubscribe();
      subscription = null;
    },
  });
}
