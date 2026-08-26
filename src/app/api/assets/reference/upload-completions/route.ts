import { NextResponse } from "next/server";
import { validateReferenceCompletionRequest } from "@/lib/api/reference-upload-contract";
import { completeReferenceUpload, isReferenceUploadConfigured } from "@/server/media/reference-uploads";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = validateReferenceCompletionRequest(body);

  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  if (!isReferenceUploadConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "upload_backend_unavailable",
          message: "Reference upload storage is not configured.",
        },
      },
      { status: 503 },
    );
  }

  try {
    const source = await completeReferenceUpload(parsed.request);
    if (!source) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "upload_not_found",
            message: "Reference upload source was not found.",
          },
        },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, source });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "upload_verification_failed",
          message: "Reference upload could not be verified.",
        },
      },
      { status: 409 },
    );
  }
}
