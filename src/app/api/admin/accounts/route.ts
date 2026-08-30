import { NextResponse } from "next/server";
import { getCurrentRenderLabAdmin } from "@/server/admin/admin-auth";
import {
  AdminOperationError,
  listAdminAccounts,
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
    return NextResponse.json({ ok: true, accounts: await listAdminAccounts() });
  } catch (error) {
    const message = error instanceof AdminOperationError
      ? error.message
      : "Admin accounts are temporarily unavailable.";
    return NextResponse.json(
      { ok: false, error: { code: "admin_backend_unavailable", message } },
      { status: 503 },
    );
  }
}
