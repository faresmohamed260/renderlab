import * as React from "react";

import { cn } from "@/lib/utils";

// Chromium only spell-checks multi-line fields unless a single-line field opts in.
// Free-text fields (names, titles, search) should be checked; codes, numbers,
// credentials and addresses must not be. A caller's explicit spellCheck wins.
const NON_PROSE_TYPES = new Set(["email", "password", "number", "tel", "url", "date", "datetime-local", "time", "month", "week", "color", "range"]);

function isProseField({ type, inputMode, autoComplete, pattern }: React.ComponentProps<"input">) {
  if (type && NON_PROSE_TYPES.has(type)) return false;
  if (inputMode && inputMode !== "text" && inputMode !== "search") return false;
  if (pattern) return false;
  return !autoComplete || !/one-time-code|email|username|password|tel|url|cc-|current|new/.test(autoComplete);
}

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      spellCheck={isProseField({ type, ...props })}
      data-slot="input"
      className={cn(
        "min-h-10 w-full min-w-0 rounded-[var(--rl-radius-field)] border border-[color:var(--rl-border-boundary)] bg-[var(--rl-surface-control)] px-3 text-sm text-[color:var(--rl-text-primary)] outline-none transition-colors placeholder:text-[color:var(--rl-text-placeholder)] focus-visible:bg-[var(--rl-surface-field-focus)] focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-[var(--rl-focus-offset)] focus-visible:outline-[color:var(--rl-focus)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[var(--rl-surface-disabled)] disabled:text-[color:var(--rl-text-disabled)]",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
