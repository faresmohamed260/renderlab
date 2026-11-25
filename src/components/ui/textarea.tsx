import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const textareaVariants = cva(
  "w-full outline-none placeholder:text-[color:var(--rl-text-placeholder)] disabled:cursor-not-allowed disabled:bg-[var(--rl-surface-disabled)] disabled:text-[color:var(--rl-text-disabled)]",
  {
    variants: {
      variant: {
        default: "min-h-24 rounded-[var(--rl-radius-field)] border border-transparent bg-[var(--rl-surface-control)] px-3 py-2 text-sm text-[color:var(--rl-text-primary)] transition-colors focus-visible:bg-[var(--rl-surface-field-focus)] focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-[var(--rl-focus-offset)] focus-visible:outline-[color:var(--rl-focus)]",
        bare: "resize-none bg-transparent text-[color:var(--rl-text-primary)]",
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
