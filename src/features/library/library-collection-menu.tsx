"use client";

import { useRef, useState } from "react";
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
  const [Manager, setManager] = useState<typeof import("./library-collection-manager").LibraryCollectionManager | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  function openManager() {
    setManagerOpen(true);
    if (Manager) return;
    setLoadFailed(false);
    void import("./library-collection-manager").then(
      ({ LibraryCollectionManager }) => setManager(() => LibraryCollectionManager),
      () => setLoadFailed(true),
    );
  }

  function closeManager() {
    setManagerOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }
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
    <div className="flex min-w-0 flex-col items-stretch sm:items-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {/* UI-075 keeps adjacent Gallery Rail retrieval controls at the shared 44px touch height. */}
          <Button ref={trigger} variant={selected ? "secondary" : "outline"} size="sm" className="min-h-11 w-full max-w-none sm:w-auto sm:max-w-56">
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
          <DropdownMenuItem onSelect={openManager}>
            <Settings2 aria-hidden="true" />
            Manage collections
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Collapsible open={managerOpen} onOpenChange={setManagerOpen}>
        <CollapsibleContent className="pt-2">
          {Manager ? <Manager
            collections={collections}
            selectedCollectionId={selectedCollectionId}
            allHref={allHref}
            onClose={closeManager}
          /> : managerOpen ? (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 p-3">
              {loadFailed ? <><p role="alert" className="text-sm text-text">Collection manager could not load.</p><Button type="button" onClick={openManager}>Retry</Button></> : <p role="status" className="text-sm text-text">Loading collection manager…</p>}
              <Button type="button" variant="ghost" onClick={closeManager}>Close</Button>
            </div>
          ) : null}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
