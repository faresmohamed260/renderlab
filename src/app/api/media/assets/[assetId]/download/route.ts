import { NextResponse } from "next/server";
import { getCurrentRenderLabAccount } from "@/lib/supabase/server";
import { getMediaAsset, getMediaAssetDownloadUrl } from "@/server/media/media-assets";

export async function GET(
  _request: Request,
  context: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await context.params;
  const account = await getCurrentRenderLabAccount();
  if (!account) return NextResponse.json({ error: "Sign in to access your RenderLab media." }, { status: 401 });

  try {
    const asset = await getMediaAsset(account.id, assetId);
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
