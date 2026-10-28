/**
 * Dormant SDK58 native Auth adapter. NO production Auth client is created
 * in the submitted app: NATIVE_AUTH_RUNTIME_ENABLED remains false, no
 * Supabase publishable key is supplied, and this module is not mounted.
 * Keep all application data behind RenderLab's first-party Next.js server.
 */
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';
import { getApprovedNativeAuthConfig } from './native-auth-config.ts';
import { createNativeAuthForegroundLifecycle } from './native-auth-lifecycle.ts';
import { createNativeSupabaseSecureStorage } from './native-supabase-storage.ts';

/** Future integration must revalidate server-owned admission on every resume. */
export function createDormantNativeSupabaseAuthRuntime(
  invalidateLocalAdmission: () => void,
  onRefreshFailure: () => void,
) {
  const config = getApprovedNativeAuthConfig();
  if (!config) return null;
  const protectedStorage = createNativeSupabaseSecureStorage({
    getItemAsync: key => SecureStore.getItemAsync(key),
    setItemAsync: (key, value) => SecureStore.setItemAsync(key, value),
    deleteItemAsync: key => SecureStore.deleteItemAsync(key),
  });
  const client = createClient(config.url, config.publishableKey, {
    auth: {
      storage: protectedStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  });
  const lifecycle = createNativeAuthForegroundLifecycle(
    AppState, client.auth, invalidateLocalAdmission, onRefreshFailure,
  );
  // Expose Auth only. Do not return the Supabase Data API client.
  return Object.freeze({
    auth: client.auth,
    start: lifecycle.start,
    stop: lifecycle.stop,
  });
}
