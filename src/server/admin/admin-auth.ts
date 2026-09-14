import {
  getFreshCurrentRenderLabAuthentication,
  type RenderLabIdentity,
} from "@/lib/supabase/server";
import { isRenderLabMfaEnrolled, type RenderLabMfaAssurance } from "@/lib/auth/mfa-assurance";
import {
  getRenderLabAccountAccess,
  type RenderLabAccountAccess,
} from "@/server/account/account-access";

export type RenderLabAdminContext = {
  identity: RenderLabIdentity;
  access: RenderLabAccountAccess;
  assurance: RenderLabMfaAssurance;
};

export type RenderLabAdminAuthorization =
  | { status: "authorized"; admin: RenderLabAdminContext }
  | {
      status: "mfa_enrollment_required" | "mfa_challenge_required";
      identity: RenderLabIdentity;
      access: RenderLabAccountAccess;
      assurance: RenderLabMfaAssurance;
    }
  | { status: "denied" };

export async function getCurrentRenderLabAdminAuthorization(): Promise<RenderLabAdminAuthorization> {
  const authentication = await getFreshCurrentRenderLabAuthentication();
  if (!authentication) return { status: "denied" };

  const { identity, assurance } = authentication;
  try {
    const access = await getRenderLabAccountAccess(identity.id);
    if (!access || access.status !== "active" || access.role !== "admin") return { status: "denied" };
    if (!isRenderLabMfaEnrolled(assurance)) {
      return { status: "mfa_enrollment_required", identity, access, assurance };
    }
    if (assurance.currentLevel !== "aal2") {
      return { status: "mfa_challenge_required", identity, access, assurance };
    }
    return { status: "authorized", admin: { identity, access, assurance } };
  } catch {
    return { status: "denied" };
  }
}

export async function getCurrentRenderLabAdmin(): Promise<RenderLabAdminContext | null> {
  const authorization = await getCurrentRenderLabAdminAuthorization();
  return authorization.status === "authorized" ? authorization.admin : null;
}
