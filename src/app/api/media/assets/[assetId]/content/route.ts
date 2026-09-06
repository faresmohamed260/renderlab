import { NextResponse } from "next/server";
import { getCurrentRenderLabAccount } from "@/lib/supabase/server";
import { getMediaAsset, getMediaAssetContentUrl } from "@/server/media/media-assets";

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
    const url = await getMediaAssetContentUrl(asset, "content");
    if (!url) return NextResponse.json({ error: "Media content is unavailable." }, { status: 404 });
    const response = NextResponse.redirect(url, 302);
    response.headers.set("Cache-Control", "private, max-age=240");
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Media content is unavailable." }, { status: 503 });
  }
}
