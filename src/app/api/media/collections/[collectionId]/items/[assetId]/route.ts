import { NextResponse } from "next/server";
import { getCurrentRenderLabAccount } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/server/data/supabase-rest";
import {
  publicMediaCollection,
  setMediaCollectionMembership,
} from "@/server/media/media-collections";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function invalidRequest() {
  return NextResponse.json(
    { ok: false, error: { code: "invalid_request", message: "Valid collection and media asset IDs are required." } },
    { status: 400 },
  );
}

function authenticationRequired() {
  return NextResponse.json(
    { ok: false, error: { code: "authentication_required", message: "Sign in to manage your RenderLab collections." } },
    { status: 401 },
  );
}

async function updateMembership(
  context: { params: Promise<{ collectionId: string; assetId: string }> },
  containsAsset: boolean,
) {
  const { collectionId, assetId } = await context.params;
  if (!uuidPattern.test(collectionId) || !uuidPattern.test(assetId)) return invalidRequest();

  const account = await getCurrentRenderLabAccount();
  if (!account) return authenticationRequired();
  if (!isSupabaseConfigured()) return NextResponse.json({ available: false }, { status: 503 });

  try {
    const result = await setMediaCollectionMembership(account.id, collectionId, assetId, containsAsset);
    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: result.reason,
            message: result.reason === "collection_not_found" ? "Collection was not found." : "Media asset was not found.",
          },
        },
        { status: 404 },
      );
    }
    return NextResponse.json({
      ok: true,
      collection: publicMediaCollection(result.collection, result.containsAsset),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "media_unavailable",
          message: error instanceof Error ? error.message : "Collection membership could not be updated.",
        },
      },
      { status: 503 },
    );
  }
}

export async function PUT(
  _request: Request,
  context: { params: Promise<{ collectionId: string; assetId: string }> },
) {
  return updateMembership(context, true);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ collectionId: string; assetId: string }> },
) {
  return updateMembership(context, false);
}
