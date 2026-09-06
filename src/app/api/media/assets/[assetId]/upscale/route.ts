import { NextResponse } from "next/server";
import type { SubmitGenerationErrorCode } from "@/lib/api/generation-contract";
import { getCurrentRenderLabAccount } from "@/lib/supabase/server";
import { loadPreparedUpscaleImageSource } from "@/server/generation/upscale-source";
import { submitUpscaleImage } from "@/server/generation/submit-upscale";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function invalidRequest(message: string) {
  return NextResponse.json(
    { ok: false, error: { code: "invalid_request", message } },
    { status: 400 },
  );
}

function authenticationRequired() {
  return NextResponse.json(
    { ok: false, error: { code: "authentication_required", message: "Sign in to access your RenderLab media." } },
    { status: 401 },
  );
}

function assetNotFound() {
  return NextResponse.json(
    { ok: false, error: { code: "asset_not_found", message: "Media asset was not found." } },
    { status: 404 },
  );
}

function submissionStatus(code: SubmitGenerationErrorCode) {
  if (code === "generation_access_denied") return 403;
  if (code === "generation_disabled" || code === "generation_backend_unavailable") return 503;
  if (code === "generation_active_limit_reached" || code === "generation_rate_limit_reached") return 429;
  return 502;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await context.params;
  if (!uuidPattern.test(assetId)) return invalidRequest("A valid media asset ID is required.");

  const requestBody = await request.arrayBuffer();
  if (requestBody.byteLength > 0) {
    return invalidRequest("Upscale 2× does not accept browser-supplied settings.");
  }

  const account = await getCurrentRenderLabAccount();
  if (!account) return authenticationRequired();

  try {
    const source = await loadPreparedUpscaleImageSource(account.id, assetId);
    if (!source) return assetNotFound();

    const result = await submitUpscaleImage(account.id, source);
    if (!result.ok) {
      return NextResponse.json(result, { status: submissionStatus(result.error.code) });
    }
    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    if (error instanceof RangeError) {
      return NextResponse.json(
        { ok: false, error: { code: "upscale_not_available", message: error.message } },
        { status: 409 },
      );
    }
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "media_unavailable",
          message: "The source image could not be prepared for Upscale right now.",
        },
      },
      { status: 503 },
    );
  }
}
