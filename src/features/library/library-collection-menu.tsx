"use client";

import { useState } from "react";
import { FolderOpen, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LibraryCollectionManager } from "@/features/library/library-collection-manager";
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
  const [managerOpen, setManagerOpen] = useState(false);
  const selected = collections.find((collection) => collection.id === selectedCollectionId) ?? null;
  const value = selected?.id ?? "all";

  function changeCollection(nextValue: string) {
    if (nextValue === value) return;
    setManagerOpen(false);
    if (nextValue === "all") {
      router.push(allHref);
      return;
    }
    const href = collectionHrefs[nextValue];
    if (href) router.push(href);
  }

  return (
    <div className="flex min-w-0 flex-col items-end gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={selected ? "secondary" : "outline"} size="sm" className="max-w-56">
            <FolderOpen aria-hidden="true" data-icon="inline-start" />
            <span className="truncate">{selected?.name ?? "Collections"}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" collisionPadding={8} className="min-w-52 max-w-72">
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
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setManagerOpen(true)}>
            <Settings2 aria-hidden="true" />
            Manage collections
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Collapsible open={managerOpen} onOpenChange={setManagerOpen}>
        <CollapsibleContent>
          <LibraryCollectionManager
            collections={collections}
            selectedCollectionId={selectedCollectionId}
            allHref={allHref}
            onClose={() => setManagerOpen(false)}
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
