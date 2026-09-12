import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LibraryNavigationLink } from "@/features/library/library-navigation-link";
import type { MediaAssetSortOrder } from "@/lib/api/media-assets-contract";

export function LibrarySortToggle({
  sort,
  newestHref,
  oldestHref,
}: {
  sort: MediaAssetSortOrder;
  newestHref: string;
  oldestHref: string;
}) {
  // UI-075 changes Gallery Rail presentation only; chronological sort remains URL/link-owned.
  const nextHref = sort === "newest" ? oldestHref : newestHref;
  const label = sort === "oldest" ? "Oldest first" : "Newest first";
  const nextLabel = sort === "oldest" ? "newest" : "oldest";

  return (
    <Button asChild variant="ghost" size="sm" className="min-h-11 shrink-0">
      <LibraryNavigationLink href={nextHref} aria-label={`${label}. Switch to ${nextLabel} first.`}>
        <ArrowUpDown aria-hidden="true" data-icon="inline-start" />
        {label}
      </LibraryNavigationLink>
    </Button>
  );
}
