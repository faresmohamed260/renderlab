import { NextResponse } from "next/server";
import {
  hasRecentRenderLabTotpStepUp,
  isRenderLabMfaEnrolled,
} from "@/lib/auth/mfa-assurance";
import { getFreshCurrentRenderLabAuthentication } from "@/lib/supabase/server";
import {
  beginAccountDeletion,
  getAccountDeletionLifecycle,
  verifyCurrentAccountPassword,
} from "@/server/account/account-data-lifecycle";
import { processAccountDeletionWithNotification } from "@/server/account/account-deletion-processor";

type DeleteAccountBody = {
  currentPassword?: unknown;
  confirmation?: unknown;
};

function publicLifecycle(row: Awaited<ReturnType<typeof getAccountDeletionLifecycle>>) {
  if (!row) return null;
  return {
    state: row.state,
    requestedAt: row.requested_at,
    quiescenceUntil: row.quiescence_until,
    retryCount: row.retry_count,
    lastErrorCode: row.last_error_code,
  };
}

function unauthorized() {
  return NextResponse.json({ ok: false, error: { code: "authentication_required" } }, { status: 401 });
}

export async function GET() {
  const authentication = await getFreshCurrentRenderLabAuthentication();
  if (!authentication) return unauthorized();
  try {
    return NextResponse.json({
      ok: true,
      deletion: publicLifecycle(await getAccountDeletionLifecycle(authentication.identity.id)),
    });
  } catch {
    return NextResponse.json({ ok: false, error: { code: "account_deletion_unavailable" } }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const authentication = await getFreshCurrentRenderLabAuthentication();
  if (!authentication) return unauthorized();

  let body: DeleteAccountBody;
  try {
    body = await request.json() as DeleteAccountBody;
  } catch {
    return NextResponse.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
  }

  if (body.confirmation !== "DELETE" || typeof body.currentPassword !== "string" || body.currentPassword.length < 1) {
    return NextResponse.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
  }

  if (isRenderLabMfaEnrolled(authentication.assurance)
      && !hasRecentRenderLabTotpStepUp(authentication.assurance)) {
    return NextResponse.json({ ok: false, error: { code: "mfa_recent_step_up_required" } }, { status: 403 });
  }

  const email = authentication.identity.email;
  if (!email) {
    return NextResponse.json({ ok: false, error: { code: "password_reauthentication_unavailable" } }, { status: 409 });
  }

  try {
    const passwordVerified = await verifyCurrentAccountPassword(
      email,
      body.currentPassword,
      authentication.identity.id,
    );
    if (!passwordVerified) {
      return NextResponse.json({ ok: false, error: { code: "password_reauthentication_failed" } }, { status: 403 });
    }

    const lifecycle = await beginAccountDeletion(authentication.identity.id);
    const process = await processAccountDeletionWithNotification(authentication.identity.id);
    return NextResponse.json({
      ok: true,
      deletion: publicLifecycle(await getAccountDeletionLifecycle(authentication.identity.id) ?? lifecycle),
      process,
    }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("renderlab_last_active_admin")) {
      return NextResponse.json({ ok: false, error: { code: "last_active_admin" } }, { status: 409 });
    }
    if (message.includes("renderlab_account_not_found")) {
      return NextResponse.json({ ok: false, error: { code: "account_not_found" } }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: { code: "account_deletion_unavailable" } }, { status: 503 });
  }
}
