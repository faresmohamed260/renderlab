import { NextResponse } from "next/server";
import {
  type CreateMediaCollectionRequest,
} from "@/lib/api/media-collections-contract";
import { getCurrentRenderLabAccount } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/server/data/supabase-rest";
import {
  createMediaCollection,
  listMediaCollections,
  publicMediaCollection,
} from "@/server/media/media-collections";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function authenticationRequired() {
  return NextResponse.json(
    { ok: false, error: { code: "authentication_required", message: "Sign in to manage your RenderLab collections." } },
    { status: 401 },
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const assetId = url.searchParams.get("assetId");
  if (assetId && !uuidPattern.test(assetId)) {
    return NextResponse.json(
      { ok: false, error: { code: "invalid_request", message: "A valid media asset ID is required." } },
      { status: 400 },
    );
  }

  const account = await getCurrentRenderLabAccount();
  if (!account) return authenticationRequired();
  if (!isSupabaseConfigured()) return NextResponse.json({ available: false });

  try {
    const collections = await listMediaCollections(account.id, assetId);
    return NextResponse.json({ ok: true, collections });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "media_unavailable",
          message: error instanceof Error ? error.message : "Collections could not be loaded.",
        },
      },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  let body: CreateMediaCollectionRequest;
  try {
    body = await request.json() as CreateMediaCollectionRequest;
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "invalid_request", message: "A collection name is required." } },
      { status: 400 },
    );
  }

  const account = await getCurrentRenderLabAccount();
  if (!account) return authenticationRequired();
  if (!isSupabaseConfigured()) return NextResponse.json({ available: false }, { status: 503 });

  try {
    const collection = await createMediaCollection(account.id, typeof body?.name === "string" ? body.name : "");
    if (!collection) throw new Error("Collection could not be created.");
    return NextResponse.json({ ok: true, collection: publicMediaCollection(collection) }, { status: 201 });
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
          message: error instanceof Error ? error.message : "Collection could not be created.",
        },
      },
      { status: 503 },
    );
  }
}
