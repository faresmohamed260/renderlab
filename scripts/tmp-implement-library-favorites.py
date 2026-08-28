from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one match, found {count}: {old[:140]!r}")
    p.write_text(text.replace(old, new, 1))


# Typed media contract.
replace_once(
    "src/lib/api/media-assets-contract.ts",
    "  operation: CreativeOperation | null;\n  createdAt: string;\n  contentUrl: string;",
    "  operation: CreativeOperation | null;\n  createdAt: string;\n  isFavorite: boolean;\n  contentUrl: string;",
)
replace_once(
    "src/lib/api/media-assets-contract.ts",
    "export type RenameMediaAssetResponse = MediaAssetResponse;",
    "export type RenameMediaAssetResponse = MediaAssetResponse;\nexport type FavoriteMediaAssetResponse = MediaAssetResponse;",
)

# Owner-scoped media persistence/query behavior.
replace_once(
    "src/server/media/media-assets.ts",
    "  created_at: string;\n  updated_at: string;",
    "  created_at: string;\n  favorited_at?: string | null;\n  updated_at: string;",
)
rename_end = """export async function renameMediaAsset(ownerId: string, assetId: string, requestedDisplayName: string) {
  const displayName = normalizeMediaAssetDisplayName(requestedDisplayName);
  if (!displayName) throw new RangeError("A media name is required.");
  if (displayName.length > MEDIA_ASSET_DISPLAY_NAME_MAX_LENGTH) {
    throw new RangeError(`Media names may not exceed ${MEDIA_ASSET_DISPLAY_NAME_MAX_LENGTH} characters.`);
  }

  const rows = await supabaseRest<MediaAssetRecord[]>(
    `media_assets?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(assetId)}&select=*`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        display_name: displayName,
        updated_at: new Date().toISOString(),
      }),
    },
  );
  return rows?.[0] ?? null;
}
"""
favorite_function = rename_end + """
export async function setMediaAssetFavorite(ownerId: string, assetId: string, favorite: boolean) {
  const current = await getMediaAsset(ownerId, assetId);
  if (!current) return null;
  if (Boolean(current.favorited_at) === favorite) return current;

  const rows = await supabaseRest<MediaAssetRecord[]>(
    `media_assets?owner_id=eq.${encodeURIComponent(ownerId)}&id=eq.${encodeURIComponent(assetId)}&select=*`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        favorited_at: favorite ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }),
    },
  );
  return rows?.[0] ?? null;
}
"""
replace_once("src/server/media/media-assets.ts", rename_end, favorite_function)
replace_once(
    "src/server/media/media-assets.ts",
    "  search,\n  sort = \"newest\",",
    "  search,\n  favoriteOnly = false,\n  sort = \"newest\",",
)
replace_once(
    "src/server/media/media-assets.ts",
    "  search?: string | null;\n  sort?: MediaAssetSortOrder;",
    "  search?: string | null;\n  favoriteOnly?: boolean;\n  sort?: MediaAssetSortOrder;",
)
replace_once(
    "src/server/media/media-assets.ts",
    "  if (kind) params.set(\"kind\", `eq.${kind}`);\n  if (normalizedSearch) params.set(\"or\", mediaSearchFilter(normalizedSearch));",
    "  if (kind) params.set(\"kind\", `eq.${kind}`);\n  if (favoriteOnly) params.set(\"favorited_at\", \"not.is.null\");\n  if (normalizedSearch) params.set(\"or\", mediaSearchFilter(normalizedSearch));",
)
replace_once(
    "src/server/media/media-assets.ts",
    "    operation: provenanceOperation(asset),\n    createdAt: asset.created_at,",
    "    operation: provenanceOperation(asset),\n    createdAt: asset.created_at,\n    isFavorite: Boolean(asset.favorited_at),",
)

# Library route state.
replace_once(
    "src/app/library/page.tsx",
    "function parseSearch(value: string | string[] | undefined) {\n  const normalized = normalizeMediaAssetSearchQuery(firstParam(value));\n  return normalized?.slice(0, MEDIA_ASSET_SEARCH_MAX_LENGTH) ?? null;\n}\n",
    "function parseSearch(value: string | string[] | undefined) {\n  const normalized = normalizeMediaAssetSearchQuery(firstParam(value));\n  return normalized?.slice(0, MEDIA_ASSET_SEARCH_MAX_LENGTH) ?? null;\n}\n\nfunction parseFavorite(value: string | string[] | undefined) {\n  return firstParam(value) === \"true\";\n}\n",
)
replace_once(
    "src/app/library/page.tsx",
    "  const searchQuery = parseSearch(params.q);\n  const offset = parseOffset(params.offset);",
    "  const searchQuery = parseSearch(params.q);\n  const favoriteOnly = parseFavorite(params.favorite);\n  const offset = parseOffset(params.offset);",
)
replace_once(
    "src/app/library/page.tsx",
    "        ...(searchQuery ? { search: searchQuery } : {}),\n        sort,",
    "        ...(searchQuery ? { search: searchQuery } : {}),\n        ...(favoriteOnly ? { favoriteOnly: true } : {}),\n        sort,",
)
replace_once(
    "src/app/library/page.tsx",
    "      searchQuery={searchQuery}\n      offset={offset}",
    "      searchQuery={searchQuery}\n      favoriteOnly={favoriteOnly}\n      offset={offset}",
)

# List API accepts favorite=true only.
replace_once(
    "src/app/api/media/assets/route.ts",
    "  const rawSort = url.searchParams.get(\"sort\");\n  const sort = (rawSort || \"newest\") as MediaAssetSortOrder;\n  const search = normalizeMediaAssetSearchQuery(url.searchParams.get(\"q\"));",
    "  const rawSort = url.searchParams.get(\"sort\");\n  const sort = (rawSort || \"newest\") as MediaAssetSortOrder;\n  const rawFavorite = url.searchParams.get(\"favorite\");\n  const favoriteOnly = rawFavorite === \"true\";\n  const search = normalizeMediaAssetSearchQuery(url.searchParams.get(\"q\"));",
)
replace_once(
    "src/app/api/media/assets/route.ts",
    "    (kind && !kinds.has(kind as MediaAssetKind))\n    || !sortOrders.has(sort)",
    "    (kind && !kinds.has(kind as MediaAssetKind))\n    || !sortOrders.has(sort)\n    || (rawFavorite != null && rawFavorite !== \"true\")",
)
replace_once(
    "src/app/api/media/assets/route.ts",
    "      ...(search ? { search } : {}),\n      sort,",
    "      ...(search ? { search } : {}),\n      ...(favoriteOnly ? { favoriteOnly: true } : {}),\n      sort,",
)

# Dedicated idempotent favorite mutation route.
favorite_route = Path("src/app/api/media/assets/[assetId]/favorite/route.ts")
favorite_route.parent.mkdir(parents=True, exist_ok=True)
if favorite_route.exists():
    raise SystemExit("Favorite route already exists")
favorite_route.write_text("""import { NextResponse } from "next/server";
import { getCurrentRenderLabAccount } from "@/lib/supabase/server";
import { publicMediaAsset, setMediaAssetFavorite } from "@/server/media/media-assets";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function invalidRequest() {
  return NextResponse.json(
    { ok: false, error: { code: "invalid_request", message: "A valid media asset ID is required." } },
    { status: 400 },
  );
}

function authenticationRequired() {
  return NextResponse.json(
    { ok: false, error: { code: "authentication_required", message: "Sign in to manage your RenderLab favorites." } },
    { status: 401 },
  );
}

async function updateFavorite(
  context: { params: Promise<{ assetId: string }> },
  favorite: boolean,
) {
  const { assetId } = await context.params;
  if (!uuidPattern.test(assetId)) return invalidRequest();

  const account = await getCurrentRenderLabAccount();
  if (!account) return authenticationRequired();

  try {
    const asset = await setMediaAssetFavorite(account.id, assetId, favorite);
    if (!asset) {
      return NextResponse.json(
        { ok: false, error: { code: "asset_not_found", message: "Media asset was not found." } },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, asset: publicMediaAsset(asset) });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "media_unavailable",
          message: error instanceof Error ? error.message : "Favorite state could not be updated.",
        },
      },
      { status: 503 },
    );
  }
}

export async function PUT(
  _request: Request,
  context: { params: Promise<{ assetId: string }> },
) {
  return updateFavorite(context, true);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ assetId: string }> },
) {
  return updateFavorite(context, false);
}
""")

# Library UI: preserve current composition and add one compact server-owned filter.
replace_once(
    "src/features/library/library-view.tsx",
    'import { ArrowLeft, ArrowRight, ImageIcon, Search, Video } from "lucide-react";',
    'import { ArrowLeft, ArrowRight, ImageIcon, Search, Star, Video } from "lucide-react";',
)
replace_once(
    "src/features/library/library-view.tsx",
    "  sort: MediaAssetSortOrder,\n  offset = 0,",
    "  sort: MediaAssetSortOrder,\n  favoriteOnly: boolean,\n  offset = 0,",
)
replace_once(
    "src/features/library/library-view.tsx",
    "  if (sort !== \"newest\") params.set(\"sort\", sort);\n  if (offset > 0) params.set(\"offset\", String(offset));",
    "  if (sort !== \"newest\") params.set(\"sort\", sort);\n  if (favoriteOnly) params.set(\"favorite\", \"true\");\n  if (offset > 0) params.set(\"offset\", String(offset));",
)
replace_once(
    "src/features/library/library-view.tsx",
    "  sort,\n  searchQuery,\n  offset,",
    "  sort,\n  searchQuery,\n  favoriteOnly,\n  offset,",
)
replace_once(
    "src/features/library/library-view.tsx",
    "  sort: MediaAssetSortOrder;\n  searchQuery: string | null;\n  offset: number;",
    "  sort: MediaAssetSortOrder;\n  searchQuery: string | null;\n  favoriteOnly: boolean;\n  offset: number;",
)
replace_once(
    "src/features/library/library-view.tsx",
    "  const previousLabel = previousDirection === \"newer\" ? \"Newer\" : \"Older\";\n  const nextLabel = nextDirection === \"older\" ? \"Older\" : \"Newer\";",
    """  const previousLabel = previousDirection === "newer" ? "Newer" : "Older";
  const nextLabel = nextDirection === "older" ? "Older" : "Newer";
  const emptyTitle = offset > 0
    ? `No ${nextDirection} media on this page`
    : searchQuery
      ? favoriteOnly ? `No favorites match “${searchQuery}”` : `No media matches “${searchQuery}”`
      : favoriteOnly
        ? "No favorites yet"
        : kind === "all"
          ? "No media yet"
          : `No ${kind === "image" ? "images" : "videos"} yet`;
  const emptyDescription = offset > 0
    ? `Go back to ${previousDirection} media.`
    : searchQuery
      ? favoriteOnly
        ? "Try another name or prompt, or clear the search to browse your favorites."
        : "Try another name or prompt, or clear the search to browse all saved media."
      : favoriteOnly
        ? "Favorite media from the Viewer and it will appear here."
        : uploadAvailable
          ? "Create or upload something and saved media will appear here automatically."
          : "Create something and saved results will appear here automatically.";
  const emptyActionHref = offset > 0
    ? libraryHref(kind, searchQuery, sort, favoriteOnly, Math.max(0, offset - limit))
    : searchQuery
      ? libraryHref(kind, null, sort, favoriteOnly)
      : favoriteOnly
        ? libraryHref(kind, null, sort, false)
        : "/";
  const emptyActionLabel = offset > 0
    ? `${previousLabel} media`
    : searchQuery
      ? "Clear search"
      : favoriteOnly
        ? "Browse all media"
        : "Create media";""",
)
old_toolbar = """            <div className="mt-8 flex items-center justify-between gap-4">
              <nav className="flex rounded-lg bg-surface-2 p-1" aria-label="Library media type">
                {filters.map((filter) => {
                  const active = kind === filter.value;
                  return (
                    <Button key={filter.value} asChild variant={active ? "secondary" : "ghost"} size="sm">
                      <Link
                        href={libraryHref(filter.value, searchQuery, sort)}
                        aria-current={active ? "page" : undefined}
                      >
                        {filter.label}
                      </Link>
                    </Button>
                  );
                })}
              </nav>
              <LibrarySortMenu
                sort={sort}
                newestHref={libraryHref(kind, searchQuery, "newest")}
                oldestHref={libraryHref(kind, searchQuery, "oldest")}
              />
            </div>"""
new_toolbar = """            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <nav className="flex rounded-lg bg-surface-2 p-1" aria-label="Library media type">
                {filters.map((filter) => {
                  const active = kind === filter.value;
                  return (
                    <Button key={filter.value} asChild variant={active ? "secondary" : "ghost"} size="sm">
                      <Link
                        href={libraryHref(filter.value, searchQuery, sort, favoriteOnly)}
                        aria-current={active ? "page" : undefined}
                      >
                        {filter.label}
                      </Link>
                    </Button>
                  );
                })}
              </nav>
              <div className="flex items-center gap-2">
                <Button asChild variant={favoriteOnly ? "secondary" : "outline"} size="sm">
                  <Link href={libraryHref(kind, searchQuery, sort, !favoriteOnly)}>
                    <Star aria-hidden="true" data-icon="inline-start" className={favoriteOnly ? "fill-current" : undefined} />
                    Favorites
                  </Link>
                </Button>
                <LibrarySortMenu
                  sort={sort}
                  newestHref={libraryHref(kind, searchQuery, "newest", favoriteOnly)}
                  oldestHref={libraryHref(kind, searchQuery, "oldest", favoriteOnly)}
                />
              </div>
            </div>"""
replace_once("src/features/library/library-view.tsx", old_toolbar, new_toolbar)
replace_once(
    "src/features/library/library-view.tsx",
    "              {sort !== \"newest\" ? <input type=\"hidden\" name=\"sort\" value={sort} /> : null}\n              <label",
    "              {sort !== \"newest\" ? <input type=\"hidden\" name=\"sort\" value={sort} /> : null}\n              {favoriteOnly ? <input type=\"hidden\" name=\"favorite\" value=\"true\" /> : null}\n              <label",
)
replace_once(
    "src/features/library/library-view.tsx",
    "                  <EmptyTitle>\n                    {offset > 0\n                      ? `No ${nextDirection} media on this page`\n                      : searchQuery\n                        ? `No media matches “${searchQuery}”`\n                        : kind === \"all\"\n                          ? \"No media yet\"\n                          : `No ${kind === \"image\" ? \"images\" : \"videos\"} yet`}\n                  </EmptyTitle>",
    "                  <EmptyTitle>{emptyTitle}</EmptyTitle>",
)
replace_once(
    "src/features/library/library-view.tsx",
    "                  <EmptyDescription>\n                    {offset > 0\n                      ? `Go back to ${previousDirection} media.`\n                      : searchQuery\n                        ? \"Try another name or prompt, or clear the search to browse all saved media.\"\n                        : uploadAvailable\n                          ? \"Create or upload something and saved media will appear here automatically.\"\n                          : \"Create something and saved results will appear here automatically.\"}\n                  </EmptyDescription>",
    "                  <EmptyDescription>{emptyDescription}</EmptyDescription>",
)
old_empty_link = """                    <Link
                      href={offset > 0
                        ? libraryHref(kind, searchQuery, sort, Math.max(0, offset - limit))
                        : searchQuery
                          ? libraryHref(kind, null, sort)
                          : "/"}
                    >
                      {offset > 0 ? <ArrowLeft aria-hidden="true" data-icon="inline-start" /> : null}
                      {offset > 0 ? `${previousLabel} media` : searchQuery ? "Clear search" : "Create media"}
                      {offset === 0 && !searchQuery ? <ArrowRight aria-hidden="true" data-icon="inline-end" /> : null}
                    </Link>"""
new_empty_link = """                    <Link href={emptyActionHref}>
                      {offset > 0 ? <ArrowLeft aria-hidden="true" data-icon="inline-start" /> : null}
                      {emptyActionLabel}
                      {offset === 0 && !searchQuery && !favoriteOnly ? <ArrowRight aria-hidden="true" data-icon="inline-end" /> : null}
                    </Link>"""
replace_once("src/features/library/library-view.tsx", old_empty_link, new_empty_link)
replace_once(
    "src/features/library/library-view.tsx",
    "<Link href={libraryHref(kind, null, sort)}>Clear</Link>",
    "<Link href={libraryHref(kind, null, sort, favoriteOnly)}>Clear</Link>",
)
replace_once(
    "src/features/library/library-view.tsx",
    "<Link href={libraryHref(kind, searchQuery, sort, Math.max(0, offset - limit))}>",
    "<Link href={libraryHref(kind, searchQuery, sort, favoriteOnly, Math.max(0, offset - limit))}>",
)
replace_once(
    "src/features/library/library-view.tsx",
    "<Link href={libraryHref(kind, searchQuery, sort, offset + limit)}>",
    "<Link href={libraryHref(kind, searchQuery, sort, favoriteOnly, offset + limit)}>",
)

# Viewer passes favorite state into its existing action group.
replace_once(
    "src/features/library/media-viewer.tsx",
    "                displayName={asset.displayName}\n                fallbackTitle={title}",
    "                displayName={asset.displayName}\n                fallbackTitle={title}\n                isFavorite={asset.isFavorite}",
)

# Viewer action composition keeps Rename/Download side-by-side and adds one full-width favorite toggle.
Path("src/features/library/media-viewer-actions.tsx").write_text("""\"use client\";

import { useId, useState, type FormEvent } from "react";
import { Check, Download, Pencil, Star, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  MEDIA_ASSET_DISPLAY_NAME_MAX_LENGTH,
  type FavoriteMediaAssetResponse,
  type RenameMediaAssetResponse,
} from "@/lib/api/media-assets-contract";

export function MediaViewerActions({
  assetId,
  displayName,
  fallbackTitle,
  isFavorite,
}: {
  assetId: string;
  displayName: string | null;
  fallbackTitle: string;
  isFavorite: boolean;
}) {
  const router = useRouter();
  const inputId = useId();
  const panelId = useId();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(displayName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [favorite, setFavorite] = useState(isFavorite);
  const [favoriteSaving, setFavoriteSaving] = useState(false);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);

  function beginEditing() {
    setDraft(displayName ?? "");
    setError(null);
    setEditing(true);
  }

  function cancelEditing() {
    if (saving) return;
    setDraft(displayName ?? "");
    setError(null);
    setEditing(false);
  }

  async function toggleFavorite() {
    if (favoriteSaving) return;
    const nextFavorite = !favorite;
    setFavoriteSaving(true);
    setFavoriteError(null);
    try {
      const response = await fetch(`/api/media/assets/${encodeURIComponent(assetId)}/favorite`, {
        method: nextFavorite ? "PUT" : "DELETE",
      });
      const payload = await response.json().catch(() => null) as FavoriteMediaAssetResponse | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload && !payload.ok ? payload.error.message : "Favorite state could not be updated.");
      }
      setFavorite(payload.asset.isFavorite);
      router.refresh();
    } catch (favoriteUpdateError) {
      setFavoriteError(
        favoriteUpdateError instanceof Error ? favoriteUpdateError.message : "Favorite state could not be updated.",
      );
    } finally {
      setFavoriteSaving(false);
    }
  }

  async function submitRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/media/assets/${encodeURIComponent(assetId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: draft }),
      });
      const payload = await response.json().catch(() => null) as RenameMediaAssetResponse | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload && !payload.ok ? payload.error.message : "Media could not be renamed.");
      }

      setDraft(payload.asset.displayName ?? "");
      setEditing(false);
      router.refresh();
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : "Media could not be renamed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        type="button"
        variant={favorite ? "secondary" : "outline"}
        size="lg"
        onClick={toggleFavorite}
        disabled={favoriteSaving}
        aria-pressed={favorite}
        className="col-span-2 w-full"
      >
        {favoriteSaving ? (
          <Spinner data-icon="inline-start" />
        ) : (
          <Star
            aria-hidden="true"
            data-icon="inline-start"
            className={favorite ? "fill-current" : undefined}
          />
        )}
        {favoriteSaving ? "Saving…" : favorite ? "Favorited" : "Favorite"}
      </Button>
      {favoriteError ? (
        <p role="alert" className="col-span-2 text-xs text-danger">{favoriteError}</p>
      ) : null}

      <Button
        type="button"
        variant="secondary"
        size="lg"
        onClick={beginEditing}
        aria-expanded={editing}
        aria-controls={panelId}
        className="w-full"
      >
        <Pencil aria-hidden="true" data-icon="inline-start" />
        Rename
      </Button>
      <Button asChild variant="secondary" size="lg" className="w-full">
        <a href={`/api/media/assets/${encodeURIComponent(assetId)}/download`}>
          <Download aria-hidden="true" data-icon="inline-start" />
          Download
        </a>
      </Button>

      {editing ? (
        <form
          id={panelId}
          onSubmit={submitRename}
          className="col-span-2 rounded-lg border border-border bg-surface-2 p-3"
        >
          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor={inputId} className="text-text">Media name</FieldLabel>
            <Input
              id={inputId}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={MEDIA_ASSET_DISPLAY_NAME_MAX_LENGTH}
              placeholder={fallbackTitle}
              autoFocus
              disabled={saving}
              aria-invalid={Boolean(error)}
            />
            <FieldError>{error}</FieldError>
          </Field>
          <div className="mt-3 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={cancelEditing} disabled={saving}>
              <X aria-hidden="true" data-icon="inline-start" />
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Spinner data-icon="inline-start" /> : <Check aria-hidden="true" data-icon="inline-start" />}
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
""")

# Focused configured verifier.
Path("scripts/verify-library-favorites.mjs").write_text("""import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { chromium } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import {
  configuredTestAccountIdentity,
  createConfiguredTestAccount,
  deleteConfiguredTestAccount,
  routeLocalAppRequestsWithAccount,
  withAccountAuthorization,
} from "./lib/configured-test-account.mjs";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const r2Bucket = process.env.R2_BUCKET_NAME;
const artifactDir = process.env.RENDERLAB_LIBRARY_FAVORITES_ARTIFACT_DIR || "artifacts";
const cleanupOnly = process.argv.includes("--cleanup-only");
const ownerIdentity = configuredTestAccountIdentity("library-favorites-owner");
const foreignIdentity = configuredTestAccountIdentity("library-favorites-foreign");

const pngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZPZkAAAAASUVORK5CYII=",
  "base64",
);

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: supabaseKey,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: r2Bucket,
})) {
  if (!value) throw new Error(`${name} is required for configured Library Favorites verification.`);
}

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function supabase(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", supabaseKey);
  headers.set("authorization", `Bearer ${supabaseKey}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers });
}

async function cleanupFixture() {
  await deleteConfiguredTestAccount(ownerIdentity);
  await deleteConfiguredTestAccount(foreignIdentity);
}

async function createAsset(account, displayName) {
  const id = randomUUID();
  const storageKey = `renderlab/favorite-fixtures/${new Date().toISOString().slice(0, 7).replace("-", "/")}/${id}.png`;
  const response = await supabase("media_assets", {
    method: "POST",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({
      id,
      owner_id: account.id,
      generation_job_id: null,
      origin: "generated",
      kind: "image",
      mime_type: "image/png",
      storage_key: storageKey,
      thumbnail_storage_key: null,
      original_filename: null,
      display_name: displayName,
      size_bytes: pngBytes.length,
      width: 1,
      height: 1,
      duration_ms: null,
      provenance: { prompt: displayName, operation: "create-image", model: "library-favorites-fixture" },
      metadata: { verification: "library-favorites-v0-1" },
      favorited_at: null,
    }),
  });
  if (!response.ok) throw new Error(`Could not create Favorites media fixture (${response.status}): ${await response.text()}`);
  await r2Client.send(new PutObjectCommand({ Bucket: r2Bucket, Key: storageKey, Body: pngBytes, ContentType: "image/png" }));
  return { id, storageKey };
}

async function favoriteApi(account, assetId, favorite) {
  const response = await fetch(
    `${baseUrl}/api/media/assets/${encodeURIComponent(assetId)}/favorite`,
    withAccountAuthorization(account, { method: favorite ? "PUT" : "DELETE" }),
  );
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

async function mediaApi(account, query) {
  const response = await fetch(`${baseUrl}/api/media/assets?${query}`, withAccountAuthorization(account));
  const payload = await response.json().catch(() => null);
  assert(response.ok && payload?.ok, `Favorites media API failed (${response.status}): ${JSON.stringify(payload)}`);
  return payload;
}

async function favoriteTimestamp(assetId) {
  const response = await supabase(`media_assets?id=eq.${encodeURIComponent(assetId)}&select=id,owner_id,favorited_at`);
  if (!response.ok) throw new Error(`Could not inspect favorite timestamp (${response.status}): ${await response.text()}`);
  return (await response.json())[0] || null;
}

if (cleanupOnly) {
  await cleanupFixture();
  process.exit(0);
}

await mkdir(artifactDir, { recursive: true });
let browser = null;
let primaryError = null;

try {
  await cleanupFixture();
  const owner = await createConfiguredTestAccount("library-favorites-owner");
  const foreign = await createConfiguredTestAccount("library-favorites-foreign");
  const favoriteAsset = await createAsset(owner, "Aurora favorite study");
  const ordinaryAsset = await createAsset(owner, "Dune ordinary study");
  const foreignAsset = await createAsset(foreign, "Foreign favorite study");

  const signedOut = await fetch(`${baseUrl}/api/media/assets/${favoriteAsset.id}/favorite`, { method: "PUT" });
  assert(signedOut.status === 401, `Signed-out favorite mutation returned ${signedOut.status}, expected 401.`);

  let result = await favoriteApi(owner, favoriteAsset.id, true);
  assert(result.response.ok && result.payload?.ok && result.payload.asset.isFavorite === true, "Owner could not favorite own asset.");
  const firstTimestamp = (await favoriteTimestamp(favoriteAsset.id))?.favorited_at;
  assert(typeof firstTimestamp === "string" && firstTimestamp.length > 10, "Favorite mutation did not persist favorited_at.");

  result = await favoriteApi(owner, favoriteAsset.id, true);
  assert(result.response.ok && result.payload?.asset?.isFavorite === true, "Repeated favorite PUT was not successful.");
  const secondTimestamp = (await favoriteTimestamp(favoriteAsset.id))?.favorited_at;
  assert(secondTimestamp === firstTimestamp, "Repeated favorite PUT changed the persisted favorite timestamp instead of remaining idempotent.");

  result = await favoriteApi(foreign, foreignAsset.id, true);
  assert(result.response.ok && result.payload?.asset?.isFavorite === true, "Foreign fixture owner could not favorite its own asset.");

  result = await favoriteApi(foreign, favoriteAsset.id, true);
  assert(result.response.status === 404, `Foreign account favorite mutation returned ${result.response.status}, expected 404.`);
  result = await favoriteApi(owner, foreignAsset.id, false);
  assert(result.response.status === 404, `Owner could mutate foreign favorite state (${result.response.status}).`);

  const favorites = await mediaApi(owner, "favorite=true");
  assert(favorites.items.length === 1 && favorites.items[0].id === favoriteAsset.id, "Favorites list did not return exactly the owner's favorite asset.");
  assert(favorites.items[0].isFavorite === true, "Favorite list serialization did not expose favorite state.");

  const composed = await mediaApi(owner, `favorite=true&kind=image&q=${encodeURIComponent("AURORA")}&sort=oldest`);
  assert(composed.items.length === 1 && composed.items[0].id === favoriteAsset.id, "Favorite filter did not compose with kind/search/sort.");
  const noMatch = await mediaApi(owner, `favorite=true&q=${encodeURIComponent("dune")}`);
  assert(noMatch.items.length === 0, "Favorite filter returned a non-favorited search match.");

  const invalidFavorite = await fetch(`${baseUrl}/api/media/assets?favorite=false`, withAccountAuthorization(owner));
  assert(invalidFavorite.status === 400, `Invalid favorite query returned ${invalidFavorite.status}, expected 400.`);

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1024 }, colorScheme: "dark" });
  const page = await context.newPage();
  await routeLocalAppRequestsWithAccount(page, baseUrl, owner);

  await page.goto(`${baseUrl}/library?favorite=true`, { waitUntil: "networkidle", timeout: 60_000 });
  const favoriteCard = page.locator(`a[href="/library/${encodeURIComponent(favoriteAsset.id)}"]`);
  await favoriteCard.waitFor({ state: "visible", timeout: 30_000 });
  assert(await page.locator(`a[href="/library/${encodeURIComponent(ordinaryAsset.id)}"]`).count() === 0, "Favorites browser view rendered non-favorite media.");
  await page.getByRole("link", { name: "Favorites", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.screenshot({ path: `${artifactDir}/library-favorites-desktop.png`, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  await page.evaluate(() => window.scrollTo(0, 0));
  assert(await favoriteCard.isVisible(), "Favorite Library card is not visible on mobile.");
  await page.screenshot({ path: `${artifactDir}/library-favorites-mobile.png`, fullPage: true });

  await page.setViewportSize({ width: 1440, height: 1024 });
  await page.goto(`${baseUrl}/library/${encodeURIComponent(favoriteAsset.id)}`, { waitUntil: "networkidle", timeout: 60_000 });
  const favoriteButton = page.getByRole("button", { name: "Favorited", exact: true });
  await favoriteButton.waitFor({ state: "visible", timeout: 30_000 });
  assert(await favoriteButton.getAttribute("aria-pressed") === "true", "Viewer favorite toggle did not expose pressed state.");
  await page.screenshot({ path: `${artifactDir}/media-favorite-viewer-desktop.png`, fullPage: true });

  await favoriteButton.click();
  const addFavoriteButton = page.getByRole("button", { name: "Favorite", exact: true });
  await addFavoriteButton.waitFor({ state: "visible", timeout: 30_000 });
  assert((await favoriteTimestamp(favoriteAsset.id))?.favorited_at == null, "Viewer unfavorite did not clear favorited_at.");
  result = await favoriteApi(owner, favoriteAsset.id, false);
  assert(result.response.ok && result.payload?.asset?.isFavorite === false, "Repeated DELETE was not idempotently unfavorited.");

  await addFavoriteButton.click();
  await page.getByRole("button", { name: "Favorited", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${artifactDir}/media-favorite-viewer-mobile.png`, fullPage: true });

  const ownerRow = await favoriteTimestamp(favoriteAsset.id);
  const foreignRow = await favoriteTimestamp(foreignAsset.id);
  assert(ownerRow?.owner_id === owner.id && foreignRow?.owner_id === foreign.id, "Favorite mutations changed asset ownership.");

  console.log(`Configured Library Favorites rendered successfully. owner=${owner.id} favorite=${favoriteAsset.id} ordinary=${ordinaryAsset.id} foreign=${foreignAsset.id}`);
} catch (error) {
  primaryError = error;
} finally {
  if (browser) await browser.close().catch(() => {});
  try {
    await cleanupFixture();
  } catch (cleanupError) {
    console.error(cleanupError);
    if (!primaryError) primaryError = cleanupError;
  }
}

if (primaryError) throw primaryError;
""")

# Focused GitHub verification workflow.
Path(".github/workflows/library-favorites-visual.yml").write_text("""name: Library Favorites Visual

on:
  pull_request:
    paths:
      - "scripts/lib/configured-test-account.mjs"
      - "scripts/verify-library-favorites.mjs"
      - ".github/workflows/library-favorites-visual.yml"
      - "components.json"
      - "package.json"
      - "src/components/ui/**"
      - "src/lib/utils.ts"
      - "src/lib/supabase/**"
      - "src/app/library/**"
      - "src/features/library/**"
      - "src/app/api/media/assets/**"
      - "src/server/media/media-assets.ts"
      - "src/server/storage/r2.ts"
      - "src/lib/api/media-assets-contract.ts"
      - "supabase/migrations/0004_core_account_ownership_prepare.sql"
      - "supabase/migrations/0005_core_account_ownership_enforce.sql"
      - "supabase/migrations/0006_media_favorites.sql"
  workflow_dispatch:

permissions:
  contents: read

jobs:
  favorites:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    env:
      SUPABASE_URL: https://rashyleshocuvpgcooxy.supabase.co
      SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
      NEXT_PUBLIC_SUPABASE_URL: https://rashyleshocuvpgcooxy.supabase.co
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: sb_publishable_Erz_UUs49DgHHDkFoXfztA_m6CbHTqw
      R2_ACCOUNT_ID: ${{ secrets.R2_ACCOUNT_ID }}
      R2_ACCESS_KEY_ID: ${{ secrets.R2_ACCESS_KEY_ID }}
      R2_SECRET_ACCESS_KEY: ${{ secrets.R2_SECRET_ACCESS_KEY }}
      R2_BUCKET_NAME: ${{ secrets.R2_BUCKET_NAME }}
      RENDERLAB_TEST_BASE_URL: http://127.0.0.1:3000

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Validate required shared-resource secrets
        shell: bash
        run: |
          missing=0
          for name in SUPABASE_SERVICE_ROLE_KEY R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_BUCKET_NAME; do
            if [ -z "${!name}" ]; then
              echo "::error::$name is not configured for RenderLab."
              missing=1
            fi
          done
          exit "$missing"

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
          cache-dependency-path: package.json

      - name: Install dependencies
        run: npm install --no-audit --no-fund

      - name: Build
        run: npm run build

      - name: Install Chromium
        run: npx playwright install --with-deps chromium

      - name: Start configured application
        shell: bash
        run: |
          npm run start -- -p 3000 > /tmp/renderlab-next.log 2>&1 &
          echo $! > /tmp/renderlab-next.pid
          for i in {1..60}; do
            if curl --fail --silent http://127.0.0.1:3000/library > /dev/null; then
              exit 0
            fi
            sleep 1
          done
          cat /tmp/renderlab-next.log || true
          exit 1

      - name: Render configured Library Favorites lifecycle
        run: node scripts/verify-library-favorites.mjs

      - name: Cleanup Library Favorites fixtures
        if: always()
        run: node scripts/verify-library-favorites.mjs --cleanup-only

      - name: Print server log on failure
        if: failure()
        run: cat /tmp/renderlab-next.log || true

      - name: Upload Library Favorites screenshots
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: renderlab-library-favorites-screenshots
          path: artifacts/*favorite*.png
          if-no-files-found: warn
          retention-days: 14
""")

# Architecture docs now match the branch implementation and applied schema.
replace_once(
    "docs/architecture/INFRASTRUCTURE.md",
    "- `0006_media_favorites.sql` — committed for active UI-031 but not yet applied at this checkpoint; additive nullable `media_assets.favorited_at` plus a partial owner/created-time browse index. It changes no ownership, RLS, browser grant or R2 contract.",
    "- `0006_media_favorites.sql` — applied as `20260828183102 renderlab_media_favorites`; adds nullable `media_assets.favorited_at` plus partial `media_assets_owner_favorite_created_at_idx` for owner/favorite browsing. Post-apply audit found 0 media rows, `owner_id` still `NOT NULL`, RLS enabled and 0 direct browser grants. It changes no R2 contract.",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "- [ ] Commit and apply additive `0006_media_favorites.sql` with nullable `favorited_at` and an owner/favorites browse index; preserve RLS and zero browser grants.",
    "- [x] Apply additive `0006_media_favorites.sql` as `20260828183102 renderlab_media_favorites`; `favorited_at` is nullable, the partial owner/favorites browse index exists, `owner_id` remains `NOT NULL`, RLS remains enabled, browser grants remain zero and the media table remained empty after migration.",
)
replace_once(
    "PROJECT.md",
    "- v0.1 scope is intentionally narrow: one owner-scoped favorite marker on existing durable `media_assets`, a URL/server-owned Favorites Library filter that composes with kind/search/sort/pagination, and one Media Viewer favorite toggle.",
    "- v0.1 scope is intentionally narrow: one owner-scoped favorite marker on existing durable `media_assets`, a URL/server-owned Favorites Library filter that composes with kind/search/sort/pagination, and one Media Viewer favorite toggle. Additive migration `20260828183102 renderlab_media_favorites` is applied with RLS/ownership/browser-grant boundaries unchanged.",
)
replace_once(
    "docs/architecture/FRONTEND_ARCHITECTURE.md",
    "GET      /api/media/assets/[assetId]\nPATCH    /api/media/assets/[assetId]\nGET      /api/media/assets/[assetId]/content",
    "GET      /api/media/assets/[assetId]\nPATCH    /api/media/assets/[assetId]\nPUT      /api/media/assets/[assetId]/favorite\nDELETE   /api/media/assets/[assetId]/favorite\nGET      /api/media/assets/[assetId]/content",
)
replace_once(
    "docs/architecture/FRONTEND_ARCHITECTURE.md",
    "`GET /api/media/assets` accepts bounded `kind`, `q`, `sort`, `limit`, `offset`; `sort` accepts only `newest|oldest` and defaults to newest. `PATCH /api/media/assets/[assetId]` currently owns the UI-025 durable display-name Rename mutation only. Picker and drag/drop persistent uploads both use the same existing media-upload ticket/completion APIs.",
    "`GET /api/media/assets` accepts bounded `kind`, `q`, `sort`, `favorite`, `limit`, `offset`; `favorite` accepts only `true` when present, and `sort` accepts only `newest|oldest` with newest as default. `PATCH /api/media/assets/[assetId]` remains the UI-025 Rename mutation; UI-031 uses idempotent owner-scoped `PUT`/`DELETE /api/media/assets/[assetId]/favorite`. Picker and drag/drop persistent uploads both use the same existing media-upload ticket/completion APIs.",
)
replace_once(
    "docs/architecture/FRONTEND_ARCHITECTURE.md",
    "- Library `kind` / `q` / `sort` / `offset`;",
    "- Library `kind` / `q` / `sort` / `favorite` / `offset`;",
)
replace_once(
    "docs/architecture/FRONTEND_ARCHITECTURE.md",
    "- Viewer Rename editor state;",
    "- Viewer Rename editor and Favorite mutation feedback state;",
)
