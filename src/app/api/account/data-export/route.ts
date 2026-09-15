import { NextResponse } from "next/server";
import {
  getPublicAccountExport,
  processAccountExport,
  requestAccountExport,
} from "@/server/account/account-data-lifecycle";
import {
  isRenderLabMfaChallengeRequired,
} from "@/lib/auth/mfa-assurance";
import { getFreshCurrentRenderLabAuthentication } from "@/lib/supabase/server";

function unauthorized() {
  return NextResponse.json({ ok: false, error: { code: "authentication_required" } }, { status: 401 });
}

function mfaRequired() {
  return NextResponse.json({ ok: false, error: { code: "mfa_required" } }, { status: 403 });
}

export async function GET() {
  const authentication = await getFreshCurrentRenderLabAuthentication();
  if (!authentication) return unauthorized();
  if (isRenderLabMfaChallengeRequired(authentication.assurance)) return mfaRequired();

  try {
    return NextResponse.json({
      ok: true,
      export: await getPublicAccountExport(authentication.identity.id),
    });
  } catch {
    return NextResponse.json({ ok: false, error: { code: "account_export_unavailable" } }, { status: 503 });
  }
}

export async function POST() {
  const authentication = await getFreshCurrentRenderLabAuthentication();
  if (!authentication) return unauthorized();
  if (isRenderLabMfaChallengeRequired(authentication.assurance)) return mfaRequired();

  try {
    const row = await requestAccountExport(authentication.identity.id);
    if (row.status === "pending" || row.status === "failed") {
      await processAccountExport(row.id);
    }
    return NextResponse.json({
      ok: true,
      export: await getPublicAccountExport(authentication.identity.id),
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("account_deletion_in_progress")) {
      return NextResponse.json({ ok: false, error: { code: "account_deletion_in_progress" } }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: { code: "account_export_unavailable" } }, { status: 503 });
  }
}
