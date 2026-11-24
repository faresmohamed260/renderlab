import { NextResponse } from "next/server";
import { maxReferenceUploadBytes, supportedReferenceMimeTypes, type ReferenceMimeType } from "@/lib/api/reference-upload-contract";
import { getCurrentRenderLabAccount } from "@/lib/supabase/server";
import { getReadyReferenceSource, getReferenceSourceContentUrl } from "@/server/media/reference-uploads";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  context: { params: Promise<{ sourceId: string }> },
) {
  const { sourceId } = await context.params;
  if (!uuidPattern.test(sourceId)) {
    return NextResponse.json({ error: "Reference source was not found." }, { status: 404 });
  }

  const account = await getCurrentRenderLabAccount();
  if (!account) return NextResponse.json({ error: "Sign in to access your RenderLab references." }, { status: 401 });

  try {
    const source = await getReadyReferenceSource(account.id, sourceId);
    if (!source) return NextResponse.json({ error: "Reference source was not found." }, { status: 404 });
    const url = await getReferenceSourceContentUrl(source);
    if (new URL(request.url).searchParams.get("source") === "1") {
      const size = Number(source.size_bytes);
      if (!supportedReferenceMimeTypes.includes(source.mime_type as ReferenceMimeType) || !Number.isSafeInteger(size) || size <= 0 || size > maxReferenceUploadBytes) {
        return NextResponse.json({ error: "Reference content is unavailable." }, { status: 415 });
      }
      const object = await fetch(url, { cache: "no-store", redirect: "error", signal: request.signal });
      if (!object.ok || !object.body || Number(object.headers.get("content-length")) !== size || object.headers.get("content-type") !== source.mime_type) {
        await object.body?.cancel();
        return NextResponse.json({ error: "Reference content is unavailable." }, { status: 502 });
      }
      return new Response(object.body, { headers: { "Content-Type": source.mime_type, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
    }
    const response = NextResponse.redirect(url, 302);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    return NextResponse.json({ error: "Reference content is unavailable." }, { status: 503 });
  }
}
