"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer inline-flex size-6 shrink-0 items-center justify-center rounded-[var(--rl-radius-micro)] border border-[color:var(--rl-border-boundary)] bg-[var(--rl-surface-control)] text-white outline-none transition-colors hover:bg-[var(--rl-surface-hover)] focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-[var(--rl-focus-offset)] focus-visible:outline-[color:var(--rl-focus)] disabled:cursor-not-allowed disabled:bg-[var(--rl-surface-disabled)] disabled:text-[color:var(--rl-text-disabled)] data-[state=checked]:border-[color:var(--rl-border-action-selection)] data-[state=checked]:bg-[var(--rl-accent-primary)]",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className="flex items-center justify-center">
        <Check aria-hidden="true" className="size-4" strokeWidth={2.5} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
