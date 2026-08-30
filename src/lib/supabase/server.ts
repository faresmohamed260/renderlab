import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { getSupabaseAuthConfig } from "@/lib/supabase/config";
import {
  getRenderLabAccountAccess,
  isRenderLabAccessEnforcementEnabled,
} from "@/server/account/account-access";

export type RenderLabIdentity = {
  id: string;
  email: string | null;
};

export type RenderLabAccount = RenderLabIdentity;

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

function verifiedUserIdentity(user: User | null): RenderLabIdentity | null {
  if (!user || user.is_anonymous === true || typeof user.id !== "string") return null;
  return {
    id: user.id,
    email: typeof user.email === "string" ? user.email : null,
  };
}

export async function getFreshCurrentRenderLabIdentity(): Promise<RenderLabIdentity | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const requestHeaders = await headers();
  const token = bearerToken(requestHeaders.get("authorization"));
  const { data, error } = await supabase.auth.getUser(token ?? undefined);
  if (error) return null;
  return verifiedUserIdentity(data.user);
}

export async function getCurrentRenderLabIdentity(): Promise<RenderLabIdentity | null> {
  return getFreshCurrentRenderLabIdentity();
}

export async function getCurrentRenderLabAccount(): Promise<RenderLabAccount | null> {
  const identity = await getCurrentRenderLabIdentity();
  if (!identity) return null;
  if (!isRenderLabAccessEnforcementEnabled()) return identity;

  try {
    const access = await getRenderLabAccountAccess(identity.id);
    return access?.status === "active" ? identity : null;
  } catch {
    // Access enforcement is fail-closed when the server-side admission store is unavailable.
    return null;
  }
}
