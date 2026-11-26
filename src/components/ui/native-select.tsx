import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

type NativeSelectProps = Omit<React.ComponentProps<"select">, "size"> & {
  size?: "sm" | "default";
};

function NativeSelect({ className, size = "default", ...props }: NativeSelectProps) {
  return (
    <div
      data-slot="native-select-wrapper"
      data-size={size}
      className={cn("group/native-select relative w-full ", className)}
    >
      <select
        data-slot="native-select"
        data-size={size}
        className="min-h-10 w-full appearance-none rounded-[var(--rl-radius-field)] border border-[color:var(--rl-border-glass-control)] forced-colors:border-[ButtonText] bg-[var(--rl-surface-control)] px-3 pr-9 text-sm text-[color:var(--rl-text-primary)] outline-none transition-colors focus-visible:bg-[var(--rl-surface-field-focus)] focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-[var(--rl-focus-offset)] focus-visible:outline-[color:var(--rl-focus)] disabled:pointer-events-none disabled:cursor-not-allowed data-[size=sm]:min-h-9"
        {...props}
      />
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--rl-text-quiet)]"
      />
    </div>
  );
}

function NativeSelectOption({ className, ...props }: React.ComponentProps<"option">) {
  return <option data-slot="native-select-option" className={cn("bg-[var(--rl-surface-raised)] text-[color:var(--rl-text-primary)]", className)} {...props} />;
}

export { NativeSelect, NativeSelectOption };
