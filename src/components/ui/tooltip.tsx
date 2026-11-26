"use client";

import type { ComponentProps } from "react";
import { Tooltip as Primitive } from "radix-ui";
import { cn } from "@/lib/utils";

export const TooltipProvider = Primitive.Provider;
export const Tooltip = Primitive.Root;
export const TooltipTrigger = Primitive.Trigger;

export function TooltipContent({ className, sideOffset = 6, ...props }: ComponentProps<typeof Primitive.Content>) {
  return <Primitive.Portal>
    <Primitive.Content data-slot="tooltip-content" sideOffset={sideOffset}
      className={cn("z-50 max-w-[min(16rem,calc(100vw-1rem))] rounded-[var(--rl-radius-micro)] bg-[var(--rl-surface-overlay)] px-3 py-2 text-sm text-[color:var(--rl-text-primary)] shadow-[var(--rl-elevation-overlay)] wrap-break-word", className)}
      {...props} />
  </Primitive.Portal>;
}
