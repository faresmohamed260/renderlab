import { NextResponse } from "next/server";
import type { CancelGenerationErrorCode } from "@/lib/api/generation-cancel-contract";
import { getCurrentRenderLabIdentity } from "@/lib/supabase/server";
import { requestGenerationCancellation } from "@/server/generation/cancel-generation";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cancelStatus(code: CancelGenerationErrorCode) {
  if (code === "job_not_found") return 404;
  if (code === "cancel_not_available") return 409;
  return 503;
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  if (!uuidPattern.test(jobId)) {
    return NextResponse.json(
      { ok: false, error: { code: "invalid_request", message: "A valid generation job ID is required." } },
      { status: 400 },
    );
  }

  const identity = await getCurrentRenderLabIdentity();
  if (!identity) {
    return NextResponse.json(
      { ok: false, error: { code: "authentication_required", message: "Sign in to cancel your generation jobs." } },
      { status: 401 },
    );
  }

  try {
    const result = await requestGenerationCancellation(identity.id, jobId);
    if (!result.ok) {
      return NextResponse.json(result, { status: cancelStatus(result.error.code) });
    }
    return NextResponse.json(result, { status: result.job.status === "cancelled" ? 200 : 202 });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "generation_backend_unavailable",
          message: "Cancellation could not be processed right now. Refresh Activity and try again.",
        },
      },
      { status: 503 },
    );
  }
}
