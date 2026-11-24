"use client";

import type { ComponentProps } from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

function Popover(props: ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root {...props} />;
}

function PopoverTrigger(props: ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  className, align = "end", sideOffset = 4, collisionPadding = 12, ...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content data-slot="popover-content" align={align} sideOffset={sideOffset}
        collisionPadding={collisionPadding} avoidCollisions
        className={cn("z-50 rounded-lg border border-border bg-surface-2 p-3 text-text shadow-xl focus-visible:ring-2 focus-visible:ring-accent", className)}
        {...props} />
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverTrigger, PopoverContent };
