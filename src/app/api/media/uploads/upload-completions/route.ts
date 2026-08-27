import { NextResponse } from "next/server";
import { validateMediaUploadCompletionRequest } from "@/lib/api/media-upload-contract";
import { publicMediaAsset } from "@/server/media/media-assets";
import { completeMediaUpload, isMediaUploadConfigured } from "@/server/media/media-uploads";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = validateMediaUploadCompletionRequest(body);

  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  if (!isMediaUploadConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "upload_backend_unavailable",
          message: "Library upload storage is not configured.",
        },
      },
      { status: 503 },
    );
  }

  try {
    const asset = await completeMediaUpload(parsed.request);
    if (!asset) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "upload_not_found",
            message: "Library upload session was not found.",
          },
        },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, asset: publicMediaAsset(asset) });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "upload_verification_failed",
          message: "Library upload could not be verified.",
        },
      },
      { status: 409 },
    );
  }
}
