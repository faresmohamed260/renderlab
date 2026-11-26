import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva("relative w-full rounded-[var(--rl-radius-control)] border px-4 py-3 text-sm", {
  variants: {
    variant: {
      default: "border-[color:var(--rl-border-subtle)] bg-[var(--rl-surface-control)] text-[color:var(--rl-text-primary)]",
      destructive: "border-[color:var(--rl-danger)] bg-[var(--rl-surface-raised)] text-[color:var(--rl-text-primary)]",
    },
  },
  defaultVariants: { variant: "default" },
});

function Alert({ className, variant, ...props }: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return <div data-slot="alert" role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-description" className={cn("leading-6", className)} {...props} />;
}

export { Alert, AlertDescription };
