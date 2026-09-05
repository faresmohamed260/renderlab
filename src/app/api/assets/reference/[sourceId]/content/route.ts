import { NextResponse } from "next/server";
import { getCurrentRenderLabAccount } from "@/lib/supabase/server";
import { getReadyReferenceSource, getReferenceSourceContentUrl } from "@/server/media/reference-uploads";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
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
    return NextResponse.redirect(await getReferenceSourceContentUrl(source), 302);
  } catch {
    return NextResponse.json({ error: "Reference content is unavailable." }, { status: 503 });
  }
}
