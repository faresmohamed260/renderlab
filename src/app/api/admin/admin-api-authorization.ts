import { NextResponse } from "next/server";
import { getCurrentRenderLabAdminAuthorization, type RenderLabAdminContext } from "@/server/admin/admin-auth";

export type RenderLabAdminApiAuthorization =
  | { ok: true; admin: RenderLabAdminContext }
  | { ok: false; response: NextResponse };

export async function authorizeRenderLabAdminApi(): Promise<RenderLabAdminApiAuthorization> {
  const authorization = await getCurrentRenderLabAdminAuthorization();
  if (authorization.status === "authorized") return { ok: true, admin: authorization.admin };
  if (authorization.status === "mfa_enrollment_required" || authorization.status === "mfa_challenge_required") {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: {
            code: "admin_mfa_required",
            message: "A verified authenticator and AAL2 session are required for Admin operations.",
          },
        },
        { status: 403 },
      ),
    };
  }
  return {
    ok: false,
    response: NextResponse.json(
      { ok: false, error: { code: "admin_access_required", message: "Active RenderLab admin access is required." } },
      { status: 403 },
    ),
  };
}
