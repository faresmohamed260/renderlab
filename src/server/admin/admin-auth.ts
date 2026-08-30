import {
  getFreshCurrentRenderLabIdentity,
  type RenderLabIdentity,
} from "@/lib/supabase/server";
import {
  getRenderLabAccountAccess,
  type RenderLabAccountAccess,
} from "@/server/account/account-access";

export type RenderLabAdminContext = {
  identity: RenderLabIdentity;
  access: RenderLabAccountAccess;
};

export async function getCurrentRenderLabAdmin(): Promise<RenderLabAdminContext | null> {
  const identity = await getFreshCurrentRenderLabIdentity();
  if (!identity) return null;

  try {
    const access = await getRenderLabAccountAccess(identity.id);
    if (!access || access.status !== "active" || access.role !== "admin") return null;
    return { identity, access };
  } catch {
    return null;
  }
}
