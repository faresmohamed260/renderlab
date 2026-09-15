import { NextRequest, NextResponse } from "next/server";
import {
  getRenderLabAccountAvatarReadUrl,
  getRenderLabAccountProfile,
  removeRenderLabAccountAvatar,
  replaceRenderLabAccountAvatar,
  type RenderLabAvatarCrop,
} from "@/server/account/account-profile";
import { getRenderLabProfileRequestOwner } from "@/server/account/account-profile-request";

function accessError(result: Extract<Awaited<ReturnType<typeof getRenderLabProfileRequestOwner>>, { ok: false }>) {
  return NextResponse.json({ ok: false, error: { code: result.code } }, { status: result.status });
}

function avatarError(error: unknown) {
  const code = error instanceof Error ? error.message : "account_profile_unavailable";
  if (code === "avatar_file_too_large") {
    return NextResponse.json({ ok: false, error: { code } }, { status: 413 });
  }
  if (
    code === "avatar_type_unsupported"
    || code === "avatar_animation_unsupported"
    || code === "avatar_image_invalid"
    || code === "avatar_dimensions_invalid"
    || code === "avatar_crop_invalid"
  ) {
    return NextResponse.json({ ok: false, error: { code } }, { status: 400 });
  }
  if (code === "account_deletion_in_progress") {
    return NextResponse.json({ ok: false, error: { code } }, { status: 409 });
  }
  return NextResponse.json({ ok: false, error: { code: "account_profile_unavailable" } }, { status: 503 });
}

function parseCrop(value: FormDataEntryValue | null): Partial<RenderLabAvatarCrop> | null {
  if (value === null || value === "") return null;
  if (typeof value !== "string") throw new Error("avatar_crop_invalid");
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("avatar_crop_invalid");
  const record = parsed as Record<string, unknown>;
  if (Object.keys(record).some((key) => !["centerX", "centerY", "zoom"].includes(key))) {
    throw new Error("avatar_crop_invalid");
  }
  return {
    centerX: Number(record.centerX),
    centerY: Number(record.centerY),
    zoom: Number(record.zoom),
  };
}

export async function GET() {
  const owner = await getRenderLabProfileRequestOwner();
  if (!owner.ok) return accessError(owner);

  try {
    const url = await getRenderLabAccountAvatarReadUrl(owner.ownerId);
    if (!url) return NextResponse.json({ ok: false, error: { code: "avatar_not_found" } }, { status: 404 });
    const response = NextResponse.redirect(url, 307);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    return NextResponse.json({ ok: false, error: { code: "account_profile_unavailable" } }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const owner = await getRenderLabProfileRequestOwner();
  if (!owner.ok) return accessError(owner);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: { code: "avatar_request_invalid" } }, { status: 400 });
  }

  const image = form.get("image");
  if (!(image instanceof File)) {
    return NextResponse.json({ ok: false, error: { code: "avatar_request_invalid" } }, { status: 400 });
  }

  try {
    const crop = parseCrop(form.get("crop"));
    const profile = await replaceRenderLabAccountAvatar(owner.ownerId, {
      bytes: new Uint8Array(await image.arrayBuffer()),
      contentType: image.type,
      crop,
    });
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ ok: false, error: { code: "avatar_crop_invalid" } }, { status: 400 });
    }
    return avatarError(error);
  }
}

export async function DELETE() {
  const owner = await getRenderLabProfileRequestOwner();
  if (!owner.ok) return accessError(owner);

  try {
    return NextResponse.json({ ok: true, profile: await removeRenderLabAccountAvatar(owner.ownerId) });
  } catch (error) {
    if (error instanceof Error && error.message === "avatar_purge_pending") {
      return NextResponse.json(
        { ok: true, profile: await getRenderLabAccountProfile(owner.ownerId), cleanupPending: true },
        { status: 202 },
      );
    }
    return avatarError(error);
  }
}
