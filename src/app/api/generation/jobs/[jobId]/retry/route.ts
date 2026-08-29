import { NextResponse } from "next/server";
import { getCurrentRenderLabAccount } from "@/lib/supabase/server";
import { retryGeneration } from "@/server/generation/retry-generation";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  const account = await getCurrentRenderLabAccount();
  if (!account) {
    return NextResponse.json(
      { ok: false, error: { code: "authentication_required", message: "Sign in to retry your generation jobs." } },
      { status: 401 },
    );
  }

  try {
    const result = await retryGeneration(account.id, jobId);
    if (!result.ok) {
      const status = result.error.code === "job_not_found"
        ? 404
        : result.error.code === "retry_not_available"
          ? 409
          : result.error.code === "generation_backend_unavailable"
            ? 503
            : 502;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json(result, { status: 202 });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "generation_backend_unavailable",
          message: "Retry could not be prepared right now. Try again shortly.",
        },
      },
      { status: 503 },
    );
  }
}
