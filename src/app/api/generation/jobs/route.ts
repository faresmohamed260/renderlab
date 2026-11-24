import { enforceSameOriginMutation } from "@/server/security/same-origin-mutation";
import { NextResponse } from "next/server";
import { type SubmitGenerationErrorCode } from "@/lib/api/generation-contract";
import { generationApiSchemas } from "@/lib/api/generation-api-schemas";
import { resolveCreativeOperation } from "@/lib/capabilities/generation";
import { recordGenerationMetric } from "@/server/observability/generation-metrics";
import { getCurrentRenderLabAccount } from "@/lib/supabase/server";
import { isFiboGenerationAvailable, isFiboMaskGenerationAvailable, isFiboAutoVglAvailable, isGenerationBackendConfigured, submitGeneration } from "@/server/generation/submit-generation";

export const maxDuration = 60;

function submissionStatus(code: SubmitGenerationErrorCode) {
  if (code === "invalid_request") return 400;
  if (code === "generation_access_denied") return 403;
  if (code === "generation_disabled" || code === "generation_backend_unavailable") return 503;
  if (code === "generation_active_limit_reached" || code === "generation_rate_limit_reached") return 429;
  if (code === "generation_idempotency_conflict") return 409;
  if (code === "generation_idempotency_unavailable" || code === "generation_acceptance_unconfirmed") return 503;
  return 502;
}

export async function GET() {
  return NextResponse.json({
    available: isGenerationBackendConfigured(),
    ...(isFiboGenerationAvailable() ? { fiboAvailable: true } : {}),
    ...(isFiboMaskGenerationAvailable() ? { fiboMaskAvailable: true } : {}),
    ...(isFiboAutoVglAvailable() ? { fiboAutoVglAvailable: true } : {}),
  });
}

export async function POST(request: Request) {
  const metricStartedAt = Date.now();
  let metricOperation = "unknown";
  let metricOutcome = "error";
  try {
  const originFailure = enforceSameOriginMutation(request);
  if (originFailure) { metricOutcome = "rejected"; return originFailure; }
  const body: unknown = await request.json().catch(() => null);
  const parsed = generationApiSchemas.request.parse(body);

  if (!parsed.ok) {
    metricOutcome = "rejected";
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }
  // Metric derivation must not reject a request, including mocked/parser-skew cases.
  try { metricOperation = resolveCreativeOperation(parsed.request); } catch { /* observe-only */ }

  const account = await getCurrentRenderLabAccount();
  if (!account) {
    metricOutcome = "rejected";
    return NextResponse.json(
      { ok: false, error: { code: "authentication_required", message: "Sign in to generate and save private media." } },
      { status: 401 },
    );
  }

  // An explicitly supplied intent key must be a bounded opaque ASCII token.
  // Missing keys retain the legacy API; malformed keys are rejected before SQL.
  const key = request.headers.get("Idempotency-Key");
  if (key !== null && !/^[A-Za-z0-9_-]{16,128}$/.test(key)) {
    metricOutcome = "rejected";
    return NextResponse.json(
      { ok: false, error: { code: "invalid_request", message: "Idempotency-Key must be a 16–128 character opaque ASCII token." } },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const result = await submitGeneration(account.id, parsed.request, key ?? undefined);

  if (!result.ok) {
    metricOutcome = "rejected";
    return NextResponse.json(result, {
      status: submissionStatus(result.error.code),
      headers: { "Cache-Control": "private, no-store", ...(result.error.code === "generation_acceptance_unconfirmed"
        ? { "Retry-After": "3" } : {}) },
    });
  }

  metricOutcome = "accepted";
  return NextResponse.json(result, { status: 202, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    metricOutcome = error instanceof Error && error.name === "TimeoutError" ? "timeout" : "error";
    throw error;
  } finally {
    recordGenerationMetric({
      name: "renderlab_generation_submit_duration_seconds",
      labels: { operation: metricOperation, outcome: metricOutcome },
      value: Math.max(0, Date.now() - metricStartedAt) / 1000,
    });
  }
}
