import { NextResponse } from "next/server";
import { isMediaUploadMimeType, maxMediaUploadBytes } from "@/lib/api/media-upload-contract";
import { getCurrentRenderLabAccount } from "@/lib/supabase/server";
import { getMediaAsset, getMediaAssetContentUrl } from "@/server/media/media-assets";

export async function GET(
  request: Request,
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
    if (new URL(request.url).searchParams.get("source") === "1") {
      if (!isMediaUploadMimeType(asset.mime_type)) {
        return NextResponse.json({ error: "Media is not a supported editing source." }, { status: 415 });
      }
      const object = await fetch(url, { cache: "no-store", redirect: "error", signal: request.signal });
      const size = Number(object.headers.get("content-length"));
      if (!object.ok || !object.body || !Number.isSafeInteger(size) || size <= 0 || size > maxMediaUploadBytes
        || object.headers.get("content-type") !== asset.mime_type) {
        await object.body?.cancel();
        return NextResponse.json({ error: "Media source is unavailable." }, { status: 502 });
      }
      return new Response(object.body, {
        headers: {
          "Content-Type": asset.mime_type,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    const response = NextResponse.redirect(url, 302);
    response.headers.set("Cache-Control", "private, max-age=240");
    return response;
  } catch (error) {
    if (new URL(request.url).searchParams.get("source") === "1") {
      return NextResponse.json({ error: "Media source is unavailable." }, { status: 502 });
    }
    return NextResponse.json({ code: "media_unavailable", error: "Media content is unavailable." }, { status: 503 });
  }
}
