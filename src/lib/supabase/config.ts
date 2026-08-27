export type SupabaseAuthConfig = {
  url: string;
  publishableKey: string;
};

export function getSupabaseAuthConfig(): SupabaseAuthConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}

export function isSupabaseAuthConfigured() {
  return getSupabaseAuthConfig() !== null;
}
