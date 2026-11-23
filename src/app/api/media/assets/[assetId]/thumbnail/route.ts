import { NextResponse } from "next/server";
import { getCurrentRenderLabAccount } from "@/lib/supabase/server";
import { getMediaAsset, getMediaAssetContentUrl } from "@/server/media/media-assets";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  context: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await context.params;
  if (!uuidPattern.test(assetId)) return NextResponse.json({ error: "Media asset was not found." }, { status: 404 });
  const account = await getCurrentRenderLabAccount();
  if (!account) return NextResponse.json({ error: "Sign in to access your RenderLab media." }, { status: 401 });

  try {
    const asset = await getMediaAsset(account.id, assetId);
    if (!asset) return NextResponse.json({ error: "Media asset was not found." }, { status: 404 });
    const url = await getMediaAssetContentUrl(asset, "thumbnail");
    if (!url) return NextResponse.json({ error: "Media thumbnail is unavailable." }, { status: 404 });
    const response = NextResponse.redirect(url, 302);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    return NextResponse.json({ code: "media_unavailable", error: "Media thumbnail is unavailable." }, { status: 503 });
  }
}
