import { NextResponse } from "next/server";
import type { RunAgainGenerationErrorCode } from "@/lib/api/generation-run-again-contract";
import { getCurrentRenderLabIdentity } from "@/lib/supabase/server";
import { runAgainGeneration } from "@/server/generation/run-again-generation";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function runAgainStatus(code: RunAgainGenerationErrorCode) {
  if (code === "job_not_found") return 404;
  if (code === "run_again_not_available") return 409;
  if (code === "generation_access_denied") return 403;
  if (code === "generation_disabled" || code === "generation_backend_unavailable") return 503;
  if (code === "generation_active_limit_reached" || code === "generation_rate_limit_reached") return 429;
  return 502;
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
      { ok: false, error: { code: "authentication_required", message: "Sign in to run your generation again." } },
      { status: 401 },
    );
  }

  try {
    const result = await runAgainGeneration(identity.id, jobId);
    if (!result.ok) return NextResponse.json(result, { status: runAgainStatus(result.error.code) });
    return NextResponse.json(result, { status: 202 });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "generation_backend_unavailable",
          message: "Run again could not be prepared right now. Try again shortly.",
        },
      },
      { status: 503 },
    );
  }
}
