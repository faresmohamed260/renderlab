import { NextRequest, NextResponse } from "next/server";
import { getFreshCurrentRenderLabAuthentication } from "@/lib/supabase/server";
import { getRenderLabAccountAccess } from "@/server/account/account-access";
import {
  getRenderLabAccountPreferences,
  resetRenderLabAccountPreferences,
  updateRenderLabAccountPreferences,
} from "@/server/account/account-preferences";

type RequestOwner =
  | { ok: true; ownerId: string }
  | {
      ok: false;
      status: 401 | 403 | 503;
      code: "authentication_required" | "renderlab_access_required" | "account_preferences_unavailable";
    };

async function getPreferenceRequestOwner(): Promise<RequestOwner> {
  const authentication = await getFreshCurrentRenderLabAuthentication();
  if (!authentication) return { ok: false, status: 401, code: "authentication_required" };
  try {
    const access = await getRenderLabAccountAccess(authentication.identity.id);
    if (!access) return { ok: false, status: 403, code: "renderlab_access_required" };
    return { ok: true, ownerId: authentication.identity.id };
  } catch {
    return { ok: false, status: 503, code: "account_preferences_unavailable" };
  }
}

function accessError(result: Extract<RequestOwner, { ok: false }>) {
  return NextResponse.json({ ok: false, error: { code: result.code } }, { status: result.status });
}

function preferenceError(error: unknown) {
  const code = error instanceof Error ? error.message : "account_preferences_unavailable";
  if (code === "account_preferences_invalid") {
    return NextResponse.json({ ok: false, error: { code } }, { status: 400 });
  }
  if (code === "account_deletion_in_progress") {
    return NextResponse.json({ ok: false, error: { code } }, { status: 409 });
  }
  return NextResponse.json({ ok: false, error: { code: "account_preferences_unavailable" } }, { status: 503 });
}

export async function GET() {
  const owner = await getPreferenceRequestOwner();
  if (!owner.ok) return accessError(owner);
  try {
    return NextResponse.json({ ok: true, preferences: await getRenderLabAccountPreferences(owner.ownerId) });
  } catch {
    return NextResponse.json({ ok: false, error: { code: "account_preferences_unavailable" } }, { status: 503 });
  }
}

export async function PUT(request: NextRequest) {
  const owner = await getPreferenceRequestOwner();
  if (!owner.ok) return accessError(owner);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: { code: "account_preferences_invalid" } }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: { code: "account_preferences_invalid" } }, { status: 400 });
  }
  const record = body as Record<string, unknown>;
  if (Object.keys(record).length !== 1 || !Object.prototype.hasOwnProperty.call(record, "create")) {
    return NextResponse.json({ ok: false, error: { code: "account_preferences_invalid" } }, { status: 400 });
  }

  try {
    return NextResponse.json({
      ok: true,
      preferences: await updateRenderLabAccountPreferences(owner.ownerId, record.create),
    });
  } catch (error) {
    return preferenceError(error);
  }
}

export async function DELETE() {
  const owner = await getPreferenceRequestOwner();
  if (!owner.ok) return accessError(owner);
  try {
    return NextResponse.json({ ok: true, preferences: await resetRenderLabAccountPreferences(owner.ownerId) });
  } catch (error) {
    return preferenceError(error);
  }
}
