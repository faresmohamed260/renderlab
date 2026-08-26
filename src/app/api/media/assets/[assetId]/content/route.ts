import { NextResponse } from "next/server";
import { getMediaAsset, getMediaAssetContentUrl } from "@/server/media/media-assets";

export async function GET(
  _request: Request,
  context: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await context.params;
  try {
    const asset = await getMediaAsset(assetId);
    if (!asset) return NextResponse.json({ error: "Media asset was not found." }, { status: 404 });
    const url = await getMediaAssetContentUrl(asset, "content");
    if (!url) return NextResponse.json({ error: "Media content is unavailable." }, { status: 404 });
    return NextResponse.redirect(url, 302);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Media content is unavailable." }, { status: 503 });
  }
}
