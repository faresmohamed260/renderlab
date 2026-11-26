"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Toggle as TogglePrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

const toggleVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-[var(--rl-radius-micro)] border border-transparent text-sm font-medium text-[color:var(--rl-text-quiet)] outline-none transition-colors hover:text-[color:var(--rl-text-primary)] focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-[var(--rl-focus-offset)] focus-visible:outline-[color:var(--rl-focus)] disabled:pointer-events-none disabled:text-[color:var(--rl-text-disabled)] data-[state=on]:bg-[var(--rl-surface-selected)] data-[state=on]:border-[color:var(--rl-border-action-selection)] forced-colors:data-[state=on]:border-[ButtonText] data-[state=on]:text-[color:var(--rl-text-primary)]",
  {
    variants: {
      variant: {
        default: "hover:bg-[var(--rl-surface-hover)]",
        outline: "bg-[var(--rl-surface-control)] hover:bg-[var(--rl-surface-hover)]",
      },
      size: {
        default: "min-h-8 min-w-20 px-3",
        sm: "min-h-8 px-2.5 text-xs",
        lg: "min-h-10 px-4",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Toggle({ className, variant, size, ...props }: React.ComponentProps<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>) {
  return <TogglePrimitive.Root data-slot="toggle" className={cn(toggleVariants({ variant, size }), className)} {...props} />;
}

export { Toggle, toggleVariants };
