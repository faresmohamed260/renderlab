// ENT-004 same-origin exemption: server-secret internal route authenticated by a dedicated bearer secret.
import { NextResponse } from "next/server";
import { supabaseRest } from "@/server/data/supabase-rest";
import { reconcileActiveNativeGenerations } from "@/server/generation/reconcile-generation";
import { normalizeDiagnosticEvent } from "@/server/observability/diagnostics";
import {
  recordGenerationDispatchHealthAlert,
  resolveGenerationDispatchHealthAlert,
  recordOldestActiveJobAlert,
  resolveOldestActiveJobAlert,
} from "@/server/observability/diagnostic-store";
import { sendOperationalAlertNotification } from "@/server/observability/operational-alert-notification";
import { readOldestActiveJobAge } from "@/server/observability/oldest-active-job-store";
import { dispatchHealthIsHealthy, type DispatchHealth } from "@/server/observability/dispatch-health";

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

export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!authorized(request)) {
    return NextResponse.json({ ok: false }, { status: 401, headers });
  }

  try {
    // Both measurements are read-only, bounded and aggregate-only. They are
    // deliberately independent: a healthy dispatch heartbeat does not settle
    // a finished owner's job if that owner never returns.
    const now = Date.now();
    const [health, oldestActiveJob] = await Promise.all([
      supabaseRest<DispatchHealth>("rpc/renderlab_generation_dispatch_health", { method: "GET" }),
      readOldestActiveJobAge(undefined, now),
    ]);
    const dispatchOk = dispatchHealthIsHealthy(health);
    const timestamp = new Date(now).toISOString();
    let notification = { attempted: 0, accepted: 0, failed: 0 };

    if (dispatchOk) {
      await resolveGenerationDispatchHealthAlert(timestamp);
    } else {
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
      notification = alert?.should_notify
        ? await sendOperationalAlertNotification(alert)
        : notification;
    }

    if (oldestActiveJob.warning) {
      // Alert persisted only: never send unapproved operational email for
      // a dormant owner. Distinct key and null code separate it from failed
      // dispatch and provider-auth qualification.
      await recordOldestActiveJobAlert(normalizeDiagnosticEvent({
        event: "generation.reconciliation",
        level: "warn",
        correlationId: "generation-oldest-active-job",
        phase: "stalled",
        status: oldestActiveJob.status ?? undefined,
        count: 1,
        durationMs: (oldestActiveJob.ageSeconds ?? 0) * 1000,
      }, timestamp));
    } else {
      await resolveOldestActiveJobAlert(timestamp);
    }

    return NextResponse.json({
      ok: dispatchOk,
      health: { ...health, oldestActiveJob },
      notification,
    }, { status: dispatchOk ? 200 : 503, headers });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503, headers });
  }
}
