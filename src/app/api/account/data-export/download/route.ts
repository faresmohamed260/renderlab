import { NextResponse } from "next/server";
import { isRenderLabMfaChallengeRequired } from "@/lib/auth/mfa-assurance";
import { getFreshCurrentRenderLabAuthentication } from "@/lib/supabase/server";
import { accountExportDownloadUrl } from "@/server/account/account-data-lifecycle";

export async function GET() {
  const authentication = await getFreshCurrentRenderLabAuthentication();
  if (!authentication) {
    return NextResponse.json({ ok: false, error: { code: "authentication_required" } }, { status: 401 });
  }
  if (isRenderLabMfaChallengeRequired(authentication.assurance)) {
    return NextResponse.json({ ok: false, error: { code: "mfa_required" } }, { status: 403 });
  }

  try {
    const url = await accountExportDownloadUrl(authentication.identity.id);
    if (!url) {
      return NextResponse.json({ ok: false, error: { code: "account_export_not_ready" } }, { status: 404 });
    }
    const response = NextResponse.redirect(url, 302);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    return NextResponse.json({ ok: false, error: { code: "account_export_unavailable" } }, { status: 503 });
  }
}
