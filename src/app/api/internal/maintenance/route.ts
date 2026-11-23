import { envString, maintenanceBatchLimit } from "../../../../lib/config/runtime-env.ts";
// ENT-004 same-origin exemption: server-secret internal route authenticated by a dedicated bearer secret.
import { NextResponse } from "next/server";
import { runAccountDataLifecycleMaintenance } from "@/server/account/account-data-lifecycle";
import { runRenderLabMaintenance } from "@/server/maintenance/renderlab-maintenance";

function authorizedMaintenance(request: Request) {
  const secret = envString("RENDERLAB_MAINTENANCE_SECRET")?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function authorizedCron(request: Request) {
  const secret = envString("CRON_SECRET")?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function configuredLimit() {
  return maintenanceBatchLimit();
}

async function runMaintenancePass() {
  const limit = configuredLimit();
  const summary = await runRenderLabMaintenance(limit);
  const accountDataLifecycle = await runAccountDataLifecycleMaintenance(Math.min(limit, 8));
  return { summary, accountDataLifecycle };
}

export async function POST(request: Request) {
  if (!authorizedMaintenance(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    return NextResponse.json({ ok: true, ...(await runMaintenancePass()) });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}

export async function GET(request: Request) {
  if (!authorizedCron(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    return NextResponse.json({ ok: true, ...(await runMaintenancePass()) });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
