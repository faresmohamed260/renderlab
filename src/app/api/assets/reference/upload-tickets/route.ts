import { NextResponse } from "next/server";
import { validateReferenceTicketRequest } from "@/lib/api/reference-upload-contract";
import { getCurrentRenderLabAccount } from "@/lib/supabase/server";
import { createReferenceUploadTicket, isReferenceUploadConfigured } from "@/server/media/reference-uploads";

export async function GET() {
  return NextResponse.json({ available: isReferenceUploadConfigured() });
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = validateReferenceTicketRequest(body);

  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const account = await getCurrentRenderLabAccount();
  if (!account) {
    return NextResponse.json(
      { ok: false, error: { code: "authentication_required", message: "Sign in to upload a reference image." } },
      { status: 401 },
    );
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
    const ticket = await createReferenceUploadTicket(account.id, parsed.request);
    return NextResponse.json({ ok: true, ticket }, { status: 201 });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "upload_backend_unavailable",
          message: "Reference upload could not be prepared.",
        },
      },
      { status: 503 },
    );
  }
}
