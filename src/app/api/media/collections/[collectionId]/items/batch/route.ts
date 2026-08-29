import { NextResponse } from "next/server";
import { MEDIA_ASSET_BATCH_MAX_ITEMS } from "@/lib/api/media-assets-contract";
import type {
  BatchMediaCollectionMembershipRequest,
  BatchMediaCollectionMembershipResult,
} from "@/lib/api/media-collections-contract";
import { getCurrentRenderLabAccount } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/server/data/supabase-rest";
import {
  getMediaCollection,
  setResolvedMediaCollectionMembership,
} from "@/server/media/media-collections";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function invalidRequest(message: string) {
  return NextResponse.json(
    { ok: false, error: { code: "invalid_request", message } },
    { status: 400 },
  );
}

function authenticationRequired() {
  return NextResponse.json(
    { ok: false, error: { code: "authentication_required", message: "Sign in to manage your RenderLab collections." } },
    { status: 401 },
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ collectionId: string }> },
) {
  const { collectionId } = await context.params;
  if (!uuidPattern.test(collectionId)) return invalidRequest("A valid collection ID is required.");

  const account = await getCurrentRenderLabAccount();
  if (!account) return authenticationRequired();
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: { code: "media_unavailable", message: "Collections are unavailable." } },
      { status: 503 },
    );
  }

  let body: BatchMediaCollectionMembershipRequest;
  try {
    body = await request.json() as BatchMediaCollectionMembershipRequest;
  } catch {
    return invalidRequest("A JSON request body is required.");
  }

  if (!body || !Array.isArray(body.assetIds)) {
    return invalidRequest("assetIds must be an array of media asset IDs.");
  }
  if (typeof body.containsAsset !== "boolean") {
    return invalidRequest("containsAsset must be a boolean target state.");
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

  let collection;
  try {
    collection = await getMediaCollection(account.id, collectionId);
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "media_unavailable", message: "Collection membership could not be updated." } },
      { status: 503 },
    );
  }
  if (!collection) {
    return NextResponse.json(
      { ok: false, error: { code: "collection_not_found", message: "Collection was not found." } },
      { status: 404 },
    );
  }

  const assetIds = [...new Set(body.assetIds)];
  const results: BatchMediaCollectionMembershipResult[] = [];

  for (const assetId of assetIds) {
    try {
      const result = await setResolvedMediaCollectionMembership(
        account.id,
        collection,
        assetId,
        body.containsAsset,
      );
      if (!result.ok) {
        results.push({
          assetId,
          ok: false,
          error: { code: "asset_not_found", message: "Media asset was not found." },
        });
        continue;
      }
      results.push({ assetId, ok: true, containsAsset: body.containsAsset });
    } catch {
      results.push({
        assetId,
        ok: false,
        error: { code: "media_unavailable", message: "Collection membership could not be updated." },
      });
    }
  }

  const succeeded = results.filter((result) => result.ok).length;
  return NextResponse.json({
    ok: true,
    collectionId,
    containsAsset: body.containsAsset,
    results,
    summary: {
      requested: results.length,
      succeeded,
      failed: results.length - succeeded,
    },
  });
}
