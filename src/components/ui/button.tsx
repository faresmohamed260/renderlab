import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--rl-radius-control)] text-sm font-semibold outline-none transition-colors focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-[var(--rl-focus-offset)] focus-visible:outline-[color:var(--rl-focus)] disabled:pointer-events-none disabled:bg-[var(--rl-surface-disabled)] disabled:text-[color:var(--rl-text-disabled)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-4",
  {
    variants: {
      variant: {
        default: "bg-[var(--rl-accent-primary)] text-[color:var(--rl-on-accent)] hover:bg-[var(--rl-accent-hover)] active:bg-[var(--rl-accent-pressed)]",
        outline: "bg-[var(--rl-surface-control)] text-[color:var(--rl-text-primary)] hover:bg-[var(--rl-surface-hover)]",
        secondary: "bg-[var(--rl-surface-hover)] text-[color:var(--rl-text-primary)] hover:bg-[var(--rl-surface-selected)] aria-pressed:bg-[var(--rl-surface-selected)] aria-pressed:shadow-[inset_0_0_0_1px_var(--rl-border-action-selection)] aria-[current=page]:bg-[var(--rl-surface-selected)] aria-[current=page]:shadow-[inset_0_0_0_1px_var(--rl-border-action-selection)]",
        ghost: "text-[color:var(--rl-text-quiet)] hover:bg-[var(--rl-surface-hover)] hover:text-[color:var(--rl-text-primary)]",
        destructive: "bg-[var(--rl-surface-raised)] text-[color:var(--rl-danger)] hover:bg-[var(--rl-surface-hover)] active:bg-[var(--rl-surface-pressed)]",
        link: "text-[color:var(--rl-text-primary)] underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-10 px-4",
        xs: "min-h-8 rounded-[var(--rl-radius-micro)] px-2.5 text-xs",
        sm: "min-h-9 px-3 text-xs",
        lg: "min-h-11 px-6",
        icon: "size-10 p-0",
        "icon-sm": "size-9 p-0",
        "icon-lg": "size-11 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
