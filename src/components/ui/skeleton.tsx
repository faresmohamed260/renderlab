import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Decorative placeholder only; caller owns real loading/error/status semantics. */
export function Skeleton({ className, ...props }: Omit<ComponentProps<"div">, "role" | "tabIndex" | "aria-hidden">) {
  return <div {...props} data-slot="skeleton" aria-hidden="true" className={cn("rl-skeleton relative overflow-hidden rounded-[var(--rl-radius-micro)] bg-[var(--rl-surface-high)]", className)} />;
}
