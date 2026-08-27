import { NextResponse } from "next/server";
import { parseGenerationRequest } from "@/lib/api/generation-contract";
import { getCurrentRenderLabAccount } from "@/lib/supabase/server";
import { isGenerationBackendConfigured, submitGeneration } from "@/server/generation/submit-generation";

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

  const account = await getCurrentRenderLabAccount();
  if (!account) {
    return NextResponse.json(
      { ok: false, error: { code: "authentication_required", message: "Sign in to generate and save private media." } },
      { status: 401 },
    );
  }

  const result = await submitGeneration(account.id, parsed.request);

  if (!result.ok) {
    const status = result.error.code === "generation_backend_unavailable" ? 503 : 502;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result, { status: 202 });
}
