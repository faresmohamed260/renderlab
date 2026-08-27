import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { getSupabaseAuthConfig } from "@/lib/supabase/config";

export type RenderLabAccount = {
  id: string;
  email: string | null;
};

export async function createServerSupabaseClient() {
  const config = getSupabaseAuthConfig();
  if (!config) return null;

  const cookieStore = await cookies();
  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot write cookies. The root proxy refreshes sessions.
        }
      },
    },
  });
}

function bearerToken(value: string | null) {
  if (!value) return null;
  const match = /^Bearer\s+(.+)$/i.exec(value.trim());
  return match?.[1]?.trim() || null;
}

export async function getCurrentRenderLabAccount(): Promise<RenderLabAccount | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const requestHeaders = await headers();
  const token = bearerToken(requestHeaders.get("authorization"));
  const { data, error } = await supabase.auth.getClaims(token ?? undefined);
  const claims = data?.claims;
  if (
    error
    || !claims
    || typeof claims.sub !== "string"
    || claims.role !== "authenticated"
    || claims.is_anonymous === true
  ) {
    return null;
  }

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
  };
}
