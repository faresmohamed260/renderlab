"use client";

import * as React from "react";
import { Label as LabelPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex w-fit items-center text-xs font-medium text-[color:var(--rl-text-quiet)] select-none peer-disabled:cursor-not-allowed peer-disabled:text-[color:var(--rl-text-disabled)]",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
