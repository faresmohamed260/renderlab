import { NextResponse } from "next/server";
import { authorizeRenderLabAdminApi } from "@/app/api/admin/admin-api-authorization";
import { AdminOperationError, listAdminAccounts } from "@/server/admin/admin-operations";

export async function GET() {
  const authorization = await authorizeRenderLabAdminApi();
  if (!authorization.ok) return authorization.response;

  try {
    return NextResponse.json({ ok: true, accounts: await listAdminAccounts() });
  } catch (error) {
    const message = error instanceof AdminOperationError ? error.message : "Admin accounts are temporarily unavailable.";
    return NextResponse.json(
      { ok: false, error: { code: "admin_backend_unavailable", message } },
      { status: 503 },
    );
  }
}
