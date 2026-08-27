import { NextResponse } from "next/server";
import { getMediaAsset, getMediaAssetDownloadUrl } from "@/server/media/media-assets";

export async function GET(
  _request: Request,
  context: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await context.params;
  try {
    const asset = await getMediaAsset(assetId);
    if (!asset) return NextResponse.json({ error: "Media asset was not found." }, { status: 404 });
    const url = await getMediaAssetDownloadUrl(asset);
    const response = NextResponse.redirect(url, 302);
    response.headers.set("cache-control", "private, no-store");
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Media download is unavailable." },
      { status: 503 },
    );
  }
}
