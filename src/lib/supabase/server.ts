import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import {
  isRenderLabMfaChallengeRequired,
  normalizeRenderLabMfaAssurance,
  type RenderLabMfaAssurance,
} from "@/lib/auth/mfa-assurance";
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

export type RenderLabAuthenticationContext = {
  identity: RenderLabIdentity;
  assurance: RenderLabMfaAssurance;
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

function verifiedUserIdentity(user: User | null): RenderLabIdentity | null {
  if (!user || user.is_anonymous === true || typeof user.id !== "string") return null;
  return {
    id: user.id,
    email: typeof user.email === "string" ? user.email : null,
  };
}

async function currentRequestBearerToken() {
  const requestHeaders = await headers();
  return bearerToken(requestHeaders.get("authorization"));
}

export async function getFreshCurrentRenderLabIdentity(): Promise<RenderLabIdentity | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const token = await currentRequestBearerToken();
  const { data, error } = await supabase.auth.getUser(token ?? undefined);
  if (error) return null;
  return verifiedUserIdentity(data.user);
}

export async function getFreshCurrentRenderLabAuthentication(): Promise<RenderLabAuthenticationContext | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const token = await currentRequestBearerToken();
  const { data: userData, error: userError } = await supabase.auth.getUser(token ?? undefined);
  const identity = userError ? null : verifiedUserIdentity(userData.user);
  if (!identity) return null;

  const { data: assuranceData, error: assuranceError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel(token ?? undefined);
  if (assuranceError) return null;
  const assurance = normalizeRenderLabMfaAssurance(assuranceData);
  if (!assurance) return null;

  return { identity, assurance };
}

export async function getCurrentRenderLabMfaAssurance(): Promise<RenderLabMfaAssurance | null> {
  const authentication = await getFreshCurrentRenderLabAuthentication();
  return authentication?.assurance ?? null;
}

export async function getCurrentRenderLabIdentity(): Promise<RenderLabIdentity | null> {
  return getFreshCurrentRenderLabIdentity();
}

export async function getCurrentRenderLabAccount(): Promise<RenderLabAccount | null> {
  const authentication = await getFreshCurrentRenderLabAuthentication();
  if (!authentication) return null;
  if (isRenderLabMfaChallengeRequired(authentication.assurance)) return null;

  const { identity } = authentication;
  if (!isRenderLabAccessEnforcementEnabled()) return identity;

  try {
    const access = await getRenderLabAccountAccess(identity.id);
    return access?.status === "active" ? identity : null;
  } catch {
    // Access enforcement is fail-closed when the server-side admission store is unavailable.
    return null;
  }
}
