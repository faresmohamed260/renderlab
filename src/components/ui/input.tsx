import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "min-h-10 w-full min-w-0 rounded-[var(--rl-radius-field)] border border-transparent bg-[var(--rl-surface-control)] px-3 text-sm text-[color:var(--rl-text-primary)] outline-none transition-colors placeholder:text-[color:var(--rl-text-placeholder)] focus-visible:bg-[var(--rl-surface-field-focus)] focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-[var(--rl-focus-offset)] focus-visible:outline-[color:var(--rl-focus)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[var(--rl-surface-disabled)] disabled:text-[color:var(--rl-text-disabled)]",
        // Native ranges can acquire fractional grid widths while clientWidth is
        // integer-rounded. Reserve one CSS pixel at the inline end; preserve
        // the native thumb, hit area, value and keyboard behavior.
        type === "range" && "box-border m-0 max-w-[calc(100%-1px)]",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
