import { NextResponse } from "next/server";
import {
  MEDIA_ASSET_BATCH_MAX_ITEMS,
  type BatchFavoriteMediaAssetResult,
  type BatchFavoriteMediaAssetsRequest,
} from "@/lib/api/media-assets-contract";
import { getCurrentRenderLabAccount } from "@/lib/supabase/server";
import { setMediaAssetFavorite } from "@/server/media/media-assets";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function invalidRequest(message: string) {
  return NextResponse.json(
    { ok: false, error: { code: "invalid_request", message } },
    { status: 400 },
  );
}

function authenticationRequired() {
  return NextResponse.json(
    { ok: false, error: { code: "authentication_required", message: "Sign in to manage your RenderLab favorites." } },
    { status: 401 },
  );
}

export async function POST(request: Request) {
  const account = await getCurrentRenderLabAccount();
  if (!account) return authenticationRequired();

  let body: BatchFavoriteMediaAssetsRequest;
  try {
    body = await request.json() as BatchFavoriteMediaAssetsRequest;
  } catch {
    return invalidRequest("A JSON request body is required.");
  }

  if (!body || !Array.isArray(body.assetIds)) {
    return invalidRequest("assetIds must be an array of media asset IDs.");
  }
  if (typeof body.favorite !== "boolean") {
    return invalidRequest("favorite must be a boolean target state.");
  }
  if (body.assetIds.length < 1) {
    return invalidRequest("Select at least one media asset to organize.");
  }
  if (body.assetIds.length > MEDIA_ASSET_BATCH_MAX_ITEMS) {
    return invalidRequest(`Batch organization supports at most ${MEDIA_ASSET_BATCH_MAX_ITEMS} media assets at a time.`);
  }
  if (body.assetIds.some((assetId) => typeof assetId !== "string" || !uuidPattern.test(assetId))) {
    return invalidRequest("Every batch media asset ID must be a valid UUID.");
  }

  const assetIds = [...new Set(body.assetIds)];
  const results: BatchFavoriteMediaAssetResult[] = [];

  for (const assetId of assetIds) {
    try {
      const asset = await setMediaAssetFavorite(account.id, assetId, body.favorite);
      if (!asset) {
        results.push({
          assetId,
          ok: false,
          error: { code: "asset_not_found", message: "Media asset was not found." },
        });
        continue;
      }
      results.push({ assetId, ok: true, favorite: body.favorite });
    } catch {
      results.push({
        assetId,
        ok: false,
        error: { code: "media_unavailable", message: "Favorite state could not be updated." },
      });
    }
  }

  const succeeded = results.filter((result) => result.ok).length;
  return NextResponse.json({
    ok: true,
    favorite: body.favorite,
    results,
    summary: {
      requested: results.length,
      succeeded,
      failed: results.length - succeeded,
    },
  });
}
