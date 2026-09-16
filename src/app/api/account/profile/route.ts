import { NextRequest, NextResponse } from "next/server";
import {
  getRenderLabAccountProfile,
  renderLabAccountProfilePolicy,
  updateRenderLabDisplayName,
} from "@/server/account/account-profile";
import { getRenderLabProfileRequestOwner } from "@/server/account/account-profile-request";

function accessError(result: Extract<Awaited<ReturnType<typeof getRenderLabProfileRequestOwner>>, { ok: false }>) {
  return NextResponse.json({ ok: false, error: { code: result.code } }, { status: result.status });
}

function profileError(error: unknown) {
  const code = error instanceof Error ? error.message : "account_profile_unavailable";
  if (code === "profile_display_name_invalid" || code === "profile_display_name_too_long") {
    return NextResponse.json({ ok: false, error: { code } }, { status: 400 });
  }
  if (code === "account_deletion_in_progress") {
    return NextResponse.json({ ok: false, error: { code } }, { status: 409 });
  }
  return NextResponse.json({ ok: false, error: { code: "account_profile_unavailable" } }, { status: 503 });
}

export async function GET() {
  const owner = await getRenderLabProfileRequestOwner();
  if (!owner.ok) return accessError(owner);

  try {
    return NextResponse.json({
      ok: true,
      profile: await getRenderLabAccountProfile(owner.ownerId),
      policy: renderLabAccountProfilePolicy,
    });
  } catch {
    return NextResponse.json({ ok: false, error: { code: "account_profile_unavailable" } }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  const owner = await getRenderLabProfileRequestOwner();
  if (!owner.ok) return accessError(owner);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: { code: "profile_request_invalid" } }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: { code: "profile_request_invalid" } }, { status: 400 });
  }
  const record = body as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(record, "displayName") || Object.keys(record).some((key) => key !== "displayName")) {
    return NextResponse.json({ ok: false, error: { code: "profile_request_invalid" } }, { status: 400 });
  }

  try {
    return NextResponse.json({
      ok: true,
      profile: await updateRenderLabDisplayName(owner.ownerId, record.displayName),
    });
  } catch (error) {
    return profileError(error);
  }
}
