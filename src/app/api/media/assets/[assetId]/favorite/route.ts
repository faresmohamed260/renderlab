import { NextResponse } from "next/server";
import { getCurrentRenderLabAccount } from "@/lib/supabase/server";
import { publicMediaAsset, setMediaAssetFavorite } from "@/server/media/media-assets";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function invalidRequest() {
  return NextResponse.json(
    { ok: false, error: { code: "invalid_request", message: "A valid media asset ID is required." } },
    { status: 400 },
  );
}

function authenticationRequired() {
  return NextResponse.json(
    { ok: false, error: { code: "authentication_required", message: "Sign in to manage your RenderLab favorites." } },
    { status: 401 },
  );
}

async function updateFavorite(
  context: { params: Promise<{ assetId: string }> },
  favorite: boolean,
) {
  const { assetId } = await context.params;
  if (!uuidPattern.test(assetId)) return invalidRequest();

  const account = await getCurrentRenderLabAccount();
  if (!account) return authenticationRequired();

  try {
    const asset = await setMediaAssetFavorite(account.id, assetId, favorite);
    if (!asset) {
      return NextResponse.json(
        { ok: false, error: { code: "asset_not_found", message: "Media asset was not found." } },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, asset: publicMediaAsset(asset) });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "media_unavailable",
          message: error instanceof Error ? error.message : "Favorite state could not be updated.",
        },
      },
      { status: 503 },
    );
  }
}

export async function PUT(
  _request: Request,
  context: { params: Promise<{ assetId: string }> },
) {
  return updateFavorite(context, true);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ assetId: string }> },
) {
  return updateFavorite(context, false);
}
