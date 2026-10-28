/**
 * Dependency-injected bridge from the reviewed Supabase Auth JS SDK to the
 * M2 state machine. No Supabase client, network, or credentials are created
 * here. All failures are redacted before reaching React Native UI state.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  NATIVE_SUPABASE_AUTH_STORAGE_KEY,
} from './native-supabase-storage.ts';
import type { NativeAuthPort } from './native-auth-coordinator.ts';

type SupabaseAuth = SupabaseClient['auth'];
type ProtectedAuthStorage = Readonly<{ removeItem: (key: string) => Promise<void> }>;

export function createNativeSupabaseAuthPort(
  auth: SupabaseAuth,
  protectedStorage: ProtectedAuthStorage,
): NativeAuthPort {
  return Object.freeze({
    async signIn({ email, password }) {
      if (typeof email !== 'string' || typeof password !== 'string' ||
          !email.trim() || password.length === 0) return false;
      try {
        const { data, error } = await auth.signInWithPassword({ email: email.trim(), password });
        return !error && Boolean(data.session?.access_token && data.user?.id);
      } catch {
        return false;
      }
    },
    async getAssurance() {
      try {
        const { data, error } = await auth.mfa.getAuthenticatorAssuranceLevel();
        if (error || !data) return null;
        return { currentLevel: data.currentLevel, nextLevel: data.nextLevel };
      } catch {
        return null;
      }
    },
    async listFactors() {
      try {
        const { data, error } = await auth.mfa.listFactors();
        return error || !data ? null : { all: data.all, totp: data.totp };
      } catch {
        return null;
      }
    },
    async verifyTotp(factorId, code) {
      if (typeof factorId !== 'string' || !/^[0-9]{6}$/.test(code)) return false;
      try {
        const { error } = await auth.mfa.challengeAndVerify({ factorId, code });
        return !error;
      } catch {
        return false;
      }
    },
    async getAccessToken() {
      try {
        const { data, error } = await auth.getSession();
        if (error || !data.session || typeof data.session.access_token !== 'string' ||
            !Number.isFinite(data.session.expires_at) ||
            (data.session.expires_at ?? 0) <= Date.now() / 1000 + 15) return null;
        return data.session.access_token;
      } catch {
        return null;
      }
    },
    async signOutRemote() {
      // Failure is surfaced to the coordinator as "remote unconfirmed",
      // never as an SDK message including auth or account values.
      try {
        const { error } = await auth.signOut({ scope: 'global' });
        if (error) throw new Error('Remote sign-out unconfirmed');
      } catch {
        throw new Error('Remote sign-out unconfirmed');
      }
    },
    async clearProtectedSession() {
      try {
        await protectedStorage.removeItem(NATIVE_SUPABASE_AUTH_STORAGE_KEY);
      } catch {
        throw new Error('Protected native session unavailable');
      }
    },
  });
}
