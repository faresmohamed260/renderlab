"use client";

import { ArrowUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { MediaAssetSortOrder } from "@/lib/api/media-assets-contract";

export function LibrarySortMenu({
  sort,
  newestHref,
  oldestHref,
}: {
  sort: MediaAssetSortOrder;
  newestHref: string;
  oldestHref: string;
}) {
  const router = useRouter();

  function changeSort(value: string) {
    if (value !== "newest" && value !== "oldest") return;
    if (value === sort) return;
    router.push(value === "oldest" ? oldestHref : newestHref);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <ArrowUpDown aria-hidden="true" data-icon="inline-start" />
          {sort === "oldest" ? "Oldest first" : "Newest first"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Order by date</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={sort} onValueChange={changeSort}>
            <DropdownMenuRadioItem value="newest">Newest first</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="oldest">Oldest first</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
