import { NextResponse } from "next/server";
import { authorizeRenderLabAdminApi } from "@/app/api/admin/admin-api-authorization";
import {
  AdminSettingsError,
  getAdminGenerationSettings,
  updateAdminGenerationSettings,
  validateAdminGenerationSettings,
} from "@/server/admin/admin-settings";

function settingsFailure(error: unknown) {
  if (error instanceof AdminSettingsError && error.code === "invalid_request") {
    return NextResponse.json({ ok: false, error: { code: error.code, message: error.message } }, { status: 400 });
  }
  if (error instanceof AdminSettingsError && error.code === "admin_access_required") {
    return NextResponse.json(
      { ok: false, error: { code: "admin_access_required", message: "Active RenderLab admin access is required." } },
      { status: 403 },
    );
  }
  return NextResponse.json(
    { ok: false, error: { code: "admin_backend_unavailable", message: "Generation defaults are temporarily unavailable." } },
    { status: 503 },
  );
}

export async function GET() {
  const authorization = await authorizeRenderLabAdminApi();
  if (!authorization.ok) return authorization.response;
  try {
    return NextResponse.json({ ok: true, settings: await getAdminGenerationSettings() });
  } catch (error) {
    return settingsFailure(error);
  }
}

export async function PATCH(request: Request) {
  const authorization = await authorizeRenderLabAdminApi();
  if (!authorization.ok) return authorization.response;
  const { admin } = authorization;
  try {
    const body: unknown = await request.json().catch(() => null);
    const update = validateAdminGenerationSettings(body);
    const settings = await updateAdminGenerationSettings(admin.identity.id, update);
    return NextResponse.json({ ok: true, settings, message: "Global generation limits updated." });
  } catch (error) {
    return settingsFailure(error);
  }
}
