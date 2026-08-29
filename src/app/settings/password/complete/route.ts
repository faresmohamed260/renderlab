import { NextRequest, NextResponse } from "next/server";
import { PASSWORD_RECOVERY_COOKIE_NAME } from "@/server/account/recovery-flow";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/settings?password=updated", request.url));
  response.headers.set("Cache-Control", "private, no-store");
  response.cookies.set(PASSWORD_RECOVERY_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/settings/password",
    maxAge: 0,
  });
  return response;
}
