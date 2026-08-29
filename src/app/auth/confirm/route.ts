import type { EmailOtpType, User } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { claimRenderLabBetaInvitation } from "@/server/account/account-access";
import {
  createPasswordRecoveryMarker,
  PASSWORD_RECOVERY_COOKIE_NAME,
  PASSWORD_RECOVERY_TTL_SECONDS,
} from "@/server/account/recovery-flow";

type RenderLabEmailFlow = Extract<EmailOtpType, "invite" | "recovery">;

function parseFlow(value: string | null): RenderLabEmailFlow | null {
  return value === "invite" || value === "recovery" ? value : null;
}

function redirect(request: NextRequest, path: string) {
  const response = NextResponse.redirect(new URL(path, request.url));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function verifiedIdentity(user: User | null) {
  if (!user || user.is_anonymous === true || typeof user.id !== "string") return null;
  return { id: user.id, email: typeof user.email === "string" ? user.email : null };
}

export async function GET(request: NextRequest) {
  const flow = parseFlow(request.nextUrl.searchParams.get("type"));
  const tokenHash = request.nextUrl.searchParams.get("token_hash")?.trim() || null;
  const code = request.nextUrl.searchParams.get("code")?.trim() || null;

  if (!flow || (!tokenHash && !code)) {
    return redirect(request, "/settings?auth=link_invalid");
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return redirect(request, "/settings?auth=unavailable");

  let user: User | null = null;
  if (tokenHash) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: flow });
    if (error) return redirect(request, "/settings?auth=link_invalid");
    user = data.user;
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return redirect(request, "/settings?auth=link_invalid");
    user = data.user;
  }

  const identity = verifiedIdentity(user);
  if (!identity) return redirect(request, "/settings?auth=link_invalid");

  if (flow === "invite") {
    try {
      const access = await claimRenderLabBetaInvitation(identity);
      if (!access || access.status !== "active") {
        return redirect(request, "/settings?auth=invitation_required");
      }
    } catch {
      return redirect(request, "/settings?auth=unavailable");
    }
    return redirect(request, "/settings?auth=invitation_accepted");
  }

  const marker = createPasswordRecoveryMarker(identity.id);
  if (!marker) return redirect(request, "/settings?auth=unavailable");

  const response = redirect(request, "/settings/password");
  response.cookies.set(PASSWORD_RECOVERY_COOKIE_NAME, marker, {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/settings/password",
    maxAge: PASSWORD_RECOVERY_TTL_SECONDS,
  });
  return response;
}
