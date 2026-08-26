import { NextResponse } from "next/server";
import { getMediaAsset, publicMediaAsset } from "@/server/media/media-assets";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  context: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await context.params;
  if (!uuidPattern.test(assetId)) {
    return NextResponse.json({ ok: false, error: { code: "invalid_request", message: "A valid media asset ID is required." } }, { status: 400 });
  }

  try {
    const asset = await getMediaAsset(assetId);
    if (!asset) {
      return NextResponse.json({ ok: false, error: { code: "asset_not_found", message: "Media asset was not found." } }, { status: 404 });
    }
    return NextResponse.json({ ok: true, asset: publicMediaAsset(asset) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { code: "media_unavailable", message: error instanceof Error ? error.message : "Media could not be loaded." } },
      { status: 503 },
    );
  }
}
