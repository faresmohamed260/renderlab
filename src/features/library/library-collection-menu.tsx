"use client";

import { FolderOpen } from "lucide-react";
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
import type { PublicMediaCollection } from "@/lib/api/media-collections-contract";

export function LibraryCollectionMenu({
  collections,
  selectedCollectionId,
  allHref,
  collectionHrefs,
}: {
  collections: PublicMediaCollection[];
  selectedCollectionId: string | null;
  allHref: string;
  collectionHrefs: Record<string, string>;
}) {
  const router = useRouter();
  const selected = collections.find((collection) => collection.id === selectedCollectionId) ?? null;
  const value = selected?.id ?? "all";

  function changeCollection(nextValue: string) {
    if (nextValue === value) return;
    if (nextValue === "all") {
      router.push(allHref);
      return;
    }
    const href = collectionHrefs[nextValue];
    if (href) router.push(href);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={selected ? "secondary" : "outline"} size="sm" className="max-w-56">
          <FolderOpen aria-hidden="true" data-icon="inline-start" />
          <span className="truncate">{selected?.name ?? "Collections"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52 max-w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Browse collection</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={value} onValueChange={changeCollection}>
            <DropdownMenuRadioItem value="all">All media</DropdownMenuRadioItem>
            {collections.map((collection) => (
              <DropdownMenuRadioItem key={collection.id} value={collection.id}>
                <span className="truncate">{collection.name}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
