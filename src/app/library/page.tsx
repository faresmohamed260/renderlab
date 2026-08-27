import type { MediaAssetListKind, PublicMediaAsset } from "@/lib/api/media-assets-contract";
import { LibraryView } from "@/features/library/library-view";
import { isSupabaseConfigured } from "@/server/data/supabase-rest";
import { listMediaAssets, publicMediaAsset } from "@/server/media/media-assets";
import { isR2Configured } from "@/server/storage/r2";

export const dynamic = "force-dynamic";

const pageSize = 24;

function parseKind(value: string | string[] | undefined): MediaAssetListKind {
  const resolved = Array.isArray(value) ? value[0] : value;
  return resolved === "image" || resolved === "video" ? resolved : "all";
}

function parseOffset(value: string | string[] | undefined) {
  const resolved = Array.isArray(value) ? value[0] : value;
  const parsed = Number(resolved || 0);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const kind = parseKind(params.kind);
  const offset = parseOffset(params.offset);
  let available = isSupabaseConfigured() && isR2Configured();
  let items: PublicMediaAsset[] = [];
  let hasMore = false;

  if (available) {
    try {
      const result = await listMediaAssets({
        ...(kind === "all" ? {} : { kind }),
        limit: pageSize,
        offset,
      });
      items = result.items.map(publicMediaAsset);
      hasMore = result.page.hasMore;
    } catch {
      available = false;
    }
  }

  return (
    <LibraryView
      available={available}
      items={items}
      kind={kind}
      offset={offset}
      limit={pageSize}
      hasMore={hasMore}
    />
  );
}
