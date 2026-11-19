import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAuthConfig } from "@/lib/supabase/config";

export function createBrowserSupabaseClient() {
  const config = getSupabaseAuthConfig();
  if (!config) return null;
  return createBrowserClient(config.url, config.publishableKey);
}

export function createPasswordVerificationSupabaseClient() {
  const config = getSupabaseAuthConfig();
  if (!config) return null;
  return createClient(config.url, config.publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
