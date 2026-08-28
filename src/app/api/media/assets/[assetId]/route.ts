import { NextResponse } from "next/server";
import {
  MEDIA_ASSET_DISPLAY_NAME_MAX_LENGTH,
  normalizeMediaAssetDisplayName,
  type RenameMediaAssetRequest,
} from "@/lib/api/media-assets-contract";
import { getCurrentRenderLabAccount } from "@/lib/supabase/server";
import { deleteMediaAsset, getMediaAsset, publicMediaAsset, renameMediaAsset } from "@/server/media/media-assets";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function invalidRequest(message: string) {
  return NextResponse.json(
    { ok: false, error: { code: "invalid_request", message } },
    { status: 400 },
  );
}

function authenticationRequired() {
  return NextResponse.json(
    { ok: false, error: { code: "authentication_required", message: "Sign in to access your RenderLab media." } },
    { status: 401 },
  );
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await context.params;
  if (!uuidPattern.test(assetId)) return invalidRequest("A valid media asset ID is required.");

  const account = await getCurrentRenderLabAccount();
  if (!account) return authenticationRequired();

  try {
    const asset = await getMediaAsset(account.id, assetId);
    if (!asset) {
      return NextResponse.json({ ok: false, error: { code: "asset_not_found", message: "Media asset was not found." } }, { status: 404 });
    }
    return NextResponse.json({ ok: true, asset: publicMediaAsset(asset) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { code: "media_unavailable", message: error instanceof Error ? error.message : "Media could not be loaded." } },
      { status: 503 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await context.params;
  if (!uuidPattern.test(assetId)) return invalidRequest("A valid media asset ID is required.");

  const account = await getCurrentRenderLabAccount();
  if (!account) return authenticationRequired();

  let body: RenameMediaAssetRequest;
  try {
    body = await request.json() as RenameMediaAssetRequest;
  } catch {
    return invalidRequest("A JSON request body is required.");
  }

  if (!body || typeof body.displayName !== "string") return invalidRequest("A media name is required.");

  const displayName = normalizeMediaAssetDisplayName(body.displayName);
  if (!displayName) return invalidRequest("A media name is required.");
  if (displayName.length > MEDIA_ASSET_DISPLAY_NAME_MAX_LENGTH) {
    return invalidRequest(`Media names may not exceed ${MEDIA_ASSET_DISPLAY_NAME_MAX_LENGTH} characters.`);
  }

  try {
    const asset = await renameMediaAsset(account.id, assetId, displayName);
    if (!asset) {
      return NextResponse.json({ ok: false, error: { code: "asset_not_found", message: "Media asset was not found." } }, { status: 404 });
    }
    return NextResponse.json({ ok: true, asset: publicMediaAsset(asset) });
  } catch (error) {
    if (error instanceof RangeError) return invalidRequest(error.message);
    return NextResponse.json(
      { ok: false, error: { code: "media_unavailable", message: error instanceof Error ? error.message : "Media could not be renamed." } },
      { status: 503 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await context.params;
  if (!uuidPattern.test(assetId)) return invalidRequest("A valid media asset ID is required.");

  const account = await getCurrentRenderLabAccount();
  if (!account) return authenticationRequired();

  try {
    const deletion = await deleteMediaAsset(account.id, assetId);
    if (!deletion) {
      return NextResponse.json({ ok: false, error: { code: "asset_not_found", message: "Media asset was not found." } }, { status: 404 });
    }

    return NextResponse.json(
      { ok: true, deleted: true, cleanupPending: deletion.cleanupPending },
      { status: deletion.cleanupPending ? 202 : 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { code: "media_unavailable", message: error instanceof Error ? error.message : "Media could not be deleted." } },
      { status: 503 },
    );
  }
}
