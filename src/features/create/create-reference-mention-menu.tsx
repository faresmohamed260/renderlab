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

export type CreateReferenceMentionOption = {
  alias: GenerationInputAlias;
  previewUrl: string;
  label: string;
};

export function CreateReferenceMentionMenu({
  triggerAlias,
  references,
  open,
  onOpenChange,
  onSelect,
}: {
  triggerAlias: GenerationInputAlias;
  references: readonly CreateReferenceMentionOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (alias: GenerationInputAlias) => void;
}) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-label={`Mention @${triggerAlias}`}
          className="shrink-0 gap-1 px-2"
        >
          @{triggerAlias}
          <ChevronDown aria-hidden="true" className="size-3 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-64">
        <DropdownMenuLabel>Mention reference</DropdownMenuLabel>
        {references.map((reference) => (
          <DropdownMenuItem
            key={reference.alias}
            onSelect={() => onSelect(reference.alias)}
            className="gap-3"
          >
            <span className="size-10 shrink-0 overflow-hidden rounded-md bg-surface-3">
              <img src={reference.previewUrl} alt="" className="size-full object-cover" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-text">@{reference.alias}</span>
              <span className="block truncate text-xs text-text-muted">{reference.label}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
