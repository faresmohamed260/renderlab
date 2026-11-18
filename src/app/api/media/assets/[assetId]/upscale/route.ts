import { enforceSameOriginMutation } from "@/server/security/same-origin-mutation";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  context: { params: Promise<{ assetId: string }> },
) {
  const originFailure = enforceSameOriginMutation(request);
  if (originFailure) return originFailure;
  await context.params;
  return NextResponse.json(
    { ok: false, error: { code: "feature_retired", message: "Upscale is no longer available." } },
    { status: 410 },
  );
}
