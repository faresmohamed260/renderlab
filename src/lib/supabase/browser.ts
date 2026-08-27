import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAuthConfig } from "@/lib/supabase/config";

export function createBrowserSupabaseClient() {
  const config = getSupabaseAuthConfig();
  if (!config) return null;
  return createBrowserClient(config.url, config.publishableKey);
}
