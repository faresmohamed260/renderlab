import { NextResponse } from "next/server";
import type { AdminAccessRole } from "@/lib/api/admin-contract";
import { getCurrentRenderLabAdmin } from "@/server/admin/admin-auth";
import {
  AdminOperationError,
  createAdminInvitation,
} from "@/server/admin/admin-operations";

function denied() {
  return NextResponse.json(
    { ok: false, error: { code: "admin_access_required", message: "Active RenderLab admin access is required." } },
    { status: 403 },
  );
}

function errorResponse(error: unknown) {
  if (!(error instanceof AdminOperationError)) {
    return NextResponse.json(
      { ok: false, error: { code: "admin_backend_unavailable", message: "The invitation could not be recorded right now." } },
      { status: 503 },
    );
  }

  const status = error.code === "invalid_request"
    ? 400
    : error.code === "invitation_exists"
      ? 409
      : error.code === "admin_access_required"
        ? 403
        : 503;
  return NextResponse.json({ ok: false, error: { code: error.code, message: error.message } }, { status });
}

export async function POST(request: Request) {
  const admin = await getCurrentRenderLabAdmin();
  if (!admin) return denied();

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { ok: false, error: { code: "invalid_request", message: "Enter an invitation email and role." } },
      { status: 400 },
    );
  }

  const { email, role } = body as Record<string, unknown>;
  if (typeof email !== "string" || (role !== "member" && role !== "admin")) {
    return NextResponse.json(
      { ok: false, error: { code: "invalid_request", message: "Enter an invitation email and role." } },
      { status: 400 },
    );
  }

  try {
    const result = await createAdminInvitation({
      email,
      role: role as AdminAccessRole,
      redirectTo: `${new URL(request.url).origin}/settings`,
    });
    return NextResponse.json(
      { ok: true, invitation: result.invitation, message: result.deliveryMessage },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
