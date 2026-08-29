import { NextResponse } from "next/server";
import type { UpdateMediaCollectionRequest } from "@/lib/api/media-collections-contract";
import { getCurrentRenderLabAccount } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/server/data/supabase-rest";
import {
  deleteMediaCollection,
  publicMediaCollection,
  renameMediaCollection,
} from "@/server/media/media-collections";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function invalidRequest(message = "A valid collection ID is required.") {
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

function collectionNotFound() {
  return NextResponse.json(
    { ok: false, error: { code: "collection_not_found", message: "Collection was not found." } },
    { status: 404 },
  );
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ collectionId: string }> },
) {
  const { collectionId } = await context.params;
  if (!uuidPattern.test(collectionId)) return invalidRequest();

  let body: UpdateMediaCollectionRequest;
  try {
    body = await request.json() as UpdateMediaCollectionRequest;
  } catch {
    return invalidRequest("A collection name is required.");
  }

  const account = await getCurrentRenderLabAccount();
  if (!account) return authenticationRequired();
  if (!isSupabaseConfigured()) return NextResponse.json({ available: false }, { status: 503 });

  try {
    const collection = await renameMediaCollection(
      account.id,
      collectionId,
      typeof body?.name === "string" ? body.name : "",
    );
    if (!collection) return collectionNotFound();
    return NextResponse.json({ ok: true, collection: publicMediaCollection(collection) });
  } catch (error) {
    if (error instanceof RangeError) {
      return NextResponse.json(
        { ok: false, error: { code: "invalid_request", message: error.message } },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "media_unavailable",
          message: error instanceof Error ? error.message : "Collection could not be renamed.",
        },
      },
      { status: 503 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ collectionId: string }> },
) {
  const { collectionId } = await context.params;
  if (!uuidPattern.test(collectionId)) return invalidRequest();

  const account = await getCurrentRenderLabAccount();
  if (!account) return authenticationRequired();
  if (!isSupabaseConfigured()) return NextResponse.json({ available: false }, { status: 503 });

  try {
    const collection = await deleteMediaCollection(account.id, collectionId);
    if (!collection) return collectionNotFound();
    return NextResponse.json({ ok: true, collectionId, deleted: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "media_unavailable",
          message: error instanceof Error ? error.message : "Collection could not be deleted.",
        },
      },
      { status: 503 },
    );
  }
}
