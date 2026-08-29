"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { GenerationInputAlias } from "@/lib/capabilities/generation";

export function CreateReferenceMentionMenu({
  alias,
  previewUrl,
  label,
  open,
  onOpenChange,
  onSelect,
}: {
  alias: GenerationInputAlias;
  previewUrl: string;
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: () => void;
}) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-label={`Mention @${alias}`}
          className="shrink-0 gap-1 px-2"
        >
          @{alias}
          <ChevronDown aria-hidden="true" className="size-3 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-64">
        <DropdownMenuLabel>Mention reference</DropdownMenuLabel>
        <DropdownMenuItem onSelect={onSelect} className="gap-3">
          <span className="size-10 shrink-0 overflow-hidden rounded-md bg-surface-3">
            <img src={previewUrl} alt="" className="size-full object-cover" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-text">@{alias}</span>
            <span className="block truncate text-xs text-text-muted">{label}</span>
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
