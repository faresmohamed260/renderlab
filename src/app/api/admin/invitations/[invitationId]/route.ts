import { NextResponse } from "next/server";
import { getCurrentRenderLabAdmin } from "@/server/admin/admin-auth";
import {
  AdminOperationError,
  revokeAdminInvitation,
} from "@/server/admin/admin-operations";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function denied() {
  return NextResponse.json(
    { ok: false, error: { code: "admin_access_required", message: "Active RenderLab admin access is required." } },
    { status: 403 },
  );
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ invitationId: string }> },
) {
  const admin = await getCurrentRenderLabAdmin();
  if (!admin) return denied();

  const { invitationId } = await context.params;
  if (!uuidPattern.test(invitationId)) {
    return NextResponse.json(
      { ok: false, error: { code: "invalid_request", message: "A valid invitation ID is required." } },
      { status: 400 },
    );
  }

  try {
    await revokeAdminInvitation(invitationId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AdminOperationError && error.code === "invitation_not_found") {
      return NextResponse.json(
        { ok: false, error: { code: error.code, message: error.message } },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { ok: false, error: { code: "admin_backend_unavailable", message: "The invitation could not be revoked right now." } },
      { status: 503 },
    );
  }
}
