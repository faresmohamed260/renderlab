import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-4",
  {
    variants: {
      variant: {
        default: "bg-accent text-white hover:opacity-90",
        outline: "border border-border bg-surface-1 text-text hover:bg-surface-2",
        secondary: "bg-surface-2 text-text hover:bg-surface-3 aria-pressed:bg-surface-3 aria-[current=page]:bg-surface-3",
        ghost: "text-text-muted hover:bg-surface-2 hover:text-text",
        destructive: "bg-danger text-white hover:opacity-90",
        link: "text-text underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-10 px-4",
        xs: "min-h-8 rounded-md px-2.5 text-xs",
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
