import { NextResponse } from "next/server";
import { validateMediaUploadTicketRequest } from "@/lib/api/media-upload-contract";
import { createMediaUploadTicket, isMediaUploadConfigured } from "@/server/media/media-uploads";

export async function GET() {
  return NextResponse.json({ available: isMediaUploadConfigured() });
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = validateMediaUploadTicketRequest(body);

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
    const ticket = await createMediaUploadTicket(parsed.request);
    return NextResponse.json({ ok: true, ticket }, { status: 201 });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "upload_backend_unavailable",
          message: "Library upload could not be prepared.",
        },
      },
      { status: 503 },
    );
  }
}
