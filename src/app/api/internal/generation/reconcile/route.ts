// ENT-004 same-origin exemption: server-secret internal route authenticated by a dedicated bearer secret.
import { NextResponse } from "next/server";
import { supabaseRest } from "@/server/data/supabase-rest";
import { reconcileActiveNativeGenerations } from "@/server/generation/reconcile-generation";
import { normalizeDiagnosticEvent } from "@/server/observability/diagnostics";
import {
  recordGenerationDispatchHealthAlert,
  resolveGenerationDispatchHealthAlert,
} from "@/server/observability/diagnostic-store";
import { sendOperationalAlertNotification } from "@/server/observability/operational-alert-notification";

function authorized(request: Request) {
  const secret = process.env.RENDERLAB_GENERATION_RECONCILER_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const summary = await reconcileActiveNativeGenerations(2);
    return NextResponse.json({ ok: true, summary });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}

type DispatchHealth = {
  oldestDueSeconds: number;
  expiredClaims: number;
  unresolved: number;
  scheduledHeartbeatAgeSeconds: number | null;
  scheduledHeartbeatMissing: boolean;
};

export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!authorized(request)) {
    return NextResponse.json({ ok: false }, { status: 401, headers });
  }

  try {
    const health = await supabaseRest<DispatchHealth>("rpc/renderlab_generation_dispatch_health", { method: "GET" });
    const ok = !health.scheduledHeartbeatMissing
      && health.oldestDueSeconds <= 180
      && health.expiredClaims === 0
      && health.unresolved === 0;
    const timestamp = new Date().toISOString();
    if (ok) {
      await resolveGenerationDispatchHealthAlert(timestamp);
      return NextResponse.json({ ok, health }, { status: 200, headers });
    }

    const code = health.scheduledHeartbeatMissing
      ? "generation_orchestration_stalled"
      : "reconciliation_failed";
    const alert = await recordGenerationDispatchHealthAlert(normalizeDiagnosticEvent({
      event: "generation.reconciliation",
      level: "warn",
      correlationId: "generation-dispatch-health",
      phase: "stalled",
      code,
      count: health.expiredClaims + health.unresolved,
      durationMs: Math.max(health.oldestDueSeconds, health.scheduledHeartbeatAgeSeconds ?? 0) * 1000,
    }, timestamp));
    const notification = alert?.should_notify
      ? await sendOperationalAlertNotification(alert)
      : { attempted: 0, accepted: 0, failed: 0 };
    return NextResponse.json({ ok: false, health, notification }, { status: 503, headers });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503, headers });
  }
}
