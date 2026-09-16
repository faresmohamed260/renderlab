import { isRenderLabMfaChallengeRequired } from "@/lib/auth/mfa-assurance";
import { getFreshCurrentRenderLabAuthentication } from "@/lib/supabase/server";
import { getRenderLabAccountAccess } from "@/server/account/account-access";

export type RenderLabProfileRequestOwner =
  | { ok: true; ownerId: string }
  | { ok: false; status: 401 | 403 | 503; code: "authentication_required" | "mfa_required" | "renderlab_access_required" | "account_profile_unavailable" };

export async function getRenderLabProfileRequestOwner(): Promise<RenderLabProfileRequestOwner> {
  const authentication = await getFreshCurrentRenderLabAuthentication();
  if (!authentication) return { ok: false, status: 401, code: "authentication_required" };
  if (isRenderLabMfaChallengeRequired(authentication.assurance)) {
    return { ok: false, status: 403, code: "mfa_required" };
  }

  try {
    const access = await getRenderLabAccountAccess(authentication.identity.id);
    if (!access) return { ok: false, status: 403, code: "renderlab_access_required" };
    return { ok: true, ownerId: authentication.identity.id };
  } catch {
    return { ok: false, status: 503, code: "account_profile_unavailable" };
  }
}
