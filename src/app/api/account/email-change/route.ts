import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  hasRecentRenderLabTotpStepUp,
  isRenderLabMfaEnrolled,
  isRenderLabMfaFactorStateSupported,
} from "@/lib/auth/mfa-assurance";
import { getSupabaseAuthConfig } from "@/lib/supabase/config";
import {
  createRequestSupabaseClient,
  getFreshCurrentRenderLabAuthentication,
} from "@/lib/supabase/server";

const EMAIL_MAX_LENGTH = 254;

function normalizedEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const email = value.trim();
  if (!email || email.length > EMAIL_MAX_LENGTH || /\s/.test(email)) return null;
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1 || !email.slice(at + 1).includes(".")) return null;
  return email;
}

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

function providerFailure(code: string | undefined) {
  if (code === "over_email_send_rate_limit") {
    return errorResponse("email_change_rate_limited", "Email change is temporarily rate limited. Try again shortly.", 429);
  }
  if (code === "email_address_invalid") {
    return errorResponse("email_change_invalid_email", "Enter a valid email address.", 400);
  }
  if (code === "email_exists" || code === "user_already_exists" || code === "identity_already_exists") {
    return errorResponse("email_change_email_unavailable", "That email address cannot be used.", 409);
  }
  if (code === "insufficient_aal") {
    return errorResponse("email_change_mfa_required", "Authenticator verification is required before changing the sign-in email.", 403);
  }
  return errorResponse("email_change_failed", "Email change could not be started. Try again.", 400);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("email_change_invalid_request", "Email change request is invalid.", 400);
  }

  if (!body || typeof body !== "object") {
    return errorResponse("email_change_invalid_request", "Email change request is invalid.", 400);
  }

  const nextEmail = normalizedEmail("email" in body ? body.email : null);
  if (!nextEmail) {
    return errorResponse("email_change_invalid_email", "Enter a valid email address.", 400);
  }

  const authentication = await getFreshCurrentRenderLabAuthentication(request);
  if (!authentication?.identity.email) {
    return errorResponse("email_change_auth_required", "Sign in to change the sign-in email.", 401);
  }

  if (!isRenderLabMfaFactorStateSupported(authentication.assurance)) {
    return errorResponse("email_change_mfa_state_unsupported", "Authenticator state is inconsistent. Email change is unavailable until it is resolved.", 409);
  }

  if (nextEmail.toLowerCase() === authentication.identity.email.trim().toLowerCase()) {
    return errorResponse("email_change_same_email", "Enter an email address different from the current sign-in email.", 400);
  }

  if (isRenderLabMfaEnrolled(authentication.assurance)) {
    if (!hasRecentRenderLabTotpStepUp(authentication.assurance)) {
      return errorResponse("email_change_mfa_required", "Recent authenticator verification is required before changing the sign-in email.", 403);
    }
  } else {
    const currentPassword = "currentPassword" in body && typeof body.currentPassword === "string"
      ? body.currentPassword
      : "";
    if (!currentPassword) {
      return errorResponse("email_change_current_password_required", "Enter the current password to continue.", 400);
    }

    const config = getSupabaseAuthConfig();
    if (!config) {
      return errorResponse("email_change_unavailable", "Email change is unavailable in this runtime.", 503);
    }

    const verifier = createClient(config.url, config.publishableKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
    const { error: verificationError } = await verifier.auth.signInWithPassword({
      email: authentication.identity.email,
      password: currentPassword,
    });
    if (verificationError) {
      return errorResponse("email_change_current_password_invalid", "Current password could not be verified.", 403);
    }
    await verifier.auth.signOut({ scope: "local" });
  }

  const supabase = await createRequestSupabaseClient(request.headers.get("authorization"));
  if (!supabase) {
    return errorResponse("email_change_unavailable", "Email change is unavailable in this runtime.", 503);
  }

  const { error } = await supabase.auth.updateUser({ email: nextEmail });
  if (error) return providerFailure(error.code);

  return NextResponse.json({
    ok: true,
    pendingEmail: nextEmail,
    message: "Confirm the change from both the current and new email inboxes. The current sign-in email remains active until both confirmations succeed.",
  });
}
