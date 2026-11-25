"use client";

import type { ComponentProps } from "react";
import { Switch as Primitive } from "radix-ui";
import { cn } from "@/lib/utils";

export function Switch({ className, ...props }: ComponentProps<typeof Primitive.Root>) {
  return <Primitive.Root data-slot="switch"
    className={cn("relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border border-[color:var(--rl-border-boundary)] bg-[var(--rl-surface-raised)] px-1 data-[state=checked]:bg-[var(--rl-accent-primary)] disabled:cursor-not-allowed disabled:bg-[var(--rl-surface-disabled)] focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-[var(--rl-focus-offset)] focus-visible:outline-[color:var(--rl-focus)]", className)}
    {...props}>
    <Primitive.Thumb data-slot="switch-thumb" className="pointer-events-none block size-6 rounded-full bg-[var(--rl-text-primary)] data-[state=checked]:translate-x-5 data-[disabled]:bg-[var(--rl-text-disabled)] motion-safe:transition-transform motion-safe:duration-[var(--rl-duration-micro)]" />
  </Primitive.Root>;
}
