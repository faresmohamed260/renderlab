import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const textareaVariants = cva(
  "w-full outline-none placeholder:text-text-muted disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "min-h-24 rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm text-text transition-colors focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/25",
        bare: "resize-none bg-transparent text-text",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Textarea({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"textarea"> & VariantProps<typeof textareaVariants>) {
  return (
    <textarea
      data-slot="textarea"
      data-variant={variant}
      className={cn(textareaVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Textarea, textareaVariants };
