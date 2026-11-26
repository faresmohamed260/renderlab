"use client";
import { ArrowDownWideNarrow, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import styles from "./library-gallery.module.css";
import type { MediaAssetListKind, MediaAssetSortOrder } from "@/lib/api/media-assets-contract";

export function LibrarySortToggle({ sort, newestHref, oldestHref, kind, kindHrefs, tab, sourceHrefs }: {
  sort: MediaAssetSortOrder; newestHref: string; oldestHref: string;
  kind: MediaAssetListKind; kindHrefs: Record<MediaAssetListKind, string>;
  tab: "creatives" | "uploads"; sourceHrefs: Record<"creatives" | "uploads", string>;
}) {
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={styles.sortTrigger} aria-label={`Sort and filter Library, ${sort === "oldest" ? "oldest" : "newest"} first`}>
          <span className={styles.sortText}>{sort === "oldest" ? "Oldest first" : "Newest first"}</span>
          <ChevronDown className={styles.sortChevron} aria-hidden="true" />
          <ArrowDownWideNarrow className={styles.sortIcon} aria-hidden="true" />
          {kind !== "all" ? <span className={styles.kindDot} aria-hidden="true" /> : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rl-glass-panel">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Sort</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={sort} onValueChange={value => router.push(value === "oldest" ? oldestHref : newestHref)}>
            <DropdownMenuRadioItem value="newest">Newest first</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="oldest">Oldest first</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className={styles.desktopMenuGroup} />
        <DropdownMenuGroup className={styles.desktopMenuGroup}>
          <DropdownMenuLabel>Show</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={kind} onValueChange={value => { if (value === "all" || value === "image" || value === "video") router.push(kindHrefs[value]); }}>
            <DropdownMenuRadioItem value="all">All media</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="image">Images</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="video">Videos</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className={styles.phoneMenuGroup} />
        <DropdownMenuGroup className={styles.phoneMenuGroup}>
          <DropdownMenuLabel>Source</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={tab} onValueChange={value => { if (value === "creatives" || value === "uploads") router.push(sourceHrefs[value]); }}>
            <DropdownMenuRadioItem value="creatives">Creatives</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="uploads">Uploads</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
