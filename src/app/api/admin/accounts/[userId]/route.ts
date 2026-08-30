import { NextResponse } from "next/server";
import type { AdminAccountUpdate } from "@/lib/api/admin-contract";
import { getCurrentRenderLabAdmin } from "@/server/admin/admin-auth";
import {
  AdminOperationError,
  updateAdminAccount,
} from "@/server/admin/admin-operations";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedKeys = new Set([
  "role",
  "status",
  "generationEnabled",
  "maxActiveJobs",
  "maxJobsPerHour",
]);

function denied() {
  return NextResponse.json(
    { ok: false, error: { code: "admin_access_required", message: "Active RenderLab admin access is required." } },
    { status: 403 },
  );
}

function invalid(message: string) {
  return NextResponse.json(
    { ok: false, error: { code: "invalid_request", message } },
    { status: 400 },
  );
}

function integerOrNull(value: unknown, min: number, max: number) {
  return value === null || (Number.isInteger(value) && Number(value) >= min && Number(value) <= max);
}

function parseUpdate(value: unknown): AdminAccountUpdate | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (!keys.length || keys.some((key) => !allowedKeys.has(key))) return null;

  if ("role" in record && record.role !== "member" && record.role !== "admin") return null;
  if ("status" in record && record.status !== "active" && record.status !== "suspended") return null;
  if (
    "generationEnabled" in record
    && record.generationEnabled !== null
    && typeof record.generationEnabled !== "boolean"
  ) return null;
  if ("maxActiveJobs" in record && !integerOrNull(record.maxActiveJobs, 1, 4)) return null;
  if ("maxJobsPerHour" in record && !integerOrNull(record.maxJobsPerHour, 1, 120)) return null;

  return record as AdminAccountUpdate;
}

function errorResponse(error: unknown) {
  if (!(error instanceof AdminOperationError)) {
    return NextResponse.json(
      { ok: false, error: { code: "admin_backend_unavailable", message: "The account could not be updated right now." } },
      { status: 503 },
    );
  }

  const status = error.code === "account_not_found"
    ? 404
    : error.code === "invalid_request"
      ? 400
      : error.code === "admin_access_required"
        ? 403
        : error.code === "self_lockout" || error.code === "last_active_admin"
          ? 409
          : 503;
  return NextResponse.json({ ok: false, error: { code: error.code, message: error.message } }, { status });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const admin = await getCurrentRenderLabAdmin();
  if (!admin) return denied();

  const { userId } = await context.params;
  if (!uuidPattern.test(userId)) return invalid("A valid RenderLab account ID is required.");

  const update = parseUpdate(await request.json().catch(() => null));
  if (!update) return invalid("The requested account update is invalid.");

  try {
    const account = await updateAdminAccount(admin.identity.id, userId, update);
    return NextResponse.json({ ok: true, account });
  } catch (error) {
    return errorResponse(error);
  }
}
