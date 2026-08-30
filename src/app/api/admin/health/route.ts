import { NextResponse } from "next/server";
import { getCurrentRenderLabAdmin } from "@/server/admin/admin-auth";
import {
  AdminOperationError,
  getAdminHealth,
} from "@/server/admin/admin-operations";

function denied() {
  return NextResponse.json(
    { ok: false, error: { code: "admin_access_required", message: "Active RenderLab admin access is required." } },
    { status: 403 },
  );
}

export async function GET() {
  const admin = await getCurrentRenderLabAdmin();
  if (!admin) return denied();

  try {
    return NextResponse.json({ ok: true, health: await getAdminHealth(admin.identity.id) });
  } catch (error) {
    const status = error instanceof AdminOperationError && error.code === "admin_access_required" ? 403 : 503;
    const code = status === 403 ? "admin_access_required" : "admin_backend_unavailable";
    const message = status === 403
      ? "Active RenderLab admin access is required."
      : "Product health is temporarily unavailable.";
    return NextResponse.json({ ok: false, error: { code, message } }, { status });
  }
}
