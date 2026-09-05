import { NextResponse } from "next/server";
import { runRenderLabMaintenance } from "@/server/maintenance/renderlab-maintenance";

function authorized(request: Request) {
  const secret = process.env.RENDERLAB_MAINTENANCE_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function configuredLimit() {
  const requested = Number(process.env.RENDERLAB_MAINTENANCE_BATCH_LIMIT || 8);
  return Number.isFinite(requested) ? requested : 8;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const summary = await runRenderLabMaintenance(configuredLimit());
    return NextResponse.json({ ok: true, summary });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
