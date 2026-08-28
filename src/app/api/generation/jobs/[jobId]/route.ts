import { NextResponse } from "next/server";
import { getCurrentRenderLabAccount } from "@/lib/supabase/server";
import { pollGenerationJob } from "@/server/generation/poll-generation";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
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
      { ok: false, error: { code: "authentication_required", message: "Sign in to access your generation jobs." } },
      { status: 401 },
    );
  }

  try {
    const job = await pollGenerationJob(account.id, jobId);
    if (!job) {
      return NextResponse.json(
        { ok: false, error: { code: "job_not_found", message: "Generation job was not found." } },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, job });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "generation_backend_unavailable",
          message: error instanceof Error ? error.message : "Generation status could not be loaded.",
        },
      },
      { status: 503 },
    );
  }
}
