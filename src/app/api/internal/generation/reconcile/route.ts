import { NextResponse } from "next/server";
import { reconcileActiveNativeGenerations } from "@/server/generation/reconcile-generation";

function authorized(request: Request) {
  const secret = process.env.RENDERLAB_GENERATION_RECONCILER_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const summary = await reconcileActiveNativeGenerations(2);
    return NextResponse.json({ ok: true, summary });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
