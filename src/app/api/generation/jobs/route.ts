import { NextResponse } from "next/server";
import { parseGenerationRequest, type SubmitGenerationErrorCode } from "@/lib/api/generation-contract";
import { getCurrentRenderLabIdentity } from "@/lib/supabase/server";
import { isGenerationBackendConfigured, submitGeneration } from "@/server/generation/submit-generation";

function submissionStatus(code: SubmitGenerationErrorCode) {
  if (code === "generation_access_denied") return 403;
  if (code === "generation_disabled" || code === "generation_backend_unavailable") return 503;
  if (code === "generation_active_limit_reached" || code === "generation_rate_limit_reached") return 429;
  return 502;
}

export async function GET() {
  return NextResponse.json({
    available: isGenerationBackendConfigured(),
  });
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = parseGenerationRequest(body);

  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const identity = await getCurrentRenderLabIdentity();
  if (!identity) {
    return NextResponse.json(
      { ok: false, error: { code: "authentication_required", message: "Sign in to generate and save private media." } },
      { status: 401 },
    );
  }

  const result = await submitGeneration(identity.id, parsed.request);

  if (!result.ok) {
    return NextResponse.json(result, { status: submissionStatus(result.error.code) });
  }

  return NextResponse.json(result, { status: 202 });
}
